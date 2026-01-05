/**
 * Contact Handler - Manages WhatsApp contacts
 * Extracted from WhatsAppService.js for better maintainability
 */

import { Device, ContactData, Contact } from "../../models/index.js";
import { Op } from "sequelize";

class ContactHandler {
  constructor(whatsAppService) {
    this.service = whatsAppService;
  }

  /**
   * Update contact from WhatsApp event
   */
  async updateContact(sessionId, update) {
    try {
      const device = await Device.findOne({ where: { sessionId } });
      if (!device) {
        console.error(`No device found for session ${sessionId}`);
        return;
      }

      const phoneNumber = update.id.split("@")[0];

      await ContactData.upsert({
        userId: device.userId,
        sessionId,
        type: false, // individual contact
        phoneNumber,
        whatsappName: update.notify || update.pushName,
        source: "contact",
        jid: update.id,
        lastSeen: new Date(),
      });
    } catch (error) {
      console.error("Error updating contact:", error);
    }
  }

  /**
   * Get contacts for a device
   */
  async getContacts(deviceId) {
    const { device, socket } = await this.service.sessionManager.validateConnection(deviceId);

    try {
      if (!socket.store || !socket.store.contacts) {
        console.warn(`No contacts store available for device ${deviceId}`);
        return [];
      }

      const contacts = socket.store.contacts;
      const contactEntries = contacts instanceof Map
        ? Array.from(contacts.entries())
        : Object.entries(contacts);

      return contactEntries.map(([id, contact]) => ({
        jid: id,
        whatsappName: contact.notify || contact.verifiedName || contact.name || "",
        phoneNumber: id.split("@")[0],
        type: id.includes("@g.us"),
        status: contact.status || "",
        pictureUrl: contact.imgUrl || null,
      }));
    } catch (error) {
      console.error(`Error fetching contacts for device ${deviceId}:`, error);
      throw new Error(`Failed to fetch contacts: ${error.message}`);
    }
  }

  /**
   * Fetch live contacts directly from WhatsApp
   */
  async fetchLiveContacts(deviceId) {
    const { device, socket } = await this.service.sessionManager.validateConnection(deviceId);

    try {
      console.log(`[FETCH] Fetching live contacts for device ${deviceId}`);

      let contacts = [];
      if (socket.store && socket.store.contacts) {
        const storeContacts = socket.store.contacts;
        const contactEntries = storeContacts instanceof Map
          ? Array.from(storeContacts.entries())
          : Object.entries(storeContacts);

        contacts = contactEntries.map(([id, contact]) => ({
          jid: id,
          whatsappName: contact.notify || contact.verifiedName || contact.name || "",
          phoneNumber: id.split("@")[0],
          type: id.includes("@g.us"),
          status: contact.status || "",
          pictureUrl: contact.imgUrl || null,
          source: "store",
        }));
        console.log(`[FETCH] Found ${contacts.length} contacts from store`);
      }

      if (contacts.length === 0) {
        console.log(`[FETCH] Store empty, trying alternative methods`);

        try {
          if (socket.chatModify && socket.store && socket.store.chats) {
            const storeChats = socket.store.chats instanceof Map
              ? Array.from(socket.store.chats.values())
              : Object.values(socket.store.chats);

            contacts = storeChats
              .filter((chat) => !chat.id.includes("@g.us"))
              .map((chat) => ({
                jid: chat.id,
                whatsappName: chat.name || chat.id.split("@")[0],
                phoneNumber: chat.id.split("@")[0],
                type: false,
                status: "",
                pictureUrl: null,
                source: "chats_store",
                lastMessageTime: chat.conversationTimestamp ? new Date(chat.conversationTimestamp) : null,
              }));
            console.log(`[FETCH] Found ${contacts.length} contacts from chat store`);
          }
        } catch (chatError) {
          console.log(`[FETCH] Chat-based contact fetch failed: ${chatError.message}`);
        }
      }

      console.log(`[FETCH] Total contacts found: ${contacts.length} for device ${deviceId}`);
      return contacts;
    } catch (error) {
      console.error(`Error fetching live contacts for device ${deviceId}:`, error);
      throw new Error(`Failed to fetch live contacts: ${error.message}`);
    }
  }

