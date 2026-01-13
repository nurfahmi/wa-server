
import express from 'express';
import wabaWebhookController from '../controllers/wabaWebhookController.js';

const router = express.Router();

// Webhook Verification (GET)
router.get('/', (req, res) => wabaWebhookController.verifyWebhook(req, res));

// Webhook Notification (POST)
router.post('/', (req, res) => wabaWebhookController.handleWebhook(req, res));

export default router;
