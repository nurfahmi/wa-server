import { ContactData, Device, ChatSettings, ChatHistory, sequelize } from "../models/index.js";
import { Op } from "sequelize";
import whatsappService from "../services/WhatsAppService.js";

// Helper function to validate device exists and user has access
const validateDevice = async (deviceId, user) => {
  const device = await Device.findByPk(deviceId);
  if (!device) {
    throw new Error("Device not found");
  }
  
  // Security Check: Ensure user owns device or is an agent of the owner
  if (user && user.role !== 'superadmin') {
    const ownerId = String(user.role === 'agent' ? user.managerId : user.id);
    if (String(device.userId) !== ownerId) {
      throw new Error("Access denied to this device");
    }
  }
  
  return device;
};

export const getContacts = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = await validateDevice(deviceId, req.user);

    const contacts = await ContactData.findAll({
      where: {
        sessionId: device.sessionId,
        source: "contact",
      },
    });

    res.json({ contacts });
  } catch (error) {
    if (error.message === "Device not found" || error.message === "Access denied to this device") {
      return res.status(error.message === "Device not found" ? 404 : 403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const getChats = async (req, res) => {
  try {
    const { deviceId } = req.params;

    // Validate device exists
    const device = await validateDevice(deviceId, req.user);

    // Use ChatSettings as the source for active chats (updated by MessageHandler)
    const chats = await ChatSettings.findAll({
      where: {
        deviceId: device.id
      },
      order: [['lastMessageTimestamp', 'DESC']]
    });

    // Map to expected format - use only fields that exist in the model
    const mappedChats = chats.map(chat => ({
      jid: chat.chatId,
      name: chat.contactName,
      phoneNumber: chat.phoneNumber,
      lastMessageTimestamp: chat.lastMessageTimestamp,
      unreadCount: 0, // Default value - column may not exist yet
      ...chat.toJSON()
    }));

    res.json({ chats: mappedChats });
  } catch (error) {
    console.error("[getChats] Error fetching chats:", error);
    if (error.message === "Device not found" || error.message === "Access denied to this device") {
      return res.status(error.message === "Device not found" ? 404 : 403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message, stack: error.stack });
  }
};

export const getGroups = async (req, res) => {
  try {
    const { deviceId } = req.params;

    // Validate device exists
    const device = await validateDevice(deviceId, req.user);

    const groups = await ContactData.findAll({
      where: {
        sessionId: device.sessionId,
        type: true,
        source: "chat",
      },
    });

    // For each group, get its members
    for (const group of groups) {
      group.members = await ContactData.findAll({
        where: {
          sessionId: device.sessionId,
          source: "groupMember",
          sourceDetail: { [Op.like]: `Member of ${group.jid}|%` },
        },
      });
    }

    res.json({ groups });
  } catch (error) {
    if (error.message === "Device not found" || error.message === "Access denied to this device") {
      return res.status(error.message === "Device not found" ? 404 : 403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const getUserContacts = async (req, res) => {
  try {
    const { userId } = req.params;

    // Get all contacts from all user's devices
    const devices = await Device.findAll({
      where: { userId },
      attributes: ["sessionId"],
    });

    const sessionIds = devices.map((device) => device.sessionId);

    // Validate that at least one device exists
    if (sessionIds.length === 0) {
      return res.status(404).json({ error: "No devices found for this user" });
    }

    const contacts = await ContactData.findAll({
      where: {
        sessionId: { [Op.in]: sessionIds },
        source: "contact",
      },
    });

    res.json({ contacts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const fetchGroupMembers = async (req, res) => {
  try {
    const { deviceId, groupId } = req.params;
    const groupData = await whatsappService.fetchGroupMembersDetailed(
      deviceId,
      groupId
    );
    res.json({ ...groupData, timestamp: new Date() });
  } catch (error) {
    if (error.message === "Invalid group ID format") {
      return res.status(400).json({ error: error.message });
    }
    if (
      error.message === "Device not found" ||
      error.message === "Device is not connected to WhatsApp" ||
      error.message === "Group not found or access denied"
    ) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

// Sync WhatsApp data
export const syncWhatsAppData = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const syncResults = await whatsappService.syncWhatsAppData(deviceId);
    res.json({
      success: true,
      data: syncResults,
      timestamp: new Date(),
    });
  } catch (error) {
    if (
      error.message === "Device not found" ||
      error.message === "Device is not connected to WhatsApp"
    ) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const fetchProfilePicture = async (req, res) => {
  try {
    const { deviceId, jid } = req.params;
    const profilePictureUrl = await whatsappService.getProfilePicture(
      deviceId,
      jid
    );
    res.json({ profilePictureUrl, timestamp: new Date() });
  } catch (error) {
    if (
      error.message === "Device not found" ||
      error.message === "Device is not connected to WhatsApp"
    ) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const fetchPresenceStatus = async (req, res) => {
  try {
    const { deviceId, jid } = req.params;
    const presence = await whatsappService.getPresenceStatus(deviceId, jid);
    res.json({ presence, timestamp: new Date() });
  } catch (error) {
    if (
      error.message === "Device not found" ||
      error.message === "Device is not connected to WhatsApp"
    ) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const fetchBusinessProfile = async (req, res) => {
  try {
    const { deviceId, jid } = req.params;
    const businessProfile = await whatsappService.getBusinessProfile(
      deviceId,
      jid
    );
    res.json({ businessProfile, timestamp: new Date() });
  } catch (error) {
    if (
      error.message === "Device not found" ||
      error.message === "Device is not connected to WhatsApp"
    ) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const fetchContactsFromBaileysStore = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const result = await whatsappService.fetchContactsFromBaileysStore(
      deviceId
    );
    res.json({
      success: true,
      data: result,
      timestamp: new Date(),
    });
  } catch (error) {
    if (
      error.message === "Device not found" ||
      error.message === "Device is not connected to WhatsApp"
    ) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const fetchChatsFromBaileysStore = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const result = await whatsappService.fetchChatsFromBaileysStore(deviceId);
    res.json({
      success: true,
      data: result,
      timestamp: new Date(),
    });
  } catch (error) {
    if (
      error.message === "Device not found" ||
      error.message === "Device is not connected to WhatsApp"
    ) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};


export const fetchMessagesFromBaileysStore = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { limit } = req.query;
    const result = await whatsappService.chatHandler.fetchMessagesFromBaileysStore(
      deviceId,
      limit ? parseInt(limit) : 100
    );
    res.json(result); // result already has { success, messages, count }
  } catch (error) {
    if (
      error.message === "Device not found" ||
      error.message === "Device is not connected to WhatsApp"
    ) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const getChatHistory = async (req, res) => {
  try {
    const { deviceId, chatId } = req.params;
    const { limit = 100, before } = req.query;

    // Validate device exists
    const device = await validateDevice(deviceId, req.user);

    // Build where clause
    const whereClause = {
      deviceId: device.id,
      chatId: chatId,
    };

    // Add pagination by timestamp
    if (before) {
      whereClause.timestamp = { [Op.lt]: new Date(before) };
    }

    const messages = await ChatHistory.findAll({
      where: whereClause,
      order: [['timestamp', 'DESC']],
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      messages: messages,
      count: messages.length,
      chatId: chatId,
    });
  } catch (error) {
    if (error.message === "Device not found" || error.message === "Access denied to this device") {
      return res.status(error.message === "Device not found" ? 404 : 403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

// Update chat settings (labels, status, priority, AI toggle)
export const updateChatSettings = async (req, res) => {
  try {
    const { deviceId, chatId } = req.params;
    const updates = req.body;

    const device = await validateDevice(deviceId, req.user);

    const chatSettings = await ChatSettings.findOne({
      where: {
        deviceId: device.id,
        chatId: chatId,
      },
    });

    if (!chatSettings) {
      return res.status(404).json({ error: "Chat not found" });
    }

    // Allowed fields to update
    const allowedFields = [
      'labels', 'status', 'priority', 'notes', 'customerSegment',
      'aiEnabled', 'assignedAgentId', 'assignedAgentName', 'contactName', 'profilePictureUrl'
    ];

    const filteredUpdates = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }

    // If assigning agent, set timestamp
    if (updates.assignedAgentId) {
      filteredUpdates.assignedAt = new Date();
    }

    await chatSettings.update(filteredUpdates);

    res.json({
      success: true,
      message: "Chat settings updated",
      chatSettings: chatSettings.toJSON(),
    });
  } catch (error) {
    if (error.message === "Device not found" || error.message === "Access denied to this device") {
      return res.status(error.message === "Device not found" ? 404 : 403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

// Human takeover - disable AI for this chat
export const takeoverChat = async (req, res) => {
  try {
    const { deviceId, chatId } = req.params;
    const { agentId, agentName } = req.body;

    const device = await validateDevice(deviceId, req.user);

    const chatSettings = await ChatSettings.findOne({
      where: {
        deviceId: device.id,
        chatId: chatId,
      },
    });

    if (!chatSettings) {
      return res.status(404).json({ error: "Chat not found" });
    }

    await chatSettings.update({
      humanTakeover: true,
      humanTakeoverAt: new Date(),
      humanTakeoverBy: agentId || null,
      assignedAgentId: agentId || chatSettings.assignedAgentId,
      assignedAgentName: agentName || chatSettings.assignedAgentName,
    });

    res.json({
      success: true,
      message: "Human takeover activated - AI will not reply to this chat",
      chatSettings: chatSettings.toJSON(),
    });
  } catch (error) {
    if (error.message === "Device not found" || error.message === "Access denied to this device") {
      return res.status(error.message === "Device not found" ? 404 : 403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

// Release chat back to AI
export const releaseChat = async (req, res) => {
  try {
    const { deviceId, chatId } = req.params;

    const device = await validateDevice(deviceId, req.user);

    const chatSettings = await ChatSettings.findOne({
      where: {
        deviceId: device.id,
        chatId: chatId,
      },
    });

    if (!chatSettings) {
      return res.status(404).json({ error: "Chat not found" });
    }

    await chatSettings.update({
      humanTakeover: false,
      humanTakeoverAt: null,
      humanTakeoverBy: null,
    });

    res.json({
      success: true,
      message: "Chat released - AI will resume replying",
      chatSettings: chatSettings.toJSON(),
    });
  } catch (error) {
    if (error.message === "Device not found" || error.message === "Access denied to this device") {
      return res.status(error.message === "Device not found" ? 404 : 403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

// Handover chat to another agent
export const handoverChat = async (req, res) => {
  try {
    const { deviceId, chatId } = req.params;
    const { toAgentId, toAgentName, notes } = req.body;

    if (!toAgentId) {
      return res.status(400).json({ error: "toAgentId is required" });
    }

    const device = await validateDevice(deviceId, req.user);

    const chatSettings = await ChatSettings.findOne({
      where: {
        deviceId: device.id,
        chatId: chatId,
      },
    });

    if (!chatSettings) {
      return res.status(404).json({ error: "Chat not found" });
    }

    const previousAgent = chatSettings.assignedAgentId;

    await chatSettings.update({
      assignedAgentId: toAgentId,
      assignedAgentName: toAgentName || toAgentId,
      assignedAt: new Date(),
      notes: notes ? `${chatSettings.notes || ''}\n[Handover] ${previousAgent || 'Unassigned'} → ${toAgentId}: ${notes}` : chatSettings.notes,
    });

    res.json({
      success: true,
      message: `Chat handed over from ${previousAgent || 'unassigned'} to ${toAgentId}`,
      chatSettings: chatSettings.toJSON(),
    });
  } catch (error) {
    if (error.message === "Device not found" || error.message === "Access denied to this device") {
      return res.status(error.message === "Device not found" ? 404 : 403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const getCSDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const managerId = req.user.role === 'agent' ? req.user.managerId : userId;
    
    // Get all devices for this user (or manager if agent)
    const devices = await Device.findAll({ where: { userId: managerId } });
    const deviceIds = devices.map(d => d.id);

    // 1. Chat Statistics
    const stats = await ChatSettings.findAll({
      where: { deviceId: { [Op.in]: deviceIds } },
      attributes: ['status', 'priority', 'assignedAgentId']
    });

    const counts = {
      open: 0,
      pending: 0,
      resolved: 0,
      unassigned: 0,
      urgent: 0,
      total: stats.length
    };

    stats.forEach(s => {
      if (s.status === 'open') counts.open++;
      if (s.status === 'pending') counts.pending++;
      if (s.status === 'resolved') counts.resolved++;
      if (!s.assignedAgentId) counts.unassigned++;
      if (s.priority === 'urgent' || s.priority === 'high') counts.urgent++;
    });

    // 2. AI Statistics (Last 24 hours)
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const historyStats = await ChatHistory.findAll({
      where: {
        deviceId: { [Op.in]: deviceIds },
        timestamp: { [Op.gt]: last24h },
        direction: 'outgoing'
      },
      attributes: ['isAiGenerated']
    });

    const aiCount = historyStats.filter(h => h.isAiGenerated).length;
    const humanCount = historyStats.length - aiCount;

    // 3. Priority Queue (Top 10 urgent/open chats)
    const priorityQueue = await ChatSettings.findAll({
      where: {
        deviceId: { [Op.in]: deviceIds },
        status: { [Op.ne]: 'resolved' }
      },
      order: [
        [sequelize.literal("CASE WHEN priority = 'urgent' THEN 1 WHEN priority = 'high' THEN 2 ELSE 3 END")],
        ['updatedAt', 'DESC']
      ],
      limit: 10
    });

    res.json({
      counts,
      aiStats: {
        aiCount,
        humanCount,
        ratio: historyStats.length > 0 ? (aiCount / historyStats.length) * 100 : 0
      },
      priorityQueue
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ error: error.message });
  }
};
