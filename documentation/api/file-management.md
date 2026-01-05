# File Management API

Complete guide for uploading, storing, organizing, and managing files for WhatsApp media messaging.

## 📋 Overview

The File Management API provides comprehensive file handling capabilities for WhatsApp media messages. It supports multiple file types, automatic organization, metadata management, and integration with the messaging system.

### Supported File Types

- **Images**: JPG, JPEG, PNG, GIF, WEBP
- **Videos**: MP4, AVI, MOV, MKV, WEBM
- **Documents**: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT
- **Audio**: MP3, WAV, OGG, AAC, M4A

### Key Features

- **File Upload**: Multiple upload methods and formats
- **Automatic Organization**: Files organized by user and type
- **Metadata Extraction**: Automatic file information extraction
- **Expiration Management**: Configurable file retention
- **File Library**: Browse and search uploaded files
- **Direct Integration**: Seamless integration with messaging API

## 🔧 Base Configuration

```javascript
// File service setup
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

class FileService {
  constructor(apiToken, baseURL, userId) {
    this.client = axios.create({
      baseURL,
      headers: {
        "X-API-TOKEN": apiToken,
      },
    });
    this.userId = userId;
  }

  // Helper to create form data for file uploads
  createFormData(filePath, additionalFields = {}) {
    const form = new FormData();
    form.append("file", fs.createReadStream(filePath));
    form.append("userId", this.userId);

    for (const [key, value] of Object.entries(additionalFields)) {
      form.append(key, value);
    }

    return form;
  }
}

// Usage
const fileService = new FileService(
  process.env.WHATSAPP_API_TOKEN,
  process.env.WHATSAPP_API_BASE_URL,
  req.user.id
);
```

---

## 📤 File Upload

### Upload Single File

**Endpoint:** `POST /api/whatsapp/files/upload`

**Description:** Uploads a single file to the user's library.

```javascript
// Upload file from local path
async function uploadFile(filePath, description = "", tags = []) {
  const form = fileService.createFormData(filePath, {
    description: description,
    tags: JSON.stringify(tags),
  });

  const response = await fileService.client.post("/files/upload", form, {
    headers: form.getHeaders(),
  });

  return response.data;
}

// Usage examples
const imageResult = await uploadFile(
  "./images/product.jpg",
  "New product image",
  ["product", "marketing"]
);
const documentResult = await uploadFile(
  "./docs/catalog.pdf",
  "Product catalog 2025"
);

console.log("File uploaded:", imageResult.data.fileId);
```

**Response:**

```json
{
  "success": true,
  "data": {
    "fileId": "file_1234567890abcdef",
    "userId": "user123",
    "originalName": "product.jpg",
    "filename": "1750355370501_2373a09c-7bfb-4f3d-927f-7745580fa195.jpg",
    "fileType": "image",
    "mimeType": "image/jpeg",
    "fileSize": 245760,
    "filePath": "uploads/users/user123/1750355370501_2373a09c-7bfb-4f3d-927f-7745580fa195.jpg",
    "description": "New product image",
    "tags": ["product", "marketing"],
    "uploadedAt": "2025-06-19T12:00:00.000Z",
    "expiresAt": "2025-07-19T12:00:00.000Z"
  },
  "message": "File uploaded successfully"
}
```

### Upload from Buffer/Stream

```javascript
// Upload from buffer
async function uploadFromBuffer(buffer, filename, mimeType, description = "") {
  const form = new FormData();
  form.append("file", buffer, { filename, contentType: mimeType });
  form.append("userId", fileService.userId);
  form.append("description", description);

  const response = await fileService.client.post("/files/upload", form, {
    headers: form.getHeaders(),
  });

  return response.data;
}

// Upload from URL
async function uploadFromUrl(fileUrl, description = "") {
  const fileResponse = await axios.get(fileUrl, { responseType: "stream" });
  const filename = fileUrl.split("/").pop() || "downloaded_file";
  const mimeType = fileResponse.headers["content-type"];

  const form = new FormData();
  form.append("file", fileResponse.data, { filename, contentType: mimeType });
  form.append("userId", fileService.userId);
  form.append("description", description);

  const response = await fileService.client.post("/files/upload", form, {
    headers: form.getHeaders(),
  });

  return response.data;
}

// Usage
const urlResult = await uploadFromUrl(
  "https://example.com/image.jpg",
  "Downloaded product image"
);
```

