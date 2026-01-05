/**
 * WhatsApp Service - Main Orchestrator
 * Manages WhatsApp connections, sessions, and messaging
 * 
 * This service coordinates between specialized handlers:
 * - SessionManager: Session lifecycle (create, restore, close, validate)
 * - ConnectionHandler: WebSocket and connection events
 * - MessageHandler: Message sending and receiving
 * - ContactHandler: Contact management
 * - ChatHandler: Chat management
 * - GroupHandler: Group management
 * - StoreManager: Baileys data store operations
 */

import config from "../config/config.js";
import { Device } from "../models/index.js";
import AIService from "./AIService.js";
import { getJakartaTime, toJakartaTime } from "../utils/timeHelper.js";
import { Op } from "sequelize";

// Import handlers
import SessionManager from "./whatsapp/SessionManager.js";
import ConnectionHandler from "./whatsapp/ConnectionHandler.js";
import MessageHandler from "./whatsapp/MessageHandler.js";
import ContactHandler from "./whatsapp/ContactHandler.js";
import ChatHandler from "./whatsapp/ChatHandler.js";
import GroupHandler from "./whatsapp/GroupHandler.js";
import StoreManager from "./whatsapp/StoreManager.js";

class WhatsAppService {
  constructor() {
    // Core state maps
    this.sessions = new Map();
    this.qrCodeCallbacks = new Map();
    this.authStates = new Map();
    this.wsClients = new Map();
    this.stores = new Map();
    this.reconnectAttempts = new Map();
    this.reconnectTimers = new Map();
    this.intentionalDisconnects = new Map();
    this.qrAttempts = new Map();
    this.qrTimeouts = new Map();
    
    // External services
    this.io = null;
    this.aiService = new AIService();

    // Initialize handlers (they need reference to this service)
    this.sessionManager = new SessionManager(this);
    this.connectionHandler = new ConnectionHandler(this);
    this.messageHandler = new MessageHandler(this);
    this.contactHandler = new ContactHandler(this);
    this.chatHandler = new ChatHandler(this);
    this.groupHandler = new GroupHandler(this);
    this.storeManager = new StoreManager(this);

    // Start periodic memory cleanup
    this.startMemoryCleanup();
  }

  /**
   * Initialize the WhatsApp service
   * Cleans up old sessions and restores previously connected devices
   */
  async init() {
    try {
      // Clean up old pending sessions first
      console.log("Cleaning up old pending sessions...");
      const now = getJakartaTime();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

      console.log("Current Jakarta time:", now.toISOString());
      console.log("Cleaning sessions older than:", thirtyMinutesAgo.toISOString());

      // Fix any future dates
      const [fixedFutureDates] = await Device.update(
        {
          lastConnection: now,
          lastError: "Fixed invalid future timestamp (normalized to Jakarta time)",
        },
        {
          where: {
            status: "pending",
            lastConnection: { [Op.gt]: now },
          },
        }
      );

      if (fixedFutureDates > 0) {
        console.log(`Fixed ${fixedFutureDates} devices with future timestamps`);
      }

      // Clean up old pending sessions
      const [updatedCount] = await Device.update(
        {
          status: "logged_out",
          lastError: "Session expired (Jakarta time)",
          lastConnection: now,
        },
        {
          where: {
            status: "pending",
            lastConnection: {
              [Op.lt]: thirtyMinutesAgo,
              [Op.lte]: now,
            },
          },
        }
      );
      console.log(`Cleaned up ${updatedCount} old pending sessions`);

      // Log remaining pending sessions
      const pendingSessions = await Device.findAll({
        where: { status: "pending" },
        attributes: ["sessionId", "lastConnection", "lastError"],
      });

      console.log(
        "Remaining pending sessions:",
        pendingSessions.map((session) => ({
          sessionId: session.sessionId,
          lastConnection: toJakartaTime(session.lastConnection),
          lastError: session.lastError,
        }))
      );

      // Get all devices that should be auto-reconnected
      console.log("[INIT] Looking for devices to auto-reconnect...");
      const devices = await Device.findAll({
        where: {
          status: { [Op.in]: ["connected"] },
        },
      });

      console.log(`[INIT] Found ${devices.length} connected devices to restore`);

      // Log all devices for debugging
      const allDevices = await Device.findAll({
        attributes: ["sessionId", "status", "lastConnection"],
      });
      console.log(
        `[INIT] All devices in database:`,
        allDevices.map((d) => ({
          sessionId: d.sessionId,
          status: d.status,
          lastConnection: d.lastConnection,
        }))
      );

      // Initialize sessions for each device
      for (const device of devices) {
        try {
          console.log(`[AUTO-RECONNECT] Processing device ${device.sessionId} with status: ${device.status}`);

          if (device.status === "connected") {
            console.log(`[AUTO-RECONNECT] Restoring previously connected session: ${device.sessionId}`);
            await this.sessionManager.restoreSession(device.sessionId, device, true);
          } else {
            console.log(`[AUTO-RECONNECT] Restore session: ${device.sessionId}`);
            await this.sessionManager.restoreSession(device.sessionId, device);
          }
        } catch (error) {
          console.error(`Failed to restore session ${device.sessionId}:`, error);
          await device.update({
            status: "error",
            lastError: error.message,
            lastConnection: now,
          });
        }
      }

      // Setup WebSocket server
      this.connectionHandler.setupWebSocket();
    } catch (error) {
      console.error("Failed to initialize WhatsAppService:", error);
    }
  }