  /**
   * Fetch contacts directly using Baileys API
   */
  async fetchDirectContacts(deviceId) {
    const { device, socket } = await this.service.sessionManager.validateConnection(deviceId);

    try {
      console.log(`[DIRECT] Fetching contacts directly for device ${deviceId}`);

      const contacts = [];

      // Add yourself as a contact
      if (socket.user && socket.user.id) {
        contacts.push({
          jid: socket.user.id,
          whatsappName: socket.user.name || "Me",
          phoneNumber: socket.user.id.split("@")[0].split(":")[0],
          type: false,
          status: "online",
          pictureUrl: null,
          source: "self",
        });
      }

      // Get contacts from groups (with rate limiting)
      try {
        const groups = await this.service.groupHandler.fetchDirectGroups(deviceId);
        console.log(`[DIRECT] Processing ${groups.length} groups for contacts (with rate limiting)`);

        const groupsToProcess = groups.slice(0, 10);
        console.log(`[DIRECT] Processing first ${groupsToProcess.length} groups to avoid rate limits`);

        for (let i = 0; i < groupsToProcess.length; i++) {
          const group = groupsToProcess[i];

          if (group.jid && group.jid.endsWith("@g.us")) {
            try {
              if (i > 0) {
                await new Promise((resolve) => setTimeout(resolve, 2000));
              }

              console.log(`[DIRECT] Getting metadata for group ${group.whatsappName} (${i + 1}/${groupsToProcess.length})`);
              const groupMetadata = await socket.groupMetadata(group.jid);

              if (groupMetadata.participants) {
                for (const participant of groupMetadata.participants) {
                  if (!participant.id.includes("@g.us") && !contacts.some((c) => c.jid === participant.id)) {
                    contacts.push({
                      jid: participant.id,
                      whatsappName: participant.id.split("@")[0].split(":")[0],
                      phoneNumber: participant.id.split("@")[0].split(":")[0],
                      type: false,
                      status: "",
                      pictureUrl: null,
                      source: `group_${group.whatsappName}`,
                      isAdmin: participant.admin === "admin" || participant.admin === "superadmin",
                    });
                  }
                }
              }
            } catch (metaError) {
              if (metaError.message.includes("rate-overlimit")) {
                console.log(`[DIRECT] Rate limit hit for group ${group.whatsappName}, waiting 10 seconds...`);
                await new Promise((resolve) => setTimeout(resolve, 10000));
              } else {
                console.log(`[DIRECT] Failed to get metadata for group ${group.jid}: ${metaError.message}`);
              }
            }
          }
        }
      } catch (groupContactError) {
        console.log(`[DIRECT] Failed to extract contacts from groups: ${groupContactError.message}`);
      }

      console.log(`[DIRECT] Found ${contacts.length} direct contacts`);
      return contacts;
    } catch (error) {
      console.error(`Error fetching direct contacts for device ${deviceId}:`, error);
      throw new Error(`Failed to fetch direct contacts: ${error.message}`);
    }
  }

  /**
   * Get profile picture for a contact
   */
  async getProfilePicture(deviceId, jid) {
    const { device, socket } = await this.service.sessionManager.validateConnection(deviceId);

    try {
      const ppUrl = await socket.profilePictureUrl(jid, "image");
      return { url: ppUrl };
    } catch (error) {
      return { url: null };
    }
  }

