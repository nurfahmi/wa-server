import express from "express";
const router = express.Router();
import * as adminController from "../controllers/adminController.js";
import adminAuth from "../middleware/adminAuth.js";

// Apply admin authentication to all routes in this router
router.use(adminAuth);

// AI Providers Management (Admin only)
router.get("/ai/providers", adminController.getAIProviders);
router.post("/ai/providers", adminController.createAIProvider);
router.put("/ai/providers/:providerId", adminController.updateAIProvider);
router.delete("/ai/providers/:providerId", adminController.deleteAIProvider);

// AI Models Management (Admin only)
router.get("/ai/models", adminController.getAIModels);
router.post("/ai/models", adminController.createAIModel);
router.put("/ai/models/:modelId", adminController.updateAIModel);
router.delete("/ai/models/:modelId", adminController.deleteAIModel);

// AI Usage Logs (View-only for admin)
router.get("/ai/usage-logs", adminController.getAIUsageLogs);

// AI Cost Alerts (View-only for admin)
router.get("/ai/cost-alerts", adminController.getAICostAlerts);

export default router;
