/**
 * Session Manager - Handles WhatsApp session lifecycle
 * Extracted from WhatsAppService.js for better maintainability
 */

import {
  default as makeWASocket,
  DisconnectReason,
} from "@whiskeysockets/baileys";
import P from "pino";
import config from "../../config/config.js";
import { Device, Message, ContactData, sequelize } from "../../models/index.js";
import { getJakartaTime, toJakartaTime } from "../../utils/timeHelper.js";
import { Op } from "sequelize";
import { useCustomMySQLAuthState } from "./MySQLAuthState.js";

class SessionManager {
  constructor(whatsAppService) {
    this.service = whatsAppService;
    this.maxQRAttempts = 3;
    this.maxReconnectAttempts = 10;
    this.reconnectingLocks = new Map(); // Prevent concurrent reconnections
  }

  /**
   * Helper function to get the MySQL auth state for the session
   * Uses custom MySQL auth state handler for better reliability
   */
  async getAuthState(sessionId) {
    console.log(`Using custom MySQL auth state for session ${sessionId}`);
    return await useCustomMySQLAuthState(sessionId);
  }

  /**
   * Generate a session ID from userId and alias
   */
  generateSessionId(userId, alias) {
    return `${userId}-${alias}`;
  }

  /**
   * Create a new WhatsApp session
   */
  async createSession(userId, alias, phoneNumber = null) {
    try {
      // Check if a device with this userId and alias already exists
      const existingDevice = await Device.findOne({
        where: { userId, alias },
      });

      if (existingDevice) {
        // If device exists, cancel its session first (preserve device record)
        await this.cancelSession(existingDevice.sessionId);
        // Update the existing device instead of creating a new one
        await existingDevice.update({
          phoneNumber,
          status: "pending",
          lastConnection: getJakartaTime(),
        });
        // Use existing sessionId
        const sessionId = existingDevice.sessionId;
        await this.initializeSession(sessionId, existingDevice);
        return {
          sessionId,
          wsEndpoint: `ws://localhost:${config.wsPort}?token=${config.apiToken}`,
        };
      }

      // Create a structured session ID without timestamp
      const sessionId = this.generateSessionId(userId, alias);

      // Create device record
      const device = await Device.create({
        userId,
        sessionId,
        alias,
        phoneNumber,
        status: "pending",
        lastConnection: getJakartaTime(),
      });

      await this.initializeSession(sessionId, device);

      return {
        sessionId,
        wsEndpoint: `ws://localhost:${config.wsPort}?token=${config.apiToken}`,
      };
    } catch (error) {
      console.error("Error creating WhatsApp session:", error);
      throw error;
    }
  }

  /**
   * Initialize a WhatsApp session
   * 
   * Per Baileys documentation at https://baileys.wiki/docs/socket/connecting:
   * - Pass auth state to makeWASocket
   * - Listen for creds.update event to save credentials
   * - Handle connection.update for QR and connection states
   */
  async initializeSession(sessionId, device) {
    const { state, saveCreds } = await this.getAuthState(sessionId);
    
    // Hardcoded WhatsApp Web version for stability (from Baileys defaults)
    const WHATSAPP_VERSION = [2, 3000, 1027934701];
    console.log(`[SESSION] Initializing session ${sessionId} with WA version ${WHATSAPP_VERSION.join(".")}`);

    // Create Baileys data store for this session
    const store = this.service.storeManager.createDataStore(sessionId);
    console.log(`[BAILEYS-STORE] Created store for new session ${sessionId}`);

    const sock = makeWASocket({
      version: WHATSAPP_VERSION,
      printQRInTerminal: false,
      auth: state,
      defaultQueryTimeoutMs: undefined,
      syncFullHistory: true,
      logger: P({ level: "silent" }),
      markOnlineOnConnect: false,
      connectTimeoutMs: 30000,
    });

    // Bind the store to listen to socket events
    store.bind(sock.ev);
    console.log(`[BAILEYS-STORE] Store successfully bound to socket for ${sessionId}`);

    // Set up event handlers - including creds.update handler as per Baileys docs
    this.service.connectionHandler.setupSessionHandlers(sock, sessionId, saveCreds);

    // Store the session
    this.service.sessions.set(sessionId, sock);
    console.log(`[SESSION] Session ${sessionId} initialized and stored`);
  }