  /**
   * Get presence status for a contact
   */
  async getPresenceStatus(deviceId, jid) {
    const { device, socket } = await this.service.sessionManager.validateConnection(deviceId);

    try {
      const presence = await socket.presenceSubscribe(jid);
      return {
        jid,
        status: presence.status || "unavailable",
        lastSeen: presence.lastSeen || null,
      };
    } catch (error) {
      throw new Error("Could not fetch presence status");
    }
  }

  /**
   * Get business profile for a contact
   */
  async getBusinessProfile(deviceId, jid) {
    const { device, socket } = await this.service.sessionManager.validateConnection(deviceId);

    try {
      const business = await socket.getBusinessProfile(jid);
      return business || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Save contacts to database
   */
  async saveContactsToDatabase(deviceId, contacts) {
    try {
      console.log(`[DB_SAVE] Saving ${contacts.length} contacts to database for device ${deviceId}`);

      const savedContacts = [];

      for (const contact of contacts) {
        try {
          const [contactRecord, created] = await ContactData.findOrCreate({
            where: {
              deviceId: deviceId,
              jid: contact.jid,
            },
            defaults: {
              deviceId: deviceId,
              jid: contact.jid,
              whatsappName: contact.whatsappName || "",
              phoneNumber: contact.phoneNumber || "",
              isGroup: contact.type || false,
              source: contact.source || "direct_fetch",
            },
          });

          if (!created) {
            await contactRecord.update({
              whatsappName: contact.whatsappName || contactRecord.whatsappName,
              phoneNumber: contact.phoneNumber || contactRecord.phoneNumber,
              source: contact.source || contactRecord.source,
            });
          }

          savedContacts.push(contactRecord);
        } catch (contactError) {
          console.log(`[DB_SAVE] Failed to save contact ${contact.jid}: ${contactError.message}`);
        }
      }

      console.log(`[DB_SAVE] Successfully saved ${savedContacts.length} contacts to database`);
      return savedContacts;
    } catch (error) {
      console.error(`Error saving contacts to database:`, error);
      throw new Error(`Failed to save contacts: ${error.message}`);
    }
  }

  /**
   * Save contacts from messaging history to database
   */
  async saveHistoryContactsToDatabase(deviceId, contacts, source = "messaging_history") {
    try {
      const device = await Device.findByPk(deviceId);
      if (!device) {
        throw new Error("Device not found");
      }

      const savedContacts = [];
      console.log(`[SAVE-HISTORY] Saving ${contacts.length} contacts from ${source} for device ${deviceId}`);

      for (const contact of contacts) {
        try {
          const extractedName = contact.name || contact.notify || contact.verifiedName || 
            contact.pushName || contact.displayName || contact.short || contact.fullName ||
            (contact.contact && contact.contact.displayName) ||
            (contact.contact && contact.contact.name) || "Unknown";

          const contactData = {
            userId: device.userId,
            sessionId: device.sessionId,
            jid: contact.id,
            phoneNumber: contact.id.split("@")[0],
            whatsappName: extractedName,
            type: contact.id.includes("@g.us"),
            status: contact.status || "",
            pictureUrl: contact.imgUrl || null,
            source: source,
            sourceDetail: `Real contact from ${source}`,
            lastMessageTime: contact.conversationTimestamp
              ? new Date(contact.conversationTimestamp * 1000)
              : null,
            unreadCount: contact.unreadCount || 0,
            lastUpdated: new Date(),
          };

          const [savedContact, created] = await ContactData.upsert(contactData, {
            where: { sessionId: device.sessionId, jid: contact.id },
          });

          savedContacts.push(savedContact);

          if (created) {
            console.log(`[SAVE-HISTORY] Created new contact: ${contact.id}`);
          } else {
            console.log(`[SAVE-HISTORY] Updated existing contact: ${contact.id}`);
          }
        } catch (contactError) {
          console.error(`[SAVE-HISTORY] Error saving contact ${contact.id}:`, contactError);
        }
      }

      console.log(`[SAVE-HISTORY] Successfully processed ${savedContacts.length}/${contacts.length} contacts`);
      return savedContacts;
    } catch (error) {
      console.error(`[SAVE-HISTORY] Error saving contacts to database:`, error);
      throw error;
    }
  }

  /**
   * Save contacts to Baileys Contact table (from Baileys events)
   * Updated for Baileys v7.0.0 LID support
   */
  async saveContactsToBaileysTable(device, contacts, source) {
    try {
      console.log(`[CONTACT-TABLE] Saving ${contacts.length} contacts from ${source}`);

      const savedContacts = [];
      for (const contact of contacts) {
        try {
          const contactId = contact.id;
          const isLID = contactId?.includes("@lid");
          const isPN = contactId?.includes("@s.whatsapp.net");
          
          let phoneNumber = null;
          if (contact.phoneNumber) {
            phoneNumber = contact.phoneNumber;
          } else if (isPN) {
            phoneNumber = contactId.split("@")[0];
          } else if (contact.pn) {
            phoneNumber = contact.pn.split("@")[0];
          }

          const contactData = {
            userId: device.userId,
            sessionId: device.sessionId,
            jid: contactId,
            lid: contact.lid || (isLID ? contactId : null),
            pn: contact.pn || (isPN ? contactId : null),
            phoneNumber: phoneNumber || contactId?.split("@")[0] || "unknown",
            name: contact.name || null,
            notify: contact.notify || null,
            verifiedName: contact.verifiedName || null,
            status: contact.status || null,
            pictureUrl: contact.imgUrl || null,
            isContact: contact.isContact || false,
            isBlocked: contact.isBlocked || false,
            source: source,
            lastSeen: contact.lastKnownPresence?.lastSeen
              ? new Date(contact.lastKnownPresence.lastSeen)
              : null,
            businessProfile: contact.businessProfile || null,
            addressingMode: isLID ? "lid" : (isPN ? "pn" : "unknown"),
          };

          const [savedContact, created] = await Contact.upsert(contactData, {
            where: { sessionId: device.sessionId, jid: contactId },
          });

          savedContacts.push(savedContact);

          if (created) {
            console.log(`[CONTACT-TABLE] Created new contact: ${contactId} (${contactData.addressingMode})`);
          } else {
            console.log(`[CONTACT-TABLE] Updated existing contact: ${contactId} (${contactData.addressingMode})`);
          }
        } catch (contactError) {
          console.error(`[CONTACT-TABLE] Error saving contact ${contact.id}:`, contactError);
        }
      }

      console.log(`[CONTACT-TABLE] Successfully processed ${savedContacts.length}/${contacts.length} contacts`);
      return savedContacts;
    } catch (error) {
      console.error(`[CONTACT-TABLE] Error saving contacts:`, error);
      throw error;
    }
  }

  /**
   * Save LID-PN mapping from lid-mapping.update event (Baileys v7.0.0+)
   */
  async saveLIDMapping(device, mapping) {
    try {
      const { lid, pn } = mapping;
      
      if (!lid || !pn) {
        console.warn(`[LID-MAPPING] Invalid mapping - missing lid or pn:`, mapping);
        return null;
      }

      console.log(`[LID-MAPPING] Saving mapping: LID=${lid} <-> PN=${pn}`);

      let contact = await Contact.findOne({
        where: {
          sessionId: device.sessionId,
          [Op.or]: [
            { jid: lid },
            { jid: pn },
            { lid: lid },
            { pn: pn },
          ],
        },
      });

      if (contact) {
        await contact.update({
          lid: lid,
          pn: pn,
          phoneNumber: pn.split("@")[0],
        });
        console.log(`[LID-MAPPING] Updated contact ${contact.jid} with LID mapping`);
      } else {
        const phoneNumber = pn.split("@")[0];
        contact = await Contact.create({
          userId: device.userId,
          sessionId: device.sessionId,
          jid: pn,
          lid: lid,
          pn: pn,
          phoneNumber: phoneNumber,
          source: "lid_mapping",
          addressingMode: "pn",
        });
        console.log(`[LID-MAPPING] Created new contact from LID mapping: ${pn}`);
      }

      return contact;
    } catch (error) {
      console.error(`[LID-MAPPING] Error saving mapping:`, error);
      throw error;
    }
  }

  /**
   * Get contact by either LID or PN (Baileys v7.0.0 compatible)
   */
  async getContactByIdOrLID(sessionId, identifier) {
    try {
      const contact = await Contact.findOne({
        where: {
          sessionId: sessionId,
          [Op.or]: [
            { jid: identifier },
            { lid: identifier },
            { pn: identifier },
          ],
        },
      });
      return contact;
    } catch (error) {
      console.error(`[CONTACT] Error finding contact by ID/LID:`, error);
      return null;
    }
  }

  /**
   * Fetch contacts from Baileys store (database-backed)
   */
  async fetchContactsFromBaileysStore(deviceId) {
    try {
      console.log(`[BAILEYS-STORE] Fetching contacts for device ${deviceId} from database`);

      const device = await Device.findOne({ where: { id: deviceId } });
      if (!device) {
        throw new Error(`Device with ID ${deviceId} not found`);
      }

      const contacts = await Contact.findAll({
        where: {
          sessionId: device.sessionId,
        },
        order: [["updatedAt", "DESC"]],
      });

      console.log(`[BAILEYS-STORE] Found ${contacts.length} contacts in database`);

      const formattedContacts = contacts.map((contact) => ({
        jid: contact.jid,
        phoneNumber: contact.phoneNumber,
        whatsappName: contact.name || contact.notify || "Unknown",
        contactName: contact.name || null,
        status: contact.status || "",
        pictureUrl: contact.pictureUrl || null,
        type: "individual",
        source: "baileys_contact_table",
        sourceDetail: `Real contacts from Baileys events (${contact.source})`,
        lastSeen: contact.lastSeen,
        isContact: contact.isContact,
        verifiedName: contact.verifiedName,
        businessProfile: contact.businessProfile,
        lastUpdated: contact.updatedAt,
        dataSource: contact.source,
      }));

      return {
        success: true,
        source: "baileys_store_database",
        message: `Successfully fetched ${contacts.length} contacts from Baileys store (database)`,
        contacts: formattedContacts,
        count: contacts.length,
      };
    } catch (error) {
      console.error(`[BAILEYS-STORE] Error fetching contacts:`, error);
      throw error;
    }
  }

  /**
   * Fetch real contacts from database
   */
  async fetchRealContactsFromDatabase(deviceId) {
    try {
      const device = await Device.findByPk(deviceId);
      if (!device) {
        throw new Error("Device not found");
      }

      console.log(`[FETCH-DB] Fetching real contacts from database for device ${deviceId}`);

      const contacts = await ContactData.findAll({
        where: {
          sessionId: device.sessionId,
          source: {
            [Op.in]: ["messaging_history", "messaging_history_chats"],
          },
          type: false,
        },
        order: [["lastUpdated", "DESC"]],
      });

      console.log(`[FETCH-DB] Found ${contacts.length} real contacts in database`);

      return contacts.map((contact) => ({
        id: contact.jid,
        name: contact.whatsappName || "Unknown",
        notify: contact.whatsappName,
        phoneNumber: contact.phoneNumber,
        status: contact.status,
        pictureUrl: contact.pictureUrl,
        lastMessageTime: contact.lastMessageTime,
        unreadCount: contact.unreadCount,
        source: contact.source,
        sourceDetail: contact.sourceDetail,
        lastUpdated: contact.lastUpdated,
      }));
    } catch (error) {
      console.error(`[FETCH-DB] Error fetching contacts from database:`, error);
      throw error;
    }
  }
}

export default ContactHandler;

