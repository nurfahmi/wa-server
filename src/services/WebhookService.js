import axios from "axios";
import { Device } from "../models/index.js";

class WebhookService {
  async sendWebhook(sessionId, eventType, data) {
    try {
      // Get device settings
      const device = await Device.findOne({
        where: { sessionId },
      });

      if (!device?.webhookEnabled || !device?.webhookUrl) {
        return;
      }

      // Check if this event type is enabled for this device
      if (!device.webhookEvents.includes(eventType)) {
        return;
      }

      // Send webhook
      await axios.post(
        device.webhookUrl,
        {
          type: eventType,
          sessionId,
          deviceId: device.id,
          timestamp: new Date().toISOString(),
          data,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 5000, // 5 second timeout
        }
      );
    } catch (error) {
      console.error(`Error sending webhook for ${eventType}:`, error.message);
    }
  }
}

export default new WebhookService();
