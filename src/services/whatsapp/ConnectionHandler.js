/**
 * Connection Handler - Manages WebSocket connections and session event handlers
 * Extracted from WhatsAppService.js for better maintainability
 */

import { WebSocketServer } from "ws";
import { DisconnectReason } from "@whiskeysockets/baileys";
import config from "../../config/config.js";
import { Device, Contact, Chat } from "../../models/index.js";
import { getJakartaTime } from "../../utils/timeHelper.js";

class ConnectionHandler {
  constructor(whatsAppService) {
    this.service = whatsAppService;
    this.wss = null;
  }

  /**
   * Setup WebSocket server
   */
  setupWebSocket() {
    try {
      if (this.wss) {
        console.log("[WS] Closing existing WebSocket server");
        this.wss.close();
      }

      try {
        this.wss = new WebSocketServer({ port: config.wsPort });
        console.log(`[WS] WebSocket server started on port ${config.wsPort}`);
      } catch (wsError) {
        if (wsError.code === 'EADDRINUSE') {
          console.error(`[WS] WebSocket server error: Port ${config.wsPort} is already in use.`);
          throw new Error(`WebSocket port ${config.wsPort} is already in use.`);
        }
        throw wsError;
      }

      this.wss.on('error', (error) => {
        console.error('[WS] WebSocket server error:', error);
      });

      this.wss.on("connection", (ws, req) => {
        const token = new URL(req.url, "http://localhost").searchParams.get("token");
        console.log("[WS] New WebSocket connection attempt", {
          hasToken: !!token,
          url: req.url,
          timestamp: new Date().toISOString(),
        });

        if (token !== config.apiToken) {
          console.log("[WS] Invalid token, closing connection");
          ws.close(1008, "Invalid token");
          return;
        }

        console.log("[WS] Valid token, connection accepted");

        const subscribedSessions = new Set();

        ws.on("message", async (message) => {
          try {
            const data = JSON.parse(message.toString());
            console.log("[WS] Message received:", {
              type: data.type,
              sessionId: data.sessionId,
              timestamp: new Date().toISOString(),
            });

            if (data.type === "subscribe" && data.sessionId) {
              console.log(`[WS] Client subscribing to session: ${data.sessionId}`);

              const oldWs = this.service.wsClients.get(data.sessionId);
              if (oldWs && oldWs !== ws && oldWs.readyState === WebSocket.OPEN) {
                console.log(`[WS] Closing old WebSocket connection for session: ${data.sessionId}`);
                oldWs.close(1000, "New client subscribed");
              }

              this.service.wsClients.set(data.sessionId, ws);
              subscribedSessions.add(data.sessionId);

              const validation = await this.service.sessionManager.validateSession(data.sessionId);
              console.log(`[WS] Session validation result:`, {
                sessionId: data.sessionId,
                valid: validation.valid,
                status: validation.status,
              });

              if (validation.valid) {
                ws.send(JSON.stringify({
                  type: "connection",
                  sessionId: data.sessionId,
                  status: validation.status || "pending",
                  timestamp: new Date().toISOString(),
                }));
              }

              const qr = this.service.qrCodeCallbacks.get(data.sessionId);
              if (qr) {
                console.log(`[WS] Sending pending QR code for session: ${data.sessionId}`);
                try {
                  ws.send(JSON.stringify({
                    type: "qr",
                    sessionId: data.sessionId,
                    qr,
                    timestamp: new Date().toISOString(),
                  }));
                  console.log(`[WS] Successfully sent pending QR code for session: ${data.sessionId}`);
                } catch (error) {
                  console.error(`[WS] Failed to send pending QR code for session: ${data.sessionId}`, error);
                }
              }
            }
          } catch (error) {
            console.error("[WS] Message processing error:", error);
          }
        });

        ws.on("close", () => {
          console.log("[WS] Client disconnected. Cleaning up subscriptions:", Array.from(subscribedSessions));
          for (const sessionId of subscribedSessions) {
            if (this.service.wsClients.get(sessionId) === ws) {
              console.log(`[WS] Removing client from session: ${sessionId}`);
              this.service.wsClients.delete(sessionId);
            }
          }
          subscribedSessions.clear();
        });

        ws.on("error", (error) => {
          console.error("[WS] WebSocket client error:", error);
        });
      });

      this.wss.on("error", (error) => {
        console.error("[WS] WebSocket server error:", error);
      });
      
    } catch (error) {
      console.error("[WS] Error setting up WebSocket server:", error);
    }
  }

