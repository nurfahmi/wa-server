import express from "express";
const router = express.Router();
import * as businessTemplateController from "../controllers/businessTemplateController.js";

// Get all business templates (with optional filters)
router.get("/", businessTemplateController.getAllTemplates);

// Get business types list
router.get("/types", businessTemplateController.getBusinessTypes);

// Get specific template by business type and language
router.get("/:businessType/:language?", businessTemplateController.getTemplate);

// Admin routes (for managing templates)
router.put(
  "/:businessType/:language?",
  businessTemplateController.createOrUpdateTemplate
);
router.delete(
  "/:businessType/:language?",
  businessTemplateController.deleteTemplate
);

export default router;
