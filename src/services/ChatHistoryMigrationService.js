/**
 * Chat History Migration Service
 * 
 * Handles archiving devices and restoring chat history between devices.
 * Enables users to preserve chat history when switching WhatsApp numbers.
 */

import { Device, ChatSettings, ChatHistory, AIConversationMemory } from "../models/index.js";
import { Op } from "sequelize";

class ChatHistoryMigrationService {
  
  /**
   * Normalize phone number for matching
   * Removes non-digits and converts local format to international
   */
  normalizePhoneNumber(phone) {
    if (!phone) return null;
    // Remove all non-digits
    let normalized = phone.replace(/[^0-9]/g, '');
    // Convert Indonesian local format (08xxx) to international (628xxx)
    if (normalized.startsWith('0')) {
      normalized = '62' + normalized.substring(1);
    }
    return normalized;
  }

  /**
   * Get all archived devices for a user
   */
  async getArchivedDevices(userId) {
    try {
      const devices = await Device.findAll({
        where: { 
          userId: String(userId), 
          status: 'archived' 
        },
        attributes: [
          'id', 'alias', 'phoneNumber', 'realPhoneNumber', 
          'archivedAt', 'archiveReason', 'lastConnection',
          'createdAt', 'provider'
        ],
        order: [['archivedAt', 'DESC']]
      });

      // Enrich with chat count for each device
      const enrichedDevices = await Promise.all(devices.map(async (device) => {
        const chatCount = await ChatSettings.count({
          where: { deviceId: device.id }
        });
        const messageCount = await ChatHistory.count({
          where: { deviceId: device.id }
        });
        
        return {
          ...device.toJSON(),
          chatCount,
          messageCount
        };
      }));

      return enrichedDevices;
    } catch (error) {
      console.error('[MIGRATION] Error getting archived devices:', error);
      throw error;
    }
  }

  /**
   * Get all active (non-archived) devices for a user
   */
  async getActiveDevices(userId) {
    try {
      const devices = await Device.findAll({
        where: { 
          userId: String(userId), 
          status: { [Op.ne]: 'archived' }
        },
        attributes: [
          'id', 'alias', 'phoneNumber', 'realPhoneNumber', 
          'status', 'lastConnection', 'createdAt', 'provider'
        ],
        order: [['lastConnection', 'DESC']]
      });

      return devices.map(d => d.toJSON());
    } catch (error) {
      console.error('[MIGRATION] Error getting active devices:', error);
      throw error;
    }
  }

