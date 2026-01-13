/**
 * Chat History Archive Controller
 * 
 * Handles API endpoints for:
 * - Archiving devices
 * - Viewing archived chat history
 * - Restoring history to active devices
 */

import ChatHistoryMigrationService from "../services/ChatHistoryMigrationService.js";
import { Device } from "../models/index.js";

/**
 * Get all archived devices for the current user
 * GET /api/chat-history/archived-devices
 */
export const getArchivedDevices = async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const devices = await ChatHistoryMigrationService.getArchivedDevices(userId);
    
    res.json({
      success: true,
      devices
    });
  } catch (error) {
    console.error('[ARCHIVE] Error getting archived devices:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all active devices for the current user (for restore target selection)
 * GET /api/chat-history/active-devices
 */
export const getActiveDevices = async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const devices = await ChatHistoryMigrationService.getActiveDevices(userId);
    
    res.json({
      success: true,
      devices
    });
  } catch (error) {
    console.error('[ARCHIVE] Error getting active devices:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Archive a device
 * POST /api/devices/:deviceId/archive
 */
export const archiveDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { reason } = req.body; // 'blocked', 'switched_number', 'inactive', 'manual'
    
    // Verify device belongs to user
    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }
    
    if (req.user && req.user.role !== 'superadmin' && String(device.userId) !== String(req.user.id)) {
      return res.status(403).json({ error: "Not authorized to archive this device" });
    }

    const result = await ChatHistoryMigrationService.archiveDevice(deviceId, reason || 'manual');
    
    res.json({
      success: true,
      message: "Device archived successfully",
      ...result
    });
  } catch (error) {
    console.error('[ARCHIVE] Error archiving device:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Unarchive a device
 * POST /api/devices/:deviceId/unarchive
 */
export const unarchiveDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    // Verify device belongs to user
    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }
    
    if (req.user && req.user.role !== 'superadmin' && String(device.userId) !== String(req.user.id)) {
      return res.status(403).json({ error: "Not authorized to unarchive this device" });
    }

    const result = await ChatHistoryMigrationService.unarchiveDevice(deviceId);
    
    res.json({
      success: true,
      message: "Device unarchived successfully",
      ...result
    });
  } catch (error) {
    console.error('[ARCHIVE] Error unarchiving device:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get conversations for a device (archived or active)
 * GET /api/chat-history/devices/:deviceId/conversations
 */
export const getConversations = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { search, page = 1, limit = 50 } = req.query;
    
    // Verify device belongs to user
    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }
    
    if (req.user && req.user.role !== 'superadmin' && String(device.userId) !== String(req.user.id)) {
      return res.status(403).json({ error: "Not authorized to view this device's history" });
    }

    const result = await ChatHistoryMigrationService.getConversationsByDevice(deviceId, {
      search,
      page: parseInt(page),
      limit: parseInt(limit)
    });
    
    res.json({
      success: true,
      device: {
        id: device.id,
        alias: device.alias,
        phoneNumber: device.realPhoneNumber || device.phoneNumber,
        status: device.status,
        archivedAt: device.archivedAt
      },
      ...result
    });
  } catch (error) {
    console.error('[ARCHIVE] Error getting conversations:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get messages for a specific chat
 * GET /api/chat-history/devices/:deviceId/messages/:chatId
 */
export const getMessages = async (req, res) => {
  try {
    const { deviceId, chatId } = req.params;
    const { page = 1, limit = 100, beforeTimestamp } = req.query;
    
    // Verify device belongs to user
    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }
    
    if (req.user && req.user.role !== 'superadmin' && String(device.userId) !== String(req.user.id)) {
      return res.status(403).json({ error: "Not authorized to view this device's history" });
    }

    const result = await ChatHistoryMigrationService.getMessagesByChat(deviceId, chatId, {
      page: parseInt(page),
      limit: parseInt(limit),
      beforeTimestamp
    });
    
    res.json({
      success: true,
      deviceId,
      ...result
    });
  } catch (error) {
    console.error('[ARCHIVE] Error getting messages:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Preview restore operation
 * POST /api/chat-history/restore/preview
 */
export const previewRestore = async (req, res) => {
  try {
    const { sourceDeviceId, targetDeviceId, mode = 'matching', selectedChats } = req.body;
    
    if (!sourceDeviceId || !targetDeviceId) {
      return res.status(400).json({ error: "Source and target device IDs are required" });
    }

    // Verify devices belong to user
    const sourceDevice = await Device.findByPk(sourceDeviceId);
    const targetDevice = await Device.findByPk(targetDeviceId);
    
    if (!sourceDevice || !targetDevice) {
      return res.status(404).json({ error: "Device not found" });
    }
    
    if (req.user && req.user.role !== 'superadmin') {
      if (String(sourceDevice.userId) !== String(req.user.id) || 
          String(targetDevice.userId) !== String(req.user.id)) {
        return res.status(403).json({ error: "Not authorized to access these devices" });
      }
    }

    const preview = await ChatHistoryMigrationService.previewRestore(
      sourceDeviceId, 
      targetDeviceId, 
      { mode, selectedChats }
    );
    
    res.json({
      success: true,
      preview
    });
  } catch (error) {
    console.error('[ARCHIVE] Error previewing restore:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Execute restore operation
 * POST /api/chat-history/restore
 */
export const executeRestore = async (req, res) => {
  try {
    const { 
      sourceDeviceId, 
      targetDeviceId, 
      mode = 'matching',
      selectedChats,
      includeAIMemory = true,
      includeIntentScores = true
    } = req.body;
    
    if (!sourceDeviceId || !targetDeviceId) {
      return res.status(400).json({ error: "Source and target device IDs are required" });
    }

    // Verify devices belong to user
    const sourceDevice = await Device.findByPk(sourceDeviceId);
    const targetDevice = await Device.findByPk(targetDeviceId);
    
    if (!sourceDevice || !targetDevice) {
      return res.status(404).json({ error: "Device not found" });
    }
    
    if (req.user && req.user.role !== 'superadmin') {
      if (String(sourceDevice.userId) !== String(req.user.id) || 
          String(targetDevice.userId) !== String(req.user.id)) {
        return res.status(403).json({ error: "Not authorized to access these devices" });
      }
    }

    const result = await ChatHistoryMigrationService.executeRestore(
      sourceDeviceId, 
      targetDeviceId, 
      { mode, selectedChats, includeAIMemory, includeIntentScores }
    );
    
    res.json({
      success: true,
      message: "Chat history restored successfully",
      result
    });
  } catch (error) {
    console.error('[ARCHIVE] Error executing restore:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Permanently delete an archived device
 * DELETE /api/devices/:deviceId/permanent
 */
export const deleteArchivedDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    // Verify device belongs to user
    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }
    
    if (req.user && req.user.role !== 'superadmin' && String(device.userId) !== String(req.user.id)) {
      return res.status(403).json({ error: "Not authorized to delete this device" });
    }

    if (device.status !== 'archived') {
      return res.status(400).json({ 
        error: "Only archived devices can be permanently deleted. Archive the device first." 
      });
    }

    const result = await ChatHistoryMigrationService.deleteArchivedDevice(deviceId);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[ARCHIVE] Error deleting archived device:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Global search across all archived messages
 * GET /api/chat-history/search
 */
export const globalSearch = async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;
    const { q, query, page = 1, limit = 50, deviceId, dateFrom, dateTo } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const searchQuery = q || query;
    if (!searchQuery || searchQuery.trim().length < 2) {
      return res.status(400).json({ error: "Search query must be at least 2 characters" });
    }

    const result = await ChatHistoryMigrationService.globalSearch(userId, searchQuery, {
      page: parseInt(page),
      limit: parseInt(limit),
      deviceId: deviceId ? parseInt(deviceId) : null,
      dateFrom,
      dateTo
    });
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[ARCHIVE] Error in global search:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get archive statistics for user
 * GET /api/chat-history/stats
 */
export const getArchiveStats = async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const stats = await ChatHistoryMigrationService.getArchiveStats(userId);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('[ARCHIVE] Error getting archive stats:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Preview bulk restore from multiple devices
 * POST /api/chat-history/restore/bulk/preview
 */
export const previewBulkRestore = async (req, res) => {
  try {
    const { sourceDeviceIds, targetDeviceId, mode = 'matching' } = req.body;
    
    if (!sourceDeviceIds || !Array.isArray(sourceDeviceIds) || sourceDeviceIds.length === 0) {
      return res.status(400).json({ error: "Source device IDs array is required" });
    }
    
    if (!targetDeviceId) {
      return res.status(400).json({ error: "Target device ID is required" });
    }

    // Verify target device belongs to user
    const targetDevice = await Device.findByPk(targetDeviceId);
    if (!targetDevice) {
      return res.status(404).json({ error: "Target device not found" });
    }
    
    if (req.user && req.user.role !== 'superadmin' && String(targetDevice.userId) !== String(req.user.id)) {
      return res.status(403).json({ error: "Not authorized to access target device" });
    }

    const preview = await ChatHistoryMigrationService.previewBulkRestore(
      sourceDeviceIds,
      targetDeviceId,
      { mode }
    );
    
    res.json({
      success: true,
      ...preview
    });
  } catch (error) {
    console.error('[ARCHIVE] Error previewing bulk restore:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Execute bulk restore from multiple devices
 * POST /api/chat-history/restore/bulk
 */
export const executeBulkRestore = async (req, res) => {
  try {
    const { 
      sourceDeviceIds, 
      targetDeviceId, 
      mode = 'matching',
      includeAIMemory = true,
      includeIntentScores = true
    } = req.body;
    
    if (!sourceDeviceIds || !Array.isArray(sourceDeviceIds) || sourceDeviceIds.length === 0) {
      return res.status(400).json({ error: "Source device IDs array is required" });
    }
    
    if (!targetDeviceId) {
      return res.status(400).json({ error: "Target device ID is required" });
    }

    // Verify target device belongs to user
    const targetDevice = await Device.findByPk(targetDeviceId);
    if (!targetDevice) {
      return res.status(404).json({ error: "Target device not found" });
    }
    
    if (req.user && req.user.role !== 'superadmin' && String(targetDevice.userId) !== String(req.user.id)) {
      return res.status(403).json({ error: "Not authorized to access target device" });
    }

    const result = await ChatHistoryMigrationService.bulkRestore(
      sourceDeviceIds, 
      targetDeviceId, 
      { mode, includeAIMemory, includeIntentScores }
    );
    
    res.json({
      success: true,
      message: "Bulk restore completed",
      ...result
    });
  } catch (error) {
    console.error('[ARCHIVE] Error executing bulk restore:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Restore specific selected chats
 * POST /api/chat-history/restore/selected
 */
export const restoreSelectedChats = async (req, res) => {
  try {
    const { 
      sourceDeviceId, 
      targetDeviceId, 
      selectedChatIds,
      includeAIMemory = true,
      includeIntentScores = true
    } = req.body;
    
    if (!sourceDeviceId || !targetDeviceId) {
      return res.status(400).json({ error: "Source and target device IDs are required" });
    }
    
    if (!selectedChatIds || !Array.isArray(selectedChatIds) || selectedChatIds.length === 0) {
      return res.status(400).json({ error: "Selected chat IDs array is required" });
    }

    // Verify devices belong to user
    const sourceDevice = await Device.findByPk(sourceDeviceId);
    const targetDevice = await Device.findByPk(targetDeviceId);
    
    if (!sourceDevice || !targetDevice) {
      return res.status(404).json({ error: "Device not found" });
    }
    
    if (req.user && req.user.role !== 'superadmin') {
      if (String(sourceDevice.userId) !== String(req.user.id) || 
          String(targetDevice.userId) !== String(req.user.id)) {
        return res.status(403).json({ error: "Not authorized to access these devices" });
      }
    }

    const result = await ChatHistoryMigrationService.restoreSelectedChats(
      sourceDeviceId, 
      targetDeviceId, 
      selectedChatIds,
      { includeAIMemory, includeIntentScores }
    );
    
    res.json({
      success: true,
      message: "Selected chats restored successfully",
      result
    });
  } catch (error) {
    console.error('[ARCHIVE] Error restoring selected chats:', error);
    res.status(500).json({ error: error.message });
  }
};
