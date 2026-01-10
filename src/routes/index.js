import express from "express";
const router = express.Router();
import * as deviceController from "../controllers/deviceController.js";
import * as messageController from "../controllers/messageController.js";
import * as contactController from "../controllers/contactController.js";
import * as serverController from "../controllers/serverController.js";
import chatSettingsRoutes from "./chatSettings.js";
import adminRoutes from "./adminRoutes.js";
import apiAuth from "../middleware/apiAuth.js";
import deviceAuth from "../middleware/deviceAuth.js";
import multer from "multer";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only JPEG, PNG and WebP images are allowed."
        )
      );
    }
  },
});

// Device API key routes (no API token needed, only device API key)
router.post(
  "/device/send",
  deviceAuth, // Apply device auth middleware
  upload.single("image"), // Handle file upload if present
  messageController.sendMessageByApiKey
);

// File Storage Routes (includes some public routes like preview)
import fileRoutes from "./fileRoutes.js";
router.use("/files", fileRoutes);

// All other routes are protected with API token
router.use(apiAuth);

// Device Management Routes
router.get("/devices", deviceController.getSessions); // Alias for getSessions to list all devices
router.post("/devices", deviceController.createDevice); // Create new device and start session
router.get("/users/:userId/devices", deviceController.getUserDevices); // List user's devices
router.get("/devices/:deviceId", deviceController.getDevice); // Get device details with status
router.put("/devices/:deviceId", deviceController.updateDevice); // Update device metadata
router.delete("/devices/:deviceId", deviceController.deleteDevice); // Delete device and cleanup session

// Device Session Management
router.post("/devices/:deviceId/logout", deviceController.logoutDevice); // Logout device (clear session, keep device)
router.post("/devices/:deviceId/login", deviceController.loginDevice); // Login/relogin device (works for both cases)
router.get("/devices/:deviceId/qr", deviceController.getDeviceQR); // Get QR code for pairing

// Message Routes
// Import middleware
import { uploadMiddleware } from "../controllers/messageController.js";

router.post("/send", messageController.sendMessage);
router.post("/send/image", uploadMiddleware, messageController.sendImage);
router.post("/send/video", uploadMiddleware, messageController.sendVideo);
router.post("/send/document", uploadMiddleware, messageController.sendDocument);
router.get("/messages", messageController.getAllMessages);
router.get(
  "/devices/:deviceId/messages/:remoteJid",
  messageController.getMessages
);
router.get("/users/:userId/messages", messageController.getUserMessages);

// Bulk & Batch Sending Routes
router.post("/send/bulk", messageController.sendBulkFiles);
router.post("/send/mixed", messageController.sendMixedMedia);
router.post("/send/batch", messageController.sendBatchFiles);

// Message Logging & Status Routes
router.get("/users/:userId/message-logs", messageController.getUserMessageLogs);
router.get("/messages/:messageId/status", messageController.getMessageStatus);
router.get(
  "/users/:userId/sending-stats",
  messageController.getUserSendingStats
);
router.post("/messages/:messageId/resend", messageController.resendMessage);

// Contact & Chat Routes (Database stored - Primary endpoints)
router.get("/devices/:deviceId/contacts", contactController.getContacts);
router.get("/devices/:deviceId/chats", contactController.getChats);
router.get("/devices/:deviceId/groups", contactController.getGroups);
router.get("/devices/:deviceId/chats/:chatId/history", contactController.getChatHistory);
router.put("/devices/:deviceId/chats/:chatId/settings", contactController.updateChatSettings);
router.post("/devices/:deviceId/chats/:chatId/takeover", contactController.takeoverChat);
router.post("/devices/:deviceId/chats/:chatId/release", contactController.releaseChat);
router.post("/devices/:deviceId/chats/:chatId/handover", contactController.handoverChat);
router.get("/users/:userId/contacts", contactController.getUserContacts);
router.get("/cs/dashboard-stats", contactController.getCSDashboardStats);

// WhatsApp Data Sync & Fetch Routes
router.post("/devices/:deviceId/sync", contactController.syncWhatsAppData);
router.get(
  "/devices/:deviceId/contacts/baileys-store",
  contactController.fetchContactsFromBaileysStore
);
router.get(
  "/devices/:deviceId/chats/baileys-store",
  contactController.fetchChatsFromBaileysStore
);
router.get(
  "/devices/:deviceId/messages/baileys-store",
  contactController.fetchMessagesFromBaileysStore
);

// Group Management
router.get(
  "/devices/:deviceId/groups/:groupId/members",
  contactController.fetchGroupMembers
);

// Profile & Status Routes
router.get(
  "/devices/:deviceId/profile/:jid",
  contactController.fetchProfilePicture
);
router.get(
  "/devices/:deviceId/presence/:jid",
  contactController.fetchPresenceStatus
);
router.get(
  "/devices/:deviceId/business/:jid",
  contactController.fetchBusinessProfile
);

// Device Settings Routes
router.get("/devices/:deviceId/settings/ai", deviceController.getAISettings);
router.put("/devices/:deviceId/settings/ai", deviceController.updateAISettings);
router.get(
  "/devices/:deviceId/settings/webhook",
  deviceController.getWebhookSettings
);
router.put(
  "/devices/:deviceId/settings/webhook",
  deviceController.updateWebhookSettings
);

// AI Testing Route
router.post("/test-ai", deviceController.testAI);

// AI Provider Routes (Read-only for regular users)
router.get("/ai/providers", deviceController.getAIProviders);

// Session Management
router.get("/sessions", deviceController.getSessions);
router.post("/sessions/:sessionId/cancel", deviceController.cancelSession);

// Chat Settings Routes
router.use("/", chatSettingsRoutes);

// Admin Routes (AI Provider/Model/Cost Management)
router.use("/admin", adminRoutes);

import * as dashboardController from "../controllers/dashboardController.js";

// Dashboard Routes
router.get("/dashboard/stats", dashboardController.getDashboardStats);

import * as userController from "../controllers/userController.js";

// Agent Management Routes (Manager only)
router.get("/agents", userController.getAgents);
router.post("/agents", userController.createAgent);
router.delete("/agents/:id", userController.deleteAgent);

// Server Monitoring
router.get("/server/stats", serverController.getServerStats);

export default router;
