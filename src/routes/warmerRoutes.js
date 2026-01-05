import express from "express";
const router = express.Router();
import warmerController from "../controllers/warmerController.js";
import config from "../config/config.js";

// Middleware to check if warmer is enabled
router.use((req, res, next) => {
  if (!config.warmer.enabled) {
    return res.status(403).json({
      success: false,
      error: "Warmer functionality is disabled. Set WARMER_ENABLED=true in .env to enable it."
    });
  }
  next();
});

// Campaign Management Routes
router.post("/campaigns", warmerController.createCampaign);
router.get("/campaigns", warmerController.getCampaigns);
router.get("/campaigns/:campaignId", warmerController.getCampaign);
router.put("/campaigns/:campaignId", warmerController.updateCampaign);
router.delete("/campaigns/:campaignId", warmerController.deleteCampaign);

// Campaign Control Routes
router.post("/campaigns/:campaignId/pause", warmerController.pauseCampaign);
router.post("/campaigns/:campaignId/resume", warmerController.resumeCampaign);
router.post("/campaigns/:campaignId/stop", warmerController.stopCampaign);

// Conversation Template Routes
router.post(
  "/campaigns/:campaignId/templates",
  warmerController.createTemplate
);
router.get("/campaigns/:campaignId/templates", warmerController.getTemplates);
router.get(
  "/campaigns/:campaignId/templates/:templateId",
  warmerController.getTemplate
);
router.put(
  "/campaigns/:campaignId/templates/:templateId",
  warmerController.updateTemplate
);
router.delete(
  "/campaigns/:campaignId/templates/:templateId",
  warmerController.deleteTemplate
);

// Analytics and Logs Routes
router.get("/campaigns/:campaignId/stats", warmerController.getCampaignStats);
router.get("/campaigns/:campaignId/logs", warmerController.getConversationLogs);

// Utility Routes
router.get("/devices", warmerController.getAvailableDevices);
router.get("/templates/defaults", warmerController.getDefaultTemplates);

export default router;