### Bulk Upload

**Endpoint:** `POST /api/whatsapp/files/upload/bulk`

**Description:** Uploads multiple files in a single request.

```javascript
// Upload multiple files
async function uploadMultipleFiles(filePaths, commonTags = []) {
  const form = new FormData();
  form.append("userId", fileService.userId);
  form.append("tags", JSON.stringify(commonTags));

  // Add multiple files
  filePaths.forEach((filePath, index) => {
    form.append(`files`, fs.createReadStream(filePath));
  });

  const response = await fileService.client.post("/files/upload/bulk", form, {
    headers: form.getHeaders(),
  });

  return response.data;
}

// Usage
const bulkResult = await uploadMultipleFiles(
  ["./images/product1.jpg", "./images/product2.jpg", "./images/product3.jpg"],
  ["products", "gallery"]
);

console.log(`Uploaded ${bulkResult.data.length} files`);
```

---

## 📁 File Retrieval

### Get User Files by Type

**Endpoint:** `GET /api/whatsapp/files/users/{userId}/{fileType}`

**Description:** Retrieves files filtered by type with pagination and search.

```javascript
// Get files by type
async function getFilesByType(fileType, options = {}) {
  const {
    limit = 50,
    offset = 0,
    search = "",
    tags = [],
    sortBy = "uploadedAt",
    sortOrder = "desc",
  } = options;

  const params = {
    limit,
    offset,
    sortBy,
    sortOrder,
  };

  if (search) params.search = search;
  if (tags.length > 0) params.tags = tags.join(",");

  const response = await fileService.client.get(
    `/files/users/${fileService.userId}/${fileType}`,
    { params }
  );

  return response.data;
}

// Usage examples
const images = await getFilesByType("image", { limit: 20 });
const documents = await getFilesByType("document", {
  search: "catalog",
  tags: ["marketing"],
  sortBy: "fileSize",
});
const videos = await getFilesByType("video");
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "fileId": "file_1234567890abcdef",
      "originalName": "product.jpg",
      "filename": "1750355370501_2373a09c-7bfb-4f3d-927f-7745580fa195.jpg",
      "fileType": "image",
      "mimeType": "image/jpeg",
      "fileSize": 245760,
      "description": "New product image",
      "tags": ["product", "marketing"],
      "uploadedAt": "2025-06-19T12:00:00.000Z",
      "expiresAt": "2025-07-19T12:00:00.000Z",
      "downloadUrl": "/api/whatsapp/files/file_1234567890abcdef/download",
      "thumbnailUrl": "/api/whatsapp/files/file_1234567890abcdef/thumbnail"
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

### Get File Details

**Endpoint:** `GET /api/whatsapp/files/{fileId}`

**Description:** Retrieves detailed information about a specific file.

```javascript
// Get file details
async function getFileDetails(fileId) {
  const response = await fileService.client.get(`/files/${fileId}`);
  return response.data;
}

// Usage
const fileInfo = await getFileDetails("file_1234567890abcdef");
console.log("File type:", fileInfo.data.fileType);
console.log("File size:", fileInfo.data.fileSize);
```

### Search Files

```javascript
// Advanced file search
async function searchFiles(query, options = {}) {
  const {
    fileTypes = ["image", "video", "document", "audio"],
    tags = [],
    dateFrom = null,
    dateTo = null,
    minSize = null,
    maxSize = null,
    limit = 50,
  } = options;

  const params = {
    search: query,
    fileTypes: fileTypes.join(","),
    limit,
  };

  if (tags.length > 0) params.tags = tags.join(",");
  if (dateFrom) params.dateFrom = dateFrom;
  if (dateTo) params.dateTo = dateTo;
  if (minSize) params.minSize = minSize;
  if (maxSize) params.maxSize = maxSize;

  const response = await fileService.client.get(
    `/files/users/${fileService.userId}/search`,
    { params }
  );
  return response.data;
}