  // ==================== SESSION MANAGEMENT (delegated to SessionManager) ====================

  async getAuthState(sessionId) {
    return this.sessionManager.getAuthState(sessionId);
  }

  generateSessionId(userId, alias) {
    return this.sessionManager.generateSessionId(userId, alias);
  }

  async createSession(userId, alias, phoneNumber = null) {
    return this.sessionManager.createSession(userId, alias, phoneNumber);
  }

  async restoreSession(sessionId, device = null, preserveStatus = false) {
    return this.sessionManager.restoreSession(sessionId, device, preserveStatus);
  }

  async closeSession(sessionId) {
    return this.sessionManager.closeSession(sessionId);
  }

  async cancelSession(sessionId) {
    return this.sessionManager.cancelSession(sessionId);
  }

  async cleanupFailedSession(sessionId) {
    return this.sessionManager.cleanupFailedSession(sessionId);
  }

  async validateSession(sessionId) {
    return this.sessionManager.validateSession(sessionId);
  }

  async getSessionWithStatus(sessionId) {
    return this.sessionManager.getSessionWithStatus(sessionId);
  }

  async reloadSession(sessionId) {
    return this.sessionManager.reloadSession(sessionId);
  }

  async reloginSession(sessionId) {
    return this.sessionManager.reloginSession(sessionId);
  }

  async logoutSession(sessionId) {
    return this.sessionManager.logoutSession(sessionId);
  }

  async logoutSessionWithAuthClear(sessionId) {
    return this.sessionManager.logoutSessionWithAuthClear(sessionId);
  }

  async getAllSessions() {
    return this.sessionManager.getAllSessions();
  }

  async getUserDevices(userId) {
    return this.sessionManager.getUserDevices(userId);
  }

  getSession(sessionId) {
    return this.sessionManager.getSession(sessionId);
  }

  isSessionActive(sessionId) {
    return this.sessionManager.isSessionActive(sessionId);
  }

  async validateConnection(deviceId) {
    return this.sessionManager.validateConnection(deviceId);
  }

  getReconnectDelay(sessionId, increment = false) {
    return this.sessionManager.getReconnectDelay(sessionId, increment);
  }

  resetReconnectAttempts(sessionId) {
    return this.sessionManager.resetReconnectAttempts(sessionId);
  }

  clearQRTimeout(sessionId) {
    return this.sessionManager.clearQRTimeout(sessionId);
  }

  async getCurrentQR(sessionId) {
    return this.sessionManager.getCurrentQR(sessionId);
  }

