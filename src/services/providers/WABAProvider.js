
import axios from 'axios';
import { Device } from '../../models/index.js';

class WABAProvider {
  constructor() {
    this.apiVersion = 'v18.0';
    this.baseUrl = 'https://graph.facebook.com';
  }

  /**
   * Send a text message via WhatsApp Business API
   * @param {Object} device - Device instance with WABA credentials
   * @param {string} to - Recipient phone number (E.164 format)
   * @param {string} text - Message content
   * @param {Object} options - Additional options (preview_url, etc)
   */
  async sendMessage(device, to, text, options = {}) {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatRecipient(to),
      type: 'text',
      text: {
        body: text,
        preview_url: options.previewUrl || false
      }
    };

    return this.sendRequest(device, payload);
  }

  /**
   * Send an image message
   * @param {Object} device - Device instance
   * @param {string} to - Recipient phone number
   * @param {string|Buffer} image - Image URL or Media ID (Buffer not directly supported well in WABA without upload first)
   * @param {string} caption - Image caption
   */
  async sendImage(device, to, image, caption = '') {
    // Note: If 'image' is a URL/MediaID, use it directly. 
    // If it's a buffer, we'd need to upload it first using the Media API.
    // For now, assuming URL or ID.
    
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatRecipient(to),
      type: 'image',
      image: {
        // limit caption to 1024 chars
        caption: caption ? caption.substring(0, 1024) : ''
      }
    };

    if (image.startsWith('http')) {
        payload.image.link = image;
    } else {
        payload.image.id = image;
    }

    return this.sendRequest(device, payload);
  }

  /**
   * Send a video message
   */
  async sendVideo(device, to, video, caption = '') {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatRecipient(to),
      type: 'video',
      video: {
        caption: caption ? caption.substring(0, 1024) : ''
      }
    };

    if (video.startsWith('http')) {
        payload.video.link = video;
    } else {
        payload.video.id = video;
    }

    return this.sendRequest(device, payload);
  }

  /**
   * Send a document message
   */
  async sendDocument(device, to, document, fileName = '', caption = '') {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatRecipient(to),
      type: 'document',
      document: {
        caption: caption ? caption.substring(0, 1024) : '',
        filename: fileName
      }
    };

    if (document.startsWith('http')) {
        payload.document.link = document;
    } else {
        payload.document.id = document;
    }

    return this.sendRequest(device, payload);
  }

  /**
   * Mark a message as read
   */
  async markAsRead(device, messageId) {
    const payload = {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId
    };

    return this.sendRequest(device, payload);
  }

  /**
   * Send Template Message (Critical for WABA - needed to start conversations)
   */
  async sendTemplate(device, to, templateName, languageCode = 'en_US', components = []) {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatRecipient(to),
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode
        },
        components
      }
    };

    return this.sendRequest(device, payload);
  }

  // ================= PRIVATE HELPERS =================

  async sendRequest(device, payload) {
    if (!device.wabaPhoneNumberId || !device.wabaAccessToken) {
      throw new Error(`Device ${device.id} is missing WABA credentials (phoneNumberId or accessToken)`);
    }

    const url = `${this.baseUrl}/${this.apiVersion}/${device.wabaPhoneNumberId}/messages`;
    
    try {
      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${device.wabaAccessToken}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
        // Standardize error return
        if (error.response) {
            console.error('[WABA Error]', JSON.stringify(error.response.data, null, 2));
            throw new Error(error.response.data?.error?.message || 'WABA API Request Failed');
        }
        throw error;
    }
  }

  formatRecipient(to) {
    // WABA expects just the number, no @s.whatsapp.net
    // If it comes in as 123456@s.whatsapp.net, strip it
    // If it comes in as 123456, keep it
    // Remove '+' if present
    
    let clean = to.replace('@s.whatsapp.net', '').replace('+', '').replace(/[^0-9]/g, '');
    return clean;
  }
}

export default new WABAProvider();
