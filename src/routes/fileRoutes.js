import express from "express";
const router = express.Router();
import * as fileController from "../controllers/fileController.js";
import * as messageController from "../controllers/messageController.js";
import apiAuth from "../middleware/apiAuth.js";
import cors from "cors";

// ============================================
// PUBLIC ROUTES (FOR BROWSER IMAGE LOADING)
// ============================================

// Configure CORS specifically for file preview endpoint
const corsOptions = {
  origin: "*",
  methods: ["GET", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  credentials: false,
};

// Handle CORS preflight for file preview
router.options("/:fileId/preview", cors(corsOptions), (req, res) => {
  res.status(204).end();
});

// File preview - public access for <img> tags but still secured by file ownership
// Apply CORS middleware for cross-origin requests
router.get("/:fileId/preview", cors(corsOptions), fileController.getFilePreview);

// ============================================
// PROTECTED ROUTES (REQUIRE API TOKEN)
// ============================================

// All other routes are protected with API token
router.use(apiAuth);

// ============================================
// FILE STORAGE MANAGEMENT
// ============================================

// Upload and store file for reuse
router.post("/upload", fileController.uploadFile);

// List stored files with filtering
router.get("/", fileController.listFiles);

// Search files by name and description
router.get("/search", fileController.searchFiles);

// ============================================
// FRONTEND INTEGRATION ENDPOINTS
// ============================================

// User dashboard and statistics
router.get("/users/:userId/stats", fileController.getUserFileStats);

// Get files by userId and fileType for messaging interface
router.get("/users/:userId/:fileType", fileController.getFilesByUserAndType);

// Bulk operations for frontend
router.delete("/bulk", fileController.bulkDeleteFiles);

// ============================================
// INDIVIDUAL FILE OPERATIONS
// ============================================

// Get single file info
router.get("/:fileId", fileController.getFile);

// Update file metadata (description, expiry)
router.put("/:fileId", fileController.updateFile);

// Delete stored file
router.delete("/:fileId", fileController.deleteFile);

// Cleanup expired files (admin/cron endpoint)
router.post("/cleanup/expired", fileController.cleanupExpired);

export default router;
