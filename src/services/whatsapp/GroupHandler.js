/**
 * Group Handler - Manages WhatsApp groups
 * Extracted from WhatsAppService.js for better maintainability
 */

import { Device, ContactData } from "../../models/index.js";
import { Op } from "sequelize";

class GroupHandler {
  constructor(whatsAppService) {
    this.service = whatsAppService;
  }

  /**
   * Update group from WhatsApp event
   */
  async updateGroup(sessionId, update) {
    try {
      const device = await Device.findOne({ where: { sessionId } });
      if (!device) {
        console.error(`No device found for session ${sessionId}`);
        return;
      }

      // Update group info
      await ContactData.upsert({
        userId: device.userId,
        sessionId,
        type: true, // group
        whatsappName: update.subject,
        source: "chat",
        jid: update.id,
        lastSeen: new Date(),
      });

      // Update group members if provided
      if (update.participants) {
        for (const participant of update.participants) {
          const phoneNumber = participant.id.split("@")[0];
          await ContactData.upsert({
            userId: device.userId,
            sessionId,
            type: false, // individual
            phoneNumber,
            source: "groupMember",
            sourceDetail: `Member of ${update.id}|${update.subject}`,
            jid: participant.id,
            lastSeen: new Date(),
          });
        }
      }
    } catch (error) {
      console.error("Error updating group:", error);
    }
  }

  /**
   * Get groups from database
   */
  async getGroups(sessionId) {
    const groups = await ContactData.findAll({
      where: {
        sessionId,
        type: true,
        source: "chat",
      },
    });

    // For each group, get its members
    for (const group of groups) {
      group.members = await ContactData.findAll({
        where: {
          sessionId,
          source: "groupMember",
          sourceDetail: { [Op.like]: `Member of ${group.jid}|%` },
        },
      });
    }

    return groups;
  }

  /**
   * Get group members
   */
  async getGroupMembers(deviceId, groupId) {
    if (!groupId.endsWith("@g.us")) {
      throw new Error("Invalid group ID format");
    }

    const { device, socket } = await this.service.sessionManager.validateConnection(deviceId);

    try {
      const groupMetadata = await socket.groupMetadata(groupId);

      const members = groupMetadata.participants.map((participant) => ({
        jid: participant.id,
        phoneNumber: participant.id.split("@")[0],
        isAdmin: participant.admin === "admin" || participant.admin === "superadmin",
        isSuperAdmin: participant.admin === "superadmin",
        joinedTimestamp: new Date(participant.addedTimestamp * 1000),
      }));

      return {
        groupId: groupId,
        groupName: groupMetadata.subject,
        groupCreator: groupMetadata.owner || null,
        creationTimestamp: new Date(groupMetadata.creation * 1000),
        memberCount: groupMetadata.size,
        members,
      };
    } catch (error) {
      throw new Error("Group not found or access denied");
    }
  }

  /**
   * Fetch live groups from WhatsApp
   */
  async fetchLiveGroups(deviceId) {
    const { device, socket } = await this.service.sessionManager.validateConnection(deviceId);

    try {
      console.log(`[FETCH] Fetching live groups for device ${deviceId}`);

      let groups = [];

      const allChats = await this.service.chatHandler.fetchLiveChats(deviceId);
      groups = allChats.filter((chat) => chat.type === true);

      // Try to get additional group info
      for (let group of groups) {
        try {
          const groupMetadata = await socket.groupMetadata(group.jid);
          group.groupName = groupMetadata.subject;
          group.groupCreator = groupMetadata.owner;
          group.creationTimestamp = new Date(groupMetadata.creation * 1000);
          group.memberCount = groupMetadata.size;
          group.description = groupMetadata.desc;
        } catch (metaError) {
          console.log(`[FETCH] Could not get metadata for group ${group.jid}: ${metaError.message}`);
        }
      }

      console.log(`[FETCH] Found ${groups.length} groups for device ${deviceId}`);
      return groups;
    } catch (error) {
      console.error(`Error fetching live groups for device ${deviceId}:`, error);
      throw new Error(`Failed to fetch live groups: ${error.message}`);
    }
  }

