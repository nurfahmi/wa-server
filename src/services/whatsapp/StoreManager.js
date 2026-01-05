/**
 * Store Manager - Manages Baileys data store (database-backed)
 * Extracted from WhatsAppService.js for better maintainability
 */

import { Device, Contact, Chat } from "../../models/index.js";

class StoreManager {
  constructor(whatsAppService) {
    this.service = whatsAppService;
  }

  /**
   * Create and manage data store for a session (database-backed with minimal memory cache)
   */
  createDataStore(sessionId) {
    if (this.service.stores.has(sessionId)) {
      return this.service.stores.get(sessionId);
    }

    console.log(`[BAILEYS-STORE] Creating custom data store for session ${sessionId}`);

    const self = this;

    // Custom in-memory store implementation for Baileys
    const store = {
      contacts: {},
      chats: new Map(),
      messages: new Map(),

      // Bind method to listen to socket events (following Baileys pattern)
      bind: (ev) => {
        console.log(`[BAILEYS-STORE] Binding event listeners for ${sessionId}`);

        // Debug: Log contacts/chats events
        const originalEmit = ev.emit;
        ev.emit = function (event, ...args) {
          if (event.startsWith("contacts.") || event.startsWith("chats.")) {
            console.log(`[BAILEYS-DEBUG] *** CONTACTS/CHATS EVENT ***: ${event} with ${args.length} arguments`);
            if (event === "contacts.set" || event === "contacts.upsert") {
              const contactCount = args[0] ? Object.keys(args[0]).length : 0;
              console.log(`[BAILEYS-DEBUG] Contacts event has ${contactCount} contacts`);
            }
            if (event === "chats.set" || event === "chats.upsert") {
              const chatCount = args[0] ? args[0].length : 0;
              console.log(`[BAILEYS-DEBUG] Chats event has ${chatCount} chats`);
            }
          }
          return originalEmit.apply(this, arguments);
        };

        // Listen for contacts upsert and save to database
        ev.on("contacts.upsert", async (contacts) => {
          console.log(`[BAILEYS-STORE] Received ${contacts.length} contacts upsert - saving to database`);

          try {
            const device = await Device.findOne({ where: { sessionId } });
            if (device) {
              const individualContacts = contacts.filter(
                (contact) => contact.id && contact.id.endsWith("@s.whatsapp.net") && !contact.id.includes("@g.us")
              );

              if (individualContacts.length > 0) {
                console.log(`[BAILEYS-STORE] Saving ${individualContacts.length} individual contacts to database`);
                await self.service.contactHandler.saveContactsToBaileysTable(device, individualContacts, "contacts_upsert");
                console.log(`[BAILEYS-STORE] Successfully saved contacts from upsert event`);
              }

              individualContacts.forEach((contact) => {
                store.contacts[contact.id] = {
                  id: contact.id,
                  name: contact.name || contact.notify || "Unknown",
                  lastUpdated: new Date(),
                };
              });
            }
          } catch (error) {
            console.error(`[BAILEYS-STORE] Error saving contacts upsert to database:`, error);
            contacts.forEach((contact) => {
              store.contacts[contact.id] = {
                ...store.contacts[contact.id],
                ...contact,
                lastUpdated: new Date(),
              };
            });
          }
        });

        // Listen for contacts set (initial load)
        ev.on("contacts.set", async ({ contacts }) => {
          console.log(`[BAILEYS-STORE] Received ${contacts.length} contacts set - saving to database`);

          try {
            const device = await Device.findOne({ where: { sessionId } });
            if (device) {
              const individualContacts = contacts.filter(
                (contact) => contact.id && contact.id.endsWith("@s.whatsapp.net") && !contact.id.includes("@g.us")
              );

              if (individualContacts.length > 0) {
                console.log(`[BAILEYS-STORE] Saving ${individualContacts.length} individual contacts to database`);
                await self.service.contactHandler.saveContactsToBaileysTable(device, individualContacts, "contacts_set");
                console.log(`[BAILEYS-STORE] Successfully saved contacts from set event`);
              }

              individualContacts.forEach((contact) => {
                store.contacts[contact.id] = {
                  id: contact.id,
                  name: contact.name || contact.notify || "Unknown",
                  lastUpdated: new Date(),
                };
              });
            }
          } catch (error) {
            console.error(`[BAILEYS-STORE] Error saving contacts set to database:`, error);
            contacts.forEach((contact) => {
              store.contacts[contact.id] = {
                ...contact,
                lastUpdated: new Date(),
              };
            });
          }
        });

        // Listen for contacts updates
        ev.on("contacts.update", async (contacts) => {
          console.log(`[CONTACT-TABLE] Received ${contacts.length} contacts update - saving to database`);

          try {
            const device = await Device.findOne({ where: { sessionId } });
            if (device) {
              const individualContacts = contacts.filter(
                (contact) => contact.id && contact.id.endsWith("@s.whatsapp.net") && !contact.id.includes("@g.us")
              );

              if (individualContacts.length > 0) {
                console.log(`[CONTACT-TABLE] Saving ${individualContacts.length} individual contacts to database`);
                await self.service.contactHandler.saveContactsToBaileysTable(device, individualContacts, "contacts_update");
                console.log(`[CONTACT-TABLE] Successfully saved contacts from update event`);
              }

              individualContacts.forEach((contact) => {
                store.contacts[contact.id] = {
                  id: contact.id,
                  name: contact.name || contact.notify || "Unknown",
                  lastUpdated: new Date(),
                };
              });
            }
          } catch (error) {
            console.error(`[CONTACT-TABLE] Error saving contacts update to database:`, error);
            contacts.forEach((contact) => {
              store.contacts[contact.id] = {
                ...store.contacts[contact.id],
                ...contact,
                lastUpdated: new Date(),
              };
            });
          }
        });

        // Listen for chats upsert
        ev.on("chats.upsert", async (chats) => {
          console.log(`[BAILEYS-STORE] Received ${chats.length} chats upsert - saving to database`);

          try {
            const device = await Device.findOne({ where: { sessionId } });
            if (device && chats.length > 0) {
              console.log(`[BAILEYS-STORE] Saving ${chats.length} chats to database`);
              await self.service.chatHandler.saveChatsToBaileysTable(device, chats, "chats_upsert");
              console.log(`[BAILEYS-STORE] Successfully saved chats from upsert event`);

              chats.forEach((chat) => {
                store.chats.set(chat.id, {
                  id: chat.id,
                  name: chat.name || "Unknown",
                  lastUpdated: new Date(),
                });
              });
            }
          } catch (error) {
            console.error(`[BAILEYS-STORE] Error saving chats upsert to database:`, error);
            chats.forEach((chat) => {
              store.chats.set(chat.id, {
                ...store.chats.get(chat.id),
                ...chat,
                lastUpdated: new Date(),
              });
            });
          }
        });

        // Listen for chats updates
        ev.on("chats.update", async (chats) => {
          console.log(`[CHAT-TABLE] Received ${chats.length} chats update - saving to database`);

          try {
            const device = await Device.findOne({ where: { sessionId } });
            if (device && chats.length > 0) {
              console.log(`[CHAT-TABLE] Saving ${chats.length} chats to database`);
              await self.service.chatHandler.saveChatsToBaileysTable(device, chats, "chats_upsert");
              console.log(`[CHAT-TABLE] Successfully saved chats from update event`);

              chats.forEach((chat) => {
                store.chats.set(chat.id, {
                  id: chat.id,
                  name: chat.name || "Unknown",
                  lastUpdated: new Date(),
                });
              });
            }
          } catch (error) {
            console.error(`[CHAT-TABLE] Error saving chats update to database:`, error);
            chats.forEach((chat) => {
              store.chats.set(chat.id, {
                ...store.chats.get(chat.id),
                ...chat,
                lastUpdated: new Date(),
              });
            });
          }
        });

        // Listen for chats set
        ev.on("chats.set", async ({ chats }) => {
          console.log(`[BAILEYS-STORE] Received ${chats.length} chats set - saving to database`);

          try {
            const device = await Device.findOne({ where: { sessionId } });
            if (device && chats.length > 0) {
              console.log(`[BAILEYS-STORE] Saving ${chats.length} chats to database`);
              await self.service.chatHandler.saveChatsToBaileysTable(device, chats, "chats_set");
              console.log(`[BAILEYS-STORE] Successfully saved chats from set event`);

              chats.forEach((chat) => {
                store.chats.set(chat.id, {
                  id: chat.id,
                  name: chat.name || "Unknown",
                  lastUpdated: new Date(),
                });
              });
            }
          } catch (error) {
            console.error(`[BAILEYS-STORE] Error saving chats set to database:`, error);
            chats.forEach((chat) => {
              store.chats.set(chat.id, {
                ...chat,
                lastUpdated: new Date(),
              });
            });
          }
        });

        // Listen for messages upsert
        ev.on("messages.upsert", ({ messages, type }) => {
          console.log(`[BAILEYS-STORE] Received ${messages.length} messages (${type})`);
          messages.forEach((message) => {
            const key = `${message.key.remoteJid}_${message.key.id}`;
            store.messages.set(key, {
              ...message,
              lastUpdated: new Date(),
            });
          });
        });
      },

      // Store methods for compatibility
      all: () => Array.from(store.chats.values()),

      // Load messages method
      loadMessages: (jid, count = 25, cursor = null) => {
        const messages = Array.from(store.messages.values())
          .filter((msg) => msg.key.remoteJid === jid)
          .sort((a, b) => (b.messageTimestamp || 0) - (a.messageTimestamp || 0))
          .slice(0, count);
        return messages;
      },

      // Get contacts count
      getContactsCount: () => Object.keys(store.contacts).length,

      // Get chats count
      getChatsCount: () => store.chats.size,

      // Get messages count
      getMessagesCount: () => store.messages.size,
    };

    this.service.stores.set(sessionId, store);
    return store;
  }