// Usage
const searchResults = await searchFiles("product", {
  fileTypes: ["image", "video"],
  tags: ["marketing"],
  dateFrom: "2025-06-01",
  maxSize: 5000000, // 5MB
});
```

---

## 📥 File Download & Access

### Download File

**Endpoint:** `GET /api/whatsapp/files/{fileId}/download`

**Description:** Downloads the original file.

```javascript
// Download file
async function downloadFile(fileId, savePath = null) {
  const response = await fileService.client.get(`/files/${fileId}/download`, {
    responseType: "stream",
  });

  if (savePath) {
    const writer = fs.createWriteStream(savePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", () => resolve(savePath));
      writer.on("error", reject);
    });
  }

  return response.data; // Return stream
}

// Usage
await downloadFile("file_1234567890abcdef", "./downloads/product.jpg");
```

### Get File URL

```javascript
// Get temporary download URL
async function getFileUrl(fileId, expiresIn = 3600) {
  const response = await fileService.client.get(`/files/${fileId}/url`, {
    params: { expiresIn },
  });

  return response.data;
}

// Usage
const urlData = await getFileUrl("file_1234567890abcdef", 7200); // 2 hours
console.log("Download URL:", urlData.data.url);
console.log("Expires at:", urlData.data.expiresAt);
```

### Get Thumbnail (Images/Videos)

**Endpoint:** `GET /api/whatsapp/files/{fileId}/thumbnail`

**Description:** Gets a thumbnail for image and video files.

```javascript
// Get thumbnail
async function getThumbnail(fileId, size = "medium") {
  const response = await fileService.client.get(`/files/${fileId}/thumbnail`, {
    params: { size },
    responseType: "stream",
  });

  return response.data;
}

// Usage
const thumbnailStream = await getThumbnail("file_1234567890abcdef", "small");
```

---

## 🏷️ File Organization

### Update File Metadata

**Endpoint:** `PUT /api/whatsapp/files/{fileId}`

**Description:** Updates file description, tags, and other metadata.

```javascript
// Update file metadata
async function updateFileMetadata(fileId, updates) {
  const response = await fileService.client.put(`/files/${fileId}`, updates);
  return response.data;
}

// Usage examples
await updateFileMetadata("file_1234567890abcdef", {
  description: "Updated product image - Summer 2025 collection",
  tags: ["product", "summer", "2025", "collection"],
});

await updateFileMetadata("file_1234567890abcdef", {
  customMetadata: {
    category: "marketing",
    campaign: "summer-launch",
    photographer: "John Doe",
  },
});
```

### Organize Files with Tags

```javascript
// Tag management helper
class FileTagManager {
  constructor(fileService) {
    this.fileService = fileService;
  }

  async addTags(fileId, newTags) {
    const file = await this.fileService.getFileDetails(fileId);
    const currentTags = file.data.tags || [];
    const updatedTags = [...new Set([...currentTags, ...newTags])];

    return await this.fileService.updateFileMetadata(fileId, {
      tags: updatedTags,
    });
  }

  async removeTags(fileId, tagsToRemove) {
    const file = await this.fileService.getFileDetails(fileId);
    const currentTags = file.data.tags || [];
    const updatedTags = currentTags.filter(
      (tag) => !tagsToRemove.includes(tag)
    );

    return await this.fileService.updateFileMetadata(fileId, {
      tags: updatedTags,
    });
  }

  async getFilesByTag(tag) {
    const allTypes = ["image", "video", "document", "audio"];
    const results = [];

    for (const type of allTypes) {
      const files = await this.fileService.getFilesByType(type, {
        tags: [tag],
      });
      results.push(...files.data);
    }

    return results;
  }

  async getAllTags() {
    const response = await this.fileService.client.get(
      `/files/users/${this.fileService.userId}/tags`
    );
    return response.data;
  }
}