  /**
   * Broadcast session update to WebSocket clients
   */
  broadcastSessionUpdate(sessionId, status, additionalData = {}) {
    try {
      const ws = this.service.wsClients.get(sessionId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        const now = getJakartaTime();
        const message = JSON.stringify({
          type: "session_update",
          sessionId,
          status,
          timestamp: now.toISOString(),
          ...additionalData,
        });

        console.log(`Broadcasting session update for ${sessionId}:`, {
          status,
          timestamp: now.toISOString(),
          ...additionalData,
        });

        ws.send(message, (error) => {
          if (error) {
            console.error(`Error broadcasting to session ${sessionId}:`, error);
            this.service.wsClients.delete(sessionId);
          }
        });
      } else {
        console.log(`No active WebSocket for session ${sessionId} (status: ${status})`);
      }
    } catch (error) {
      console.error(`Error in broadcastSessionUpdate for ${sessionId}:`, error);
    }
  }

  /**
   * Broadcast message update to WebSocket clients
   */
  broadcastMessageUpdate(sessionId, messageUpdate) {
    try {
      const ws = this.service.wsClients.get(sessionId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "message_update",
          sessionId,
          data: messageUpdate,
          timestamp: new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error(`Error broadcasting message update for ${sessionId}:`, error);
    }
  }

  /**
   * Setup session event handlers for a Baileys socket
   * 
   * Per Baileys documentation at https://baileys.wiki/docs/socket/connecting:
   * - Listen for connection.update for QR and connection states
   * - Handle restartRequired by creating a new socket
   * - Save credentials on creds.update event
   */
  setupSessionHandlers(sock, sessionId, saveCreds) {
    // Handle connection updates
    sock.ev.on("connection.update", async (update) => {
      try {
        const { connection, lastDisconnect, qr } = update;
        console.log("Connection update:", {
          sessionId,
          connection,
          hasQR: !!qr,
          disconnectReason: lastDisconnect?.error?.message,
          statusCode: lastDisconnect?.error?.output?.statusCode,
          timestamp: new Date().toISOString(),
        });

        const device = await Device.findOne({ where: { sessionId } });

        if (!device) {
          // Device was deleted - clean up the session
          console.warn(`[CONNECTION] Device not found for session ${sessionId} - device may have been deleted`);
          // Clean up socket if it exists
          const existingSocket = this.service.sessions.get(sessionId);
          if (existingSocket) {
            try {
              existingSocket.ev.removeAllListeners();
              if (typeof existingSocket.end === 'function') {
                existingSocket.end(undefined);
              }
            } catch (e) {
              // Ignore cleanup errors
            }
            this.service.sessions.delete(sessionId);
          }
          this.service.stores.delete(sessionId);
          return;
        }

        // Handle connection open FIRST
        if (connection === "open") {
          this.service.sessionManager.resetReconnectAttempts(sessionId);
          this.service.qrAttempts.delete(sessionId);
          this.service.sessionManager.clearQRTimeout(sessionId);

          await device.update({
            status: "connected",
            lastConnection: getJakartaTime(),
            lastError: null,
          });

          this.broadcastSessionUpdate(sessionId, "connected");
          this.service.qrCodeCallbacks.delete(sessionId);

          console.log(`[CONNECTION] Session ${sessionId} successfully connected to WhatsApp`);
          return;
        }

        // Process QR codes if connection is NOT open
        if (qr && connection !== "open") {
          console.log(`[QR] Received new QR code for session ${sessionId}`);
          
          if (device.status === "connected") {
            console.log(`[QR] Device ${sessionId} was connected but credentials are invalid, requiring new QR scan`);
          }

          const maxQRAttempts = this.service.sessionManager.maxQRAttempts;
          const qrAttempts = this.service.qrAttempts.get(sessionId) || 0;

          if (qrAttempts >= maxQRAttempts) {
            console.log(`[QR] Session ${sessionId} has exceeded ${maxQRAttempts} QR attempts, stopping`);

            await device.update({
              status: "error",
              lastError: "QR code scan timeout - please try again later",
              lastConnection: getJakartaTime(),
            });

            this.broadcastSessionUpdate(sessionId, "qr_timeout", {
              error: "QR code scan timeout - please try again later",
              message: "Maximum QR attempts reached",
            });

            await this.service.sessionManager.cleanupFailedSession(sessionId);
            return;
          }

          this.service.qrAttempts.set(sessionId, qrAttempts + 1);
          console.log(`[QR] QR attempt ${qrAttempts + 1}/${maxQRAttempts} for session ${sessionId}`);

          this.service.qrCodeCallbacks.set(sessionId, qr);

          await device.update({
            status: "pending",
            lastError: null,
            lastConnection: getJakartaTime(),
          });

          const ws = this.service.wsClients.get(sessionId);
          if (ws && ws.readyState === WebSocket.OPEN) {
            console.log(`[QR] Broadcasting QR code to WebSocket client for session ${sessionId}`);
            try {
              ws.send(JSON.stringify({
                type: "qr",
                sessionId,
                qr,
                attempt: qrAttempts + 1,
                maxAttempts: maxQRAttempts,
                timestamp: new Date().toISOString(),
              }));
              console.log(`[QR] Successfully sent QR code for session ${sessionId}`);
            } catch (wsError) {
              console.error(`[QR] Failed to send QR code via WebSocket for session ${sessionId}:`, wsError);
            }
          }

          this.broadcastSessionUpdate(sessionId, "pending", {
            hasQR: true,
            message: `Waiting for QR code scan (attempt ${qrAttempts + 1}/${maxQRAttempts})`,
            attempt: qrAttempts + 1,
            maxAttempts: maxQRAttempts,
          });
        }

        if (connection === "close") {
          await this.handleConnectionClose(sessionId, device, lastDisconnect);
        }
      } catch (error) {
        console.error(`Error handling connection update for session ${sessionId}:`, error);
      }
    });

    // Handle messages
    sock.ev.on("messages.upsert", async (m) => {
      // Broadcast to WebSocket clients
      try {
        const ws = this.service.wsClients.get(sessionId);
        if (ws && ws.readyState === WebSocket.OPEN && m.messages && m.messages.length > 0) {
          // Enrich messages with agent name for outgoing if available
          const enrichedMessages = m.messages.map(msg => {
            if (msg.key?.fromMe) {
              const meta = this.service.messageMetadata.get(msg.key.id);
              if (meta) {
                return { ...msg, agentName: meta.agentName };
              }
            }
            return msg;
          });

          ws.send(JSON.stringify({
            type: "messages.upsert",
            sessionId,
            data: { messages: enrichedMessages },
            timestamp: new Date().toISOString()
          }));
        }
      } catch (broadcastError) {
        console.error(`[WS] Error broadcasting messages.upsert for ${sessionId}:`, broadcastError);
      }

      if (m.type === "notify") {
        for (const msg of m.messages) {
          await this.service.messageHandler.handleIncomingMessage(sessionId, msg);
        }
      }
    });

    // Handle messaging history sync
    sock.ev.on("messaging-history.set", async ({ chats: newChats, contacts: newContacts, messages: newMessages, syncType }) => {
      try {
        const device = await Device.findOne({ where: { sessionId } });
        if (device) {
          await device.update({
            status: "synchronizing",
            lastConnection: getJakartaTime(),
          });
          this.broadcastSessionUpdate(sessionId, "synchronizing");
        }

        console.log(`[HISTORY-SYNC] Received messaging history for session ${sessionId}`);
        console.log(`[HISTORY-SYNC] syncType: ${syncType}, chats: ${newChats?.length || 0}, contacts: ${newContacts?.length || 0}, messages: ${newMessages?.length || 0}`);

        if (newContacts && newContacts.length > 0) {
          console.log(`[HISTORY-SYNC] Processing ${newContacts.length} contacts from messaging history`);

          const individualContacts = newContacts.filter(
            (contact) => contact.id && contact.id.endsWith("@s.whatsapp.net")
          );

          console.log(`[HISTORY-SYNC] Found ${individualContacts.length} individual contacts`);

          if (individualContacts.length > 0 && device) {
            const savedContacts = await this.service.contactHandler.saveHistoryContactsToDatabase(
              device.id,
              individualContacts
            );
            console.log(`[HISTORY-SYNC] Saved ${savedContacts.length} contacts from messaging history to database`);
          }
        }

        if (newChats && newChats.length > 0) {
          console.log(`[HISTORY-SYNC] Processing ${newChats.length} chats from messaging history`);

          const individualChats = newChats.filter(
            (chat) => chat.id && chat.id.endsWith("@s.whatsapp.net") && !chat.id.includes("@g.us")
          );

          console.log(`[HISTORY-SYNC] Found ${individualChats.length} individual chats`);

          if (individualChats.length > 0 && device) {
            const chatContacts = individualChats.map((chat) => ({
              id: chat.id,
              name: chat.name || chat.notify || chat.pushName || chat.displayName || "Unknown",
              notify: chat.notify,
              conversationTimestamp: chat.conversationTimestamp,
              unreadCount: chat.unreadCount,
            }));

            const savedChatContacts = await this.service.contactHandler.saveHistoryContactsToDatabase(
              device.id,
              chatContacts,
              "messaging_history_chats"
            );
            console.log(`[HISTORY-SYNC] Saved ${savedChatContacts.length} chat contacts from messaging history to database`);
          }
        }

        const syncDevice = await Device.findOne({ where: { sessionId } });
        if (syncDevice) {
          await syncDevice.update({
            status: "connected",
            lastConnection: getJakartaTime(),
          });
          this.broadcastSessionUpdate(sessionId, "connected");
          console.log(`[HISTORY-SYNC] Synchronization complete for session ${sessionId}`);
        }
      } catch (error) {
        console.error(`[HISTORY-SYNC] Error processing messaging history for session ${sessionId}:`, error);

        try {
          const errorDevice = await Device.findOne({ where: { sessionId } });
          if (errorDevice) {
            await errorDevice.update({
              status: "connected",
              lastConnection: getJakartaTime(),
              lastError: `Sync error: ${error.message}`,
            });
            this.broadcastSessionUpdate(sessionId, "connected");
          }
        } catch (statusError) {
          console.error(`[HISTORY-SYNC] Error updating status after sync failure:`, statusError);
        }
      }
    });

    // Contact/chat/group handlers if enabled
    if (config.database.saveContacts) {
      sock.ev.on("contacts.update", async (updates) => {
        for (const update of updates) {
          await this.service.contactHandler.updateContact(sessionId, update);
        }
      });

      sock.ev.on("chats.update", async (updates) => {
        for (const update of updates) {
          await this.service.chatHandler.updateChat(sessionId, update);
        }
      });

      sock.ev.on("groups.update", async (updates) => {
        for (const update of updates) {
          await this.service.groupHandler.updateGroup(sessionId, update);
        }
      });
    }

    // Save credentials
    sock.ev.on("creds.update", saveCreds);

    // Handle LID-PN mapping updates (Baileys v7.0.0+)
    sock.ev.on("lid-mapping.update", async (mappings) => {
      try {
        console.log(`[LID-MAPPING] Received ${mappings.length} LID-PN mappings for session ${sessionId}`);
        
        const device = await Device.findOne({ where: { sessionId } });
        if (!device) {
          console.error(`[LID-MAPPING] Device not found for session ${sessionId}`);
          return;
        }

        for (const mapping of mappings) {
          try {
            await this.service.contactHandler.saveLIDMapping(device, mapping);
          } catch (mappingError) {
            console.error(`[LID-MAPPING] Error saving mapping:`, mappingError);
          }
        }
        
        console.log(`[LID-MAPPING] Successfully processed ${mappings.length} mappings`);
      } catch (error) {
        console.error(`[LID-MAPPING] Error processing LID mappings:`, error);
      }
    });

    // Handle general socket errors
    sock.ev.on("error", (error) => {
      console.error(`Socket error for session ${sessionId}:`, error);
    });
  }

  /**
   * Handle connection close event
   * 
   * Per Baileys documentation at https://baileys.wiki/docs/socket/connecting:
   * - After scanning QR, WhatsApp will forcibly disconnect you (restartRequired)
   * - This is NOT an error - you must create a NEW socket
   * - The old socket is useless after restartRequired
   */
  async handleConnectionClose(sessionId, device, lastDisconnect) {
    const statusCode = lastDisconnect?.error?.output?.statusCode;
    let errorMessage = lastDisconnect?.error?.message;
    const maxQRAttempts = this.service.sessionManager.maxQRAttempts;
    const maxReconnectAttempts = this.service.sessionManager.maxReconnectAttempts;

    let shouldReconnect = true;
    let reconnectDelay = 0;
    let status = "disconnected";
    let isRestartRequired = false;

    // Check if intentional disconnect
    if (this.service.intentionalDisconnects.has(sessionId)) {
      shouldReconnect = false;
      status = "disconnected";
      console.log(`Session ${sessionId} was intentionally disconnected, preventing reconnection`);
      this.service.intentionalDisconnects.delete(sessionId);
    }
    else if (statusCode === DisconnectReason.loggedOut) {
      shouldReconnect = false;
      status = "logged_out";
      // Clear auth on logout
      console.log(`[LOGGED OUT] Session ${sessionId} was logged out, clearing credentials`);
      await this.service.sessionManager.cleanupFailedSession(sessionId);
    } else if (statusCode === 440 || statusCode === DisconnectReason.connectionReplaced) {
      shouldReconnect = false;
      status = "logged_out";
      console.log(`[LOGIN TIMEOUT] Session ${sessionId} received status 440 - connection replaced or login timeout`);
      await this.service.sessionManager.cleanupFailedSession(sessionId);
    } else if (statusCode === DisconnectReason.restartRequired) {
      // IMPORTANT: Per Baileys docs, this is normal after QR scan
      // We need to create a NEW socket - the old one is useless
      isRestartRequired = true;
      status = "reconnecting";
      // Short delay for restart required - this is expected behavior
      reconnectDelay = 1000;
      console.log(`[RESTART REQUIRED] Session ${sessionId} requires restart (normal after QR scan), creating new socket in ${reconnectDelay}ms`);
      // Reset reconnect attempts for restart required - it's not really a failure
      this.service.sessionManager.resetReconnectAttempts(sessionId);
    } else if (statusCode === DisconnectReason.timedOut || statusCode === 408) {
      status = "reconnecting";
      reconnectDelay = this.service.sessionManager.getReconnectDelay(sessionId, true);
      console.log(`[TIMEOUT] Session ${sessionId} timed out, reconnecting in ${reconnectDelay}ms`);
    } else if (statusCode === DisconnectReason.connectionLost) {
      status = "reconnecting";
      reconnectDelay = 2000;
      console.log(`[CONNECTION LOST] Session ${sessionId} connection lost, reconnecting in ${reconnectDelay}ms`);
    } else if (errorMessage?.includes("Intentional Logout")) {
      shouldReconnect = false;
      status = "disconnected";
      console.log(`Session ${sessionId} logged out intentionally, preventing reconnection`);
    } else if (statusCode === 401) {
      // 401 errors indicate authentication/authorization issues
      if (errorMessage?.includes("conflict") || errorMessage?.includes("device_removed")) {
        shouldReconnect = false;
        status = "logged_out";
        errorMessage = "WhatsApp session was terminated - device removed or session opened elsewhere";
        console.log(`[CONFLICT/DEVICE_REMOVED] Cleaning up session ${sessionId}`);
        await this.service.sessionManager.cleanupFailedSession(sessionId);
      } else if (errorMessage?.includes("Connection Failure")) {
        // 401 with Connection Failure means credentials are invalid
        shouldReconnect = false;
        status = "logged_out";
        errorMessage = "Authentication failed - please scan QR code again";
        console.log(`[AUTH FAILURE] Session ${sessionId} authentication failed, clearing credentials`);
        await this.service.sessionManager.cleanupFailedSession(sessionId);
      } else {
        shouldReconnect = false;
        status = "logged_out";
        errorMessage = "Authentication error - please reconnect";
        console.log(`[AUTH ERROR] Session ${sessionId} auth error: ${errorMessage}`);
        await this.service.sessionManager.cleanupFailedSession(sessionId);
      }
    } else if (errorMessage?.includes("Stream Errored")) {
      if (errorMessage.includes("conflict") || errorMessage.includes("device_removed")) {
        shouldReconnect = false;
        status = "logged_out";
        errorMessage = "WhatsApp session was terminated - device removed or opened elsewhere";
        console.log(`[STREAM CONFLICT] Cleaning up session ${sessionId}`);
        await this.service.sessionManager.cleanupFailedSession(sessionId);
      } else if (errorMessage.includes("restart required")) {
        // Stream Errored (restart required) - same as DisconnectReason.restartRequired
        isRestartRequired = true;
        status = "reconnecting";
        reconnectDelay = 1000;
        console.log(`[STREAM RESTART] Session ${sessionId} stream requires restart, creating new socket in ${reconnectDelay}ms`);
        this.service.sessionManager.resetReconnectAttempts(sessionId);
      } else {
        status = "reconnecting";
        reconnectDelay = this.service.sessionManager.getReconnectDelay(sessionId, true);
        console.log(`[STREAM ERROR] Stream error for ${sessionId}, reconnecting in ${reconnectDelay}ms`);
      }
    } else if (errorMessage?.includes("Connection Closed")) {
      status = "reconnecting";
      reconnectDelay = 1000;
    } else if (errorMessage?.includes("QR refs attempts ended")) {
      const qrAttempts = this.service.qrAttempts.get(sessionId) || 0;

      if (qrAttempts >= maxQRAttempts) {
        shouldReconnect = false;
        status = "error";
        errorMessage = "QR code scan timeout - please try again later";
        console.log(`Session ${sessionId} QR timeout after ${qrAttempts} attempts - FINAL STOP`);
        this.service.intentionalDisconnects.set(sessionId, true);
        this.service.qrAttempts.delete(sessionId);
        this.service.sessionManager.clearQRTimeout(sessionId);
      } else {
        this.service.qrAttempts.set(sessionId, qrAttempts + 1);
        status = "reconnecting";
        reconnectDelay = 2000;
        console.log(`Session ${sessionId} QR timeout, attempt ${qrAttempts + 1}/${maxQRAttempts}`);
      }
    }

    // Update device status
    await device.update({
      status,
      lastConnection: getJakartaTime(),
      lastError: errorMessage || null,
    });

    // Notify WebSocket clients
    const broadcastStatus = status === "error" && errorMessage?.includes("QR code scan timeout")
      ? "qr_timeout"
      : status;
    this.broadcastSessionUpdate(sessionId, broadcastStatus, {
      error: errorMessage,
      reconnectDelay,
      statusCode,
    });

    if (shouldReconnect) {
      const currentQRAttempts = this.service.qrAttempts.get(sessionId) || 0;
      const currentReconnectAttempts = this.service.reconnectAttempts.get(sessionId) || 0;

      if (currentQRAttempts >= maxQRAttempts) {
        console.log(`[RECONNECT] Skipping reconnection for ${sessionId} - already at max QR attempts`);
        this.service.intentionalDisconnects.set(sessionId, true);
      } else if (!isRestartRequired && currentReconnectAttempts >= maxReconnectAttempts) {
        // Only apply max reconnect limit for non-restart-required scenarios
        console.log(`[RECONNECT LIMIT] Session ${sessionId} reached max reconnection attempts - stopping`);
        this.service.intentionalDisconnects.set(sessionId, true);
        this.service.sessionManager.resetReconnectAttempts(sessionId);
        await device.update({
          status: "error",
          lastError: `Max reconnection attempts (${maxReconnectAttempts}) reached - please reconnect manually`,
        });
        this.broadcastSessionUpdate(sessionId, "reconnect_limit_reached", {
          error: `Max reconnection attempts (${maxReconnectAttempts}) reached`,
          message: "Please disconnect and reconnect the device manually",
          attempts: currentReconnectAttempts,
        });
      } else {
        // Check if already reconnecting to prevent duplicate attempts
        if (this.service.sessionManager.reconnectingLocks.get(sessionId)) {
          console.log(`[RECONNECT] Already reconnecting ${sessionId}, skipping schedule`);
          return;
        }

        if (!isRestartRequired) {
          this.service.reconnectAttempts.set(sessionId, currentReconnectAttempts + 1);
        }
        
        const attemptInfo = isRestartRequired 
          ? "(restart required - normal behavior)" 
          : `(attempt ${currentReconnectAttempts + 1}/${maxReconnectAttempts})`;
        console.log(`[RECONNECT] Scheduling reconnection for ${sessionId} ${attemptInfo} in ${reconnectDelay}ms`);
        
        setTimeout(async () => {
          try {
            console.log(`[RECONNECT] Creating new socket for session ${sessionId} ${attemptInfo}`);
            await this.service.sessionManager.reloadSession(sessionId);
          } catch (reconnectError) {
            console.error(`Failed to reconnect session ${sessionId}:`, reconnectError);
            const nextDelay = this.service.sessionManager.getReconnectDelay(sessionId, true);
            this.broadcastSessionUpdate(sessionId, "reconnect_failed", {
              error: reconnectError.message,
              nextAttempt: nextDelay,
              attempt: currentReconnectAttempts + 1,
              maxAttempts: maxReconnectAttempts,
            });
          }
        }, reconnectDelay);
      }
    } else if (status === "logged_out") {
      console.log(`Session ${sessionId} requires new QR scan`);
      this.broadcastSessionUpdate(sessionId, "requires_relogin", {
        error: errorMessage,
        message: "Session was terminated. Please scan QR code again to reconnect.",
      });
    }
  }
}

export default ConnectionHandler;