  /**
   * Get available socket methods for debugging
   */
  async getSocketMethods(deviceId) {
    const { device, socket } = await this.service.sessionManager.validateConnection(deviceId);

    const methods = {};
    for (const key in socket) {
      if (typeof socket[key] === "function") {
        methods[key] = "function";
      }
    }

    return {
      deviceId,
      socketMethods: methods,
      storeStatus: {
        hasStore: !!socket.store,
        hasContacts: !!(socket.store && socket.store.contacts),
        hasChats: !!(socket.store && socket.store.chats),
        contactsType: socket.store?.contacts
          ? socket.store.contacts instanceof Map ? "Map" : typeof socket.store.contacts
          : "none",
        chatsType: socket.store?.chats
          ? socket.store.chats instanceof Map ? "Map" : typeof socket.store.chats
          : "none",
      },
      userInfo: socket.user || null,
    };
  }

  /**
   * Sync WhatsApp data
   */
  async syncWhatsAppData(deviceId) {
    const { device, socket } = await this.service.sessionManager.validateConnection(deviceId);

    try {
      console.log(`[SYNC] Starting WhatsApp data sync for device ${deviceId}`);

      const results = {
        contacts: 0,
        chats: 0,
        groups: 0,
        timestamp: new Date(),
      };

      // Try to generate activity
      try {
        if (socket.user && socket.user.id) {
          const myNumber = socket.user.id;
          console.log(`[SYNC] Sending self-message to ${myNumber} to generate chat activity`);
          await socket.sendMessage(myNumber, {
            text: `🔄 WhatsApp Sync Test - ${new Date().toISOString()}`,
          });
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (selfMessageError) {
        console.log(`[SYNC] Self-message failed: ${selfMessageError.message}`);
      }

      // Try to query for chat list
      try {
        if (socket.query) {
          console.log(`[SYNC] Querying WhatsApp for chat data`);
          await socket.query({
            tag: "iq",
            attrs: {
              type: "get",
              xmlns: "w:chat",
              to: "s.whatsapp.net",
            },
          });
        }
      } catch (queryError) {
        console.log(`[SYNC] Query sync failed: ${queryError.message}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Get current data counts
      const contacts = await this.service.contactHandler.fetchLiveContacts(deviceId);
      const chats = await this.service.chatHandler.fetchLiveChats(deviceId);
      const groups = await this.service.groupHandler.fetchLiveGroups(deviceId);

      results.contacts = contacts.length;
      results.chats = chats.length;
      results.groups = groups.length;

      console.log(`[SYNC] Sync complete for device ${deviceId}:`, results);
      return results;
    } catch (error) {
      console.error(`Error syncing WhatsApp data for device ${deviceId}:`, error);
      throw new Error(`Failed to sync WhatsApp data: ${error.message}`);
    }
  }

  /**
   * Quick sync with rate limiting
   */
  async quickSyncLimited(deviceId) {
    const { device, socket } = await this.service.sessionManager.validateConnection(deviceId);

    try {
      console.log(`[QUICK_SYNC_LIMITED] Starting limited quick sync for device ${deviceId}`);

      const results = {
        method: "direct_api_limited",
        contacts: 0,
        chats: 0,
        groups: 0,
        timestamp: new Date(),
        userInfo: socket.user || null,
        note: "Limited to avoid rate limits - processing first 10 groups only",
      };

      // Get data using rate-limited methods
      const [groups, chats] = await Promise.all([
        this.service.groupHandler.fetchDirectGroups(deviceId),
        this.service.chatHandler.fetchDirectChats(deviceId),
      ]);

      // Get contacts separately for rate limiting
      const contacts = await this.service.contactHandler.fetchDirectContacts(deviceId);

      results.contacts = contacts.length;
      results.chats = chats.length;
      results.groups = groups.length;

      console.log(`[QUICK_SYNC_LIMITED] Limited sync complete for device ${deviceId}:`, results);
      return { results, data: { contacts, chats, groups } };
    } catch (error) {
      console.error(`Error in limited quick sync for device ${deviceId}:`, error);
      throw new Error(`Failed to perform limited quick sync: ${error.message}`);
    }
  }

  /**
   * Fetch and save contacts
   */
  async fetchAndSaveContacts(deviceId, saveToDb = false) {
    try {
      const contacts = await this.service.contactHandler.fetchDirectContacts(deviceId);

      if (saveToDb) {
        const savedContacts = await this.service.contactHandler.saveContactsToDatabase(deviceId, contacts);
        return {
          fetched: contacts,
          saved: savedContacts,
          message: `Fetched ${contacts.length} contacts, saved ${savedContacts.length} to database`,
        };
      }

      return {
        fetched: contacts,
        message: `Fetched ${contacts.length} contacts (not saved to database)`,
      };
    } catch (error) {
      throw new Error(`Failed to fetch and save contacts: ${error.message}`);
    }
  }
}

export default StoreManager;

