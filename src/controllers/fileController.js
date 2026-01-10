import { StoredFile, Device } from "../models/index.js";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { Op, fn, col } from "sequelize";
import bunnyStorageService from "../services/storage/BunnyStorageService.js";
import config from "../config/config.js";

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    // Use a temporary uploads directory, we'll move it later
    const tempDir = path.join(process.cwd(), "uploads", "temp");

    try {
      await fs.mkdir(tempDir, { recursive: true });
      cb(null, tempDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const timestamp = Date.now();
    const filename = `${timestamp}_${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow all common media types
    const allowedTypes = [
      // Images
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      // Videos
      "video/mp4",
      "video/3gpp",
      "video/quicktime",
      "video/x-msvideo",
      // Documents
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      // Audio
      "audio/mpeg",
      "audio/wav",
      "audio/ogg",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  },
}).single("file");

// Helper function to determine file type from MIME type
const getFileTypeFromMime = (mimeType) => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
};

// Helper function to get file type from extension (fallback when mime is wrong)
const getFileTypeFromExtension = (filename) => {
  if (!filename) return "document";
  const ext = path.extname(filename).toLowerCase();
  
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
  const videoExts = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.3gp'];
  const audioExts = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
  
  if (imageExts.includes(ext)) return "image";
  if (videoExts.includes(ext)) return "video";
  if (audioExts.includes(ext)) return "audio";
  return "document";
};

// Helper function to get correct mime type from extension
const getCorrectMimeType = (filename, detectedMime) => {
  // If detected mime is specific enough, use it
  if (detectedMime && 
      detectedMime !== 'text/plain' && 
      detectedMime !== 'application/octet-stream') {
    return detectedMime;
  }
  
  // Otherwise, derive from extension
  if (!filename) return detectedMime || 'application/octet-stream';
  const ext = path.extname(filename).toLowerCase();
  
  const mimeMap = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
    '.webm': 'video/webm',
    '.3gp': 'video/3gpp',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.txt': 'text/plain',
  };
  
  return mimeMap[ext] || detectedMime || 'application/octet-stream';
};

// Upload and store file
export const uploadFile = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        error: err.message,
      });
    }

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file provided",
        });
      }

      // Extract request data
      const {
        userId,
        description,
        expiresIn, // hours
        isPublic = false,
      } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "userId is required",
        });
      }

      // Calculate expiration date if provided
      let expiresAt = null;
      if (expiresIn) {
        expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + parseInt(expiresIn));
      }

      // Generate solid ID early
      const storedFileId = uuidv4();

      // Create user-specific directory and move file
      const userDir = path.join(process.cwd(), "uploads", "users", userId);
      await fs.mkdir(userDir, { recursive: true });

      // Move file from temp to user directory
      const newFilePath = path.join(userDir, req.file.filename);
      await fs.rename(req.file.path, newFilePath);

      // Get file metadata - use extension-based detection as fallback for incorrect mime types
      let fileType = getFileTypeFromMime(req.file.mimetype);
      let mimeType = req.file.mimetype;
      
      // If mime detection failed (text/plain or octet-stream for media files), use extension
      if (mimeType === 'text/plain' || mimeType === 'application/octet-stream') {
        const extFileType = getFileTypeFromExtension(req.file.originalname);
        const extMimeType = getCorrectMimeType(req.file.originalname, mimeType);
        
        // Only override if extension indicates media file
        if (extFileType !== 'document') {
          fileType = extFileType;
          mimeType = extMimeType;
          console.log(`[FileUpload] Corrected mime type from ${req.file.mimetype} to ${mimeType} based on extension`);
        }
      }
      
      let filePath = path.relative(process.cwd(), newFilePath);
      let publicUrl = `/api/whatsapp/files/${storedFileId}/preview`;
      let isStorageExternal = false;

      // Use Bunny.net if configured
      if (config.bunny.apiKey && config.bunny.storageZoneName) {
        try {
          const fileBuffer = await fs.readFile(newFilePath);
          const subfolder = fileType === "image" ? "images" : fileType === "video" ? "videos" : "documents";
          const bunnyUrl = await bunnyStorageService.uploadFile(fileBuffer, req.file.filename, subfolder);
          
          if (bunnyUrl) {
            filePath = bunnyUrl;
            publicUrl = bunnyUrl;
            isStorageExternal = true;
            
            // Clean up local file after successful Bunny upload
            try {
              await fs.unlink(newFilePath);
            } catch (unlinkErr) {
              console.warn("[FileUpload] Failed to delete local file after Bunny upload:", unlinkErr);
            }
          }
        } catch (bunnyErr) {
          console.error("[FileUpload] Bunny upload failed, falling back to local storage:", bunnyErr);
        }
      }

      // Create database record
      const storedFile = await StoredFile.create({
        id: storedFileId,
        userId,
        deviceId: null, 
        originalName: req.file.originalname,
        storedName: req.file.filename,
        mimeType: mimeType,
        fileType,
        size: req.file.size,
        filePath,
        isPublic: isPublic === "true" || isPublic === true,
        tags: [], 
        description,
        expiresAt,
        metadata: {
          uploadedAt: new Date(),
          clientIP: req.ip,
          isExternal: isStorageExternal
        },
      });

      res.json({
        success: true,
        message: "File uploaded successfully",
        url: publicUrl,
        file: {
          id: storedFile.id,
          originalName: storedFile.originalName,
          fileType: storedFile.fileType,
          size: storedFile.size,
          mimeType: storedFile.mimeType,
          description: storedFile.description,
          createdAt: storedFile.createdAt,
          expiresAt: storedFile.expiresAt,
          url: publicUrl
        },
      });
    } catch (error) {
      console.error("Error uploading file:", error);

      // Clean up uploaded file if database operation failed
      if (req.file) {
        try {
          // Try to clean up both temp file and moved file
          const tempPath = req.file.path;
          const userDir = path.join(
            process.cwd(),
            "uploads",
            "users",
            userId || "unknown"
          );
          const movedPath = path.join(userDir, req.file.filename);

          try {
            await fs.unlink(tempPath);
          } catch (e) {
            // Temp file might already be moved
          }

          try {
            await fs.unlink(movedPath);
          } catch (e) {
            // Moved file might not exist yet
          }
        } catch (unlinkError) {
          console.error("Error cleaning up file:", unlinkError);
        }
      }

      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });
};

// List stored files
export const listFiles = async (req, res) => {
  try {
    const {
      userId,
      fileType,
      limit = 50,
      offset = 0,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    // Build where clause
    const where = {};

    // Use current user's ID if not specified and not system access
    const effectiveUserId = userId || (req.user ? req.user.id : null);
    if (effectiveUserId && !req.isSystem) where.userId = effectiveUserId;
    if (fileType) where.fileType = fileType;

    // Exclude expired files
    where[Op.or] = [
      { expiresAt: null },
      { expiresAt: { [Op.gt]: new Date() } },
    ];

    const files = await StoredFile.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]],
      attributes: [
        "id",
        "originalName",
        "fileType",
        "size",
        "mimeType",
        "filePath",
        "description",
        "usageCount",
        "lastUsed",
        "createdAt",
        "expiresAt",
      ],
    });

    res.json({
      success: true,
      files: files.rows,
      pagination: {
        total: files.count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < files.count,
      },
    });
  } catch (error) {
    console.error("Error listing files:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get single file info
export const getFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { userId } = req.query;

    const where = { id: fileId };
    if (userId) where.userId = userId;

    const file = await StoredFile.findOne({
      where,
      include: [
        {
          model: Device,
          as: "device",
          attributes: ["id", "alias", "userId"],
          required: false,
        },
      ],
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        error: "File not found",
      });
    }

    if (file.isExpired()) {
      return res.status(410).json({
        success: false,
        error: "File has expired",
      });
    }

    res.json({
      success: true,
      file: {
        id: file.id,
        originalName: file.originalName,
        fileType: file.fileType,
        size: file.size,
        mimeType: file.mimeType,
        description: file.description,
        usageCount: file.usageCount,
        lastUsed: file.lastUsed,
        createdAt: file.createdAt,
        expiresAt: file.expiresAt,
        device: file.device,
      },
    });
  } catch (error) {
    console.error("Error getting file:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Delete stored file
export const deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { userId } = req.body;

    const where = { id: fileId };
    if (userId) where.userId = userId;

    const file = await StoredFile.findOne({ where });

    if (!file) {
      return res.status(404).json({
        success: false,
        error: "File not found",
      });
    }

    // Delete physical file
    const fullPath = path.join(process.cwd(), file.filePath);
    try {
      await fs.unlink(fullPath);
    } catch (unlinkError) {
      console.warn("File not found on disk, removing database record only");
    }

    // Delete database record
    await file.destroy();

    res.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Update file metadata
export const updateFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { userId, description, expiresIn } = req.body;

    const where = { id: fileId };
    if (userId) where.userId = userId;

    const file = await StoredFile.findOne({ where });

    if (!file) {
      return res.status(404).json({
        success: false,
        error: "File not found",
      });
    }

    // Prepare update data
    const updateData = {};

    if (tags !== undefined) {
      updateData.tags = Array.isArray(tags) ? tags : [tags];
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    if (expiresIn !== undefined) {
      if (expiresIn === null || expiresIn === "") {
        updateData.expiresAt = null;
      } else {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + parseInt(expiresIn));
        updateData.expiresAt = expiresAt;
      }
    }

    await file.update(updateData);

    res.json({
      success: true,
      message: "File updated successfully",
      file: {
        id: file.id,
        tags: file.tags,
        description: file.description,
        expiresAt: file.expiresAt,
      },
    });
  } catch (error) {
    console.error("Error updating file:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Search files by tags
export const searchFiles = async (req, res) => {
  try {
    const { userId, query, tags, fileType, limit = 20 } = req.query;

    const where = {};

    if (userId) where.userId = userId;
    if (fileType) where.fileType = fileType;

    // Text search in name and description
    if (query) {
      where[Op.or] = [
        { originalName: { [Op.iLike]: `%${query}%` } },
        { description: { [Op.iLike]: `%${query}%` } },
      ];
    }

    // Tag search
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : tags.split(",");
      where.tags = {
        [Op.overlap]: tagArray,
      };
    }

    // Exclude expired files
    where[Op.or] = [
      { expiresAt: null },
      { expiresAt: { [Op.gt]: new Date() } },
    ];

    const files = await StoredFile.findAll({
      where,
      limit: parseInt(limit),
      order: [
        ["usageCount", "DESC"],
        ["createdAt", "DESC"],
      ],
      attributes: [
        "id",
        "originalName",
        "fileType",
        "tags",
        "description",
        "usageCount",
        "createdAt",
      ],
    });

    res.json({
      success: true,
      files,
      total: files.length,
    });
  } catch (error) {
    console.error("Error searching files:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Cleanup expired files
export const cleanupExpired = async (req, res) => {
  try {
    const deletedCount = await StoredFile.cleanupExpired();

    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} expired files`,
      deletedCount,
    });
  } catch (error) {
    console.error("Error cleaning up expired files:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// ============================================
// FRONTEND INTEGRATION ENDPOINTS
// ============================================

// Get user's file stats and overview
export const getUserFileStats = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "userId is required",
      });
    }

    // Get file statistics
    const totalFiles = await StoredFile.count({
      where: { userId },
    });

    const filesByType = await StoredFile.findAll({
      where: { userId },
      attributes: [
        "fileType",
        [fn("COUNT", col("id")), "count"],
        [fn("SUM", col("size")), "totalSize"],
        [fn("SUM", col("usageCount")), "totalUsage"],
      ],
      group: ["fileType"],
      raw: true,
    });

    const totalSize = await StoredFile.sum("size", {
      where: { userId },
    });

    const totalUsage = await StoredFile.sum("usageCount", {
      where: { userId },
    });

    // Get recent files
    const recentFiles = await StoredFile.findAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
      limit: 5,
      attributes: [
        "id",
        "originalName",
        "fileType",
        "size",
        "usageCount",
        "createdAt",
      ],
    });

    // Get most used files
    const popularFiles = await StoredFile.findAll({
      where: {
        userId,
        usageCount: { [Op.gt]: 0 },
      },
      order: [["usageCount", "DESC"]],
      limit: 5,
      attributes: ["id", "originalName", "fileType", "usageCount", "lastUsed"],
    });

    res.json({
      success: true,
      stats: {
        totalFiles,
        totalSize: totalSize || 0,
        totalUsage: totalUsage || 0,
        filesByType,
        recentFiles,
        popularFiles,
      },
    });
  } catch (error) {
    console.error("Error getting user file stats:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get files by userId and fileType (for messaging interface)
export const getFilesByUserAndType = async (req, res) => {
  try {
    const { userId, fileType } = req.params;

    if (!userId || !fileType) {
      return res.status(400).json({
        success: false,
        error: "userId and fileType are required",
      });
    }

    // Validate fileType
    const validFileTypes = ["image", "video", "document", "audio"];
    if (!validFileTypes.includes(fileType)) {
      return res.status(400).json({
        success: false,
        error: "Invalid fileType. Must be one of: " + validFileTypes.join(", "),
      });
    }

    const files = await StoredFile.findAll({
      where: {
        userId: userId,
        fileType: fileType,
      },
      order: [["createdAt", "DESC"]],
      limit: 100, // Reasonable limit for modal display
    });

    // Filter out expired files and transform data
    const validFiles = files
      .filter((file) => !file.isExpired())
      .map((file) => ({
        id: file.id,
        originalName: file.originalName,
        fileType: file.fileType,
        size: file.size,
        mimeType: file.mimeType,
        description: file.description,
        createdAt: file.createdAt,
        usageCount: file.usageCount,
      }));

    res.json({
      success: true,
      files: validFiles,
      count: validFiles.length,
    });
  } catch (error) {
    console.error("Error getting files by user and type:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Helper to detect if file is an image based on extension
const isImageByExtension = (filename) => {
  if (!filename) return false;
  const ext = path.extname(filename).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'].includes(ext);
};

// Helper to get correct mime type from extension
const getMimeTypeFromExtension = (filename) => {
  if (!filename) return 'application/octet-stream';
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
    '.pdf': 'application/pdf',
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

// Get file preview/thumbnail URL
export const getFilePreview = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { userId, token } = req.query;

    const where = { id: fileId };
    if (userId) where.userId = userId;

    const file = await StoredFile.findOne({ where });

    if (!file) {
      return res.status(404).json({
        success: false,
        error: "File not found",
      });
    }

    if (file.isExpired()) {
      return res.status(410).json({
        success: false,
        error: "File has expired",
      });
    }

    // Check if file is an image - by fileType OR by file extension (fallback for incorrectly stored files)
    const isImage = file.fileType === "image" || isImageByExtension(file.originalName);
    
    // For images, return the actual file
    if (isImage) {
      // If the file is stored externally (e.g. BunnyCDN), redirect to it
      if (file.filePath.startsWith("http")) {
        return res.redirect(file.filePath);
      }

      const filePath = path.join(process.cwd(), file.filePath);

      // Check if file exists
      try {
        await fs.access(filePath);
        
        // Determine correct mime type - use stored if valid, otherwise derive from extension
        let contentType = file.mimeType;
        if (!contentType || contentType === 'text/plain' || contentType === 'application/octet-stream') {
          contentType = getMimeTypeFromExtension(file.originalName);
        }
        
        // Set CORS headers to allow cross-origin requests
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "public, max-age=86400"); // 24 hours cache
        
        res.sendFile(filePath);
      } catch (error) {
        res.status(404).json({
          success: false,
          error: "Physical file not found",
        });
      }
    } else {
      // For non-images, return file info with icon
      res.json({
        success: true,
        file: {
          id: file.id,
          originalName: file.originalName,
          fileType: file.fileType,
          mimeType: file.mimeType,
          size: file.size,
          icon: getFileIcon(file.fileType, file.mimeType),
        },
      });
    }
  } catch (error) {
    console.error("Error getting file preview:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Bulk operations for files
export const bulkDeleteFiles = async (req, res) => {
  try {
    const { userId, fileIds } = req.body;

    if (!userId || !fileIds || !Array.isArray(fileIds)) {
      return res.status(400).json({
        success: false,
        error: "userId and fileIds array are required",
      });
    }

    const files = await StoredFile.findAll({
      where: {
        id: { [Op.in]: fileIds },
        userId: userId,
      },
    });

    let deletedCount = 0;
    const errors = [];

    for (const file of files) {
      try {
        // Delete physical file
        const fullPath = path.join(process.cwd(), file.filePath);
        try {
          await fs.unlink(fullPath);
        } catch (unlinkError) {
          console.warn(`Physical file not found: ${file.filePath}`);
        }

        // Delete database record
        await file.destroy();
        deletedCount++;
      } catch (error) {
        errors.push({
          fileId: file.id,
          fileName: file.originalName,
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      message: `Successfully deleted ${deletedCount} files`,
      deletedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error in bulk delete:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Helper function to get file icon based on type
function getFileIcon(fileType, mimeType) {
  const icons = {
    image: "🖼️",
    video: "🎥",
    document: "📄",
    audio: "🎵",
  };

  // Specific MIME type icons
  const mimeIcons = {
    "application/pdf": "📕",
    "application/msword": "📘",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "📘",
    "application/vnd.ms-excel": "📗",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "📗",
    "application/vnd.ms-powerpoint": "📙",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      "📙",
    "text/plain": "📝",
  };

  return mimeIcons[mimeType] || icons[fileType] || "📁";
}
