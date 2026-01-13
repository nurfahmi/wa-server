import { ChatSettings, Device, ChatHistory, Message } from "../models/index.js";
import { Op } from "sequelize";
import WhatsAppService from "../services/WhatsAppService.js";

// Mark messages in a chat as read (send read receipts to WhatsApp)
export const markAsRead = async (req, res) => {
  try {
    const { deviceId, chatId } = req.params;
    
    // Verify device exists
    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }
    
    // Format chatId if needed
    let formattedChatId = chatId;
    if (!chatId.includes("@")) {
      formattedChatId = `${chatId}@s.whatsapp.net`;
    }
    
    // Check if session is active
    if (!WhatsAppService.isSessionActive(device.sessionId)) {
      return res.status(400).json({ error: "Device is not connected to WhatsApp" });
    }
    
    try {
      // Get the session and mark messages as read
      const session = WhatsAppService.getSession(device.sessionId);
      if (session) {
        // Send "read" presence update to the chat
        await session.sendPresenceUpdate("available", formattedChatId);
        
        // Get the last few unread messages and mark them as read
        const lastMessages = await ChatHistory.findAll({
          where: {
            deviceId: device.id,
            chatId: formattedChatId,
            direction: "incoming",
          },
          order: [["timestamp", "DESC"]],
          limit: 10,
        });
        
        if (lastMessages.length > 0) {
          // Create message keys for marking as read
          const messageKeys = lastMessages
            .filter(msg => msg.messageId)
            .map(msg => ({
              remoteJid: formattedChatId,
              id: msg.messageId,
              fromMe: false,
            }));
          
          if (messageKeys.length > 0) {
            await session.readMessages(messageKeys);
            console.log(`[MARK-READ] Marked ${messageKeys.length} messages as read for chat ${formattedChatId}`);
          }
        }
        
        // Update unread count in ChatSettings to 0
        await ChatSettings.update(
          { unreadCount: 0 },
          { where: { deviceId, chatId: formattedChatId } }
        );
        
        res.json({
          success: true,
          message: "Messages marked as read",
          chatId: formattedChatId,
          markedCount: lastMessages.length,
        });
      } else {
        res.status(400).json({ error: "Session not found" });
      }
    } catch (readError) {
      console.error("[MARK-READ] Error marking messages as read:", readError);
      // Still update local unread count even if WA read fails
      await ChatSettings.update(
        { unreadCount: 0 },
        { where: { deviceId, chatId: formattedChatId } }
      );
      res.json({
        success: true,
        message: "Local unread count cleared, but WhatsApp read receipt may have failed",
        error: readError.message
      });
    }
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ error: error.message });
  }
};

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

    // Clear memory by updating aiMemoryClearedAt timestamp
    // This tells the AI to ignore any messages before this time when fetching context
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
      aiMemoryClearedAt: new Date(),
    });

    res.json({
      success: true,
      message: "AI conversation memory cleared (soft-clear)",
      data: {
        chatId,
        clearedAt: chatSettings.aiMemoryClearedAt,
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

    // 1. Try to get from ChatHistory (unified source)
    try {
      const history = await ChatHistory.findAll({
        where: {
          deviceId: device.id,
          chatId: chatId,
          ...(before && { timestamp: { [Op.lt]: new Date(before) } }),
        },
        order: [["timestamp", "DESC"]],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      conversationHistory = history.map((msg) => ({
        id: msg.id,
        content: msg.content,
        messageType: msg.messageType,
        timestamp: msg.timestamp,
        source: "chat_history",
        direction: msg.direction,
        role: msg.direction === "incoming" ? "user" : "assistant",
        isAiGenerated: msg.isAiGenerated,
        agentName: msg.agentName,
      }));
    } catch (error) {
      console.log(
        "ChatHistory not available or empty:",
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

    // Count from ChatHistory
    try {
      const totalCount = await ChatHistory.count({
        where: {
          deviceId: device.id,
          chatId: chatId,
        },
      });

      const incomingCount = await ChatHistory.count({
        where: {
          deviceId: device.id,
          chatId: chatId,
          direction: "incoming",
        },
      });

      const outgoingCount = await ChatHistory.count({
        where: {
          deviceId: device.id,
          chatId: chatId,
          direction: "outgoing",
        },
      });

      const aiCount = await ChatHistory.count({
        where: {
          deviceId: device.id,
          chatId: chatId,
          isAiGenerated: true,
        },
      });

      // Get first and last message dates
      const firstMessage = await ChatHistory.findOne({
        where: {
          deviceId: device.id,
          chatId: chatId,
        },
        order: [["timestamp", "ASC"]],
      });

      const lastMessage = await ChatHistory.findOne({
        where: {
          deviceId: device.id,
          chatId: chatId,
        },
        order: [["timestamp", "DESC"]],
      });

      stats.totalMessages = totalCount;
      stats.userMessages = incomingCount;
      stats.aiMessages = aiCount;
      stats.firstMessageDate = firstMessage?.timestamp;
      stats.lastMessageDate = lastMessage?.timestamp;
    } catch (error) {
      console.log("Error getting ChatHistory stats:", error.message);
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

/**
 * Delete a chat and all its history
 */
export const deleteChat = async (req, res) => {
  try {
    const { deviceId, phoneNumber } = req.params;

    // Verify device exists
    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    const chatId = `${phoneNumber}@s.whatsapp.net`;

    // Find the chat settings
    const chatSettings = await ChatSettings.findOne({
      where: {
        deviceId,
        chatId,
      },
    });

    if (!chatSettings) {
      return res.status(404).json({ error: "Chat not found" });
    }

    // Delete all chat history
    const deletedHistoryCount = await ChatHistory.destroy({
      where: {
        deviceId,
        chatId,
      },
    });

    // Delete chat settings
    await chatSettings.destroy();

    console.log(`[DELETE-CHAT] Deleted chat ${phoneNumber} for device ${deviceId}. Removed ${deletedHistoryCount} messages.`);

    res.json({
      success: true,
      message: "Chat and history deleted successfully",
      deletedMessages: deletedHistoryCount,
    });
  } catch (error) {
    console.error("Error deleting chat:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================================
// PURCHASE INTENT ANALYTICS
// ============================================================================

/**
 * Get purchase intent summary for a device
 * Returns aggregated intent stats and stage distribution
 */
export const getIntentSummary = async (req, res) => {
  try {
    const { deviceId } = req.params;

    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    // Get all chats with intent data
    const chats = await ChatSettings.findAll({
      where: {
        deviceId,
        purchaseIntentScore: { [Op.gt]: 0 }, // Only chats with analyzed intent
      },
      attributes: [
        "id", "phoneNumber", "contactName", "purchaseIntentScore", 
        "purchaseIntentStage", "intentSignals", "intentObjections",
        "productsOfInterest", "aiRecommendedAction", "intentUpdatedAt",
        "lastMessageTimestamp", "priority"
      ],
      order: [["purchaseIntentScore", "DESC"]],
    });

    // Calculate stage distribution
    const stageDistribution = {
      cold: 0,
      curious: 0,
      interested: 0,
      hot: 0,
      closing: 0,
    };

    // Aggregate products of interest
    const allProducts = {};

    // Aggregate signals
    const allSignals = {};

    // Aggregate objections
    const allObjections = {};

    chats.forEach((chat) => {
      // Count stages
      const stage = chat.purchaseIntentStage || "cold";
      if (stageDistribution.hasOwnProperty(stage)) {
        stageDistribution[stage]++;
      }

      // Count products
      let products = chat.productsOfInterest || [];
      if (typeof products === "string") {
        try { products = JSON.parse(products); } catch (e) { products = []; }
      }
      products.forEach((p) => {
        allProducts[p] = (allProducts[p] || 0) + 1;
      });

      // Count signals
      let signals = chat.intentSignals || [];
      if (typeof signals === "string") {
        try { signals = JSON.parse(signals); } catch (e) { signals = []; }
      }
      signals.forEach((s) => {
        allSignals[s] = (allSignals[s] || 0) + 1;
      });

      // Count objections
      let objections = chat.intentObjections || [];
      if (typeof objections === "string") {
        try { objections = JSON.parse(objections); } catch (e) { objections = []; }
      }
      objections.forEach((o) => {
        allObjections[o] = (allObjections[o] || 0) + 1;
      });
    });

    // Sort products by popularity
    const topProducts = Object.entries(allProducts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // Sort signals by frequency
    const topSignals = Object.entries(allSignals)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    // Sort objections by frequency
    const topObjections = Object.entries(allObjections)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    // Calculate averages
    const totalScore = chats.reduce((sum, c) => sum + (c.purchaseIntentScore || 0), 0);
    const averageScore = chats.length > 0 ? Math.round(totalScore / chats.length) : 0;

    res.json({
      success: true,
      summary: {
        totalAnalyzedChats: chats.length,
        averageIntentScore: averageScore,
        stageDistribution,
        hotLeadsCount: stageDistribution.hot + stageDistribution.closing,
        conversionReadyCount: stageDistribution.closing,
      },
      insights: {
        topProducts,
        topSignals,
        topObjections,
      },
      device: {
        id: device.id,
        alias: device.alias,
      },
    });
  } catch (error) {
    console.error("Error fetching intent summary:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get hot leads for a device
 * Returns chats with high purchase intent that need attention
 */
export const getHotLeads = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { minScore = 60, limit = 20 } = req.query;

    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    const hotLeads = await ChatSettings.findAll({
      where: {
        deviceId,
        purchaseIntentScore: { [Op.gte]: parseInt(minScore) },
      },
      attributes: [
        "id", "phoneNumber", "contactName", "purchaseIntentScore",
        "purchaseIntentStage", "intentSignals", "intentObjections",
        "productsOfInterest", "aiRecommendedAction", "intentUpdatedAt",
        "lastMessageContent", "lastMessageTimestamp", "priority", "labels",
        "humanTakeover", "assignedAgentName"
      ],
      order: [
        ["purchaseIntentScore", "DESC"],
        ["lastMessageTimestamp", "DESC"],
      ],
      limit: parseInt(limit),
    });

    // Format response with lead quality indicators
    const formattedLeads = hotLeads.map((lead) => {
      let signals = lead.intentSignals || [];
      if (typeof signals === "string") {
        try { signals = JSON.parse(signals); } catch (e) { signals = []; }
      }

      let products = lead.productsOfInterest || [];
      if (typeof products === "string") {
        try { products = JSON.parse(products); } catch (e) { products = []; }
      }

      let objections = lead.intentObjections || [];
      if (typeof objections === "string") {
        try { objections = JSON.parse(objections); } catch (e) { objections = []; }
      }

      return {
        id: lead.id,
        phoneNumber: lead.phoneNumber,
        contactName: lead.contactName || "Unknown",
        intentScore: lead.purchaseIntentScore,
        intentStage: lead.purchaseIntentStage,
        priority: lead.priority,
        signals,
        objections,
        productsOfInterest: products,
        recommendedAction: lead.aiRecommendedAction,
        lastMessage: lead.lastMessageContent,
        lastActivity: lead.lastMessageTimestamp,
        intentUpdated: lead.intentUpdatedAt,
        isAssigned: !!lead.assignedAgentName,
        assignedTo: lead.assignedAgentName,
        humanTakeover: lead.humanTakeover,
        // Lead quality indicator
        quality: lead.purchaseIntentScore >= 80 ? "🔥 Hot" : 
                 lead.purchaseIntentScore >= 60 ? "🟠 Warm" : "🟡 Interested",
      };
    });

    res.json({
      success: true,
      leads: formattedLeads,
      total: formattedLeads.length,
      filter: {
        minScore: parseInt(minScore),
        limit: parseInt(limit),
      },
      device: {
        id: device.id,
        alias: device.alias,
      },
    });
  } catch (error) {
    console.error("Error fetching hot leads:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get intent analytics for all chats (sorted by score)
 */
export const getIntentAnalytics = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { 
      limit = 50, 
      offset = 0, 
      stage = null, 
      sortBy = "purchaseIntentScore",
      sortOrder = "DESC" 
    } = req.query;

    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    const whereClause = { deviceId };
    
    // Filter by stage if specified
    if (stage && ["cold", "curious", "interested", "hot", "closing"].includes(stage)) {
      whereClause.purchaseIntentStage = stage;
    }

    const chats = await ChatSettings.findAndCountAll({
      where: whereClause,
      attributes: [
        "id", "phoneNumber", "contactName", "purchaseIntentScore",
        "purchaseIntentStage", "intentSignals", "intentObjections",
        "productsOfInterest", "aiRecommendedAction", "intentUpdatedAt",
        "intentHistory", "lastMessageContent", "lastMessageTimestamp",
        "priority", "labels", "humanTakeover", "assignedAgentName", "status"
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Format intent history for each chat
    const formattedChats = chats.rows.map((chat) => {
      let history = chat.intentHistory || [];
      if (typeof history === "string") {
        try { history = JSON.parse(history); } catch (e) { history = []; }
      }

      let signals = chat.intentSignals || [];
      if (typeof signals === "string") {
        try { signals = JSON.parse(signals); } catch (e) { signals = []; }
      }

      let products = chat.productsOfInterest || [];
      if (typeof products === "string") {
        try { products = JSON.parse(products); } catch (e) { products = []; }
      }

      let objections = chat.intentObjections || [];
      if (typeof objections === "string") {
        try { objections = JSON.parse(objections); } catch (e) { objections = []; }
      }

      let labels = chat.labels || [];
      if (typeof labels === "string") {
        try { labels = JSON.parse(labels); } catch (e) { labels = []; }
      }

      return {
        id: chat.id,
        phoneNumber: chat.phoneNumber,
        contactName: chat.contactName || "Unknown",
        intent: {
          score: chat.purchaseIntentScore || 0,
          stage: chat.purchaseIntentStage || "cold",
          signals,
          objections,
          productsOfInterest: products,
          recommendedAction: chat.aiRecommendedAction,
          lastUpdated: chat.intentUpdatedAt,
          history: history.slice(-5), // Last 5 history entries
        },
        chat: {
          lastMessage: chat.lastMessageContent,
          lastActivity: chat.lastMessageTimestamp,
          priority: chat.priority,
          status: chat.status,
          labels,
        },
        assignment: {
          humanTakeover: chat.humanTakeover,
          assignedTo: chat.assignedAgentName,
        },
      };
    });

    res.json({
      success: true,
      chats: formattedChats,
      pagination: {
        total: chats.count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < chats.count,
      },
      device: {
        id: device.id,
        alias: device.alias,
      },
    });
  } catch (error) {
    console.error("Error fetching intent analytics:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get intent history for a specific chat
 */
export const getChatIntentHistory = async (req, res) => {
  try {
    const { deviceId, phoneNumber } = req.params;

    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    const chatId = `${phoneNumber}@s.whatsapp.net`;

    const chatSettings = await ChatSettings.findOne({
      where: { deviceId, chatId },
      attributes: [
        "id", "phoneNumber", "contactName", "purchaseIntentScore",
        "purchaseIntentStage", "intentSignals", "intentObjections",
        "productsOfInterest", "aiRecommendedAction", "intentUpdatedAt",
        "intentHistory"
      ],
    });

    if (!chatSettings) {
      return res.status(404).json({ error: "Chat not found" });
    }

    let history = chatSettings.intentHistory || [];
    if (typeof history === "string") {
      try { history = JSON.parse(history); } catch (e) { history = []; }
    }

    let signals = chatSettings.intentSignals || [];
    if (typeof signals === "string") {
      try { signals = JSON.parse(signals); } catch (e) { signals = []; }
    }

    let products = chatSettings.productsOfInterest || [];
    if (typeof products === "string") {
      try { products = JSON.parse(products); } catch (e) { products = []; }
    }

    let objections = chatSettings.intentObjections || [];
    if (typeof objections === "string") {
      try { objections = JSON.parse(objections); } catch (e) { objections = []; }
    }

    res.json({
      success: true,
      chat: {
        phoneNumber: chatSettings.phoneNumber,
        contactName: chatSettings.contactName || "Unknown",
      },
      currentIntent: {
        score: chatSettings.purchaseIntentScore || 0,
        stage: chatSettings.purchaseIntentStage || "cold",
        recommendedAction: chatSettings.aiRecommendedAction,
        lastUpdated: chatSettings.intentUpdatedAt,
      },
      signals,
      objections,
      productsOfInterest: products,
      history: history.reverse(), // Most recent first
      analytics: {
        highestScore: history.length > 0 ? Math.max(...history.map(h => h.score || 0)) : 0,
        scoreChanges: history.length,
        firstAnalyzed: history.length > 0 ? history[history.length - 1]?.timestamp : null,
        lastAnalyzed: history.length > 0 ? history[0]?.timestamp : null,
      },
    });
  } catch (error) {
    console.error("Error fetching chat intent history:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================================
// CONVERSATION OUTCOME TRACKING & ANALYTICS
// ============================================================================

/**
 * Mark conversation outcome (converted, lost, follow_up)
 */
export const markConversationOutcome = async (req, res) => {
  try {
    const { deviceId, phoneNumber } = req.params;
    const { 
      outcome, 
      conversionValue, 
      conversionProducts, 
      lostReason, 
      followUpDate, 
      followUpNotes 
    } = req.body;

    if (!outcome || !["converted", "lost", "follow_up", "handed_over", "pending"].includes(outcome)) {
      return res.status(400).json({ 
        error: "Invalid outcome. Must be: converted, lost, follow_up, handed_over, or pending" 
      });
    }

    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    const chatId = `${phoneNumber}@s.whatsapp.net`;

    const chatSettings = await ChatSettings.findOne({
      where: { deviceId, chatId },
    });

    if (!chatSettings) {
      return res.status(404).json({ error: "Chat not found" });
    }

    // Update outcome fields
    const updateData = {
      conversationOutcome: outcome,
      outcomeMarkedAt: new Date(),
      outcomeMarkedBy: req.user?.id?.toString() || "system",
    };

    // Add outcome-specific data
    if (outcome === "converted") {
      updateData.conversionValue = conversionValue || null;
      updateData.conversionProducts = conversionProducts || [];
      updateData.status = "resolved";
      
      // Add "purchased" label
      let labels = chatSettings.labels || [];
      if (typeof labels === "string") {
        try { labels = JSON.parse(labels); } catch (e) { labels = []; }
      }
      if (!labels.includes("purchased")) {
        labels.push("purchased");
      }
      updateData.labels = labels;
    }

    if (outcome === "lost") {
      updateData.lostReason = lostReason || "other";
      updateData.status = "closed";
    }

    if (outcome === "follow_up") {
      updateData.followUpDate = followUpDate ? new Date(followUpDate) : null;
      updateData.followUpNotes = followUpNotes || null;
      updateData.status = "pending";
      
      // Add "follow-up" label
      let labels = chatSettings.labels || [];
      if (typeof labels === "string") {
        try { labels = JSON.parse(labels); } catch (e) { labels = []; }
      }
      if (!labels.includes("follow-up")) {
        labels.push("follow-up");
      }
      updateData.labels = labels;
    }

    if (outcome === "handed_over") {
      updateData.status = "open";
    }

    await chatSettings.update(updateData);

    console.log(`[OUTCOME] Marked ${phoneNumber} as ${outcome} for device ${deviceId}`);

    res.json({
      success: true,
      message: `Conversation marked as ${outcome}`,
      chat: {
        phoneNumber,
        outcome: chatSettings.conversationOutcome,
        outcomeMarkedAt: chatSettings.outcomeMarkedAt,
        conversionValue: chatSettings.conversionValue,
      },
    });
  } catch (error) {
    console.error("Error marking conversation outcome:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get conversion analytics for a device
 */
export const getConversionAnalytics = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { days = 30 } = req.query;

    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get all chats with outcomes in the period
    const chats = await ChatSettings.findAll({
      where: {
        deviceId,
        [Op.or]: [
          { outcomeMarkedAt: { [Op.gte]: startDate } },
          { createdAt: { [Op.gte]: startDate } },
        ],
      },
      attributes: [
        "id", "conversationOutcome", "conversionValue", "conversionProducts",
        "lostReason", "purchaseIntentScore", "purchaseIntentStage", "peakIntentScore",
        "totalMessages", "aiMessagesCount", "humanMessagesCount", "averageResponseTime",
        "outcomeMarkedAt", "createdAt", "firstMessageAt"
      ],
    });

    // Calculate metrics
    const outcomes = {
      converted: 0,
      lost: 0,
      follow_up: 0,
      handed_over: 0,
      pending: 0,
    };

    let totalConversionValue = 0;
    let totalMessages = 0;
    let totalAiMessages = 0;
    let totalHumanMessages = 0;
    let totalResponseTime = 0;
    let responseTimeCount = 0;
    const productsSold = {};
    const lostReasons = {};
    const intentAtConversion = [];
    const intentAtLost = [];

    chats.forEach((chat) => {
      const outcome = chat.conversationOutcome || "pending";
      outcomes[outcome] = (outcomes[outcome] || 0) + 1;

      totalMessages += chat.totalMessages || 0;
      totalAiMessages += chat.aiMessagesCount || 0;
      totalHumanMessages += chat.humanMessagesCount || 0;

      if (chat.averageResponseTime) {
        totalResponseTime += chat.averageResponseTime;
        responseTimeCount++;
      }

      if (outcome === "converted") {
        totalConversionValue += parseFloat(chat.conversionValue) || 0;
        intentAtConversion.push(chat.peakIntentScore || chat.purchaseIntentScore || 0);

        let products = chat.conversionProducts || [];
        if (typeof products === "string") {
          try { products = JSON.parse(products); } catch (e) { products = []; }
        }
        products.forEach((p) => {
          const productName = typeof p === "string" ? p : p.name || "Unknown";
          productsSold[productName] = (productsSold[productName] || 0) + 1;
        });
      }

      if (outcome === "lost") {
        const reason = chat.lostReason || "other";
        lostReasons[reason] = (lostReasons[reason] || 0) + 1;
        intentAtLost.push(chat.peakIntentScore || chat.purchaseIntentScore || 0);
      }
    });

    // Calculate conversion rate
    const totalWithOutcome = outcomes.converted + outcomes.lost;
    const conversionRate = totalWithOutcome > 0 
      ? Math.round((outcomes.converted / totalWithOutcome) * 100) 
      : 0;

    // Calculate averages
    const avgConversionValue = outcomes.converted > 0 
      ? Math.round(totalConversionValue / outcomes.converted) 
      : 0;
    const avgResponseTime = responseTimeCount > 0 
      ? Math.round(totalResponseTime / responseTimeCount) 
      : 0;
    const avgIntentAtConversion = intentAtConversion.length > 0
      ? Math.round(intentAtConversion.reduce((a, b) => a + b, 0) / intentAtConversion.length)
      : 0;
    const avgIntentAtLost = intentAtLost.length > 0
      ? Math.round(intentAtLost.reduce((a, b) => a + b, 0) / intentAtLost.length)
      : 0;

    // Top products sold
    const topProducts = Object.entries(productsSold)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // Lost reasons breakdown
    const lostReasonsBreakdown = Object.entries(lostReasons)
      .sort((a, b) => b[1] - a[1])
      .map(([reason, count]) => ({ reason, count, percentage: Math.round((count / outcomes.lost) * 100) }));

    res.json({
      success: true,
      period: {
        days: parseInt(days),
        startDate,
        endDate: new Date(),
      },
      summary: {
        totalChats: chats.length,
        conversionRate: `${conversionRate}%`,
        totalRevenue: totalConversionValue,
        avgOrderValue: avgConversionValue,
      },
      outcomes,
      messaging: {
        totalMessages,
        aiMessages: totalAiMessages,
        humanMessages: totalHumanMessages,
        aiPercentage: totalMessages > 0 ? Math.round((totalAiMessages / totalMessages) * 100) : 0,
        avgResponseTime: `${avgResponseTime}s`,
      },
      insights: {
        avgIntentAtConversion,
        avgIntentAtLost,
        intentDifference: avgIntentAtConversion - avgIntentAtLost,
        topProducts,
        lostReasons: lostReasonsBreakdown,
      },
      device: {
        id: device.id,
        alias: device.alias,
      },
    });
  } catch (error) {
    console.error("Error fetching conversion analytics:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get follow-up tasks for a device
 */
export const getFollowUpTasks = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { status = "all" } = req.query; // all, overdue, today, upcoming

    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let whereClause = {
      deviceId,
      conversationOutcome: "follow_up",
      followUpDate: { [Op.ne]: null },
    };

    // Apply status filter
    if (status === "overdue") {
      whereClause.followUpDate = { [Op.lt]: today };
    } else if (status === "today") {
      whereClause.followUpDate = { [Op.gte]: today, [Op.lt]: tomorrow };
    } else if (status === "upcoming") {
      whereClause.followUpDate = { [Op.gte]: tomorrow };
    }

    const followUps = await ChatSettings.findAll({
      where: whereClause,
      attributes: [
        "id", "phoneNumber", "contactName", "followUpDate", "followUpNotes",
        "purchaseIntentScore", "purchaseIntentStage", "productsOfInterest",
        "lastMessageContent", "lastMessageTimestamp", "assignedAgentName"
      ],
      order: [["followUpDate", "ASC"]],
    });

    // Categorize follow-ups
    const categorized = {
      overdue: [],
      today: [],
      upcoming: [],
    };

    followUps.forEach((task) => {
      const followUpDate = new Date(task.followUpDate);
      
      let products = task.productsOfInterest || [];
      if (typeof products === "string") {
        try { products = JSON.parse(products); } catch (e) { products = []; }
      }

      const taskData = {
        id: task.id,
        phoneNumber: task.phoneNumber,
        contactName: task.contactName || "Unknown",
        followUpDate: task.followUpDate,
        notes: task.followUpNotes,
        intentScore: task.purchaseIntentScore,
        intentStage: task.purchaseIntentStage,
        products,
        lastMessage: task.lastMessageContent,
        lastActivity: task.lastMessageTimestamp,
        assignedTo: task.assignedAgentName,
      };

      if (followUpDate < today) {
        categorized.overdue.push(taskData);
      } else if (followUpDate >= today && followUpDate < tomorrow) {
        categorized.today.push(taskData);
      } else {
        categorized.upcoming.push(taskData);
      }
    });

    res.json({
      success: true,
      summary: {
        total: followUps.length,
        overdue: categorized.overdue.length,
        today: categorized.today.length,
        upcoming: categorized.upcoming.length,
      },
      tasks: status === "all" ? categorized : (categorized[status] || []),
      device: {
        id: device.id,
        alias: device.alias,
      },
    });
  } catch (error) {
    console.error("Error fetching follow-up tasks:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get conversion funnel analytics
 */
export const getConversionFunnel = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { days = 30 } = req.query;

    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get all chats in period
    const chats = await ChatSettings.findAll({
      where: {
        deviceId,
        createdAt: { [Op.gte]: startDate },
      },
      attributes: [
        "purchaseIntentStage", "conversationOutcome", "peakIntentScore",
        "totalMessages", "humanTakeover"
      ],
    });

    // Build funnel data
    const funnel = {
      total: chats.length,
      stages: {
        cold: { count: 0, converted: 0 },
        curious: { count: 0, converted: 0 },
        interested: { count: 0, converted: 0 },
        hot: { count: 0, converted: 0 },
        closing: { count: 0, converted: 0 },
      },
    };

    // AI vs Human comparison
    const aiOnly = { total: 0, converted: 0 };
    const humanInvolved = { total: 0, converted: 0 };

    chats.forEach((chat) => {
      const stage = chat.purchaseIntentStage || "cold";
      const isConverted = chat.conversationOutcome === "converted";

      if (funnel.stages[stage]) {
        funnel.stages[stage].count++;
        if (isConverted) funnel.stages[stage].converted++;
      }

      // AI vs Human tracking
      if (chat.humanTakeover) {
        humanInvolved.total++;
        if (isConverted) humanInvolved.converted++;
      } else {
        aiOnly.total++;
        if (isConverted) aiOnly.converted++;
      }
    });

    // Calculate conversion rates per stage
    const stageData = Object.entries(funnel.stages).map(([stage, data]) => ({
      stage,
      count: data.count,
      converted: data.converted,
      conversionRate: data.count > 0 ? Math.round((data.converted / data.count) * 100) : 0,
    }));

    // Calculate AI effectiveness
    const aiConversionRate = aiOnly.total > 0 
      ? Math.round((aiOnly.converted / aiOnly.total) * 100) 
      : 0;
    const humanConversionRate = humanInvolved.total > 0 
      ? Math.round((humanInvolved.converted / humanInvolved.total) * 100) 
      : 0;

    res.json({
      success: true,
      period: {
        days: parseInt(days),
        startDate,
        endDate: new Date(),
      },
      funnel: {
        total: funnel.total,
        stages: stageData,
      },
      aiEffectiveness: {
        aiOnly: {
          total: aiOnly.total,
          converted: aiOnly.converted,
          conversionRate: `${aiConversionRate}%`,
        },
        humanInvolved: {
          total: humanInvolved.total,
          converted: humanInvolved.converted,
          conversionRate: `${humanConversionRate}%`,
        },
        recommendation: aiConversionRate >= humanConversionRate 
          ? "AI is performing well! Consider expanding AI coverage." 
          : "Human agents are outperforming AI. Review AI prompts and training.",
      },
      device: {
        id: device.id,
        alias: device.alias,
      },
    });
  } catch (error) {
    console.error("Error fetching conversion funnel:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get learning insights (what patterns lead to conversions)
 */
export const getLearningInsights = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { days = 90 } = req.query;

    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get converted and lost chats
    const chats = await ChatSettings.findAll({
      where: {
        deviceId,
        conversationOutcome: { [Op.in]: ["converted", "lost"] },
        outcomeMarkedAt: { [Op.gte]: startDate },
      },
      attributes: [
        "conversationOutcome", "intentSignals", "intentObjections",
        "productsOfInterest", "purchaseIntentScore", "peakIntentScore",
        "totalMessages", "aiMessagesCount", "humanTakeover", "lostReason"
      ],
    });

    // Analyze patterns
    const convertedChats = chats.filter(c => c.conversationOutcome === "converted");
    const lostChats = chats.filter(c => c.conversationOutcome === "lost");

    // Signal analysis
    const signalConversion = {};
    const signalLost = {};

    // Objection analysis
    const objectionResolved = {}; // Objections that led to conversion
    const objectionUnresolved = {}; // Objections that led to loss

    // Product analysis
    const productConversion = {};

    convertedChats.forEach((chat) => {
      let signals = chat.intentSignals || [];
      if (typeof signals === "string") try { signals = JSON.parse(signals); } catch (e) { signals = []; }
      signals.forEach(s => { signalConversion[s] = (signalConversion[s] || 0) + 1; });

      let objections = chat.intentObjections || [];
      if (typeof objections === "string") try { objections = JSON.parse(objections); } catch (e) { objections = []; }
      objections.forEach(o => { objectionResolved[o] = (objectionResolved[o] || 0) + 1; });

      let products = chat.productsOfInterest || [];
      if (typeof products === "string") try { products = JSON.parse(products); } catch (e) { products = []; }
      products.forEach(p => { productConversion[p] = (productConversion[p] || 0) + 1; });
    });

    lostChats.forEach((chat) => {
      let signals = chat.intentSignals || [];
      if (typeof signals === "string") try { signals = JSON.parse(signals); } catch (e) { signals = []; }
      signals.forEach(s => { signalLost[s] = (signalLost[s] || 0) + 1; });

      let objections = chat.intentObjections || [];
      if (typeof objections === "string") try { objections = JSON.parse(objections); } catch (e) { objections = []; }
      objections.forEach(o => { objectionUnresolved[o] = (objectionUnresolved[o] || 0) + 1; });
    });

    // Calculate averages
    const avgMessagesConverted = convertedChats.length > 0
      ? Math.round(convertedChats.reduce((sum, c) => sum + (c.totalMessages || 0), 0) / convertedChats.length)
      : 0;
    const avgMessagesLost = lostChats.length > 0
      ? Math.round(lostChats.reduce((sum, c) => sum + (c.totalMessages || 0), 0) / lostChats.length)
      : 0;

    const avgIntentConverted = convertedChats.length > 0
      ? Math.round(convertedChats.reduce((sum, c) => sum + (c.peakIntentScore || 0), 0) / convertedChats.length)
      : 0;
    const avgIntentLost = lostChats.length > 0
      ? Math.round(lostChats.reduce((sum, c) => sum + (c.peakIntentScore || 0), 0) / lostChats.length)
      : 0;

    // Generate insights
    const insights = [];

    // Insight 1: Optimal message count
    if (avgMessagesConverted < avgMessagesLost) {
      insights.push({
        type: "messaging",
        insight: `Converted leads need fewer messages (avg ${avgMessagesConverted}) vs lost leads (avg ${avgMessagesLost}). Focus on quick, decisive responses.`,
        priority: "high",
      });
    }

    // Insight 2: Intent threshold
    if (avgIntentConverted > 0) {
      insights.push({
        type: "intent",
        insight: `Leads that convert typically reach ${avgIntentConverted}% intent score. Prioritize leads above ${Math.round(avgIntentConverted * 0.8)}%.`,
        priority: "medium",
      });
    }

    // Insight 3: Problematic objections
    const topUnresolvedObjections = Object.entries(objectionUnresolved)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    if (topUnresolvedObjections.length > 0) {
      insights.push({
        type: "objection",
        insight: `Top objections causing lost leads: ${topUnresolvedObjections.map(([o]) => o).join(", ")}. Improve handling scripts.`,
        priority: "high",
        details: topUnresolvedObjections,
      });
    }

    // Insight 4: AI vs Human
    const aiOnlyConverted = convertedChats.filter(c => !c.humanTakeover).length;
    const humanConverted = convertedChats.filter(c => c.humanTakeover).length;
    const aiPercentage = convertedChats.length > 0 
      ? Math.round((aiOnlyConverted / convertedChats.length) * 100) 
      : 0;
    insights.push({
      type: "ai_effectiveness",
      insight: `${aiPercentage}% of conversions are handled by AI alone. ${aiPercentage > 50 ? "AI is effective!" : "Consider improving AI responses."}`,
      priority: aiPercentage > 50 ? "low" : "medium",
    });

    res.json({
      success: true,
      period: {
        days: parseInt(days),
        analyzedChats: chats.length,
        converted: convertedChats.length,
        lost: lostChats.length,
      },
      patterns: {
        converted: {
          avgMessages: avgMessagesConverted,
          avgPeakIntent: avgIntentConverted,
          topSignals: Object.entries(signalConversion).sort((a, b) => b[1] - a[1]).slice(0, 5),
          resolvedObjections: Object.entries(objectionResolved).sort((a, b) => b[1] - a[1]).slice(0, 5),
          topProducts: Object.entries(productConversion).sort((a, b) => b[1] - a[1]).slice(0, 5),
        },
        lost: {
          avgMessages: avgMessagesLost,
          avgPeakIntent: avgIntentLost,
          topSignals: Object.entries(signalLost).sort((a, b) => b[1] - a[1]).slice(0, 5),
          unresolvedObjections: Object.entries(objectionUnresolved).sort((a, b) => b[1] - a[1]).slice(0, 5),
        },
      },
      insights,
      device: {
        id: device.id,
        alias: device.alias,
      },
    });
  } catch (error) {
    console.error("Error fetching learning insights:", error);
    res.status(500).json({ error: error.message });
  }
};
