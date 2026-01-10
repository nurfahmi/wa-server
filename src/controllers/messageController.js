import { Message, Device, StoredFile, sequelize } from "../models/index.js";
import WhatsAppService from "../services/WhatsAppService.js";
import { Op } from "sequelize";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import config from "../config/config.js";
import BunnyStorageService from "../services/storage/BunnyStorageService.js";

// Configure multer for file uploads
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for videos and documents
  },
  fileFilter: (req, file, cb) => {
    if (req.path.includes("/send/video")) {
      const allowedTypes = ["video/mp4", "video/3gpp", "video/quicktime"];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(
          new Error(
            "Invalid file type. Only MP4, 3GP, and MOV videos are allowed."
          )
        );
      }
    } else if (req.path.includes("/send/document")) {
      // Allow most common document types
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "text/plain",
      ];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(
          new Error(
            "Invalid file type. Only PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, and TXT files are allowed."
          )
        );
      }
    } else if (req.path.includes("/send/image")) {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(
          new Error(
            "Invalid file type. Only JPEG, PNG and WebP images are allowed."
          )
        );
      }
    } else {
      cb(new Error("Invalid upload type"));
    }
  },
}).single("file");

export const sendMessage = async (req, res) => {
  try {
    const { sessionId, recipient, message, agentId, agentName, imageUrl } = req.body;

    if (!sessionId || !recipient || (!message && !imageUrl)) {
      return res
        .status(400)
        .json({ error: "SessionId, recipient and either message or imageUrl are required" });
    }

    // Get device by sessionId
    const device = await Device.findOne({ where: { sessionId } });
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    // Check if device is connected
    if (!WhatsAppService.isSessionActive(sessionId)) {
      return res
        .status(400)
        .json({ error: "Device is not connected to WhatsApp" });
    }

    let savedMessage = null;
    let result = null;

    // Save message to database (only if SAVE_MESSAGES=true)
    if (config.database.saveMessages) {
      savedMessage = await Message.create({
        userId: device.userId,
        deviceId: device.id,
        sessionId: sessionId,
        phoneNumber: recipient,
        messageType: imageUrl ? "image" : "text",
        content: imageUrl ? { text: message, imageUrl } : { text: message },
        type: "outgoing",
        timestamp: new Date(),
        status: "pending",
      });
    }

    try {
      if (imageUrl) {
        // Fetch image from URL
        console.log(`[SEND-MESSAGE] Fetching image from URL: ${imageUrl}`);
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'binary');
        const contentType = response.headers['content-type'] || 'image/jpeg';
        
        // Send image message with caption
        result = await WhatsAppService.sendImage(
          sessionId,
          recipient,
          buffer,
          message || "", // caption
          contentType,
          false, // viewOnce
          { agentId, agentName }
        );
      } else {
        // Send regular text message
        result = await WhatsAppService.sendMessage(
          sessionId,
          recipient,
          message,
          agentId, 
          agentName
        );
      }

      // Update message status to sent if saved
      if (savedMessage && result) {
        await savedMessage.update({
          status: "sent",
          sentAt: new Date(),
          whatsappMessageId: result.messageId || result.key?.id || null,
        });
      }

      res.json({
        success: true,
        message: imageUrl ? "Image sent successfully" : "Message sent successfully",
        messageId: savedMessage?.id,
        whatsappMessageId: result?.messageId || result?.key?.id,
      });
    } catch (sendError) {
      console.error("[SEND-MESSAGE] Error:", sendError);
      // Update message status to failed if saved
      if (savedMessage) {
        await savedMessage.update({
          status: "failed",
          errorMessage: sendError.message,
        });
      }
      throw sendError;
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Send image message (direct upload)
export const sendImage = async (req, res) => {
  try {
    const { sessionId, recipient, caption = "", agentId, agentName } = req.body;
    const file = req.file;

    if (!sessionId || !recipient || !file) {
      return res.status(400).json({
        success: false,
        error: "SessionId, recipient, and image file are required",
      });
    }

    // Get device by sessionId
    const device = await Device.findOne({ where: { sessionId } });
    if (!device) {
      return res.status(404).json({
        success: false,
        error: "Device not found",
      });
    }

    // Check if device is connected
    if (!WhatsAppService.isSessionActive(sessionId)) {
      return res.status(400).json({
        success: false,
        error: "Device is not connected to WhatsApp",
      });
    }

    // 1. Upload to Bunny.net
    const filename = `img-sent-${device.sessionId}-${Date.now()}-${uuidv4().substring(0,8)}.jpg`;
    const storagePath = `${device.userId}/${device.sessionId}/images`;
    const mediaUrl = await BunnyStorageService.uploadFile(file.buffer, filename, storagePath);

    // 2. Create StoredFile record
    const storedFile = await StoredFile.create({
        userId: device.userId,
        deviceId: device.id,
        originalName: file.originalname || "outgoing-image.jpg",
        storedName: filename,
        mimeType: file.mimetype,
        fileType: "image",
        size: file.size,
        filePath: mediaUrl,
        isPublic: true,
        tags: ["whatsapp", "outgoing", device.sessionId]
    });

    // 3. Send via WhatsApp Service
    // Pass mediaUrl in options/extra so MessageHandler can skip re-upload logic if needed, 
    // or simply just send the buffer.
    const result = await WhatsAppService.sendImage(
        sessionId,
        recipient,
        file.buffer,
        caption,
        file.mimetype,
        false, // viewOnce
        { agentId, agentName, mediaUrl } // Pass metadata
    );

    res.json({
      success: true,
      message: "Image sent successfully",
      messageId: result?.messageId,
      mediaUrl: mediaUrl,
      fileId: storedFile.id
    });

  } catch (error) {
    console.error("Error sending image:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { limit = 50, before } = req.query;

    // Get device and validate
    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    const messages = await Message.findAll({
      where: {
        deviceId,
        ...(before && { createdAt: { [Op.lt]: new Date(before) } }),
      },
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
    });

    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all messages with pagination
export const getAllMessages = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const messages = await Message.findAndCountAll({
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      messages: messages.rows,
      pagination: {
        total: messages.count,
        page: parseInt(page),
        totalPages: Math.ceil(messages.count / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching all messages:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get messages by userId with pagination
export const getUserMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const messages = await Message.findAndCountAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      messages: messages.rows,
      pagination: {
        total: messages.count,
        page: parseInt(page),
        totalPages: Math.ceil(messages.count / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching user messages:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Send message using device API key
export const sendMessageByApiKey = async (req, res) => {
  try {
    // Device is already attached to req by deviceAuth middleware
    if (!req.device) {
      return res.status(401).json({
        error: "Device API key is required",
      });
    }

    const { recipient, message, type = "text" } = req.body;

    if (!recipient || (!message && type === "text")) {
      return res.status(400).json({
        error: "Recipient and message are required for text messages",
      });
    }

    // Check if device is connected
    if (!WhatsAppService.isSessionActive(req.device.sessionId)) {
      return res.status(400).json({
        error: "Device is not connected to WhatsApp",
      });
    }

    let result;
    if (type === "text") {
      // Send text message
      await WhatsAppService.sendMessage(
        req.device.sessionId,
        recipient,
        message
      );
      result = { type: "text", status: "sent" };
    } else if (type === "image") {
      // Handle image message
      if (!req.file) {
        return res.status(400).json({
          error: "Image file is required for image messages",
        });
      }

      await WhatsAppService.sendImage(
        req.device.sessionId,
        recipient,
        req.file.buffer,
        message, // message becomes the caption for image
        req.file.mimetype
      );
      result = { type: "image", status: "sent" };
    } else {
      return res.status(400).json({
        error: "Unsupported message type",
      });
    }

    res.json({
      success: true,
      message: "Message sent successfully",
      device: {
        id: req.device.id,
        alias: req.device.alias,
      },
      result,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Send video message (only stored files)
export const sendVideo = async (req, res) => {
  try {
    const { sessionId, recipient, fileId, caption = "" } = req.body;

    if (!sessionId || !recipient || !fileId) {
      return res.status(400).json({
        success: false,
        error: "SessionId, recipient, and fileId are required",
      });
    }

    // Get device by sessionId
    const device = await Device.findOne({ where: { sessionId } });
    if (!device) {
      return res.status(404).json({
        success: false,
        error: "Device not found",
      });
    }

    // Check if device is connected
    if (!WhatsAppService.isSessionActive(sessionId)) {
      return res.status(400).json({
        success: false,
        error: "Device is not connected to WhatsApp",
      });
    }

    // Get stored file
    const storedFile = await StoredFile.findOne({
      where: {
        id: fileId,
        userId: device.userId,
        fileType: "video",
      },
    });

    if (!storedFile) {
      return res.status(404).json({
        success: false,
        error: "Video file not found or access denied",
      });
    }

    if (storedFile.isExpired()) {
      return res.status(410).json({
        success: false,
        error: "File has expired",
      });
    }

    // Read file from storage
    const fileBuffer = await fs.readFile(
      path.join(process.cwd(), storedFile.filePath)
    );

    let savedMessage = null;

    // Save message to database
    if (config.database.saveMessages) {
      savedMessage = await Message.create({
        userId: device.userId,
        deviceId: device.id,
        sessionId: sessionId,
        phoneNumber: recipient,
        messageType: "video",
        content: {
          caption: caption,
          mimeType: storedFile.mimeType,
          size: storedFile.size,
          storedFileId: fileId,
        },
        type: "outgoing",
        timestamp: new Date(),
        status: "pending",
      });
    }

    try {
      // Send video using device's session
      const result = await WhatsAppService.sendVideo(
        sessionId,
        recipient,
        fileBuffer,
        caption
      );

      // Update message status to sent if saved
      if (savedMessage && result) {
        await savedMessage.update({
          status: "sent",
          sentAt: new Date(),
          whatsappMessageId: result.messageId || null,
        });
      }

      // Update file usage stats
      await storedFile.incrementUsage();

      res.json({
        success: true,
        message: "Video sent successfully",
        messageId: savedMessage?.id,
        whatsappMessageId: result?.messageId,
        file: {
          id: storedFile.id,
          originalName: storedFile.originalName,
          usageCount: storedFile.usageCount + 1,
        },
      });
    } catch (sendError) {
      // Update message status to failed if saved
      if (savedMessage) {
        await savedMessage.update({
          status: "failed",
          errorMessage: sendError.message,
        });
      }
      throw sendError;
    }
  } catch (error) {
    console.error("Error sending video:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Send document message (only stored files)
export const sendDocument = async (req, res) => {
  try {
    const { sessionId, recipient, fileId, fileName } = req.body;

    if (!sessionId || !recipient || !fileId) {
      return res.status(400).json({
        success: false,
        error: "SessionId, recipient, and fileId are required",
      });
    }

    // Get device by sessionId
    const device = await Device.findOne({ where: { sessionId } });
    if (!device) {
      return res.status(404).json({
        success: false,
        error: "Device not found",
      });
    }

    // Check if device is connected
    if (!WhatsAppService.isSessionActive(sessionId)) {
      return res.status(400).json({
        success: false,
        error: "Device is not connected to WhatsApp",
      });
    }

    // Get stored file
    const storedFile = await StoredFile.findOne({
      where: {
        id: fileId,
        userId: device.userId,
        fileType: "document",
      },
    });

    if (!storedFile) {
      return res.status(404).json({
        success: false,
        error: "Document file not found or access denied",
      });
    }

    if (storedFile.isExpired()) {
      return res.status(410).json({
        success: false,
        error: "File has expired",
      });
    }

    // Read file from storage
    const fileBuffer = await fs.readFile(
      path.join(process.cwd(), storedFile.filePath)
    );

    let savedMessage = null;

    // Save message to database
    if (config.database.saveMessages) {
      savedMessage = await Message.create({
        userId: device.userId,
        deviceId: device.id,
        sessionId: sessionId,
        phoneNumber: recipient,
        messageType: "document",
        content: {
          fileName: fileName || storedFile.originalName,
          mimeType: storedFile.mimeType,
          size: storedFile.size,
          storedFileId: fileId,
        },
        type: "outgoing",
        timestamp: new Date(),
        status: "pending",
      });
    }

    try {
      // Send document using device's session
      const result = await WhatsAppService.sendDocument(
        sessionId,
        recipient,
        fileBuffer,
        fileName || storedFile.originalName
      );

      // Update message status to sent if saved
      if (savedMessage && result) {
        await savedMessage.update({
          status: "sent",
          sentAt: new Date(),
          whatsappMessageId: result.messageId || null,
        });
      }

      // Update file usage stats
      await storedFile.incrementUsage();

      res.json({
        success: true,
        message: "Document sent successfully",
        messageId: savedMessage?.id,
        whatsappMessageId: result?.messageId,
        file: {
          id: storedFile.id,
          originalName: storedFile.originalName,
          usageCount: storedFile.usageCount + 1,
        },
      });
    } catch (sendError) {
      // Update message status to failed if saved
      if (savedMessage) {
        await savedMessage.update({
          status: "failed",
          errorMessage: sendError.message,
        });
      }
      throw sendError;
    }
  } catch (error) {
    console.error("Error sending document:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get message logs by userId with status filtering
export const getUserMessageLogs = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      page = 1,
      limit = 50,
      status,
      messageType,
      phoneNumber,
      startDate,
      endDate,
    } = req.query;

    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = { userId };

    if (status) {
      whereClause.status = status;
    }

    if (messageType) {
      whereClause.messageType = messageType;
    }

    if (phoneNumber) {
      whereClause.phoneNumber = phoneNumber;
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt[Op.lte] = new Date(endDate);
      }
    }

    const messages = await Message.findAndCountAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: Device,
          attributes: ["id", "alias", "sessionId"],
          required: false,
        },
      ],
    });

    // Calculate status summary
    const statusSummary = await Message.findAll({
      where: { userId },
      attributes: [
        "status",
        [sequelize.fn("COUNT", sequelize.col("status")), "count"],
      ],
      group: ["status"],
      raw: true,
    });

    res.json({
      success: true,
      messages: messages.rows,
      pagination: {
        total: messages.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(messages.count / limit),
      },
      statusSummary: statusSummary.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),
      filters: {
        status,
        messageType,
        phoneNumber,
        startDate,
        endDate,
      },
    });
  } catch (error) {
    console.error("Error fetching user message logs:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get message status by message ID
export const getMessageStatus = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findByPk(messageId, {
      include: [
        {
          model: Device,
          attributes: ["id", "alias", "sessionId"],
          required: false,
        },
      ],
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        error: "Message not found",
      });
    }

    res.json({
      success: true,
      message: {
        id: message.id,
        userId: message.userId,
        phoneNumber: message.phoneNumber,
        messageType: message.messageType,
        content: message.content,
        type: message.type,
        status: message.status,
        whatsappMessageId: message.whatsappMessageId,
        errorMessage: message.errorMessage,
        sentAt: message.sentAt,
        deliveredAt: message.deliveredAt,
        readAt: message.readAt,
        timestamp: message.timestamp,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
        device: message.Device,
      },
    });
  } catch (error) {
    console.error("Error fetching message status:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get sending statistics for a user
export const getUserSendingStats = async (req, res) => {
  try {
    const { userId } = req.params;
    const { period = "7d" } = req.query; // 1d, 7d, 30d, or custom

    let startDate;
    const endDate = new Date();

    switch (period) {
      case "1d":
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get status counts
    const statusStats = await Message.findAll({
      where: {
        userId,
        type: "outgoing",
        createdAt: {
          [Op.gte]: startDate,
          [Op.lte]: endDate,
        },
      },
      attributes: [
        "status",
        [sequelize.fn("COUNT", sequelize.col("status")), "count"],
      ],
      group: ["status"],
      raw: true,
    });

    // Get message type counts
    const typeStats = await Message.findAll({
      where: {
        userId,
        type: "outgoing",
        createdAt: {
          [Op.gte]: startDate,
          [Op.lte]: endDate,
        },
      },
      attributes: [
        "messageType",
        [sequelize.fn("COUNT", sequelize.col("messageType")), "count"],
      ],
      group: ["messageType"],
      raw: true,
    });

    // Get daily counts for the period
    const dailyStats = await Message.findAll({
      where: {
        userId,
        type: "outgoing",
        createdAt: {
          [Op.gte]: startDate,
          [Op.lte]: endDate,
        },
      },
      attributes: [
        [sequelize.fn("DATE", sequelize.col("createdAt")), "date"],
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: [sequelize.fn("DATE", sequelize.col("createdAt"))],
      order: [[sequelize.fn("DATE", sequelize.col("createdAt")), "ASC"]],
      raw: true,
    });

    // Calculate success rate
    const totalMessages = statusStats.reduce(
      (sum, stat) => sum + parseInt(stat.count),
      0
    );
    const sentMessages =
      statusStats.find((stat) => stat.status === "sent")?.count || 0;
    const successRate =
      totalMessages > 0 ? ((sentMessages / totalMessages) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      period,
      startDate,
      endDate,
      totalMessages,
      successRate: parseFloat(successRate),
      statusBreakdown: statusStats.reduce((acc, stat) => {
        acc[stat.status] = parseInt(stat.count);
        return acc;
      }, {}),
      typeBreakdown: typeStats.reduce((acc, stat) => {
        acc[stat.messageType] = parseInt(stat.count);
        return acc;
      }, {}),
      dailyStats: dailyStats.map((stat) => ({
        date: stat.date,
        count: parseInt(stat.count),
      })),
    });
  } catch (error) {
    console.error("Error fetching user sending stats:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Resend a message by message ID
export const resendMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { sessionId } = req.body; // Optional: allow specifying different session

    // Find the original message
    const originalMessage = await Message.findByPk(messageId, {
      include: [
        {
          model: Device,
          attributes: ["id", "alias", "sessionId", "userId"],
          required: true,
        },
      ],
    });

    if (!originalMessage) {
      return res.status(404).json({
        success: false,
        error: "Message not found",
      });
    }

    // Use provided sessionId or fall back to original device's sessionId
    const targetSessionId = sessionId || originalMessage.Device.sessionId;

    // Get the target device
    const targetDevice = await Device.findOne({
      where: { sessionId: targetSessionId },
    });

    if (!targetDevice) {
      return res.status(404).json({
        success: false,
        error: "Target device not found",
      });
    }

    // Check if device is connected
    if (!WhatsAppService.isSessionActive(targetSessionId)) {
      return res.status(400).json({
        success: false,
        error: "Device is not connected to WhatsApp",
      });
    }

    // Check if user has access to both original message and target device
    if (originalMessage.userId !== targetDevice.userId) {
      return res.status(403).json({
        success: false,
        error:
          "Access denied: Cannot resend message to different user's device",
      });
    }

    let newMessage = null;

    // Create new message record if saving is enabled
    if (config.database.saveMessages) {
      newMessage = await Message.create({
        userId: targetDevice.userId,
        deviceId: targetDevice.id,
        sessionId: targetSessionId,
        phoneNumber: originalMessage.phoneNumber,
        messageType: originalMessage.messageType,
        content: originalMessage.content,
        type: "outgoing",
        timestamp: new Date(),
        status: "pending",
        // Add reference to original message (if field exists)
        ...(originalMessage.id && { originalMessageId: originalMessage.id }),
      });
    }

    let result = null;

    try {
      // Resend based on message type
      switch (originalMessage.messageType) {
        case "text":
          result = await WhatsAppService.sendMessage(
            targetSessionId,
            originalMessage.phoneNumber,
            originalMessage.content.text
          );
          break;

        case "image":
          // For image messages, we need to get the file from storage
          if (originalMessage.content.fileId) {
            const storedFile = await StoredFile.findOne({
              where: {
                id: originalMessage.content.fileId,
                userId: targetDevice.userId,
                fileType: "image",
              },
            });

            if (!storedFile || storedFile.isExpired()) {
              throw new Error("Original image file not found or expired");
            }

            const fileBuffer = await fs.readFile(
              path.join(process.cwd(), storedFile.filePath)
            );

            result = await WhatsAppService.sendImage(
              targetSessionId,
              originalMessage.phoneNumber,
              fileBuffer,
              originalMessage.content.caption || "",
              storedFile.mimeType
            );

            // Update file usage count
            await storedFile.increment("usageCount");
          } else {
            throw new Error(
              "Image file reference not found in original message"
            );
          }
          break;

        case "video":
          if (originalMessage.content.fileId) {
            const storedFile = await StoredFile.findOne({
              where: {
                id: originalMessage.content.fileId,
                userId: targetDevice.userId,
                fileType: "video",
              },
            });

            if (!storedFile || storedFile.isExpired()) {
              throw new Error("Original video file not found or expired");
            }

            const fileBuffer = await fs.readFile(
              path.join(process.cwd(), storedFile.filePath)
            );

            result = await WhatsAppService.sendVideo(
              targetSessionId,
              originalMessage.phoneNumber,
              fileBuffer,
              storedFile.mimeType,
              originalMessage.content.caption || ""
            );

            await storedFile.increment("usageCount");
          } else {
            throw new Error(
              "Video file reference not found in original message"
            );
          }
          break;

        case "document":
          if (originalMessage.content.fileId) {
            const storedFile = await StoredFile.findOne({
              where: {
                id: originalMessage.content.fileId,
                userId: targetDevice.userId,
                fileType: "document",
              },
            });

            if (!storedFile || storedFile.isExpired()) {
              throw new Error("Original document file not found or expired");
            }

            const fileBuffer = await fs.readFile(
              path.join(process.cwd(), storedFile.filePath)
            );

            result = await WhatsAppService.sendDocument(
              targetSessionId,
              originalMessage.phoneNumber,
              fileBuffer,
              storedFile.mimeType,
              storedFile.originalName
            );

            await storedFile.increment("usageCount");
          } else {
            throw new Error(
              "Document file reference not found in original message"
            );
          }
          break;

        default:
          throw new Error(
            `Unsupported message type: ${originalMessage.messageType}`
          );
      }

      // Update new message status to sent if saved
      if (newMessage && result) {
        await newMessage.update({
          status: "sent",
          sentAt: new Date(),
          whatsappMessageId: result.messageId || null,
        });
      }

      res.json({
        success: true,
        message: "Message resent successfully",
        originalMessageId: originalMessage.id,
        newMessageId: newMessage?.id,
        whatsappMessageId: result?.messageId,
        messageType: originalMessage.messageType,
        recipient: originalMessage.phoneNumber,
        sessionId: targetSessionId,
      });
    } catch (sendError) {
      // Update new message status to failed if saved
      if (newMessage) {
        await newMessage.update({
          status: "failed",
          errorMessage: sendError.message,
        });
      }
      throw sendError;
    }
  } catch (error) {
    console.error("Error resending message:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Send multiple files of the same type (bulk sending)
export const sendBulkFiles = async (req, res) => {
  try {
    const {
      sessionId,
      recipient,
      fileIds,
      fileType,
      caption = "",
      delay = 1000,
    } = req.body;

    if (
      !sessionId ||
      !recipient ||
      !fileIds ||
      !Array.isArray(fileIds) ||
      fileIds.length === 0
    ) {
      return res.status(400).json({
        success: false,
        error: "SessionId, recipient, and fileIds array are required",
      });
    }

    if (!["image", "video", "document"].includes(fileType)) {
      return res.status(400).json({
        success: false,
        error: "fileType must be one of: image, video, document",
      });
    }

    // Get device by sessionId
    const device = await Device.findOne({ where: { sessionId } });
    if (!device) {
      return res.status(404).json({
        success: false,
        error: "Device not found",
      });
    }

    // Check if device is connected
    if (!WhatsAppService.isSessionActive(sessionId)) {
      return res.status(400).json({
        success: false,
        error: "Device is not connected to WhatsApp",
      });
    }

    // Validate all files exist and belong to user
    const storedFiles = await StoredFile.findAll({
      where: {
        id: fileIds,
        userId: device.userId,
        fileType: fileType,
      },
    });

    if (storedFiles.length !== fileIds.length) {
      return res.status(404).json({
        success: false,
        error: "One or more files not found or access denied",
      });
    }

    // Check for expired files
    const expiredFiles = storedFiles.filter((file) => file.isExpired());
    if (expiredFiles.length > 0) {
      return res.status(410).json({
        success: false,
        error: `${expiredFiles.length} files have expired`,
        expiredFileIds: expiredFiles.map((f) => f.id),
      });
    }

    const results = [];

    // Send files one by one with delay
    for (let i = 0; i < storedFiles.length; i++) {
      const storedFile = storedFiles[i];
      let savedMessage = null;

      try {
        // Create message record if saving is enabled
        if (config.database.saveMessages) {
          savedMessage = await Message.create({
            userId: device.userId,
            deviceId: device.id,
            sessionId: sessionId,
            phoneNumber: recipient,
            messageType: fileType,
            content: {
              fileId: storedFile.id,
              fileName: storedFile.originalName,
              caption: caption,
            },
            type: "outgoing",
            timestamp: new Date(),
            status: "pending",
          });
        }

        // Read file from storage
        const fileBuffer = await fs.readFile(
          path.join(process.cwd(), storedFile.filePath)
        );

        let result;
        // Send based on file type
        switch (fileType) {
          case "image":
            result = await WhatsAppService.sendImage(
              sessionId,
              recipient,
              fileBuffer,
              caption,
              storedFile.mimeType
            );
            break;
          case "video":
            result = await WhatsAppService.sendVideo(
              sessionId,
              recipient,
              fileBuffer,
              storedFile.mimeType,
              caption
            );
            break;
          case "document":
            result = await WhatsAppService.sendDocument(
              sessionId,
              recipient,
              fileBuffer,
              storedFile.mimeType,
              storedFile.originalName
            );
            break;
        }

        // Update message status and file usage
        if (savedMessage && result) {
          await savedMessage.update({
            status: "sent",
            sentAt: new Date(),
            whatsappMessageId: result.messageId || null,
          });
        }

        await storedFile.increment("usageCount");

        results.push({
          fileId: storedFile.id,
          fileName: storedFile.originalName,
          success: true,
          messageId: savedMessage?.id,
          whatsappMessageId: result?.messageId,
        });

        // Add delay between messages (except for the last one)
        if (i < storedFiles.length - 1 && delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      } catch (sendError) {
        // Update message status to failed if saved
        if (savedMessage) {
          await savedMessage.update({
            status: "failed",
            errorMessage: sendError.message,
          });
        }

        results.push({
          fileId: storedFile.id,
          fileName: storedFile.originalName,
          success: false,
          error: sendError.message,
          messageId: savedMessage?.id,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    res.json({
      success: true,
      message: `Bulk send completed: ${successCount} sent, ${failureCount} failed`,
      totalFiles: fileIds.length,
      successCount,
      failureCount,
      results,
    });
  } catch (error) {
    console.error("Error in bulk file sending:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Send mixed media types (images, videos, documents combined)
export const sendMixedMedia = async (req, res) => {
  try {
    const {
      sessionId,
      recipient,
      files,
      caption = "",
      delay = 1000,
    } = req.body;

    if (
      !sessionId ||
      !recipient ||
      !files ||
      !Array.isArray(files) ||
      files.length === 0
    ) {
      return res.status(400).json({
        success: false,
        error: "SessionId, recipient, and files array are required",
      });
    }

    // Validate files array format: [{ fileId: 123, fileType: "image" }, ...]
    for (const file of files) {
      if (
        !file.fileId ||
        !file.fileType ||
        !["image", "video", "document"].includes(file.fileType)
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Each file must have fileId and fileType (image/video/document)",
        });
      }
    }

    // Get device by sessionId
    const device = await Device.findOne({ where: { sessionId } });
    if (!device) {
      return res.status(404).json({
        success: false,
        error: "Device not found",
      });
    }

    // Check if device is connected
    if (!WhatsAppService.isSessionActive(sessionId)) {
      return res.status(400).json({
        success: false,
        error: "Device is not connected to WhatsApp",
      });
    }

    // Group files by type for batch validation
    const filesByType = {};
    files.forEach((file) => {
      if (!filesByType[file.fileType]) {
        filesByType[file.fileType] = [];
      }
      filesByType[file.fileType].push(file.fileId);
    });

    // Validate all files exist and belong to user
    const allStoredFiles = [];
    for (const [fileType, fileIds] of Object.entries(filesByType)) {
      const storedFiles = await StoredFile.findAll({
        where: {
          id: fileIds,
          userId: device.userId,
          fileType: fileType,
        },
      });

      if (storedFiles.length !== fileIds.length) {
        return res.status(404).json({
          success: false,
          error: `Some ${fileType} files not found or access denied`,
        });
      }

      allStoredFiles.push(...storedFiles);
    }

    // Check for expired files
    const expiredFiles = allStoredFiles.filter((file) => file.isExpired());
    if (expiredFiles.length > 0) {
      return res.status(410).json({
        success: false,
        error: `${expiredFiles.length} files have expired`,
        expiredFileIds: expiredFiles.map((f) => f.id),
      });
    }

    // Create a map for quick file lookup
    const fileMap = {};
    allStoredFiles.forEach((file) => {
      fileMap[file.id] = file;
    });

    const results = [];

    // Send files in the order specified
    for (let i = 0; i < files.length; i++) {
      const fileRequest = files[i];
      const storedFile = fileMap[fileRequest.fileId];
      let savedMessage = null;

      try {
        // Create message record if saving is enabled
        if (config.database.saveMessages) {
          savedMessage = await Message.create({
            userId: device.userId,
            deviceId: device.id,
            sessionId: sessionId,
            phoneNumber: recipient,
            messageType: fileRequest.fileType,
            content: {
              fileId: storedFile.id,
              fileName: storedFile.originalName,
              caption: fileRequest.caption || caption,
            },
            type: "outgoing",
            timestamp: new Date(),
            status: "pending",
          });
        }

        // Read file from storage
        const fileBuffer = await fs.readFile(
          path.join(process.cwd(), storedFile.filePath)
        );

        let result;
        // Send based on file type
        switch (fileRequest.fileType) {
          case "image":
            result = await WhatsAppService.sendImage(
              sessionId,
              recipient,
              fileBuffer,
              fileRequest.caption || caption,
              storedFile.mimeType
            );
            break;
          case "video":
            result = await WhatsAppService.sendVideo(
              sessionId,
              recipient,
              fileBuffer,
              storedFile.mimeType,
              fileRequest.caption || caption
            );
            break;
          case "document":
            result = await WhatsAppService.sendDocument(
              sessionId,
              recipient,
              fileBuffer,
              storedFile.mimeType,
              storedFile.originalName
            );
            break;
        }

        // Update message status and file usage
        if (savedMessage && result) {
          await savedMessage.update({
            status: "sent",
            sentAt: new Date(),
            whatsappMessageId: result.messageId || null,
          });
        }

        await storedFile.increment("usageCount");

        results.push({
          fileId: storedFile.id,
          fileName: storedFile.originalName,
          fileType: fileRequest.fileType,
          success: true,
          messageId: savedMessage?.id,
          whatsappMessageId: result?.messageId,
        });

        // Add delay between messages (except for the last one)
        if (i < files.length - 1 && delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      } catch (sendError) {
        // Update message status to failed if saved
        if (savedMessage) {
          await savedMessage.update({
            status: "failed",
            errorMessage: sendError.message,
          });
        }

        results.push({
          fileId: storedFile.id,
          fileName: storedFile.originalName,
          fileType: fileRequest.fileType,
          success: false,
          error: sendError.message,
          messageId: savedMessage?.id,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    res.json({
      success: true,
      message: `Mixed media send completed: ${successCount} sent, ${failureCount} failed`,
      totalFiles: files.length,
      successCount,
      failureCount,
      results,
    });
  } catch (error) {
    console.error("Error in mixed media sending:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Send files to multiple recipients (batch sending)
export const sendBatchFiles = async (req, res) => {
  try {
    const {
      sessionId,
      recipients,
      fileIds,
      fileType,
      caption = "",
      delay = 2000,
    } = req.body;

    if (
      !sessionId ||
      !recipients ||
      !Array.isArray(recipients) ||
      recipients.length === 0
    ) {
      return res.status(400).json({
        success: false,
        error: "SessionId and recipients array are required",
      });
    }

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "fileIds array is required",
      });
    }

    if (!["image", "video", "document"].includes(fileType)) {
      return res.status(400).json({
        success: false,
        error: "fileType must be one of: image, video, document",
      });
    }

    // Get device by sessionId
    const device = await Device.findOne({ where: { sessionId } });
    if (!device) {
      return res.status(404).json({
        success: false,
        error: "Device not found",
      });
    }

    // Check if device is connected
    if (!WhatsAppService.isSessionActive(sessionId)) {
      return res.status(400).json({
        success: false,
        error: "Device is not connected to WhatsApp",
      });
    }

    // Validate all files exist and belong to user
    const storedFiles = await StoredFile.findAll({
      where: {
        id: fileIds,
        userId: device.userId,
        fileType: fileType,
      },
    });

    if (storedFiles.length !== fileIds.length) {
      return res.status(404).json({
        success: false,
        error: "One or more files not found or access denied",
      });
    }

    // Check for expired files
    const expiredFiles = storedFiles.filter((file) => file.isExpired());
    if (expiredFiles.length > 0) {
      return res.status(410).json({
        success: false,
        error: `${expiredFiles.length} files have expired`,
        expiredFileIds: expiredFiles.map((f) => f.id),
      });
    }

    const results = [];

    // Send to each recipient
    for (
      let recipientIndex = 0;
      recipientIndex < recipients.length;
      recipientIndex++
    ) {
      const recipient = recipients[recipientIndex];
      const recipientResults = [];

      // Send each file to this recipient
      for (let fileIndex = 0; fileIndex < storedFiles.length; fileIndex++) {
        const storedFile = storedFiles[fileIndex];
        let savedMessage = null;

        try {
          // Create message record if saving is enabled
          if (config.database.saveMessages) {
            savedMessage = await Message.create({
              userId: device.userId,
              deviceId: device.id,
              sessionId: sessionId,
              phoneNumber: recipient,
              messageType: fileType,
              content: {
                fileId: storedFile.id,
                fileName: storedFile.originalName,
                caption: caption,
              },
              type: "outgoing",
              timestamp: new Date(),
              status: "pending",
            });
          }

          // Read file from storage
          const fileBuffer = await fs.readFile(
            path.join(process.cwd(), storedFile.filePath)
          );

          let result;
          // Send based on file type
          switch (fileType) {
            case "image":
              result = await WhatsAppService.sendImage(
                sessionId,
                recipient,
                fileBuffer,
                caption,
                storedFile.mimeType
              );
              break;
            case "video":
              result = await WhatsAppService.sendVideo(
                sessionId,
                recipient,
                fileBuffer,
                storedFile.mimeType,
                caption
              );
              break;
            case "document":
              result = await WhatsAppService.sendDocument(
                sessionId,
                recipient,
                fileBuffer,
                storedFile.mimeType,
                storedFile.originalName
              );
              break;
          }

          // Update message status and file usage
          if (savedMessage && result) {
            await savedMessage.update({
              status: "sent",
              sentAt: new Date(),
              whatsappMessageId: result.messageId || null,
            });
          }

          await storedFile.increment("usageCount");

          recipientResults.push({
            fileId: storedFile.id,
            fileName: storedFile.originalName,
            success: true,
            messageId: savedMessage?.id,
            whatsappMessageId: result?.messageId,
          });

          // Add delay between files to same recipient
          if (fileIndex < storedFiles.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        } catch (sendError) {
          // Update message status to failed if saved
          if (savedMessage) {
            await savedMessage.update({
              status: "failed",
              errorMessage: sendError.message,
            });
          }

          recipientResults.push({
            fileId: storedFile.id,
            fileName: storedFile.originalName,
            success: false,
            error: sendError.message,
            messageId: savedMessage?.id,
          });
        }
      }

      results.push({
        recipient: recipient,
        results: recipientResults,
        successCount: recipientResults.filter((r) => r.success).length,
        failureCount: recipientResults.filter((r) => !r.success).length,
      });

      // Add delay between recipients
      if (recipientIndex < recipients.length - 1 && delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    const totalSuccess = results.reduce((sum, r) => sum + r.successCount, 0);
    const totalFailure = results.reduce((sum, r) => sum + r.failureCount, 0);

    res.json({
      success: true,
      message: `Batch send completed: ${totalSuccess} sent, ${totalFailure} failed`,
      totalRecipients: recipients.length,
      totalFiles: fileIds.length,
      totalMessages: recipients.length * fileIds.length,
      totalSuccess,
      totalFailure,
      results,
    });
  } catch (error) {
    console.error("Error in batch file sending:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
