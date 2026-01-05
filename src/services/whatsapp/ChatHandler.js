/**
 * Chat Handler - Manages WhatsApp chats
 * Extracted from WhatsAppService.js for better maintainability
 */

import { Device, ContactData, Chat, Message } from "../../models/index.js";

class ChatHandler {
  constructor(whatsAppService) {
    this.service = whatsAppService;
  }

  /**
   * Update chat from WhatsApp event
   */
  async updateChat(sessionId, update) {
    try {
      const device = await Device.findOne({ where: { sessionId } });
      if (!device) {
        console.error(`No device found for session ${sessionId}`);
        return;
      }

      const isGroup = update.id.endsWith("@g.us");

      // Skip broadcasts
      if (update.id.includes("status@broadcast") || update.id.includes("@broadcast")) {
        console.log(`Skipping broadcast/status update: ${update.id}`);
        return;
      }

      const phoneNumber = isGroup ? null : update.id.split("@")[0];

      // Validate phone number format
      if (!isGroup && phoneNumber) {
        if (!/^\+?[\d\s-]+$/.test(phoneNumber)) {
          console.log(`Skipping invalid phone number format: ${phoneNumber} from ID: ${update.id}`);
          return;
        }
      }

      await ContactData.upsert({
        userId: device.userId,
        sessionId,
        type: isGroup,
        phoneNumber,
        source: "chat",
        jid: update.id,
        lastSeen: new Date(),
      });
    } catch (error) {
      console.error("Error updating chat:", error);
    }
  }

  /**
   * Get chats for a device
   */
  async getChats(deviceId) {
    const { device, socket } = await this.service.sessionManager.validateConnection(deviceId);

    try {
      if (!socket.store || !socket.store.chats) {
        console.warn(`No chats store available for device ${deviceId}`);
        return [];
      }

      let chats;
      if (socket.store.chats.array && typeof socket.store.chats.array === "function") {
        chats = socket.store.chats.array();
      } else if (socket.store.chats instanceof Map) {
        chats = Array.from(socket.store.chats.values());
      } else {
        chats = Object.values(socket.store.chats);
      }

      return chats.map((chat) => ({
        jid: chat.id,
        whatsappName: chat.name || "",
        phoneNumber: chat.id.split("@")[0],
        type: chat.id.includes("@g.us"),
        unreadCount: chat.unreadCount || 0,
        timestamp: chat.conversationTimestamp ? new Date(chat.conversationTimestamp) : null,
        isReadOnly: chat.readOnly || false,
        isMuted: chat.mute > 0,
        lastMessageTimestamp: chat.lastMessageRecvTimestamp ? new Date(chat.lastMessageRecvTimestamp) : null,
      }));
    } catch (error) {
      console.error(`Error fetching chats for device ${deviceId}:`, error);
      throw new Error(`Failed to fetch chats: ${error.message}`);
    }
  }