  resetQRAttempts(sessionId) {
    return this.sessionManager.resetQRAttempts(sessionId);
  }

  // ==================== CONNECTION MANAGEMENT (delegated to ConnectionHandler) ====================

  setupWebSocket() {
    return this.connectionHandler.setupWebSocket();
  }

  broadcastSessionUpdate(sessionId, status, additionalData = {}) {
    return this.connectionHandler.broadcastSessionUpdate(sessionId, status, additionalData);
  }

  setupSessionHandlers(sock, sessionId, saveCreds) {
    return this.connectionHandler.setupSessionHandlers(sock, sessionId, saveCreds);
  }

  // ==================== MESSAGE HANDLING (delegated to MessageHandler) ====================

  async handleIncomingMessage(sessionId, message) {
    return this.messageHandler.handleIncomingMessage(sessionId, message);
  }

  async sendNaturalReply(sessionId, recipient, messageKey, replyContent) {
    return this.messageHandler.sendNaturalReply(sessionId, recipient, messageKey, replyContent);
  }

  async sendMessage(sessionId, recipient, message) {
    return this.messageHandler.sendMessage(sessionId, recipient, message);
  }

  async sendImage(sessionId, recipient, imageBuffer, caption = "", mimetype = "image/jpeg") {
    return this.messageHandler.sendImage(sessionId, recipient, imageBuffer, caption, mimetype);
  }

  async sendVideo(sessionId, recipient, buffer, caption = "") {
    return this.messageHandler.sendVideo(sessionId, recipient, buffer, caption);
  }

  async sendDocument(sessionId, recipient, buffer, fileName) {
    return this.messageHandler.sendDocument(sessionId, recipient, buffer, fileName);
  }

  shouldUseAI(chatSettings, device) {
    return this.messageHandler.shouldUseAI(chatSettings, device);
  }

  async shouldUseAutoReply(chatSettings, device) {
    return this.messageHandler.shouldUseAutoReply(chatSettings, device);
  }

  cleanImageCaption(caption) {
    return this.messageHandler.cleanImageCaption(caption);
  }

  // ==================== CONTACT MANAGEMENT (delegated to ContactHandler) ====================

  async updateContact(sessionId, update) {
    return this.contactHandler.updateContact(sessionId, update);
  }

  async getContacts(deviceId) {
    return this.contactHandler.getContacts(deviceId);
  }

  async fetchLiveContacts(deviceId) {
    return this.contactHandler.fetchLiveContacts(deviceId);
  }

  async fetchDirectContacts(deviceId) {
    return this.contactHandler.fetchDirectContacts(deviceId);
  }

  async getProfilePicture(deviceId, jid) {
    return this.contactHandler.getProfilePicture(deviceId, jid);
  }

  async getPresenceStatus(deviceId, jid) {
    return this.contactHandler.getPresenceStatus(deviceId, jid);
  }

  async getBusinessProfile(deviceId, jid) {
    return this.contactHandler.getBusinessProfile(deviceId, jid);
  }

  async saveContactsToDatabase(deviceId, contacts) {
    return this.contactHandler.saveContactsToDatabase(deviceId, contacts);
  }

  async saveHistoryContactsToDatabase(deviceId, contacts, source = "messaging_history") {
    return this.contactHandler.saveHistoryContactsToDatabase(deviceId, contacts, source);
  }

  async saveContactsToBaileysTable(device, contacts, source) {
    return this.contactHandler.saveContactsToBaileysTable(device, contacts, source);
  }

  async saveLIDMapping(device, mapping) {
    return this.contactHandler.saveLIDMapping(device, mapping);
  }

  async getContactByIdOrLID(sessionId, identifier) {
    return this.contactHandler.getContactByIdOrLID(sessionId, identifier);
  }

  async fetchContactsFromBaileysStore(deviceId) {
    return this.contactHandler.fetchContactsFromBaileysStore(deviceId);
  }

