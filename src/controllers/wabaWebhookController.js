
import config from "../config/config.js";
import { Device } from "../models/index.js";
import whatsappService from "../services/WhatsAppService.js";

/**
 * Controller for WhatsApp Business API Webhooks
 */
class WabaWebhookController {
  
  /**
   * Handle Webhook Verification (GET)
   * Meta calls this when you configure the webhook in the App Dashboard
   */
  async verifyWebhook(req, res) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // You should allow configuring the verify token in .env or config
    // For now, let's assume a default or check against a specific device's token if needed.
    // However, usually there is ONE verify token for the App.
    // Let's use config.apiToken or a dedicated config.waba.verifyToken
    
    // Fallback: If no dedicated token, accept a hardcoded one or the general API token
    const VERIFY_TOKEN = config.waba?.verifyToken || config.apiToken || 'baileys_api_secret';

    if (mode && token) {
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('[WABA-WEBHOOK] Webhook verified successfully');
        res.status(200).send(challenge);
      } else {
        console.log(`[WABA-WEBHOOK] Verification failed. Token: ${token}, Expected: ${VERIFY_TOKEN}`);
        res.sendStatus(403);
      }
    } else {
      res.sendStatus(400);
    }
  }

  /**
   * Handle Webhook Events (POST)
   */
  async handleWebhook(req, res) {
    // Send 200 OK immediately to acknowledge receipt
    res.sendStatus(200);

    const body = req.body;

    try {
      if (body.object === 'whatsapp_business_account') {
        for (const entry of body.entry || []) {
          for (const change of entry.changes || []) {
            const value = change.value;
            
            if (value && value.messages) {
              // Handle incoming messages
              const phoneNumberId = value.metadata.phone_number_id;
              
              // Find device associated with this PhoneNumberId
              // Note: Device model needs to have wabaPhoneNumberId
              const device = await Device.findOne({ 
                where: { wabaPhoneNumberId: phoneNumberId } 
              });

              if (!device) {
                console.warn(`[WABA-WEBHOOK] Received message for unknown Phone ID: ${phoneNumberId}`);
                continue;
              }

              for (const message of value.messages) {
                await this.processMessage(device, message, value.contacts);
              }
            } else if (value && value.statuses) {
              // Handle message status updates (sent, delivered, read)
              // TODO: Implement status updates
            }
          }
        }
      } else {
        // Unknown event type
        console.log(`[WABA-WEBHOOK] Received unknown event type: ${body.object}`);
      }
    } catch (error) {
      console.error('[WABA-WEBHOOK] Error processing webhook:', error);
    }
  }

  /**
   * Process a single incoming WABA message and normalize it for the system
   */
  async processMessage(device, wabaMessage, contacts) {
    const sessionId = device.sessionId;
    
    // Get sender contact info if available in the payload
    const contactInfo = contacts?.find(c => c.wa_id === wabaMessage.from);
    const senderName = contactInfo?.profile?.name || wabaMessage.from;

    // Normalize to Baileys-like simplified structure
    // This allows reusing existing Logic in MessageHandler
    
    const normalizedMessage = {
      key: {
        remoteJid: `${wabaMessage.from}@s.whatsapp.net`,
        fromMe: false,
        id: wabaMessage.id
      },
      pushName: senderName,
      messageTimestamp: wabaMessage.timestamp
    };

    // Map WABA types to Baileys proto types
    switch (wabaMessage.type) {
      case 'text':
        normalizedMessage.message = {
          conversation: wabaMessage.text.body
        };
        break;
      case 'image':
        normalizedMessage.message = {
          imageMessage: {
            url: wabaMessage.image.id, // We'll need to fetch this ID later
            caption: wabaMessage.image.caption,
            mimetype: wabaMessage.image.mime_type
          }
        };
        break;
      // TODO: Add other types (video, document, location, etc.)
      default:
        console.log(`[WABA-WEBHOOK] Unsupported message type: ${wabaMessage.type}`);
        return; 
    }

    console.log(`[WABA-WEBHOOK] Processing normalized message for session ${sessionId}`);
    
    // Inject into existing pipeline
    // We pass the "provider" context if needed, but the MessageHandler mostly cares about the structure
    await whatsappService.handleIncomingMessage(sessionId, normalizedMessage);
  }
}

export default new WabaWebhookController();