  /**
   * Fetch live chats from WhatsApp
   */
  async fetchLiveChats(deviceId) {
    const { device, socket } = await this.service.sessionManager.validateConnection(deviceId);

    try {
      console.log(`[FETCH] Fetching live chats for device ${deviceId}`);

      let chats = [];

      if (socket.store && socket.store.chats) {
        let storeChats;
        if (socket.store.chats.array && typeof socket.store.chats.array === "function") {
          storeChats = socket.store.chats.array();
        } else if (socket.store.chats instanceof Map) {
          storeChats = Array.from(socket.store.chats.values());
        } else if (typeof socket.store.chats === "object") {
          storeChats = Object.values(socket.store.chats);
        }

        if (storeChats && storeChats.length > 0) {
          chats = storeChats.map((chat) => ({
            jid: chat.id,
            whatsappName: chat.name || chat.subject || "",
            phoneNumber: chat.id.split("@")[0],
            type: chat.id.includes("@g.us") ? "group" : "individual",
            unreadCount: chat.unreadCount || 0,
            timestamp: chat.conversationTimestamp ? new Date(chat.conversationTimestamp) : null,
            isReadOnly: chat.readOnly || false,
            isMuted: chat.mute > 0,
            lastMessageTimestamp: chat.lastMessageRecvTimestamp ? new Date(chat.lastMessageRecvTimestamp) : null,
            source: "store",
          }));
          console.log(`[FETCH] Found ${chats.length} chats from store`);
        }
      }

      if (chats.length === 0) {
        console.log(`[FETCH] Store empty, trying to fetch using available methods`);

        try {
          if (socket.query) {
            console.log(`[FETCH] Trying to use socket.query to populate chat store`);
            await socket.query({
              tag: "iq",
              attrs: { type: "get", xmlns: "w:chat" },
            });
          }
        } catch (queryError) {
          console.log(`[FETCH] Query method failed: ${queryError.message}`);
        }

        // Check store again after query
        if (socket.store && socket.store.chats) {
          let storeChats;
          if (socket.store.chats.array && typeof socket.store.chats.array === "function") {
            storeChats = socket.store.chats.array();
          } else if (socket.store.chats instanceof Map) {
            storeChats = Array.from(socket.store.chats.values());
          } else if (typeof socket.store.chats === "object") {
            storeChats = Object.values(socket.store.chats);
          }

          if (storeChats && storeChats.length > 0) {
            chats = storeChats.map((chat) => ({
              jid: chat.id,
              whatsappName: chat.name || chat.subject || "",
              phoneNumber: chat.id.split("@")[0],
              type: chat.id.includes("@g.us") ? "group" : "individual",
              unreadCount: chat.unreadCount || 0,
              timestamp: chat.conversationTimestamp ? new Date(chat.conversationTimestamp) : null,
              isReadOnly: chat.readOnly || false,
              isMuted: false,
              lastMessageTimestamp: null,
              source: "post_query",
            }));
            console.log(`[FETCH] Found ${chats.length} chats after query`);
          }
        }
      }

      console.log(`[FETCH] Total chats found: ${chats.length} for device ${deviceId}`);
      return chats;
    } catch (error) {
      console.error(`Error fetching live chats for device ${deviceId}:`, error);
      throw new Error(`Failed to fetch live chats: ${error.message}`);
    }
  }

  /**
   * Fetch direct chats using Baileys API
   */
  async fetchDirectChats(deviceId) {
    const { device, socket } = await this.service.sessionManager.validateConnection(deviceId);

    try {
      console.log(`[DIRECT] Fetching chats directly using available Baileys methods for device ${deviceId}`);

      const chats = [];

      if (socket.user && socket.user.id) {
        const myJid = socket.user.id;
        console.log(`[DIRECT] User JID: ${myJid}`);

        try {
          const myMessages = await socket.fetchMessageHistory(myJid, 5);
          console.log(`[DIRECT] Fetched ${myMessages?.length || 0} messages from self`);

          if (myMessages && myMessages.length > 0) {
            chats.push({
              jid: myJid,
              whatsappName: socket.user.name || "Me",
              phoneNumber: myJid.split("@")[0].split(":")[0],
              type: false,
              unreadCount: 0,
              timestamp: new Date(),
              source: "self",
              messageCount: myMessages.length,
            });
          }
        } catch (historyError) {
          console.log(`[DIRECT] Message history fetch failed: ${historyError.message}`);
        }
      }

      console.log(`[DIRECT] Found ${chats.length} direct chats`);
      return chats;
    } catch (error) {
      console.error(`Error fetching direct chats for device ${deviceId}:`, error);
      throw new Error(`Failed to fetch direct chats: ${error.message}`);
    }
  }

  /**
   * Get messages for a chat
   */
  async getMessages(sessionId, remoteJid, limit = 50, before = null) {
    const query = { sessionId, remoteJid };
    if (before) {
      query.timestamp = { $lt: before };
    }
    return Message.find(query).sort({ timestamp: -1 }).limit(limit);
  }

