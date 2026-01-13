import express from "express";
const router = express.Router();
import * as chatSettingsController from "../controllers/chatSettingsController.js";

// Get all chats for a device with settings
router.get("/devices/:deviceId/chat-settings", chatSettingsController.getChats);

// Get summary of active chats
router.get(
  "/devices/:deviceId/chat-settings/summary",
  chatSettingsController.getChatsSummary
);

// Get specific chat settings
router.get(
  "/devices/:deviceId/chat-settings/:phoneNumber",
  chatSettingsController.getChatSettings
);

// Update specific chat settings
router.put(
  "/devices/:deviceId/chat-settings/:phoneNumber",
  chatSettingsController.updateChatSettings
);

// Delete specific chat and its history
router.delete(
  "/devices/:deviceId/chat-settings/:phoneNumber",
  chatSettingsController.deleteChat
);

// Mark messages in a chat as read (send read receipts)
router.post(
  "/devices/:deviceId/chats/:chatId/read",
  chatSettingsController.markAsRead
);

// Bulk update multiple chats
router.post(
  "/devices/:deviceId/chat-settings/bulk-update",
  chatSettingsController.bulkUpdateChats
);

// Bulk update multiple chats
router.patch("/bulk", chatSettingsController.bulkUpdateChats);

// Memory management routes
router.patch(
  "/:deviceId/:chatId/memory",
  chatSettingsController.updateMemorySettings
);
router.delete("/:deviceId/:chatId/memory", chatSettingsController.clearMemory);

// Get conversation history for a specific chat
router.get(
  "/devices/:deviceId/chat-settings/:phoneNumber/conversation",
  chatSettingsController.getChatConversation
);

// Get conversation stats for a specific chat
router.get(
  "/devices/:deviceId/chat-settings/:phoneNumber/stats",
  chatSettingsController.getChatStats
);

// ============================================================================
// PURCHASE INTENT ANALYTICS ROUTES
// ============================================================================

// Get purchase intent summary for a device (aggregated stats)
router.get(
  "/devices/:deviceId/intent/summary",
  chatSettingsController.getIntentSummary
);

// Get hot leads for a device (high intent customers)
router.get(
  "/devices/:deviceId/intent/hot-leads",
  chatSettingsController.getHotLeads
);

// Get all chats with intent analytics (paginated, sortable)
router.get(
  "/devices/:deviceId/intent/analytics",
  chatSettingsController.getIntentAnalytics
);

// Get intent history for a specific chat
router.get(
  "/devices/:deviceId/chat-settings/:phoneNumber/intent-history",
  chatSettingsController.getChatIntentHistory
);

// ============================================================================
// CONVERSATION OUTCOME & LEARNING ROUTES
// ============================================================================

// Mark conversation outcome (converted, lost, follow_up)
router.post(
  "/devices/:deviceId/chat-settings/:phoneNumber/outcome",
  chatSettingsController.markConversationOutcome
);

// Get conversion analytics for a device
router.get(
  "/devices/:deviceId/analytics/conversions",
  chatSettingsController.getConversionAnalytics
);

// Get follow-up tasks
router.get(
  "/devices/:deviceId/analytics/follow-ups",
  chatSettingsController.getFollowUpTasks
);

// Get conversion funnel analytics
router.get(
  "/devices/:deviceId/analytics/funnel",
  chatSettingsController.getConversionFunnel
);

// Get learning insights (what patterns lead to conversions)
router.get(
  "/devices/:deviceId/analytics/learning",
  chatSettingsController.getLearningInsights
);

export default router;
