import express from "express";
import * as oauthController from "../controllers/oauthController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.get("/login", oauthController.login);
router.post("/login-local", oauthController.loginLocal);
router.post("/exchange", oauthController.exchange);
router.post("/webhooks/membership", oauthController.handleWebhook);
router.get("/webhooks/membership", oauthController.handleGetWebhook);

// router.get("/callback", oauthController.callback); // Removed as we use frontend callback now

// Protected routes
router.get("/me", authMiddleware, oauthController.getMe);

export default router;
