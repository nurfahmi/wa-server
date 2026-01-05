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

export default router;