  /**
   * Get conversations (chat list) for a device
   */
  async getConversationsByDevice(deviceId, options = {}) {
    try {
      const { search, page = 1, limit = 50 } = options;
      
      const whereClause = { deviceId };
      
      if (search) {
        whereClause[Op.or] = [
          { contactName: { [Op.like]: `%${search}%` } },
          { phoneNumber: { [Op.like]: `%${search}%` } }
        ];
      }

      const { count, rows } = await ChatSettings.findAndCountAll({
        where: whereClause,
        attributes: [
          'id', 'chatId', 'contactName', 'phoneNumber', 
          'profilePictureUrl', 'lastMessageContent', 
          'lastMessageTimestamp', 'unreadCount', 'aiEnabled',
          'purchaseIntentScore', 'purchaseIntentStage',
          'conversationOutcome', 'labels'
        ],
        order: [['lastMessageTimestamp', 'DESC']],
        limit,
        offset: (page - 1) * limit
      });

      return {
        conversations: rows.map(r => r.toJSON()),
        total: count,
        page,
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      console.error('[MIGRATION] Error getting conversations:', error);
      throw error;
    }
  }

  /**
   * Get messages for a specific chat
   */
  async getMessagesByChat(deviceId, chatId, options = {}) {
    try {
      const { page = 1, limit = 100, beforeTimestamp } = options;
      
      const whereClause = { deviceId, chatId };
      
      if (beforeTimestamp) {
        whereClause.timestamp = { [Op.lt]: new Date(beforeTimestamp) };
      }

      const { count, rows } = await ChatHistory.findAndCountAll({
        where: whereClause,
        attributes: [
          'id', 'messageId', 'direction', 'messageType',
          'content', 'mediaUrl', 'caption', 'timestamp',
          'fromMe', 'senderName', 'isAiGenerated', 'agentName'
        ],
        order: [['timestamp', 'ASC']],
        limit,
        offset: (page - 1) * limit
      });

      // Get chat settings for context
      const chatSettings = await ChatSettings.findOne({
        where: { deviceId, chatId },
        attributes: ['contactName', 'phoneNumber', 'profilePictureUrl']
      });

      return {
        messages: rows.map(r => r.toJSON()),
        chatInfo: chatSettings ? chatSettings.toJSON() : null,
        total: count,
        page,
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      console.error('[MIGRATION] Error getting messages:', error);
      throw error;
    }
  }

  /**
   * Archive a device (instead of deleting)
   */
  async archiveDevice(deviceId, reason = 'manual') {
    try {
      const device = await Device.findByPk(deviceId);
      
      if (!device) {
        throw new Error('Device not found');
      }

      if (device.status === 'archived') {
        throw new Error('Device is already archived');
      }

      // Get stats before archiving
      const chatCount = await ChatSettings.count({ where: { deviceId } });
      const messageCount = await ChatHistory.count({ where: { deviceId } });

      await device.update({
        status: 'archived',
        archivedAt: new Date(),
        archiveReason: reason
      });

      console.log(`[MIGRATION] Device ${deviceId} archived. Preserved ${chatCount} chats and ${messageCount} messages.`);

      return {
        success: true,
        device: device.toJSON(),
        preserved: {
          chatCount,
          messageCount
        }
      };
    } catch (error) {
      console.error('[MIGRATION] Error archiving device:', error);
      throw error;
    }
  }

  /**
   * Preview what will be restored
   */
  async previewRestore(sourceDeviceId, targetDeviceId, options = {}) {
    try {
      const { mode = 'matching', selectedChats = null } = options;
      
      // Validate devices
      const sourceDevice = await Device.findByPk(sourceDeviceId);
      const targetDevice = await Device.findByPk(targetDeviceId);

      if (!sourceDevice) throw new Error('Source device not found');
      if (!targetDevice) throw new Error('Target device not found');
      if (sourceDevice.userId !== targetDevice.userId) {
        throw new Error('Devices must belong to the same user');
      }

      // Get source conversations
      let sourceChats = await ChatSettings.findAll({
        where: selectedChats 
          ? { deviceId: sourceDeviceId, chatId: { [Op.in]: selectedChats } }
          : { deviceId: sourceDeviceId }
      });

      // Get target conversations for matching
      const targetChats = await ChatSettings.findAll({
        where: { deviceId: targetDeviceId }
      });

      // Create phone number lookup for target
      const targetPhoneMap = new Map();
      targetChats.forEach(chat => {
        const normalized = this.normalizePhoneNumber(chat.phoneNumber);
        if (normalized) {
          targetPhoneMap.set(normalized, chat);
        }
      });

      // Categorize chats
      const preview = {
        toMerge: [],      // Matching phone numbers - will merge history
        toAdd: [],        // New contacts - will add as new
        skipped: [],      // Skipped (if mode is 'matching' and no match)
        sourceDevice: {
          id: sourceDevice.id,
          alias: sourceDevice.alias,
          phoneNumber: sourceDevice.realPhoneNumber || sourceDevice.phoneNumber
        },
        targetDevice: {
          id: targetDevice.id,
          alias: targetDevice.alias,
          phoneNumber: targetDevice.realPhoneNumber || targetDevice.phoneNumber
        },
        stats: {
          totalChats: 0,
          totalMessages: 0,
          matchingChats: 0,
          newChats: 0
        }
      };

      for (const sourceChat of sourceChats) {
        const normalizedPhone = this.normalizePhoneNumber(sourceChat.phoneNumber);
        const matchingTarget = normalizedPhone ? targetPhoneMap.get(normalizedPhone) : null;
        
        // Count messages for this chat
        const messageCount = await ChatHistory.count({
          where: { deviceId: sourceDeviceId, chatId: sourceChat.chatId }
        });

        const chatInfo = {
          chatId: sourceChat.chatId,
          contactName: sourceChat.contactName,
          phoneNumber: sourceChat.phoneNumber,
          lastMessage: sourceChat.lastMessageContent,
          messageCount
        };

        preview.stats.totalChats++;
        preview.stats.totalMessages += messageCount;

        if (matchingTarget) {
          preview.toMerge.push({
            source: chatInfo,
            target: {
              chatId: matchingTarget.chatId,
              contactName: matchingTarget.contactName
            }
          });
          preview.stats.matchingChats++;
        } else if (mode === 'all') {
          preview.toAdd.push(chatInfo);
          preview.stats.newChats++;
        } else {
          preview.skipped.push(chatInfo);
        }
      }

      return preview;
    } catch (error) {
      console.error('[MIGRATION] Error previewing restore:', error);
      throw error;
    }
  }

  /**
   * Execute chat history restoration
   */
  async executeRestore(sourceDeviceId, targetDeviceId, options = {}) {
    try {
      const { 
        mode = 'matching',          // 'matching' | 'all' | 'selected'
        selectedChats = null,       // Array of chatIds or null for all
        includeAIMemory = true,
        includeIntentScores = true
      } = options;

      // Get preview first
      const preview = await this.previewRestore(sourceDeviceId, targetDeviceId, { mode, selectedChats });
      
      const targetDevice = await Device.findByPk(targetDeviceId);
      const results = {
        merged: 0,
        added: 0,
        messagesRestored: 0,
        aiMemoryRestored: 0,
        errors: []
      };

      // Process chats to merge (matching phone numbers)
      for (const item of preview.toMerge) {
        try {
          await this.mergeChat(
            sourceDeviceId, 
            item.source.chatId, 
            targetDeviceId, 
            item.target.chatId,
            { includeAIMemory, includeIntentScores }
          );
          results.merged++;
          results.messagesRestored += item.source.messageCount;
        } catch (err) {
          results.errors.push({
            chatId: item.source.chatId,
            error: err.message
          });
        }
      }

      // Process chats to add (new contacts)
      if (mode === 'all') {
        for (const item of preview.toAdd) {
          try {
            await this.copyChat(
              sourceDeviceId, 
              item.chatId, 
              targetDeviceId,
              targetDevice.sessionId,
              { includeAIMemory, includeIntentScores }
            );
            results.added++;
            results.messagesRestored += item.messageCount;
          } catch (err) {
            results.errors.push({
              chatId: item.chatId,
              error: err.message
            });
          }
        }
      }

      // Restore AI memory if enabled
      if (includeAIMemory) {
        const memoryResult = await this.restoreAIMemory(sourceDeviceId, targetDeviceId, mode);
        results.aiMemoryRestored = memoryResult.count;
      }

      console.log(`[MIGRATION] Restore complete:`, results);
      return results;
    } catch (error) {
      console.error('[MIGRATION] Error executing restore:', error);
      throw error;
    }
  }

  /**
   * Merge messages from source chat into existing target chat
   */
  async mergeChat(sourceDeviceId, sourceChatId, targetDeviceId, targetChatId, options = {}) {
    const { includeIntentScores = true } = options;

    // Get all messages from source
    const sourceMessages = await ChatHistory.findAll({
      where: { deviceId: sourceDeviceId, chatId: sourceChatId },
      order: [['timestamp', 'ASC']]
    });

    // Get existing message IDs in target to avoid duplicates
    const existingMessageIds = new Set();
    const targetMessages = await ChatHistory.findAll({
      where: { deviceId: targetDeviceId, chatId: targetChatId },
      attributes: ['messageId']
    });
    targetMessages.forEach(m => {
      if (m.messageId) existingMessageIds.add(m.messageId);
    });

    // Get target device for sessionId
    const targetDevice = await Device.findByPk(targetDeviceId);

    // Copy messages that don't already exist
    let copied = 0;
    for (const msg of sourceMessages) {
      // Skip if message already exists (by messageId)
      if (msg.messageId && existingMessageIds.has(msg.messageId)) {
        continue;
      }

      await ChatHistory.create({
        deviceId: targetDeviceId,
        sessionId: targetDevice.sessionId,
        chatId: targetChatId,
        phoneNumber: msg.phoneNumber,
        messageId: msg.messageId,
        direction: msg.direction,
        messageType: msg.messageType,
        content: msg.content,
        mediaUrl: msg.mediaUrl,
        caption: msg.caption,
        timestamp: msg.timestamp,
        fromMe: msg.fromMe,
        senderName: msg.senderName,
        isAiGenerated: msg.isAiGenerated,
        agentName: msg.agentName,
        restoredFromDeviceId: sourceDeviceId
      });
      copied++;
    }

    // Optionally update intent scores in target
    if (includeIntentScores) {
      const sourceChatSettings = await ChatSettings.findOne({
        where: { deviceId: sourceDeviceId, chatId: sourceChatId }
      });
      const targetChatSettings = await ChatSettings.findOne({
        where: { deviceId: targetDeviceId, chatId: targetChatId }
      });

      if (sourceChatSettings && targetChatSettings) {
        // Only update if source has higher intent score
        if (sourceChatSettings.purchaseIntentScore > targetChatSettings.purchaseIntentScore) {
          await targetChatSettings.update({
            purchaseIntentScore: sourceChatSettings.purchaseIntentScore,
            purchaseIntentStage: sourceChatSettings.purchaseIntentStage,
            intentSignals: sourceChatSettings.intentSignals,
            peakIntentScore: Math.max(
              sourceChatSettings.peakIntentScore || 0,
              targetChatSettings.peakIntentScore || 0
            )
          });
        }
      }
    }

    return { copied };
  }

  /**
   * Copy entire chat to new device (for new contacts)
   */
  async copyChat(sourceDeviceId, sourceChatId, targetDeviceId, targetSessionId, options = {}) {
    const { includeIntentScores = true } = options;

    // Copy ChatSettings
    const sourceSettings = await ChatSettings.findOne({
      where: { deviceId: sourceDeviceId, chatId: sourceChatId }
    });

    if (!sourceSettings) {
      throw new Error(`Source chat settings not found for ${sourceChatId}`);
    }

    // Get the device to get userId
    const targetDevice = await Device.findByPk(targetDeviceId);

    // Create new ChatSettings for target device
    const settingsData = {
      userId: targetDevice.userId,
      deviceId: targetDeviceId,
      sessionId: targetSessionId,
      chatId: sourceChatId,
      phoneNumber: sourceSettings.phoneNumber,
      contactName: sourceSettings.contactName,
      profilePictureUrl: sourceSettings.profilePictureUrl,
      aiEnabled: sourceSettings.aiEnabled,
      lastMessageContent: sourceSettings.lastMessageContent,
      lastMessageTimestamp: sourceSettings.lastMessageTimestamp,
      labels: sourceSettings.labels,
      restoredFromDeviceId: sourceDeviceId
    };

    if (includeIntentScores) {
      settingsData.purchaseIntentScore = sourceSettings.purchaseIntentScore;
      settingsData.purchaseIntentStage = sourceSettings.purchaseIntentStage;
      settingsData.intentSignals = sourceSettings.intentSignals;
      settingsData.peakIntentScore = sourceSettings.peakIntentScore;
    }

    await ChatSettings.create(settingsData);

    // Copy all messages
    const sourceMessages = await ChatHistory.findAll({
      where: { deviceId: sourceDeviceId, chatId: sourceChatId },
      order: [['timestamp', 'ASC']]
    });

    for (const msg of sourceMessages) {
      await ChatHistory.create({
        deviceId: targetDeviceId,
        sessionId: targetSessionId,
        chatId: sourceChatId,
        phoneNumber: msg.phoneNumber,
        messageId: msg.messageId,
        direction: msg.direction,
        messageType: msg.messageType,
        content: msg.content,
        mediaUrl: msg.mediaUrl,
        caption: msg.caption,
        timestamp: msg.timestamp,
        fromMe: msg.fromMe,
        senderName: msg.senderName,
        isAiGenerated: msg.isAiGenerated,
        agentName: msg.agentName,
        restoredFromDeviceId: sourceDeviceId
      });
    }

    return { messagesCount: sourceMessages.length };
  }

  /**
   * Restore AI conversation memory
   */
  async restoreAIMemory(sourceDeviceId, targetDeviceId, mode = 'matching') {
    try {
      // Get source AI memories
      const sourceMemories = await AIConversationMemory.findAll({
        where: { deviceId: sourceDeviceId }
      });

      // Get target device
      const targetDevice = await Device.findByPk(targetDeviceId);

      // Get existing memories in target
      const existingMemories = await AIConversationMemory.findAll({
        where: { deviceId: targetDeviceId },
        attributes: ['chatId']
      });
      const existingChatIds = new Set(existingMemories.map(m => m.chatId));

      let restored = 0;
      for (const memory of sourceMemories) {
        // Skip if already exists in target
        if (existingChatIds.has(memory.chatId)) {
          continue;
        }

        // For 'matching' mode, check if there's a matching chat in target
        if (mode === 'matching') {
          const hasMatchingChat = await ChatSettings.findOne({
            where: { 
              deviceId: targetDeviceId, 
              phoneNumber: memory.chatId.replace('@s.whatsapp.net', '')
            }
          });
          if (!hasMatchingChat) continue;
        }

        await AIConversationMemory.create({
          deviceId: targetDeviceId,
          sessionId: targetDevice.sessionId,
          chatId: memory.chatId,
          messages: memory.messages,
          summary: memory.summary,
          lastInteraction: memory.lastInteraction
        });
        restored++;
      }

      return { count: restored };
    } catch (error) {
      console.error('[MIGRATION] Error restoring AI memory:', error);
      return { count: 0, error: error.message };
    }
  }

  /**
   * Unarchive a device
   */
  async unarchiveDevice(deviceId) {
    try {
      const device = await Device.findByPk(deviceId);
      
      if (!device) {
        throw new Error('Device not found');
      }

      if (device.status !== 'archived') {
        throw new Error('Device is not archived');
      }

      await device.update({
        status: 'logged_out',
        archivedAt: null,
        archiveReason: null
      });

      return {
        success: true,
        device: device.toJSON()
      };
    } catch (error) {
      console.error('[MIGRATION] Error unarchiving device:', error);
      throw error;
    }
  }

  /**
   * Permanently delete archived device and all its data
   */
  async deleteArchivedDevice(deviceId) {
    try {
      const device = await Device.findByPk(deviceId);
      
      if (!device) {
        throw new Error('Device not found');
      }

      if (device.status !== 'archived') {
        throw new Error('Only archived devices can be permanently deleted');
      }

      // Delete all related data (CASCADE should handle this, but be explicit)
      await ChatHistory.destroy({ where: { deviceId } });
      await ChatSettings.destroy({ where: { deviceId } });
      await AIConversationMemory.destroy({ where: { deviceId } });
      
      // Delete device
      await device.destroy();

      return { success: true, message: 'Device and all data permanently deleted' };
    } catch (error) {
      console.error('[MIGRATION] Error deleting archived device:', error);
      throw error;
    }
  }

  /**
   * Global search across all archived messages for a user
   */
  async globalSearch(userId, query, options = {}) {
    try {
      const { page = 1, limit = 50, deviceId = null, dateFrom = null, dateTo = null } = options;
      
      if (!query || query.trim().length < 2) {
        throw new Error('Search query must be at least 2 characters');
      }

      // Get all archived devices for this user (or specific one)
      const deviceWhere = { userId: String(userId), status: 'archived' };
      if (deviceId) {
        deviceWhere.id = deviceId;
      }
      
      const archivedDevices = await Device.findAll({
        where: deviceWhere,
        attributes: ['id', 'alias', 'realPhoneNumber', 'phoneNumber']
      });
      
      if (archivedDevices.length === 0) {
        return {
          results: [],
          total: 0,
          page,
          totalPages: 0,
          query
        };
      }

      const deviceIds = archivedDevices.map(d => d.id);
      const deviceMap = new Map(archivedDevices.map(d => [d.id, d.toJSON()]));

      // Build message search query
      const messageWhere = {
        deviceId: { [Op.in]: deviceIds },
        [Op.or]: [
          { content: { [Op.like]: `%${query}%` } },
          { caption: { [Op.like]: `%${query}%` } }
        ]
      };

      // Date range filter
      if (dateFrom || dateTo) {
        messageWhere.timestamp = {};
        if (dateFrom) messageWhere.timestamp[Op.gte] = new Date(dateFrom);
        if (dateTo) messageWhere.timestamp[Op.lte] = new Date(dateTo);
      }

      const { count, rows } = await ChatHistory.findAndCountAll({
        where: messageWhere,
        attributes: [
          'id', 'deviceId', 'chatId', 'messageId', 'content', 
          'caption', 'timestamp', 'direction', 'messageType', 'fromMe'
        ],
        order: [['timestamp', 'DESC']],
        limit,
        offset: (page - 1) * limit
      });

      // Enrich results with chat and device info
      const chatIds = [...new Set(rows.map(r => r.chatId))];
      const chatSettings = await ChatSettings.findAll({
        where: { 
          deviceId: { [Op.in]: deviceIds },
          chatId: { [Op.in]: chatIds }
        },
        attributes: ['deviceId', 'chatId', 'contactName', 'phoneNumber', 'profilePictureUrl']
      });
      
      const chatMap = new Map();
      chatSettings.forEach(cs => {
        const key = `${cs.deviceId}-${cs.chatId}`;
        chatMap.set(key, cs.toJSON());
      });

      const results = rows.map(msg => {
        const msgJson = msg.toJSON();
        const chatKey = `${msgJson.deviceId}-${msgJson.chatId}`;
        const chatInfo = chatMap.get(chatKey) || {};
        const deviceInfo = deviceMap.get(msgJson.deviceId) || {};
        
        return {
          ...msgJson,
          contactName: chatInfo.contactName,
          contactPhone: chatInfo.phoneNumber,
          profilePictureUrl: chatInfo.profilePictureUrl,
          deviceAlias: deviceInfo.alias,
          devicePhone: deviceInfo.realPhoneNumber || deviceInfo.phoneNumber,
          // Highlight matching text
          highlightedContent: this.highlightMatch(msgJson.content || msgJson.caption, query)
        };
      });

      return {
        results,
        total: count,
        page,
        totalPages: Math.ceil(count / limit),
        query,
        deviceCount: archivedDevices.length
      };
    } catch (error) {
      console.error('[MIGRATION] Error in global search:', error);
      throw error;
    }
  }

  /**
   * Highlight matching text in content
   */
  highlightMatch(text, query) {
    if (!text || !query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '**$1**');
  }

  /**
   * Bulk restore from multiple archived devices to one target
   */
  async bulkRestore(sourceDeviceIds, targetDeviceId, options = {}) {
    try {
      const {
        mode = 'matching',
        includeAIMemory = true,
        includeIntentScores = true
      } = options;

      // Validate all source devices belong to same user
      const sourceDevices = await Device.findAll({
        where: { id: { [Op.in]: sourceDeviceIds } }
      });
      
      const targetDevice = await Device.findByPk(targetDeviceId);
      
      if (!targetDevice) {
        throw new Error('Target device not found');
      }

      // Validate ownership
      const userIds = [...new Set(sourceDevices.map(d => d.userId))];
      if (userIds.length > 1 || !userIds.includes(targetDevice.userId)) {
        throw new Error('All devices must belong to the same user');
      }

      const bulkResults = {
        totalMerged: 0,
        totalAdded: 0,
        totalMessagesRestored: 0,
        totalAIMemoryRestored: 0,
        deviceResults: [],
        errors: []
      };

      // Process each source device
      for (const sourceDevice of sourceDevices) {
        console.log(`[BULK-RESTORE] Processing device ${sourceDevice.id} (${sourceDevice.alias})`);
        
        try {
          const result = await this.executeRestore(
            sourceDevice.id,
            targetDeviceId,
            { mode, includeAIMemory, includeIntentScores }
          );
          
          bulkResults.deviceResults.push({
            deviceId: sourceDevice.id,
            alias: sourceDevice.alias,
            ...result
          });
          
          bulkResults.totalMerged += result.merged;
          bulkResults.totalAdded += result.added;
          bulkResults.totalMessagesRestored += result.messagesRestored;
          bulkResults.totalAIMemoryRestored += result.aiMemoryRestored;
          
          if (result.errors.length > 0) {
            bulkResults.errors.push(...result.errors.map(e => ({
              ...e,
              sourceDeviceId: sourceDevice.id,
              sourceDeviceAlias: sourceDevice.alias
            })));
          }
        } catch (err) {
          bulkResults.errors.push({
            sourceDeviceId: sourceDevice.id,
            sourceDeviceAlias: sourceDevice.alias,
            error: err.message
          });
        }
      }

      console.log(`[BULK-RESTORE] Complete:`, bulkResults);
      return bulkResults;
    } catch (error) {
      console.error('[MIGRATION] Error in bulk restore:', error);
      throw error;
    }
  }

  /**
   * Preview bulk restore from multiple devices
   */
  async previewBulkRestore(sourceDeviceIds, targetDeviceId, options = {}) {
    try {
      const { mode = 'matching' } = options;
      
      const previews = [];
      let totalStats = {
        totalChats: 0,
        totalMessages: 0,
        matchingChats: 0,
        newChats: 0,
        skippedChats: 0
      };

      for (const sourceId of sourceDeviceIds) {
        try {
          const preview = await this.previewRestore(sourceId, targetDeviceId, { mode });
          previews.push(preview);
          
          totalStats.totalChats += preview.stats.totalChats;
          totalStats.totalMessages += preview.stats.totalMessages;
          totalStats.matchingChats += preview.stats.matchingChats;
          totalStats.newChats += preview.stats.newChats;
          totalStats.skippedChats += preview.skipped.length;
        } catch (err) {
          previews.push({
            sourceDevice: { id: sourceId },
            error: err.message
          });
        }
      }

      return {
        previews,
        totalStats,
        sourceDeviceCount: sourceDeviceIds.length
      };
    } catch (error) {
      console.error('[MIGRATION] Error in bulk preview:', error);
      throw error;
    }
  }

  /**
   * Get archive statistics for a user
   */
  async getArchiveStats(userId) {
    try {
      const archivedDevices = await Device.findAll({
        where: { userId: String(userId), status: 'archived' },
        attributes: ['id']
      });

      if (archivedDevices.length === 0) {
        return {
          deviceCount: 0,
          chatCount: 0,
          messageCount: 0,
          oldestArchive: null,
          newestArchive: null
        };
      }

      const deviceIds = archivedDevices.map(d => d.id);

      const [chatCount, messageCount, dateRange] = await Promise.all([
        ChatSettings.count({ where: { deviceId: { [Op.in]: deviceIds } } }),
        ChatHistory.count({ where: { deviceId: { [Op.in]: deviceIds } } }),
        Device.findOne({
          where: { id: { [Op.in]: deviceIds } },
          attributes: [
            [sequelize.fn('MIN', sequelize.col('archivedAt')), 'oldest'],
            [sequelize.fn('MAX', sequelize.col('archivedAt')), 'newest']
          ],
          raw: true
        })
      ]);

      return {
        deviceCount: archivedDevices.length,
        chatCount,
        messageCount,
        oldestArchive: dateRange?.oldest,
        newestArchive: dateRange?.newest
      };
    } catch (error) {
      console.error('[MIGRATION] Error getting archive stats:', error);
      throw error;
    }
  }

  /**
   * Select specific chats for restoration
   */
  async previewSelectedChatsRestore(sourceDeviceId, targetDeviceId, selectedChatIds) {
    try {
      return await this.previewRestore(sourceDeviceId, targetDeviceId, {
        mode: 'all',
        selectedChats: selectedChatIds
      });
    } catch (error) {
      console.error('[MIGRATION] Error previewing selected chats:', error);
      throw error;
    }
  }

  /**
   * Restore only selected chats
   */
  async restoreSelectedChats(sourceDeviceId, targetDeviceId, selectedChatIds, options = {}) {
    try {
      const { includeAIMemory = true, includeIntentScores = true } = options;
      
      return await this.executeRestore(sourceDeviceId, targetDeviceId, {
        mode: 'all',
        selectedChats: selectedChatIds,
        includeAIMemory,
        includeIntentScores
      });
    } catch (error) {
      console.error('[MIGRATION] Error restoring selected chats:', error);
      throw error;
    }
  }
}

// Import sequelize for aggregate functions
import { sequelize } from "../models/index.js";

export default new ChatHistoryMigrationService();
