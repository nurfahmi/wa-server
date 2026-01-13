/**
 * Chat History Archive Routes
 * 
 * Routes for managing archived devices and chat history restoration
 */

import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  getArchivedDevices,
  getActiveDevices,
  archiveDevice,
  unarchiveDevice,
  getConversations,
  getMessages,
  previewRestore,
  executeRestore,
  deleteArchivedDevice,
  globalSearch,
  getArchiveStats,
  previewBulkRestore,
  executeBulkRestore,
  restoreSelectedChats
} from "../controllers/chatHistoryArchiveController.js";

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

// ==========================================
// Device Archive Management
// ==========================================

/**
 * GET /api/chat-history/archived-devices
 * Get all archived devices for the current user
 */
router.get("/archived-devices", getArchivedDevices);

/**
 * GET /api/chat-history/active-devices
 * Get all active (non-archived) devices for the current user
 * Used for selecting restore target
 */
router.get("/active-devices", getActiveDevices);

/**
 * GET /api/chat-history/stats
 * Get archive statistics for the current user
 */
router.get("/stats", getArchiveStats);

// ==========================================
// Global Search
// ==========================================

/**
 * GET /api/chat-history/search
 * Search across all archived messages
 * Query params: q, page, limit, deviceId, dateFrom, dateTo
 */
router.get("/search", globalSearch);

// ==========================================
// Browse Archived History
// ==========================================

/**
 * GET /api/chat-history/devices/:deviceId/conversations
 * Get conversation list for a device (archived or active)
 * Query params: search, page, limit
 */
router.get("/devices/:deviceId/conversations", getConversations);

/**
 * GET /api/chat-history/devices/:deviceId/messages/:chatId
 * Get messages for a specific chat
 * Query params: page, limit, beforeTimestamp
 */
router.get("/devices/:deviceId/messages/:chatId", getMessages);

// ==========================================
// Restore Operations
// ==========================================

/**
 * POST /api/chat-history/restore/preview
 * Preview what will be restored before executing
 * Body: { sourceDeviceId, targetDeviceId, mode, selectedChats }
 */
router.post("/restore/preview", previewRestore);

/**
 * POST /api/chat-history/restore
 * Execute chat history restoration
 * Body: { sourceDeviceId, targetDeviceId, mode, selectedChats, includeAIMemory, includeIntentScores }
 */
router.post("/restore", executeRestore);

/**
 * POST /api/chat-history/restore/bulk/preview
 * Preview bulk restore from multiple archived devices
 * Body: { sourceDeviceIds, targetDeviceId, mode }
 */
router.post("/restore/bulk/preview", previewBulkRestore);

/**
 * POST /api/chat-history/restore/bulk
 * Execute bulk restore from multiple archived devices
 * Body: { sourceDeviceIds, targetDeviceId, mode, includeAIMemory, includeIntentScores }
 */
router.post("/restore/bulk", executeBulkRestore);

/**
 * POST /api/chat-history/restore/selected
 * Restore specific selected chats only
 * Body: { sourceDeviceId, targetDeviceId, selectedChatIds, includeAIMemory, includeIntentScores }
 */
router.post("/restore/selected", restoreSelectedChats);

export default router;