  /**
   * Fetch groups directly using groupFetchAllParticipating
   */
  async fetchDirectGroups(deviceId) {
    const { device, socket } = await this.service.sessionManager.validateConnection(deviceId);

    try {
      console.log(`[DIRECT] Fetching groups directly using groupFetchAllParticipating for device ${deviceId}`);

      const groups = [];

      try {
        const participatingGroups = await socket.groupFetchAllParticipating();
        console.log(`[DIRECT] Found ${Object.keys(participatingGroups || {}).length} participating groups`);

        for (const [groupId, groupInfo] of Object.entries(participatingGroups || {})) {
          groups.push({
            jid: groupId,
            whatsappName: groupInfo.subject || "Unknown Group",
            phoneNumber: groupId.split("@")[0],
            type: true,
            unreadCount: 0,
            timestamp: groupInfo.creation ? new Date(groupInfo.creation * 1000) : null,
            source: "direct_api",
            memberCount: groupInfo.size || 0,
            groupCreator: groupInfo.owner || null,
            description: groupInfo.desc || "",
          });
        }
      } catch (groupError) {
        console.log(`[DIRECT] Group fetch failed: ${groupError.message}`);
      }

      console.log(`[DIRECT] Found ${groups.length} direct groups`);
      return groups;
    } catch (error) {
      console.error(`Error fetching direct groups for device ${deviceId}:`, error);
      throw new Error(`Failed to fetch direct groups: ${error.message}`);
    }
  }

  /**
   * Fetch group members with detailed info
   */
  async fetchGroupMembersDetailed(deviceId, groupId) {
    if (!groupId.endsWith("@g.us")) {
      throw new Error("Invalid group ID format");
    }

    const { device, socket } = await this.service.sessionManager.validateConnection(deviceId);

    try {
      console.log(`[FETCH] Fetching group members for ${groupId}`);

      const groupMetadata = await socket.groupMetadata(groupId);

      const members = await Promise.all(
        groupMetadata.participants.map(async (participant) => {
          let memberInfo = {
            jid: participant.id,
            phoneNumber: participant.id.split("@")[0],
            isAdmin: participant.admin === "admin" || participant.admin === "superadmin",
            isSuperAdmin: participant.admin === "superadmin",
            joinedTimestamp: new Date(participant.addedTimestamp * 1000),
          };

          // Try to get profile picture
          try {
            const profilePic = await socket.profilePictureUrl(participant.id, "image");
            memberInfo.profilePicture = profilePic;
          } catch (ppError) {
            memberInfo.profilePicture = null;
          }

          // Try to get name from contacts
          if (socket.store && socket.store.contacts) {
            const contact = socket.store.contacts.get
              ? socket.store.contacts.get(participant.id)
              : socket.store.contacts[participant.id];

            if (contact) {
              memberInfo.whatsappName = contact.notify || contact.verifiedName || contact.name;
            }
          }

          return memberInfo;
        })
      );

      return {
        groupId: groupId,
        groupName: groupMetadata.subject,
        groupCreator: groupMetadata.owner || null,
        creationTimestamp: new Date(groupMetadata.creation * 1000),
        memberCount: groupMetadata.size,
        description: groupMetadata.desc || "",
        members,
      };
    } catch (error) {
      console.error(`Error fetching group members for ${groupId}:`, error);
      throw new Error("Group not found or access denied");
    }
  }

  /**
   * Selective group metadata (no rate limits)
   */
  async getGroupMembersSelective(deviceId, groupId) {
    if (!groupId.endsWith("@g.us")) {
      throw new Error("Invalid group ID format");
    }

    const { device, socket } = await this.service.sessionManager.validateConnection(deviceId);

    try {
      console.log(`[SELECTIVE] Fetching members for specific group: ${groupId}`);

      const groupMetadata = await socket.groupMetadata(groupId);

      const members = await Promise.all(
        groupMetadata.participants.map(async (participant) => {
          let memberInfo = {
            jid: participant.id,
            phoneNumber: participant.id.split("@")[0].split(":")[0],
            isAdmin: participant.admin === "admin" || participant.admin === "superadmin",
            isSuperAdmin: participant.admin === "superadmin",
            joinedTimestamp: new Date(participant.addedTimestamp * 1000),
          };

          try {
            const profilePic = await socket.profilePictureUrl(participant.id, "image");
            memberInfo.profilePicture = profilePic;
          } catch (ppError) {
            memberInfo.profilePicture = null;
          }

          if (socket.store && socket.store.contacts) {
            const contact = socket.store.contacts.get
              ? socket.store.contacts.get(participant.id)
              : socket.store.contacts[participant.id];

            if (contact) {
              memberInfo.whatsappName = contact.notify || contact.verifiedName || contact.name;
            }
          }

          return memberInfo;
        })
      );

      return {
        groupId: groupId,
        groupName: groupMetadata.subject,
        groupCreator: groupMetadata.owner || null,
        creationTimestamp: new Date(groupMetadata.creation * 1000),
        memberCount: groupMetadata.size,
        description: groupMetadata.desc || "",
        members,
      };
    } catch (error) {
      console.error(`Error fetching group members for ${groupId}:`, error);
      throw new Error("Group not found or access denied");
    }
  }
}

export default GroupHandler;