  /**
   * Save chats to Baileys Chat table (from Baileys events)
   */
  async saveChatsToBaileysTable(device, chats, source) {
    try {
      console.log(`[CHAT-TABLE] Saving ${chats.length} chats from ${source}`);

      const savedChats = [];
      for (const chat of chats) {
        try {
          let chatType = "individual";
          if (chat.id.includes("@g.us")) {
            chatType = "group";
          } else if (chat.id.includes("@broadcast")) {
            chatType = "broadcast";
          }

          const chatData = {
            userId: device.userId,
            sessionId: device.sessionId,
            jid: chat.id,
            name: chat.name || chat.subject || null,
            type: chatType,
            conversationTimestamp: chat.conversationTimestamp
              ? new Date(chat.conversationTimestamp * 1000)
              : null,
            unreadCount: chat.unreadCount || 0,
            archived: chat.archived || false,
            pinned: chat.pinned || false,
            muted: chat.mute > 0 ? new Date(chat.mute * 1000) : null,
            readOnly: chat.readOnly || false,
            ephemeralExpiration: chat.ephemeralExpiration || null,
            lastMessageTimestamp: chat.lastMessageRecvTimestamp
              ? new Date(chat.lastMessageRecvTimestamp)
              : null,
            source: source,
            metadata: {
              participantCount: chat.size || null,
              description: chat.desc || null,
              owner: chat.owner || null,
              creation: chat.creation || null,
            },
          };

          const [savedChat, created] = await Chat.upsert(chatData, {
            where: { sessionId: device.sessionId, jid: chat.id },
          });

          savedChats.push(savedChat);

          if (created) {
            console.log(`[CHAT-TABLE] Created new chat: ${chat.id} (${chatType})`);
          } else {
            console.log(`[CHAT-TABLE] Updated existing chat: ${chat.id} (${chatType})`);
          }
        } catch (chatError) {
          console.error(`[CHAT-TABLE] Error saving chat ${chat.id}:`, chatError);
        }
      }

      console.log(`[CHAT-TABLE] Successfully processed ${savedChats.length}/${chats.length} chats`);
      return savedChats;
    } catch (error) {
      console.error(`[CHAT-TABLE] Error saving chats:`, error);
      throw error;
    }
  }

  /**
   * Fetch chats from Baileys Chat table
   */
  async fetchChatsFromBaileysTable(deviceId) {
    try {
      console.log(`[CHAT-TABLE] Fetching chats for device ${deviceId} from database`);

      const device = await Device.findOne({ where: { id: deviceId } });
      if (!device) {
        throw new Error(`Device with ID ${deviceId} not found`);
      }

      const chats = await Chat.findAll({
        where: {
          sessionId: device.sessionId,
        },
        order: [["conversationTimestamp", "DESC"]],
      });

      console.log(`[CHAT-TABLE] Found ${chats.length} chats in database`);

      const formattedChats = chats.map((chat) => ({
        jid: chat.jid,
        name: chat.name || "Unknown",
        type: chat.type,
        conversationTimestamp: chat.conversationTimestamp,
        unreadCount: chat.unreadCount,
        archived: chat.archived,
        pinned: chat.pinned,
        muted: chat.muted,
        readOnly: chat.readOnly,
        ephemeralExpiration: chat.ephemeralExpiration,
        lastMessageTimestamp: chat.lastMessageTimestamp,
        source: "baileys_chat_table",
        sourceDetail: `Chats from Baileys events (${chat.source})`,
        lastUpdated: chat.updatedAt,
        dataSource: chat.source,
        metadata: chat.metadata,
      }));

      return {
        success: true,
        source: "baileys_chat_table",
        message: `Successfully fetched ${chats.length} chats from Baileys Chat table`,
        chats: formattedChats,
        count: chats.length,
      };
    } catch (error) {
      console.error(`[CHAT-TABLE] Error fetching chats:`, error);
      throw error;
    }
  }

  /**
   * Fetch chats from Baileys store
   */
  async fetchChatsFromBaileysStore(deviceId) {
    try {
      console.log(`[BAILEYS-STORE] Fetching chats for device ${deviceId}`);

      const device = await Device.findOne({ where: { id: deviceId } });
      if (!device) {
        throw new Error(`Device with ID ${deviceId} not found`);
      }

      const sessionId = device.sessionId;
      const store = this.service.stores.get(sessionId);

      if (!store) {
        throw new Error(`No Baileys store found for session ${sessionId}`);
      }

      const chats = store.chats.all();

      console.log(`[BAILEYS-STORE] Found ${chats.length} chats in store`);

      const formattedChats = chats.map((chat) => ({
        jid: chat.id,
        name: chat.name || chat.notify || "Unknown",
        type: chat.id.includes("@g.us") ? "group" : "individual",
        unreadCount: chat.unreadCount || 0,
        lastMessageTime: chat.conversationTimestamp
          ? new Date(chat.conversationTimestamp * 1000)
          : null,
        archived: chat.archived || false,
        pinned: chat.pinned || false,
        muted: chat.mute || false,
        source: "baileys_store",
      }));

      return {
        success: true,
        source: "baileys_store",
        message: `Successfully fetched ${chats.length} chats from Baileys store`,
        chats: formattedChats,
        count: chats.length,
      };
    } catch (error) {
      console.error(`[BAILEYS-STORE] Error fetching chats:`, error);
      throw error;
    }
  }
}

export default ChatHandler;