  /**
   * Restore an existing session
   * 
   * Per Baileys documentation at https://baileys.wiki/docs/socket/connecting:
   * - If valid credentials are available, it'll connect without QR
   * - The creds.update event triggers every time creds are updated
   */
  async restoreSession(sessionId, device = null, preserveStatus = false) {
    try {
      // Clean up any existing session first
      const existingSession = this.service.sessions.get(sessionId);
      if (existingSession) {
        console.log(`[RESTORE] Cleaning up existing socket for ${sessionId}`);
        try {
          existingSession.ev.removeAllListeners();
          if (typeof existingSession.end === 'function') {
            existingSession.end(undefined);
          }
        } catch (e) {
          console.warn(`[RESTORE] Error cleaning up old socket: ${e.message}`);
        }
        this.service.sessions.delete(sessionId);
        this.service.stores.delete(sessionId);
      }

      const { state, saveCreds } = await this.getAuthState(sessionId);
      
      // Hardcoded WhatsApp Web version for stability
      const WHATSAPP_VERSION = [2, 3000, 1027934701];
      console.log(`[RESTORE] Restoring session ${sessionId} with WA version ${WHATSAPP_VERSION.join(".")}`);

      if (device) {
        const wasConnected = device.status === "connected";
        const shouldPreserve = preserveStatus && wasConnected;
        
        if (!shouldPreserve) {
          await device.update({
            status: "connecting",
            lastError: null,
            lastConnection: getJakartaTime(),
          });
          this.service.connectionHandler.broadcastSessionUpdate(sessionId, "connecting");
        } else {
          console.log(`[RESTORE] Preserving "connected" status for ${sessionId} during restoration`);
          await device.update({
            lastConnection: getJakartaTime(),
          });
        }
      }

      // Create Baileys data store for this session
      const store = this.service.storeManager.createDataStore(sessionId);
      console.log(`[RESTORE] Created store for ${sessionId}`);

      const sock = makeWASocket({
        version: WHATSAPP_VERSION,
        printQRInTerminal: false,
        auth: state,
        defaultQueryTimeoutMs: undefined,
        connectTimeoutMs: 30000,
        syncFullHistory: true,
        markOnlineOnConnect: false,
        logger: P({ level: "silent" }),
      });

      // Bind store to socket
      store.bind(sock.ev);
      console.log(`[RESTORE] Store bound to socket for ${sessionId}`);

      // Set up event handlers - including creds.update as per Baileys docs
      this.service.connectionHandler.setupSessionHandlers(sock, sessionId, saveCreds);

      // Store the session
      this.service.sessions.set(sessionId, sock);
      console.log(`[RESTORE] Session ${sessionId} restored and stored`);

      return true;
    } catch (error) {
      console.error(`[RESTORE] Failed to restore session ${sessionId}:`, error);

      let status = "error";
      let errorMessage = error.message;

      if (error.message.includes("auth")) {
        status = "auth_failed";
        errorMessage = "Authentication failed";
      }

      if (device) {
        await device.update({
          status,
          lastError: errorMessage,
          lastConnection: getJakartaTime(),
        });
        this.service.connectionHandler.broadcastSessionUpdate(sessionId, status, {
          error: errorMessage,
        });
      }

      await this.cleanupFailedSession(sessionId);
      return false;
    }
  }