  async fetchRealContactsFromDatabase(deviceId) {
    return this.contactHandler.fetchRealContactsFromDatabase(deviceId);
  }

  normalizeJIDForSending(jid, contact = null) {
    if (!jid) return null;
    
    if (jid.includes("@s.whatsapp.net") || jid.includes("@g.us")) {
      return jid;
    }
    
    if (jid.includes("@lid") && contact?.pn) {
      console.log(`[JID-NORMALIZE] Converting LID ${jid} to PN ${contact.pn}`);
      return contact.pn;
    }
    
    return jid;
  }

  // ==================== CHAT MANAGEMENT (delegated to ChatHandler) ====================

  async updateChat(sessionId, update) {
    return this.chatHandler.updateChat(sessionId, update);
  }

  async getChats(deviceId) {
    return this.chatHandler.getChats(deviceId);
  }

  async fetchLiveChats(deviceId) {
    return this.chatHandler.fetchLiveChats(deviceId);
  }

  async fetchDirectChats(deviceId) {
    return this.chatHandler.fetchDirectChats(deviceId);
  }

  async getMessages(sessionId, remoteJid, limit = 50, before = null) {
    return this.chatHandler.getMessages(sessionId, remoteJid, limit, before);
  }

  async saveChatsToBaileysTable(device, chats, source) {
    return this.chatHandler.saveChatsToBaileysTable(device, chats, source);
  }

  async fetchChatsFromBaileysTable(deviceId) {
    return this.chatHandler.fetchChatsFromBaileysTable(deviceId);
  }

  async fetchChatsFromBaileysStore(deviceId) {
    return this.chatHandler.fetchChatsFromBaileysStore(deviceId);
  }

  // ==================== GROUP MANAGEMENT (delegated to GroupHandler) ====================

  async updateGroup(sessionId, update) {
    return this.groupHandler.updateGroup(sessionId, update);
  }

  async getGroups(sessionId) {
    return this.groupHandler.getGroups(sessionId);
  }

  async getGroupMembers(deviceId, groupId) {
    return this.groupHandler.getGroupMembers(deviceId, groupId);
  }

  async fetchLiveGroups(deviceId) {
    return this.groupHandler.fetchLiveGroups(deviceId);
  }

  async fetchDirectGroups(deviceId) {
    return this.groupHandler.fetchDirectGroups(deviceId);
  }

  async fetchGroupMembersDetailed(deviceId, groupId) {
    return this.groupHandler.fetchGroupMembersDetailed(deviceId, groupId);
  }

  async getGroupMembersSelective(deviceId, groupId) {
    return this.groupHandler.getGroupMembersSelective(deviceId, groupId);
  }

  // ==================== STORE MANAGEMENT (delegated to StoreManager) ====================

  createDataStore(sessionId) {
    return this.storeManager.createDataStore(sessionId);
  }

  async getSocketMethods(deviceId) {
    return this.storeManager.getSocketMethods(deviceId);
  }

  async syncWhatsAppData(deviceId) {
    return this.storeManager.syncWhatsAppData(deviceId);
  }

  async quickSyncLimited(deviceId) {
    return this.storeManager.quickSyncLimited(deviceId);
  }

  async fetchAndSaveContacts(deviceId, saveToDb = false) {
    return this.storeManager.fetchAndSaveContacts(deviceId, saveToDb);
  }

  // ==================== MEMORY CLEANUP ====================

  /**
   * Start periodic memory cleanup to remove expired conversation memories
   */
  startMemoryCleanup() {
    const cleanupInterval = config.ai.memoryCleanupInterval * 1000;

    setInterval(async () => {
      try {
        await this.aiService.cleanupExpiredMemories();
        console.log("✅ Conversation memory cleanup completed");
      } catch (error) {
        console.error("❌ Error during memory cleanup:", error);
      }
    }, cleanupInterval);

    console.log(`🧹 Memory cleanup scheduled every ${config.ai.memoryCleanupInterval} seconds`);
  }
}

// Create singleton instance
const whatsAppService = new WhatsAppService();
export default whatsAppService;
