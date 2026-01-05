import { ChatSettings, Device, AIConversationMemory, Message } from "../models/index.js";
import { Op } from "sequelize";

// Get all chats for a device with their settings and latest messages
export const getChats = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Verify device exists
    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    const chats = await ChatSettings.findAndCountAll({
      where: { deviceId },
      order: [["lastMessageTimestamp", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      chats: chats.rows,
      total: chats.count,
      device: {
        id: device.id,
        alias: device.alias,
        sessionId: device.sessionId,
      },
    });
  } catch (error) {
    console.error("Error fetching chats:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get specific chat settings
export const getChatSettings = async (req, res) => {
  try {
    const { deviceId, phoneNumber } = req.params;

    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    const chatId = `${phoneNumber}@s.whatsapp.net`;
    const chatSettings = await ChatSettings.findOne({
      where: {
        deviceId,
        chatId,
      },
    });

    if (!chatSettings) {
      return res.status(404).json({ error: "Chat not found" });
    }

    res.json({
      success: true,
      chat: chatSettings,
    });
  } catch (error) {
    console.error("Error fetching chat settings:", error);
    res.status(500).json({ error: error.message });
  }
};

// Update chat-specific AI settings
export const updateChatSettings = async (req, res) => {
  try {
    const { deviceId, phoneNumber } = req.params;
    const { aiEnabled, contactName, customerSegment, notes } = req.body;

    // Verify device exists
    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    const chatId = `${phoneNumber}@s.whatsapp.net`;

    // Update or create chat settings
    const [chatSettings, created] = await ChatSettings.upsert(
      {
        userId: device.userId,
        deviceId,
        sessionId: device.sessionId,
        chatId,
        phoneNumber,
        contactName: contactName || null,
        customerSegment: customerSegment || null,
        notes: notes || null,
        aiEnabled: aiEnabled !== undefined ? aiEnabled : null,
      },
      {
        returning: true,
      }
    );

    console.log(
      `${created ? "Created" : "Updated"} chat settings for ${phoneNumber}:`,
      {
        aiEnabled,
        contactName,
        customerSegment,
        hasNotes: !!notes,
      }
    );

    res.json({
      success: true,
      message: `Chat settings ${created ? "created" : "updated"} successfully`,
      chat: chatSettings,
    });
  } catch (error) {
    console.error("Error updating chat settings:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get active chats summary for a device
export const getChatsSummary = async (req, res) => {
  try {
    const { deviceId } = req.params;

    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    const summary = await ChatSettings.findAll({
      where: {
        deviceId,
        isActive: true,
        lastMessageTimestamp: {
          [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      order: [["lastMessageTimestamp", "DESC"]],
      limit: 20,
      attributes: [
        "phoneNumber",
        "contactName",
        "lastMessageContent",
        "lastMessageDirection",
        "lastMessageTimestamp",
        "aiEnabled",
        "totalIncomingMessages",
        "totalOutgoingMessages",
      ],
    });

    const stats = {
      totalActiveChats: summary.length,
      aiEnabledChats: summary.filter((chat) => chat.aiEnabled === true).length,
      totalIncoming: summary.reduce(
        (sum, chat) => sum + (chat.totalIncomingMessages || 0),
        0
      ),
      totalOutgoing: summary.reduce(
        (sum, chat) => sum + (chat.totalOutgoingMessages || 0),
        0
      ),
    };

    res.json({
      success: true,
      summary,
      stats,
      device: {
        id: device.id,
        alias: device.alias,
        sessionId: device.sessionId,
      },
    });
  } catch (error) {
    console.error("Error fetching chats summary:", error);
    res.status(500).json({ error: error.message });
  }
};

// Bulk update AI settings for multiple chats
export const bulkUpdateChats = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { phoneNumbers, settings } = req.body;

    if (
      !phoneNumbers ||
      !Array.isArray(phoneNumbers) ||
      phoneNumbers.length === 0
    ) {
      return res.status(400).json({ error: "phoneNumbers array is required" });
    }

    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    const chatIds = phoneNumbers.map((phone) => `${phone}@s.whatsapp.net`);

    // Update all specified chats
    const updateResult = await ChatSettings.update(settings, {
      where: {
        deviceId,
        chatId: { [Op.in]: chatIds },
      },
    });

    console.log(
      `Bulk updated ${updateResult[0]} chats for device ${deviceId}:`,
      settings
    );

    res.json({
      success: true,
      message: `Updated ${updateResult[0]} chats`,
      updatedCount: updateResult[0],
    });
  } catch (error) {
    console.error("Error bulk updating chats:", error);
    res.status(500).json({ error: error.message });
  }
};

// Update conversation memory settings for a chat
export const updateMemorySettings = async (req, res) => {
  try {
    const { deviceId, chatId } = req.params;
    const { memoryRetentionHours, maxHistoryMessages } = req.body;

    const chatSettings = await ChatSettings.findOne({
      where: { deviceId, chatId },
    });

    if (!chatSettings) {
      return res.status(404).json({
        success: false,
        message: "Chat settings not found",
      });
    }

    await chatSettings.update({
      memoryRetentionHours: memoryRetentionHours || null,
      maxHistoryMessages: maxHistoryMessages || null,
    });

    res.json({
      success: true,
      message: "Memory settings updated successfully",
      data: {
        chatId: chatSettings.chatId,
        phoneNumber: chatSettings.phoneNumber,
        memoryRetentionHours: chatSettings.memoryRetentionHours,
        maxHistoryMessages: chatSettings.maxHistoryMessages,
      },
    });
  } catch (error) {
    console.error("Error updating memory settings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update memory settings",
    });
  }
};

// Clear conversation memory for a chat
export const clearMemory = async (req, res) => {
  try {
    const { deviceId, chatId } = req.params;

    // Get device to find sessionId
    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    // Clear all conversation memory for this chat
    const deletedCount = await AIConversationMemory.destroy({
      where: {
        sessionId: device.sessionId,
        remoteJid: chatId,
      },
    });

    res.json({
      success: true,
      message: `Cleared ${deletedCount} conversation memory entries`,
      data: {
        chatId,
        deletedEntries: deletedCount,
      },
    });
  } catch (error) {
    console.error("Error clearing memory:", error);
    res.status(500).json({
      success: false,
      message: "Failed to clear conversation memory",
    });
  }
};

// Get conversation history for a specific chat
export const getChatConversation = async (req, res) => {
  try {
    const { deviceId, phoneNumber } = req.params;
    const { limit = 50, offset = 0, before } = req.query;

    // Verify device exists
    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    const chatId = `${phoneNumber}@s.whatsapp.net`;

    // Get conversation history from different sources

    let conversationHistory = [];

    // 1. Try to get from AIConversationMemory (most recent AI conversations)
    try {
      const aiHistory = await AIConversationMemory.findAll({
        where: {
          sessionId: device.sessionId,
          remoteJid: chatId,
          ...(before && { timestamp: { [Op.lt]: new Date(before) } }),
        },
        order: [["timestamp", "DESC"]],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      conversationHistory = aiHistory.map((msg) => ({
        id: msg.id,
        content: msg.content,
        role: msg.role, // 'user' or 'assistant'
        timestamp: msg.timestamp,
        source: "ai_memory",
        direction: msg.role === "user" ? "incoming" : "outgoing",
      }));
    } catch (error) {
      console.log(
        "AIConversationMemory not available or empty:",
        error.message
      );
    }

    // 2. If no AI history, get from Messages table
    if (conversationHistory.length === 0) {
      try {
        const messages = await Message.findAll({
          where: {
            sessionId: device.sessionId,
            phoneNumber: phoneNumber,
            ...(before && { createdAt: { [Op.lt]: new Date(before) } }),
          },
          order: [["createdAt", "DESC"]],
          limit: parseInt(limit),
          offset: parseInt(offset),
        });

        conversationHistory = messages.map((msg) => ({
          id: msg.id,
          content:
            typeof msg.content === "object"
              ? msg.content.text || JSON.stringify(msg.content)
              : msg.content,
          messageType: msg.messageType || "text",
          timestamp: msg.createdAt,
          source: "messages",
          direction: "outgoing", // Messages table typically stores outgoing messages
        }));
      } catch (error) {
        console.log("Messages table not available or empty:", error.message);
      }
    }

    // Get chat settings for context
    const chatSettings = await ChatSettings.findOne({
      where: {
        deviceId,
        chatId,
      },
    });

    res.json({
      success: true,
      chat: {
        phoneNumber,
        chatId,
        contactName: chatSettings?.contactName || "Unknown",
        deviceId,
        sessionId: device.sessionId,
      },
      conversation: conversationHistory.reverse(), // Return in chronological order
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: conversationHistory.length,
        hasMore: conversationHistory.length === parseInt(limit),
      },
      source:
        conversationHistory.length > 0 ? conversationHistory[0].source : "none",
    });
  } catch (error) {
    console.error("Error fetching chat conversation:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get conversation summary/stats for a chat
export const getChatStats = async (req, res) => {
  try {
    const { deviceId, phoneNumber } = req.params;

    // Verify device exists
    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    const chatId = `${phoneNumber}@s.whatsapp.net`;

    // Get stats from different sources
    let stats = {
      totalMessages: 0,
      aiMessages: 0,
      userMessages: 0,
      firstMessageDate: null,
      lastMessageDate: null,
      averageResponseTime: null,
    };

    // Count from AIConversationMemory
    try {
      const aiCount = await AIConversationMemory.count({
        where: {
          sessionId: device.sessionId,
          remoteJid: chatId,
        },
      });

      const aiUserCount = await AIConversationMemory.count({
        where: {
          sessionId: device.sessionId,
          remoteJid: chatId,
          role: "user",
        },
      });

      const aiAssistantCount = await AIConversationMemory.count({
        where: {
          sessionId: device.sessionId,
          remoteJid: chatId,
          role: "assistant",
        },
      });

      // Get first and last message dates
      const firstMessage = await AIConversationMemory.findOne({
        where: {
          sessionId: device.sessionId,
          remoteJid: chatId,
        },
        order: [["timestamp", "ASC"]],
      });

      const lastMessage = await AIConversationMemory.findOne({
        where: {
          sessionId: device.sessionId,
          remoteJid: chatId,
        },
        order: [["timestamp", "DESC"]],
      });

      stats.totalMessages = aiCount;
      stats.userMessages = aiUserCount;
      stats.aiMessages = aiAssistantCount;
      stats.firstMessageDate = firstMessage?.timestamp;
      stats.lastMessageDate = lastMessage?.timestamp;
    } catch (error) {
      console.log("Error getting AI stats:", error.message);
    }

    // Get chat settings
    const chatSettings = await ChatSettings.findOne({
      where: {
        deviceId,
        chatId,
      },
    });

    res.json({
      success: true,
      chat: {
        phoneNumber,
        chatId,
        contactName: chatSettings?.contactName || "Unknown",
        aiEnabled: chatSettings?.aiEnabled,
        lastMessageContent: chatSettings?.lastMessageContent,
        lastMessageTimestamp: chatSettings?.lastMessageTimestamp,
      },
      stats,
    });
  } catch (error) {
    console.error("Error fetching chat stats:", error);
    res.status(500).json({ error: error.message });
  }
};