  /**
   * Close and delete a session completely
   */
  async closeSession(sessionId) {
    try {
      this.service.intentionalDisconnects.set(sessionId, true);

      const { valid, session, device } = await this.validateSession(sessionId);

      if (!valid) {
        throw new Error("Session not found or already closed");
      }

      if (device) {
        await device.update({
          status: "disconnecting",
          lastConnection: getJakartaTime(),
        });
        this.service.connectionHandler.broadcastSessionUpdate(sessionId, "disconnecting");
      }

      if (session) {
        try {
          if (session.ws && session.ws.readyState === WebSocket.OPEN) {
            await session.logout();
            console.log(`Session ${sessionId} logged out successfully`);
          } else {
            console.log(`Session ${sessionId} WebSocket already closed, skipping logout`);
          }
        } catch (error) {
          if (error.message === "Connection Closed") {
            console.log(`Session ${sessionId} already disconnected, logout skipped`);
          } else {
            console.warn(`Error during session logout for ${sessionId}:`, error.message);
          }
        }

        try {
          session.end(true);
        } catch (endError) {
          if (!endError.message.includes("WebSocket was closed")) {
            console.warn(`Error ending session ${sessionId}:`, endError.message);
          }
        }
      }

      // Clean up all resources
      this.service.sessions.delete(sessionId);
      this.service.qrCodeCallbacks.delete(sessionId);
      this.service.stores.delete(sessionId);

      // Close WebSocket connections
      const ws = this.service.wsClients.get(sessionId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "connection",
          sessionId,
          status: "deleted",
        }));
        ws.close();
      }
      this.service.wsClients.delete(sessionId);

      // Clean up auth state
      try {
        const authState = await this.getAuthState(sessionId);
        if (authState && typeof authState.removeCreds === "function") {
          await authState.removeCreds();
          console.log(`Auth credentials removed for session ${sessionId}`);
        }
      } catch (authError) {
        console.warn(`Failed to remove auth credentials for session ${sessionId}:`, authError.message);
      }

      // Clean up database records
      await sequelize.transaction(async (t) => {
        await Promise.all([
          Message.destroy({ where: { sessionId }, transaction: t }),
          ContactData.destroy({ where: { sessionId }, transaction: t }),
          device?.destroy({ transaction: t }),
        ]);
      });

      return true;
    } catch (error) {
      console.error(`Error closing session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel a session (keep device record)
   */
  async cancelSession(sessionId) {
    try {
      this.service.intentionalDisconnects.set(sessionId, true);

      const { valid, session, device } = await this.validateSession(sessionId);

      if (!valid) {
        throw new Error("Session not found or already closed");
      }

      if (session) {
        try {
          if (session.ws && session.ws.readyState === WebSocket.OPEN) {
            await session.logout();
          } else {
            console.warn(`Session ${sessionId} does not have an active WebSocket connection, skipping logout`);
          }
        } catch (error) {
          console.warn(`Error during session logout for ${sessionId}:`, error);
          try {
            if (typeof session.end === "function" && session.ws && session.ws.readyState === WebSocket.OPEN) {
              session.end(true);
            }
          } catch (endError) {
            console.warn(`Error ending session ${sessionId}:`, endError);
          }
        }
      }

      // Clean up memory resources
      this.service.sessions.delete(sessionId);
      this.service.qrCodeCallbacks.delete(sessionId);
      this.service.stores.delete(sessionId);

      // Close WebSocket
      const ws = this.service.wsClients.get(sessionId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "connection",
          sessionId,
          status: "cancelled",
        }));
        ws.close();
      }
      this.service.wsClients.delete(sessionId);

      // Clean up auth state
      try {
        const authState = await this.getAuthState(sessionId);
        if (authState && typeof authState.removeCreds === "function") {
          await authState.removeCreds();
          console.log(`Auth credentials removed for session ${sessionId}`);
        }
      } catch (authError) {
        console.warn(`Failed to remove auth credentials for session ${sessionId}:`, authError.message);
      }

      // Clean up session-related data only
      await sequelize.transaction(async (t) => {
        await Promise.all([
          Message.destroy({ where: { sessionId }, transaction: t }),
          ContactData.destroy({ where: { sessionId }, transaction: t }),
        ]);
      });

      return true;
    } catch (error) {
      console.error(`Error cancelling session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Clean up a failed session
   */
  async cleanupFailedSession(sessionId) {
    try {
      this.service.sessions.delete(sessionId);
      this.service.qrCodeCallbacks.delete(sessionId);

      const qrAttempts = this.service.qrAttempts.get(sessionId) || 0;

      if (qrAttempts >= this.maxQRAttempts) {
        console.log(`[CLEANUP] Preserving QR timeout state for ${sessionId} (${qrAttempts}/${this.maxQRAttempts})`);
        this.service.intentionalDisconnects.set(sessionId, true);
      } else {
        this.service.qrAttempts.delete(sessionId);
      }

      this.clearQRTimeout(sessionId);

      const ws = this.service.wsClients.get(sessionId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      this.service.wsClients.delete(sessionId);

      try {
        const authState = await this.getAuthState(sessionId);
        if (authState && typeof authState.removeCreds === "function") {
          await authState.removeCreds();
          console.log(`Auth credentials removed for failed session ${sessionId}`);
        }
      } catch (authError) {
        console.warn(`Failed to remove auth credentials for failed session ${sessionId}:`, authError.message);
      }
    } catch (error) {
      console.error(`Error cleaning up failed session ${sessionId}:`, error);
    }
  }

  /**
   * Validate a session
   */
  async validateSession(sessionId) {
    if (!sessionId) {
      return { valid: false, error: "Session ID is required" };
    }

    try {
      const device = await Device.findOne({ where: { sessionId } });
      let session = this.service.sessions.get(sessionId);

      if (!device && !session) {
        return { valid: false, error: "Session not found" };
      }

      if (device && !session) {
        const qrAttempts = this.service.qrAttempts.get(sessionId) || 0;

        if (qrAttempts >= this.maxQRAttempts) {
          console.log(`[VALIDATE] Refusing to restore session ${sessionId} - already at max QR attempts`);
          return {
            valid: false,
            error: "Session in QR timeout state",
            status: "qr_timeout",
            device,
          };
        }

        try {
          const restored = await this.restoreSession(sessionId, device);
          if (restored) {
            session = this.service.sessions.get(sessionId);
          } else {
            return {
              valid: false,
              error: "Failed to restore session",
              status: device.status,
              device,
            };
          }
        } catch (restoreError) {
          console.error(`Error restoring session ${sessionId}:`, restoreError);
          return {
            valid: false,
            error: "Failed to restore session: " + restoreError.message,
            status: device.status,
            device,
          };
        }
      }

      if (session && !device) {
        const parts = sessionId.split("_");
        if (parts.length >= 5) {
          try {
            const newDevice = await Device.create({
              userId: parts[1],
              sessionId,
              alias: parts[3],
              status: "pending",
              lastConnection: getJakartaTime(),
            });
            return {
              valid: true,
              device: newDevice,
              session,
              status: "pending",
            };
          } catch (createError) {
            console.error(`Error creating device record for ${sessionId}:`, createError);
            return {
              valid: false,
              error: "Failed to create device record",
              session,
            };
          }
        } else {
          return {
            valid: false,
            error: "Invalid session ID format",
            session,
          };
        }
      }

      if (device && device.status !== "connected") {
        return {
          valid: false,
          error: `Device is ${device.status}. Please ensure device is connected before sending messages.`,
          status: device.status,
          device,
        };
      }

      return {
        valid: true,
        device,
        session,
        status: device ? device.status : "unknown",
      };
    } catch (error) {
      console.error(`Error validating session ${sessionId}:`, error);
      return {
        valid: false,
        error: `Session validation failed: ${error.message}`,
        errorDetails: error.stack,
      };
    }
  }

  /**
   * Get session with status
   */
  async getSessionWithStatus(sessionId) {
    try {
      const validation = await this.validateSession(sessionId);

      if (!validation.valid) {
        return {
          valid: false,
          status: validation.status || "error",
          error: validation.error || "Unknown error",
          session: null,
          device: validation.device || null,
        };
      }

      return {
        valid: true,
        session: validation.session,
        status: validation.status || "pending",
        device: validation.device,
        error: null,
      };
    } catch (error) {
      console.error(`Error getting session status for ${sessionId}:`, error);
      return {
        valid: false,
        status: "error",
        error: error?.message || "Failed to get session status",
        session: null,
        device: null,
      };
    }
  }

  /**
   * Reload a session - Creates a NEW socket (required per Baileys docs)
   * 
   * Per https://baileys.wiki/docs/socket/connecting:
   * After restartRequired, the old socket is useless and we must create a new one
   */
  async reloadSession(sessionId) {
    // Prevent concurrent reconnection attempts
    if (this.reconnectingLocks.get(sessionId)) {
      console.log(`[RELOAD] Already reconnecting ${sessionId}, skipping duplicate attempt`);
      return false;
    }
    this.reconnectingLocks.set(sessionId, true);

    try {
      // Get the device first - don't use validateSession as it may try to restore
      const device = await Device.findOne({ where: { sessionId } });
      if (!device) {
        console.log(`[RELOAD] No device found for session ${sessionId}`);
        return false;
      }

      const qrAttempts = this.service.qrAttempts.get(sessionId) || 0;

      if (qrAttempts >= this.maxQRAttempts) {
        console.log(`[RELOAD] Refusing to reload session ${sessionId} - already at max QR attempts`);
        this.service.intentionalDisconnects.set(sessionId, true);
        await device.update({
          status: "error",
          lastError: "QR code scan timeout - maximum attempts exceeded",
          lastConnection: getJakartaTime(),
        });
        return false;
      }

      // Clean up existing session properly - IMPORTANT for restartRequired
      const existingSession = this.service.sessions.get(sessionId);
      if (existingSession) {
        try {
          console.log(`[RELOAD] Cleaning up old socket for ${sessionId}`);
          // Remove event listeners FIRST to prevent duplicate events
          existingSession.ev.removeAllListeners();
          // End the session - don't logout, just end
          if (typeof existingSession.end === 'function') {
            existingSession.end(undefined);
          }
        } catch (endError) {
          console.warn(`[RELOAD] Error ending old socket for ${sessionId}:`, endError.message);
        }
        this.service.sessions.delete(sessionId);
      }

      // Also clean up the store to prevent stale data
      this.service.stores.delete(sessionId);

      // Small delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 300));

      // Update device status
      await device.update({
        status: "connecting",
        lastError: null,
        lastConnection: getJakartaTime(),
      });
      this.service.connectionHandler.broadcastSessionUpdate(sessionId, "connecting");

      // Get fresh auth state
      const { state, saveCreds } = await this.getAuthState(sessionId);
      
      // Hardcoded WhatsApp Web version for stability
      const WHATSAPP_VERSION = [2, 3000, 1027934701];
      console.log(`[RELOAD] Creating new socket for ${sessionId} with WA version ${WHATSAPP_VERSION.join(".")}`);

      // Create new Baileys data store
      const store = this.service.storeManager.createDataStore(sessionId);
      console.log(`[RELOAD] Created new store for ${sessionId}`);

      // Create NEW socket - this is required per Baileys docs
      const sock = makeWASocket({
        version: WHATSAPP_VERSION,
        printQRInTerminal: false,
        auth: state,
        defaultQueryTimeoutMs: undefined,
        markOnlineOnConnect: false,
        logger: P({ level: "silent" }),
        // Add connection timeout
        connectTimeoutMs: 30000,
      });

      // Bind store to new socket
      store.bind(sock.ev);
      console.log(`[RELOAD] Store bound to new socket for ${sessionId}`);

      // Setup event handlers for new socket
      this.service.connectionHandler.setupSessionHandlers(sock, sessionId, saveCreds);
      
      // Store the new session
      this.service.sessions.set(sessionId, sock);
      console.log(`[RELOAD] New socket created and stored for ${sessionId}`);

      return true;
    } catch (error) {
      console.error(`[RELOAD] Error reloading session ${sessionId}:`, error);
      const device = await Device.findOne({ where: { sessionId } });
      if (device) {
        await device.update({
          status: "error",
          lastError: error.message,
          lastConnection: getJakartaTime(),
        });
        this.service.connectionHandler.broadcastSessionUpdate(sessionId, "error", {
          error: error.message,
        });
      }
      return false;
    } finally {
      // Release the lock after a delay to prevent immediate re-trigger
      setTimeout(() => {
        this.reconnectingLocks.delete(sessionId);
      }, 3000);
    }
  }

  /**
   * Relogin a session (fresh login with new QR)
   * Clears credentials and starts fresh
   */
  async reloginSession(sessionId) {
    try {
      console.log(`[RELOGIN] Starting relogin process for session ${sessionId}`);

      // Reset QR attempts for fresh start
      this.resetQRAttempts(sessionId);
      this.service.intentionalDisconnects.delete(sessionId);
      this.resetReconnectAttempts(sessionId);

      // Clean up existing session
      const session = this.service.sessions.get(sessionId);
      if (session) {
        console.log(`[RELOGIN] Closing existing session for ${sessionId}`);
        try {
          session.ev.removeAllListeners();
          if (typeof session.end === 'function') {
            session.end(undefined);
          }
        } catch (error) {
          console.warn(`[RELOGIN] Error during session cleanup: ${error.message}`);
        }
        this.service.sessions.delete(sessionId);
      }
      this.service.stores.delete(sessionId);

      const device = await Device.findOne({ where: { sessionId } });
      if (device) {
        console.log(`[RELOGIN] Updating device status for ${sessionId}`);
        await device.update({
          status: "connecting",
          lastError: null,
          lastConnection: getJakartaTime(),
        });
      }

      // Get auth state and remove old credentials for fresh start
      console.log(`[RELOGIN] Removing existing credentials for ${sessionId}`);
      const { removeCreds } = await this.getAuthState(sessionId);
      if (typeof removeCreds === "function") {
        await removeCreds();
        console.log(`[RELOGIN] Credentials removed successfully for ${sessionId}`);
      }

      // Get fresh auth state (will initialize new credentials)
      const { state, saveCreds } = await this.getAuthState(sessionId);

      // Hardcoded WhatsApp Web version for stability
      const WHATSAPP_VERSION = [2, 3000, 1027934701];
      console.log(`[RELOGIN] Creating new WhatsApp session for ${sessionId}`);

      // Create new store
      const store = this.service.storeManager.createDataStore(sessionId);
      
      const sock = makeWASocket({
        version: WHATSAPP_VERSION,
        printQRInTerminal: false,
        auth: state,
        defaultQueryTimeoutMs: undefined,
        logger: P({ level: "silent" }),
        markOnlineOnConnect: false,
        connectTimeoutMs: 30000,
      });

      // Bind store
      store.bind(sock.ev);

      // Setup event handlers
      this.service.connectionHandler.setupSessionHandlers(sock, sessionId, saveCreds);

      this.service.sessions.set(sessionId, sock);

      console.log(`[RELOGIN] Relogin process completed for ${sessionId}`);
      return {
        sessionId,
        wsEndpoint: `ws://localhost:${config.wsPort}?token=${config.apiToken}`,
      };
    } catch (error) {
      console.error(`[RELOGIN] Error during relogin for ${sessionId}:`, error);
      const device = await Device.findOne({ where: { sessionId } });
      if (device) {
        await device.update({
          status: "error",
          lastError: error.message,
          lastConnection: getJakartaTime(),
        });
      }
      throw error;
    }
  }

  /**
   * Logout a session
   */
  async logoutSession(sessionId) {
    const validation = await this.validateSession(sessionId);
    if (!validation.valid) {
      return false;
    }

    try {
      if (validation.session) {
        try {
          if (validation.session.ws && validation.session.ws.readyState === WebSocket.OPEN) {
            await validation.session.logout();
          }
        } catch (logoutError) {
          console.warn(`Error during logout for ${sessionId}:`, logoutError.message);
        }
      }

      this.service.sessions.delete(sessionId);

      if (validation.device) {
        await validation.device.update({
          status: "logged_out",
          lastConnection: getJakartaTime(),
          lastError: null,
        });
      }

      const ws = this.service.wsClients.get(sessionId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "connection",
          sessionId,
          status: "logged_out",
        }));
      }

      return true;
    } catch (error) {
      console.error("Error logging out session:", error);
      if (validation.device) {
        await validation.device.update({
          status: "error",
          lastError: error.message,
          lastConnection: getJakartaTime(),
        });
      }
      throw error;
    }
  }

  /**
   * Logout session with auth clear
   */
  async logoutSessionWithAuthClear(sessionId) {
    const validation = await this.validateSession(sessionId);
    if (!validation.valid) {
      return false;
    }

    try {
      if (validation.session) {
        try {
          if (validation.session.ws && validation.session.ws.readyState === WebSocket.OPEN) {
            await validation.session.logout();
          }
        } catch (logoutError) {
          console.warn(`Error during logout for ${sessionId}:`, logoutError.message);
        }
      }

      this.service.sessions.delete(sessionId);

      try {
        const { removeCreds } = await this.getAuthState(sessionId);
        if (typeof removeCreds === "function") {
          await removeCreds();
          console.log(`Auth credentials cleared for session ${sessionId}`);
        }
      } catch (authError) {
        console.warn(`Failed to clear auth credentials for ${sessionId}:`, authError.message);
      }

      if (validation.device) {
        await validation.device.update({
          status: "logged_out",
          lastConnection: getJakartaTime(),
          lastError: null,
        });
      }

      const ws = this.service.wsClients.get(sessionId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "connection",
          sessionId,
          status: "logged_out",
        }));
      }

      return true;
    } catch (error) {
      console.error("Error logging out session with auth clear:", error);
      if (validation.device) {
        await validation.device.update({
          status: "error",
          lastError: error.message,
          lastConnection: getJakartaTime(),
        });
      }
      throw error;
    }
  }

  /**
   * Get all sessions
   */
  async getAllSessions() {
    try {
      const devices = await Device.findAll({
        attributes: ["sessionId", "userId", "alias", "status", "lastConnection"],
        where: {
          status: { [Op.ne]: "deleted" },
        },
      });

      return devices.map((d) => d.sessionId);
    } catch (error) {
      console.error("Error getting all sessions:", error);
      throw error;
    }
  }

  /**
   * Get user devices
   */
  async getUserDevices(userId) {
    return Device.findAll({
      where: { userId },
      order: [["lastConnection", "DESC"]],
    });
  }

  /**
   * Get session by ID
   */
  getSession(sessionId) {
    return this.service.sessions.get(sessionId);
  }

  /**
   * Check if session is active and connected
   */
  isSessionActive(sessionId) {
    const session = this.service.sessions.get(sessionId);
    return session && session.user && session.user.id;
  }

  /**
   * Get reconnection delay with exponential backoff
   */
  getReconnectDelay(sessionId, increment = false) {
    let attempts = this.service.reconnectAttempts.get(sessionId) || 0;
    if (increment) {
      attempts++;
      this.service.reconnectAttempts.set(sessionId, attempts);
    }

    const delay = Math.min(Math.pow(2, attempts) * 1000, 300000);
    return delay;
  }

  /**
   * Reset reconnection attempts
   */
  resetReconnectAttempts(sessionId) {
    this.service.reconnectAttempts.delete(sessionId);
  }

  /**
   * Clear QR timeout timer
   */
  clearQRTimeout(sessionId) {
    const timer = this.service.qrTimeouts.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.service.qrTimeouts.delete(sessionId);
    }
  }

  /**
   * Get current QR code for a session
   */
  async getCurrentQR(sessionId) {
    return this.service.qrCodeCallbacks.get(sessionId);
  }

  /**
   * Reset QR attempts for a session
   */
  resetQRAttempts(sessionId) {
    this.service.qrAttempts.delete(sessionId);
    this.clearQRTimeout(sessionId);
    console.log(`QR attempts reset for session ${sessionId}`);
  }

  /**
   * Validate connection for a device
   */
  async validateConnection(deviceId) {
    const device = await Device.findByPk(deviceId);
    if (!device) {
      throw new Error("Device not found");
    }

    const session = this.service.sessions.get(device.sessionId);
    if (!session) {
      throw new Error("Device is not connected to WhatsApp");
    }

    return { device, socket: session };
  }
}

export default SessionManager;