// Usage
const tagManager = new FileTagManager(fileService);
await tagManager.addTags("file_123", ["urgent", "client-presentation"]);
await tagManager.removeTags("file_123", ["draft"]);

const presentationFiles = await tagManager.getFilesByTag("client-presentation");
const allTags = await tagManager.getAllTags();
```

### Create File Collections

```javascript
// File collection manager
class FileCollectionManager {
  constructor(fileService) {
    this.fileService = fileService;
    this.collections = new Map();
  }

  createCollection(name, description = "") {
    const collection = {
      id: `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      files: [],
      createdAt: new Date().toISOString(),
    };

    this.collections.set(collection.id, collection);
    return collection;
  }

  addFileToCollection(collectionId, fileId) {
    const collection = this.collections.get(collectionId);
    if (!collection) {
      throw new Error("Collection not found");
    }

    if (!collection.files.includes(fileId)) {
      collection.files.push(fileId);
    }

    return collection;
  }

  removeFileFromCollection(collectionId, fileId) {
    const collection = this.collections.get(collectionId);
    if (!collection) {
      throw new Error("Collection not found");
    }

    collection.files = collection.files.filter((id) => id !== fileId);
    return collection;
  }

  async getCollectionFiles(collectionId) {
    const collection = this.collections.get(collectionId);
    if (!collection) {
      throw new Error("Collection not found");
    }

    const files = [];
    for (const fileId of collection.files) {
      try {
        const fileData = await this.fileService.getFileDetails(fileId);
        files.push(fileData.data);
      } catch (error) {
        console.warn(`File ${fileId} not found, removing from collection`);
        this.removeFileFromCollection(collectionId, fileId);
      }
    }

    return files;
  }

  async sendCollection(collectionId, deviceAlias, phoneNumber, caption = "") {
    const files = await this.getCollectionFiles(collectionId);
    const messageService = this.fileService.messageService; // Assuming integration

    const results = [];
    for (const file of files) {
      try {
        let result;
        switch (file.fileType) {
          case "image":
            result = await messageService.sendImage(
              deviceAlias,
              phoneNumber,
              file.fileId,
              caption
            );
            break;
          case "video":
            result = await messageService.sendVideo(
              deviceAlias,
              phoneNumber,
              file.fileId,
              caption
            );
            break;
          case "document":
            result = await messageService.sendDocument(
              deviceAlias,
              phoneNumber,
              file.fileId
            );
            break;
        }
        results.push(result);
      } catch (error) {
        console.error(`Failed to send file ${file.fileId}:`, error);
      }
    }

    return results;
  }
}

// Usage
const collectionManager = new FileCollectionManager(fileService);
const productGallery = collectionManager.createCollection(
  "Product Gallery",
  "Main product images"
);

collectionManager.addFileToCollection(productGallery.id, "file_img1");
collectionManager.addFileToCollection(productGallery.id, "file_img2");
collectionManager.addFileToCollection(productGallery.id, "file_img3");

const galleryFiles = await collectionManager.getCollectionFiles(
  productGallery.id
);
```

---

## 🗑️ File Management

### Delete File

**Endpoint:** `DELETE /api/whatsapp/files/{fileId}`

**Description:** Permanently deletes a file and its metadata.

```javascript
// Delete file
async function deleteFile(fileId) {
  const response = await fileService.client.delete(`/files/${fileId}`);
  return response.data;
}

// Safe delete with confirmation
async function safeDeleteFile(fileId) {
  try {
    // Get file info first
    const fileInfo = await getFileDetails(fileId);
    console.log(
      `Deleting file: ${fileInfo.data.originalName} (${fileInfo.data.fileSize} bytes)`
    );

    // Delete file
    const result = await deleteFile(fileId);
    console.log("File deleted successfully");

    return result;
  } catch (error) {
    console.error(
      "File deletion failed:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// Usage
await safeDeleteFile("file_1234567890abcdef");
```

### Bulk Delete

```javascript
// Delete multiple files
async function deleteMultipleFiles(fileIds) {
  const results = [];

  for (const fileId of fileIds) {
    try {
      const result = await deleteFile(fileId);
      results.push({ fileId, success: true, result });
    } catch (error) {
      results.push({
        fileId,
        success: false,
        error: error.response?.data?.error || error.message,
      });
    }
  }

  return results;
}

// Delete files by criteria
async function deleteFilesByCriteria(criteria) {
  const { fileType, tags, olderThan, smallerThan, largerThan } = criteria;

  // Get files matching criteria
  const files = await searchFiles("", {
    fileTypes: fileType ? [fileType] : undefined,
    tags: tags || [],
    dateTo: olderThan || null,
    maxSize: smallerThan || null,
    minSize: largerThan || null,
    limit: 1000,
  });

  const fileIds = files.data.map((f) => f.fileId);
  return await deleteMultipleFiles(fileIds);
}

// Usage
const oldFiles = await deleteFilesByCriteria({
  olderThan: "2025-01-01",
  smallerThan: 1000, // Less than 1KB
});
```

### File Expiration Management

```javascript
// Extend file expiration
async function extendFileExpiration(fileId, daysToAdd = 30) {
  const response = await fileService.client.put(`/files/${fileId}/extend`, {
    days: daysToAdd,
  });

  return response.data;
}

// Get expiring files
async function getExpiringFiles(daysAhead = 7) {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + daysAhead);

  const response = await fileService.client.get(
    `/files/users/${fileService.userId}/expiring`,
    {
      params: { before: expirationDate.toISOString() },
    }
  );

  return response.data;
}

// Auto-extend important files
async function autoExtendImportantFiles() {
  const expiringFiles = await getExpiringFiles(7);
  const results = [];

  for (const file of expiringFiles.data) {
    // Check if file has 'important' tag or is frequently used
    if (file.tags?.includes("important") || file.downloadCount > 10) {
      try {
        await extendFileExpiration(file.fileId, 30);
        results.push({ fileId: file.fileId, extended: true });
      } catch (error) {
        results.push({
          fileId: file.fileId,
          extended: false,
          error: error.message,
        });
      }
    }
  }

  return results;
}

// Usage
const expiringFiles = await getExpiringFiles(3);
console.log(`${expiringFiles.data.length} files expiring in 3 days`);

await extendFileExpiration("file_important_123", 60); // Extend by 60 days
const autoExtendResults = await autoExtendImportantFiles();
```

---

## 📊 File Analytics & Statistics

### Get File Statistics

**Endpoint:** `GET /api/whatsapp/files/users/{userId}/stats`

**Description:** Retrieves comprehensive file usage statistics.

```javascript
// Get file statistics
async function getFileStats() {
  const response = await fileService.client.get(
    `/files/users/${fileService.userId}/stats`
  );
  return response.data;
}

// Usage
const stats = await getFileStats();
console.log("Total files:", stats.data.totalFiles);
console.log("Storage used:", stats.data.totalSize);
```

**Response:**

```json
{
  "success": true,
  "data": {
    "totalFiles": 150,
    "totalSize": 52428800,
    "byType": {
      "image": { "count": 85, "size": 35651584 },
      "video": { "count": 25, "size": 15728640 },
      "document": { "count": 35, "size": 1048576 },
      "audio": { "count": 5, "size": 0 }
    },
    "recentUploads": {
      "today": 5,
      "thisWeek": 23,
      "thisMonth": 67
    },
    "topTags": [
      { "tag": "product", "count": 45 },
      { "tag": "marketing", "count": 32 },
      { "tag": "support", "count": 18 }
    ],
    "storageQuota": {
      "used": 52428800,
      "limit": 1073741824,
      "percentage": 4.9
    }
  }
}
```

### File Usage Analytics

```javascript
// Advanced analytics helper
class FileAnalytics {
  constructor(fileService) {
    this.fileService = fileService;
  }

  async getUsageReport(dateFrom, dateTo) {
    const response = await this.fileService.client.get(
      `/files/users/${this.fileService.userId}/analytics`,
      {
        params: { dateFrom, dateTo },
      }
    );

    return response.data;
  }

  async getMostUsedFiles(limit = 10) {
    const response = await this.fileService.client.get(
      `/files/users/${this.fileService.userId}/most-used`,
      { params: { limit } }
    );

    return response.data;
  }

  async getStorageTrends(days = 30) {
    const trends = [];
    const endDate = new Date();

    for (let i = days; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);

      const stats = await this.getUsageReport(
        date.toISOString().split("T")[0],
        date.toISOString().split("T")[0]
      );

      trends.push({
        date: date.toISOString().split("T")[0],
        totalFiles: stats.data.totalFiles,
        totalSize: stats.data.totalSize,
      });
    }

    return trends;
  }

  async generateReport() {
    const stats = await this.fileService.getFileStats();
    const mostUsed = await this.getMostUsedFiles(5);
    const trends = await this.getStorageTrends(7);

    return {
      summary: stats.data,
      mostUsedFiles: mostUsed.data,
      weeklyTrends: trends,
      recommendations: this.generateRecommendations(stats.data),
    };
  }

  generateRecommendations(stats) {
    const recommendations = [];

    // Storage recommendations
    if (stats.storageQuota.percentage > 80) {
      recommendations.push({
        type: "storage",
        priority: "high",
        message:
          "Storage is nearly full. Consider deleting old or unused files.",
      });
    }

    // File organization recommendations
    const untaggedFiles =
      stats.totalFiles - stats.topTags.reduce((sum, tag) => sum + tag.count, 0);
    if (untaggedFiles > stats.totalFiles * 0.3) {
      recommendations.push({
        type: "organization",
        priority: "medium",
        message:
          "Many files are untagged. Consider adding tags for better organization.",
      });
    }

    // Performance recommendations
    if (stats.byType.video.count > 50) {
      recommendations.push({
        type: "performance",
        priority: "low",
        message:
          "Consider compressing large video files to save storage space.",
      });
    }

    return recommendations;
  }
}

// Usage
const analytics = new FileAnalytics(fileService);
const report = await analytics.generateReport();
console.log("File management report:", report);
```

---

## 🔧 Advanced Features

### File Compression

```javascript
// File compression helper (requires additional packages)
const sharp = require("sharp"); // For images
const ffmpeg = require("fluent-ffmpeg"); // For videos

class FileCompressor {
  constructor(fileService) {
    this.fileService = fileService;
  }

  async compressImage(fileId, quality = 80) {
    // Download original
    const originalStream = await this.fileService.downloadFile(fileId);

    // Compress using sharp
    const compressedBuffer = await sharp(originalStream)
      .jpeg({ quality })
      .toBuffer();

    // Upload compressed version
    const result = await this.fileService.uploadFromBuffer(
      compressedBuffer,
      "compressed_image.jpg",
      "image/jpeg",
      "Compressed version"
    );

    return result;
  }

  async compressVideo(fileId, targetSize = "720x480") {
    return new Promise(async (resolve, reject) => {
      const originalPath = await this.fileService.downloadFile(
        fileId,
        "./temp_video"
      );
      const outputPath = "./temp_compressed_video.mp4";

      ffmpeg(originalPath)
        .size(targetSize)
        .videoBitrate("1000k")
        .audioBitrate("128k")
        .output(outputPath)
        .on("end", async () => {
          try {
            const result = await this.fileService.uploadFile(
              outputPath,
              "Compressed video"
            );

            // Cleanup temp files
            fs.unlinkSync(originalPath);
            fs.unlinkSync(outputPath);

            resolve(result);
          } catch (error) {
            reject(error);
          }
        })
        .on("error", reject)
        .run();
    });
  }
}
```

### File Validation

```javascript
// File validation helper
class FileValidator {
  constructor() {
    this.allowedTypes = {
      image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
      video: ["video/mp4", "video/avi", "video/mov", "video/mkv"],
      document: ["application/pdf", "application/msword", "text/plain"],
      audio: ["audio/mpeg", "audio/wav", "audio/ogg"],
    };

    this.maxSizes = {
      image: 10 * 1024 * 1024, // 10MB
      video: 100 * 1024 * 1024, // 100MB
      document: 50 * 1024 * 1024, // 50MB
      audio: 25 * 1024 * 1024, // 25MB
    };
  }

  validateFile(file, expectedType = null) {
    const errors = [];

    // Check file type
    if (
      expectedType &&
      !this.allowedTypes[expectedType].includes(file.mimeType)
    ) {
      errors.push(
        `Invalid file type. Expected ${expectedType}, got ${file.mimeType}`
      );
    }

    // Check file size
    const fileType = this.getFileTypeFromMime(file.mimeType);
    if (fileType && file.fileSize > this.maxSizes[fileType]) {
      errors.push(
        `File too large. Maximum size for ${fileType}: ${this.formatFileSize(
          this.maxSizes[fileType]
        )}`
      );
    }

    // Check filename
    if (!file.originalName || file.originalName.length > 255) {
      errors.push("Invalid filename");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  getFileTypeFromMime(mimeType) {
    for (const [type, mimes] of Object.entries(this.allowedTypes)) {
      if (mimes.includes(mimeType)) {
        return type;
      }
    }
    return null;
  }

  formatFileSize(bytes) {
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  }
}

// Usage
const validator = new FileValidator();
const validation = validator.validateFile(
  {
    originalName: "large_image.jpg",
    mimeType: "image/jpeg",
    fileSize: 15 * 1024 * 1024, // 15MB
  },
  "image"
);

if (!validation.isValid) {
  console.error("Validation errors:", validation.errors);
}
```

---

## 🚨 Error Handling & Best Practices

### File Operation Error Handling

```javascript
class FileErrorHandler {
  static handleFileError(error) {
    if (!error.response) {
      return {
        code: "NETWORK_ERROR",
        message: "Unable to connect to file service",
        action: "retry_later",
      };
    }

    const { status, data } = error.response;

    switch (status) {
      case 400:
        return {
          code: "INVALID_FILE_DATA",
          message: data.error || "Invalid file or parameters",
          action: "check_file_and_parameters",
        };

      case 404:
        return {
          code: "FILE_NOT_FOUND",
          message: "File does not exist",
          action: "verify_file_id",
        };

      case 413:
        return {
          code: "FILE_TOO_LARGE",
          message: "File exceeds maximum size limit",
          action: "compress_or_split_file",
        };

      case 415:
        return {
          code: "UNSUPPORTED_FILE_TYPE",
          message: "File type not supported",
          action: "convert_to_supported_format",
        };

      case 507:
        return {
          code: "STORAGE_FULL",
          message: "Storage quota exceeded",
          action: "delete_old_files_or_upgrade",
        };

      default:
        return {
          code: "FILE_API_ERROR",
          message: data.error || "Unknown file service error",
          action: "contact_support",
        };
    }
  }

  static async retryFileOperation(operation, maxRetries = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const errorInfo = this.handleFileError(error);

        // Don't retry certain errors
        if (
          [
            "INVALID_FILE_DATA",
            "FILE_TOO_LARGE",
            "UNSUPPORTED_FILE_TYPE",
          ].includes(errorInfo.code)
        ) {
          throw error;
        }

        if (attempt === maxRetries) {
          break;
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(
          `File operation attempt ${attempt} failed, retrying in ${delay}ms:`,
          errorInfo.message
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}

// Usage
try {
  const result = await FileErrorHandler.retryFileOperation(() =>
    fileService.uploadFile("./large-file.mp4")
  );
  console.log("File uploaded:", result.data.fileId);
} catch (error) {
  const errorInfo = FileErrorHandler.handleFileError(error);
  console.error("File operation failed:", errorInfo);
}
```

---

This file management documentation provides comprehensive coverage of all file-related operations. Use these patterns and examples to integrate file management functionality into your Node.js applications effectively.
