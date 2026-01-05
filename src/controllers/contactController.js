import { ContactData, Device } from "../models/index.js";
import { Op } from "sequelize";
import whatsappService from "../services/WhatsAppService.js";

// Helper function to validate device exists
const validateDevice = async (deviceId) => {
  const device = await Device.findByPk(deviceId);
  if (!device) {
    throw new Error("Device not found");
  }
  return device;
};

export const getContacts = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = await validateDevice(deviceId);

    const contacts = await ContactData.findAll({
      where: {
        sessionId: device.sessionId,
        source: "contact",
      },
    });

    res.json({ contacts });
  } catch (error) {
    if (error.message === "Device not found") {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const getChats = async (req, res) => {
  try {
    const { deviceId } = req.params;

    // Validate device exists
    const device = await validateDevice(deviceId);

    const chats = await ContactData.findAll({
      where: {
        sessionId: device.sessionId,
        source: "chat",
      },
    });

    res.json({ chats });
  } catch (error) {
    if (error.message === "Device not found") {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const getGroups = async (req, res) => {
  try {
    const { deviceId } = req.params;

    // Validate device exists
    const device = await validateDevice(deviceId);

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
    if (error.message === "Device not found") {
      return res.status(404).json({ error: error.message });
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
