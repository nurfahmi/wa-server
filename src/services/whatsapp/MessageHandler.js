/**
 * Message Handler - Handles message sending and receiving
 * Extracted from WhatsAppService.js for better maintainability
 */

import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";
import config from "../../config/config.js";
import { Device, ChatSettings, StoredFile, WarmerCampaign } from "../../models/index.js";
import { Op } from "sequelize";
import { getMimeType } from "../../utils/mimeHelper.js";

// Helper to detect if file is an image based on extension
const isImageByExtension = (filename) => {
  if (!filename) return false;
  const ext = path.extname(filename).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'].includes(ext);
};

// Helper to get correct mime type from extension
const getMimeTypeFromExtension = (filename) => {
  if (!filename) return 'application/octet-stream';
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp', '.svg': 'image/svg+xml',
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

class MessageHandler {
  constructor(whatsAppService) {
    this.service = whatsAppService;
  }

  /**
   * Handle incoming WhatsApp message
   */
  async handleIncomingMessage(sessionId, message) {
    try {
      const device = await Device.findOne({ where: { sessionId } });
      if (!device) {
        console.log(`Device ${sessionId} not found`);
        return;
      }

      const sender = message.key.remoteJid;
      const isGroup = sender.includes("@g.us");

      // Skip group messages
      if (isGroup) {
        console.log(`Skipping group message from ${sender}`);
        return;
      }

      // Handle both PN and LID formats (Baileys v7.0.0)
      const isPN = sender.includes("@s.whatsapp.net");
      const isLID = sender.includes("@lid");
      
      if (!isPN && !isLID) {
        console.log(`Skipping non-individual chat from ${sender}`);
        return;
      }

      // Skip own messages
      if (message.key.fromMe === true) {
        console.log(`Skipping own message from ${sender} (fromMe=true)`);
        return;
      }

      const messageContent =
        message.message?.conversation ||
        message.message?.extendedTextMessage?.text ||
        "";

      console.log(`Processing individual chat message from ${sender} (${isLID ? 'LID' : 'PN'}): ${messageContent}`);

      // Get PN from LID if available
      const remoteJidAlt = message.key.remoteJidAlt;
      
      let phoneNumber = null;
      let effectiveSender = sender;
      
      if (isPN) {
        phoneNumber = sender.replace("@s.whatsapp.net", "");
      } else if (isLID) {
        if (remoteJidAlt && remoteJidAlt.includes("@s.whatsapp.net")) {
          phoneNumber = remoteJidAlt.replace("@s.whatsapp.net", "");
          effectiveSender = remoteJidAlt;
          console.log(`[LID] Resolved LID ${sender} to PN ${remoteJidAlt}`);
        } else {
          const contact = await this.service.contactHandler.getContactByIdOrLID(sessionId, sender);
          if (contact?.pn) {
            phoneNumber = contact.pn.replace("@s.whatsapp.net", "");
            effectiveSender = contact.pn;
            console.log(`[LID] Resolved LID ${sender} to PN ${contact.pn} from database`);
          } else {
            phoneNumber = sender.split("@")[0];
            console.log(`[LID] No PN mapping found for LID ${sender}, using LID as identifier`);
          }
        }
      }

      // Get or create chat settings
      let chatSettings = await ChatSettings.findOne({
        where: {
          deviceId: device.id,
          [Op.or]: [
            { chatId: sender },
            { chatId: effectiveSender },
          ],
        },
      });

      if (!chatSettings) {
        chatSettings = await ChatSettings.create({
          userId: device.userId,
          sessionId: device.sessionId,
          deviceId: device.id,
          chatId: effectiveSender,
          phoneNumber: phoneNumber,
          contactName: message.pushName || "Unknown",
          latestMessage: messageContent,
          latestMessageType: "text",
          latestMessageDirection: "incoming",
          latestMessageTimestamp: new Date(),
          incomingMessageCount: 1,
          outgoingMessageCount: 0,
          aiEnabled: true,
        });
        console.log(`Created new ChatSettings for ${phoneNumber} (${isLID ? 'from LID' : 'PN'})`);
      } else {
        await chatSettings.update({
          contactName: message.pushName || chatSettings.contactName,
          latestMessage: messageContent,
          latestMessageType: "text",
          latestMessageDirection: "incoming",
          latestMessageTimestamp: new Date(),
          incomingMessageCount: chatSettings.incomingMessageCount + 1,
          phoneNumber: phoneNumber || chatSettings.phoneNumber,
        });
        console.log(`Updated ChatSettings for ${phoneNumber}`);
      }

      // Determine AI settings
      const shouldUseAI = this.shouldUseAI(chatSettings, device);
      const shouldUseAutoReply = await this.shouldUseAutoReply(chatSettings, device);

      console.log(`AI Decision for ${phoneNumber}:`, {
        chatAI: chatSettings.aiEnabled,
        deviceAI: device.aiEnabled,
        finalAI: shouldUseAI,
        finalAutoReply: shouldUseAutoReply,
      });

      // Process with AI if enabled
      if (shouldUseAI && messageContent.trim()) {
        const memoryHours = chatSettings.memoryRetentionHours || config.ai.memoryRetentionHours;
        const maxHistory = chatSettings.maxHistoryMessages || config.ai.maxHistoryMessages;

        const aiContext = {
          deviceId: device.id,
          sessionId: device.sessionId,
          remoteJid: sender,
          aiEnabled: true,
          autoReply: shouldUseAutoReply,
          conversationMemoryEnabled: config.ai.conversationMemoryEnabled,
          maxHistoryLength: maxHistory,
          expiryMinutes: memoryHours * 60,
          botName: device.aiBotName || device.botName || `Assistant for ${device.alias}`,
          temperature: device.aiTemperature || 0.7,
          maxTokens: device.aiMaxTokens || config.openai.maxTokens,
          customPrompt: device.aiPromptTemplate,
          customTriggers: device.aiTriggers,
          triggerRequired: device.aiTriggerRequired || false,
          productKnowledge: device.productKnowledge,
          salesScripts: device.salesScripts,
          aiLanguage: device.aiLanguage,
          rules: device.aiRules,
        };

        console.log(`[AUTOREPLY] Processing message with AI. Context:`, {
          shouldUseAI,
          shouldUseAutoReply,
          autoReply: aiContext.autoReply,
          aiEnabled: aiContext.aiEnabled,
          provider: device.aiProvider || 'openai',
          model: device.aiModel || 'default',
        });

        const aiResponse = await this.service.aiService.processMessage(
          {
            content: messageContent,
            messageType: "text",
            sender: sender,
            isGroup: false,
          },
          aiContext
        );

        console.log(`[AUTOREPLY] AI Response received:`, {
          hasResponse: !!aiResponse,
          shouldRespond: aiResponse?.shouldRespond,
          hasContent: !!aiResponse?.content,
          hasError: !!aiResponse?.error,
          error: aiResponse?.error,
          contentPreview: aiResponse?.content?.substring(0, 50),
        });

        if (aiResponse && aiResponse.shouldRespond && aiResponse.content) {
          await this.processAIResponse(device, sender, message.key, aiResponse, chatSettings, phoneNumber);
        }
      }

      // Emit real-time notification
      if (this.service.io) {
        this.service.io.emit("newMessage", {
          sessionId,
          sender,
          phoneNumber,
          contactName: chatSettings.contactName,
          message: messageContent,
          type: "incoming",
          timestamp: new Date(),
          aiProcessed: shouldUseAI,
          autoReplyUsed: shouldUseAutoReply,
        });
      }
    } catch (error) {
      console.error("Error handling incoming message:", error);
    }
  }

  /**
   * Process AI response and send message
   */
  async processAIResponse(device, sender, messageKey, aiResponse, chatSettings, phoneNumber) {
    console.log(`[AI-RESPONSE] AI response received:`, {
      hasContent: !!aiResponse.content,
      hasImageId: !!aiResponse.imageId,
      imageId: aiResponse.imageId,
      contentPreview: aiResponse.content.substring(0, 100),
    });
    
    // Extract imageId from response
    let imageIdToUse = aiResponse.imageId;
    if (!imageIdToUse && aiResponse.content) {
      // Extended URL patterns to catch more formats
      const urlPatterns = [
        // Standard UUID patterns
        /\/files\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\/preview/i,
        /\/api\/whatsapp\/files\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\/preview/i,
        /\/files\/([a-f0-9-]{36})\/preview/i,
        /\/api\/whatsapp\/files\/([a-f0-9-]{36})\/preview/i,
        // UUID without /preview suffix
        /\/files\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})(?:\/|$|\s|\))/i,
        /\/api\/whatsapp\/files\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})(?:\/|$|\s|\))/i,
        // Markdown image format: ![alt](url)
        /!\[[^\]]*\]\s*\([^)]*\/files\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})[^)]*\)/i,
        // Any UUID-like pattern mentioned after "image" or "gambar"
        /(?:image|gambar|foto|photo)[:\s]+[^\s]*([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i,
      ];
      
      for (const pattern of urlPatterns) {
        const match = aiResponse.content.match(pattern);
        if (match && match[1]) {
          imageIdToUse = match[1];
          console.log(`[AI-RESPONSE] Extracted imageId from content using pattern: ${imageIdToUse}`);
          break;
        }
      }
    }
    
    // Log for debugging
    if (!imageIdToUse) {
      console.log(`[AI-RESPONSE] No imageId found. Content contains URL-like patterns: ${/\/files\/|\/api\/whatsapp\/files\//.test(aiResponse.content)}`);
    }
    
    // Send image if available
    if (imageIdToUse) {
      console.log(`[AI-RESPONSE] Attempting to send image with ID: ${imageIdToUse}`);
      try {
        let fileId = imageIdToUse;
        if (typeof imageIdToUse === 'string' && /^\d+$/.test(imageIdToUse)) {
          fileId = parseInt(imageIdToUse, 10);
        }
        
        console.log(`[AI-RESPONSE] Looking up file with ID: ${fileId}, device userId: ${device.userId}`);
        
        // First try to find by fileType: "image"
        let storedFile = await StoredFile.findOne({
          where: {
            id: fileId,
            userId: device.userId,
            fileType: "image",
          },
          logging: false,
        });
        
        if (!storedFile) {
          console.log(`[AI-RESPONSE] File not found with userId ${device.userId}, trying without userId restriction`);
          storedFile = await StoredFile.findOne({
            where: {
              id: fileId,
              fileType: "image",
            },
            logging: false,
          });
        }
        
        // Fallback: check if file exists with any fileType but is an image by extension
        // This handles files that were incorrectly stored as "document" due to mime detection issues
        if (!storedFile) {
          console.log(`[AI-RESPONSE] Image not found by fileType, checking by extension`);
          const anyFile = await StoredFile.findOne({
            where: { id: fileId },
            logging: false,
          });
          
          if (anyFile && isImageByExtension(anyFile.originalName)) {
            console.log(`[AI-RESPONSE] Found file with image extension: ${anyFile.originalName} (stored as ${anyFile.fileType})`);
            storedFile = anyFile;
          }
        }

        if (storedFile && !storedFile.isExpired()) {
          await storedFile.reload();
          const filePath = path.join(process.cwd(), storedFile.filePath);
          console.log(`[AI-RESPONSE] Reading image from: ${filePath}`);
          
          try {
            await fs.access(filePath);
          } catch (accessError) {
            console.error(`[AI-RESPONSE] Image file not found at path: ${filePath}`);
            throw new Error(`Image file not found: ${storedFile.originalName}`);
          }
          
          const imageBuffer = await fs.readFile(filePath);
          console.log(`[AI-RESPONSE] Image loaded successfully, size: ${imageBuffer.length} bytes`);
          
          const rawCaption = aiResponse.content.substring(0, 1024);
          const caption = this.cleanImageCaption(rawCaption);
          
          // Use correct mime type - if stored mime is wrong (text/plain, octet-stream), get from extension
          let mimeType = storedFile.mimeType;
          if (!mimeType || mimeType === 'text/plain' || mimeType === 'application/octet-stream') {
            mimeType = getMimeTypeFromExtension(storedFile.originalName);
            console.log(`[AI-RESPONSE] Corrected mime type from ${storedFile.mimeType} to ${mimeType}`);
          }
          
          await this.sendImage(
            device.sessionId,
            sender,
            imageBuffer,
            caption,
            mimeType
          );
          
          await storedFile.incrementUsage();
          
          console.log(`AI response sent with product image to ${phoneNumber}: ${storedFile.originalName}`);
          
          if (aiResponse.content.length > 1024) {
            const remainingText = aiResponse.content.substring(1024);
            await this.sendNaturalReply(device.sessionId, sender, messageKey, remainingText);
          }
        } else {
          console.warn(`[AI-RESPONSE] Product image ${imageIdToUse} not found or expired. Stored file found: ${!!storedFile}, expired: ${storedFile?.isExpired?.()}`);
          // Clean the caption before sending as text
          const cleanedContent = this.cleanImageCaption(aiResponse.content);
          await this.sendNaturalReply(device.sessionId, sender, messageKey, cleanedContent || aiResponse.content);
        }
      } catch (imageError) {
        console.error("[AI-RESPONSE] Error sending product image:", imageError);
        // Clean the caption before sending as text fallback
        const cleanedContent = this.cleanImageCaption(aiResponse.content);
        await this.sendNaturalReply(device.sessionId, sender, messageKey, cleanedContent || aiResponse.content);
      }
    } else {
      // No image to send, just send text (but clean any URL references that might be there)
      const hasUrlPatterns = /\/files\/|\/api\/whatsapp\/files\//.test(aiResponse.content);
      if (hasUrlPatterns) {
        console.log(`[AI-RESPONSE] Cleaning URL patterns from text response`);
        const cleanedContent = this.cleanImageCaption(aiResponse.content);
        await this.sendNaturalReply(device.sessionId, sender, messageKey, cleanedContent || aiResponse.content);
      } else {
        await this.sendNaturalReply(device.sessionId, sender, messageKey, aiResponse.content);
      }
    }

    await chatSettings.update({
      outgoingMessageCount: chatSettings.outgoingMessageCount + 1,
      lastProcessedAt: new Date(),
    });

    console.log(`AI response sent to ${phoneNumber}: ${aiResponse.content.substring(0, 50)}...`);
  }

  /**
   * Send reply with natural human-like behavior
   */
  async sendNaturalReply(sessionId, recipient, messageKey, replyContent) {
    try {
      const session = this.service.sessions.get(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const naturalSettings = config.ai.naturalReply;

      console.log(`[NATURAL-REPLY] Starting natural reply to ${recipient}`);

      if (!naturalSettings.enabled) {
        console.log(`[NATURAL-REPLY] Natural reply disabled, sending direct message`);
        await this.sendMessage(sessionId, recipient, replyContent);
        return;
      }

      // Mark message as read
      if (naturalSettings.markAsRead) {
        try {
          await session.readMessages([messageKey]);
          console.log(`[NATURAL-REPLY] Message marked as read for ${recipient}`);
        } catch (readError) {
          console.warn(`[NATURAL-REPLY] Could not mark message as read:`, readError.message);
        }
      }

      // Show typing indicator
      if (naturalSettings.showTyping) {
        try {
          await session.sendPresenceUpdate("composing", recipient);
          console.log(`[NATURAL-REPLY] Typing indicator sent to ${recipient}`);
        } catch (typingError) {
          console.warn(`[NATURAL-REPLY] Could not send typing indicator:`, typingError.message);
        }
      }

      // Calculate delay
      const baseDelay = naturalSettings.baseDelay;
      const charDelay = naturalSettings.charDelay;
      const maxDelay = naturalSettings.maxDelay;
      const minDelay = naturalSettings.minDelay;

      const calculatedDelay = Math.max(
        minDelay,
        Math.min(baseDelay + replyContent.length * charDelay, maxDelay)
      );

      console.log(`[NATURAL-REPLY] Waiting ${calculatedDelay}ms (typing simulation) for ${recipient}`);

      await new Promise((resolve) => setTimeout(resolve, calculatedDelay));

      // Stop typing indicator
      if (naturalSettings.showTyping) {
        try {
          await session.sendPresenceUpdate("available", recipient);
          console.log(`[NATURAL-REPLY] Stopped typing indicator for ${recipient}`);
        } catch (stopTypingError) {
          console.warn(`[NATURAL-REPLY] Could not stop typing indicator:`, stopTypingError.message);
        }
      }

      // Send the message
      await this.sendMessage(sessionId, recipient, replyContent);
      console.log(`[NATURAL-REPLY] Reply sent naturally to ${recipient}`);
    } catch (error) {
      console.error(`[NATURAL-REPLY] Error in natural reply to ${recipient}:`, error);
      try {
        await this.sendMessage(sessionId, recipient, replyContent);
        console.log(`[NATURAL-REPLY] Fallback direct message sent to ${recipient}`);
      } catch (fallbackError) {
        console.error(`[NATURAL-REPLY] Fallback also failed for ${recipient}:`, fallbackError);
        throw fallbackError;
      }
    }
  }

  /**
   * Send a text message
   */
  async sendMessage(sessionId, recipient, message) {
    console.log(`[SEND-MESSAGE] Attempting to send message via session ${sessionId} to ${recipient}`);
    
    const validation = await this.service.sessionManager.validateSession(sessionId);
    if (!validation.valid) {
      console.error(`[SEND-MESSAGE] Validation failed: ${validation.error}`);
      throw new Error(validation.error || "Session not found");
    }

    console.log(`[SEND-MESSAGE] Session validated successfully, proceeding with message send`);

    try {
      const device = await Device.findOne({ where: { sessionId } });
      if (!device) {
        throw new Error("Device not found");
      }

      let normalizedRecipient = recipient;
      if (!recipient.includes("@")) {
        normalizedRecipient = recipient.replace(/[+\s-]/g, "");
      }

      const formattedRecipient = normalizedRecipient.includes("@s.whatsapp.net")
        ? normalizedRecipient
        : `${normalizedRecipient}@s.whatsapp.net`;

      console.log(`[SEND-MESSAGE] Sending message to ${formattedRecipient}...`);
      const sendWithTimeout = Promise.race([
        validation.session.sendMessage(formattedRecipient, { text: message }),
        new Promise((_, reject) => 
          setTimeout(() => {
            console.error(`[SEND-MESSAGE] Message send timed out after 30 seconds for ${formattedRecipient}`);
            reject(new Error("Message send timeout after 30 seconds."));
          }, 30000)
        )
      ]);

      const sent = await sendWithTimeout;
      console.log(`[SEND-MESSAGE] Message sent successfully to ${formattedRecipient}`);

      // Update chat settings
      if (formattedRecipient.endsWith("@s.whatsapp.net")) {
        await this.updateChatSettingsForOutgoing(device, formattedRecipient, recipient, message, "text");
      }

      return {
        success: true,
        messageId: sent?.key?.id || null,
      };
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  }

  /**
   * Send an image message
   */
  async sendImage(sessionId, recipient, imageBuffer, caption = "", mimetype = "image/jpeg") {
    const validation = await this.service.sessionManager.validateSession(sessionId);
    if (!validation.valid) {
      throw new Error(validation.error || "Session not found");
    }

    try {
      const device = await Device.findOne({ where: { sessionId } });
      if (!device) {
        throw new Error("Device not found");
      }

      let normalizedRecipient = recipient;
      if (!recipient.includes("@")) {
        normalizedRecipient = recipient.replace(/[+\s-]/g, "");
      }

      const formattedRecipient = normalizedRecipient.includes("@s.whatsapp.net")
        ? normalizedRecipient
        : `${normalizedRecipient}@s.whatsapp.net`;

      // Convert WebP to JPEG
      let finalImageBuffer = imageBuffer;
      let finalMimetype = mimetype;
      
      if (mimetype === "image/webp") {
        try {
          console.log(`[SEND-IMAGE] Converting WebP to JPEG for better WhatsApp compatibility`);
          finalImageBuffer = await sharp(imageBuffer).jpeg({ quality: 90 }).toBuffer();
          finalMimetype = "image/jpeg";
          console.log(`[SEND-IMAGE] WebP converted successfully. Original: ${imageBuffer.length} bytes, Converted: ${finalImageBuffer.length} bytes`);
        } catch (conversionError) {
          console.error(`[SEND-IMAGE] Error converting WebP to JPEG:`, conversionError);
          console.warn(`[SEND-IMAGE] Falling back to sending WebP without conversion`);
        }
      }

      const sendWithTimeout = Promise.race([
        validation.session.sendMessage(formattedRecipient, {
          image: finalImageBuffer,
          caption: caption,
          mimetype: finalMimetype,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Image send timeout after 60 seconds")), 60000)
        )
      ]);

      const sent = await sendWithTimeout;

      if (formattedRecipient.endsWith("@s.whatsapp.net")) {
        await this.updateChatSettingsForOutgoing(device, formattedRecipient, recipient, caption || "[Image]", "image");
      }

      return {
        success: true,
        messageId: sent?.key?.id || null,
      };
    } catch (error) {
      console.error("Error sending image:", error);
      throw error;
    }
  }

  /**
   * Send a video message
   */
  async sendVideo(sessionId, recipient, buffer, caption = "") {
    try {
      const { valid, session, device } = await this.service.sessionManager.validateSession(sessionId);
      if (!valid || !session) {
        throw new Error("Invalid or inactive session");
      }

      let normalizedRecipient = recipient;
      if (!recipient.includes("@")) {
        normalizedRecipient = recipient.replace(/[+\s-]/g, "");
      }

      const formattedRecipient = normalizedRecipient.includes("@s.whatsapp.net")
        ? normalizedRecipient
        : `${normalizedRecipient}@s.whatsapp.net`;

      const sendWithTimeout = Promise.race([
        session.sendMessage(formattedRecipient, {
          video: buffer,
          caption: caption,
          mimetype: "video/mp4",
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Video send timeout after 60 seconds")), 60000)
        )
      ]);

      const sent = await sendWithTimeout;

      if (formattedRecipient.endsWith("@s.whatsapp.net")) {
        await this.updateChatSettingsForOutgoing(device, formattedRecipient, recipient, caption || "[Video]", "video");
      }

      return {
        success: true,
        messageId: sent?.key?.id || null,
      };
    } catch (error) {
      console.error("Error sending video:", error);
      throw error;
    }
  }

  /**
   * Send a document message
   */
  async sendDocument(sessionId, recipient, buffer, fileName) {
    try {
      const { valid, session, device } = await this.service.sessionManager.validateSession(sessionId);
      if (!valid || !session) {
        throw new Error("Invalid or inactive session");
      }

      let normalizedRecipient = recipient;
      if (!recipient.includes("@")) {
        normalizedRecipient = recipient.replace(/[+\s-]/g, "");
      }

      const formattedRecipient = normalizedRecipient.includes("@s.whatsapp.net")
        ? normalizedRecipient
        : `${normalizedRecipient}@s.whatsapp.net`;

      const sendWithTimeout = Promise.race([
        session.sendMessage(formattedRecipient, {
          document: buffer,
          fileName: fileName,
          mimetype: getMimeType(fileName),
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Document send timeout after 60 seconds")), 60000)
        )
      ]);

      const sent = await sendWithTimeout;

      if (formattedRecipient.endsWith("@s.whatsapp.net")) {
        await this.updateChatSettingsForOutgoing(device, formattedRecipient, recipient, `[Document: ${fileName}]`, "document");
      }

      return {
        success: true,
        messageId: sent?.key?.id || null,
      };
    } catch (error) {
      console.error("Error sending document:", error);
      throw error;
    }
  }

  /**
   * Update chat settings for outgoing messages
   */
  async updateChatSettingsForOutgoing(device, chatId, phoneNumber, message, messageType) {
    try {
      let chatSettings = await ChatSettings.findOne({
        where: {
          deviceId: device.id,
          chatId: chatId,
        },
      });

      if (!chatSettings) {
        chatSettings = await ChatSettings.create({
          userId: device.userId,
          sessionId: device.sessionId,
          deviceId: device.id,
          chatId: chatId,
          phoneNumber: phoneNumber,
          contactName: "Unknown",
          latestMessage: message,
          latestMessageType: messageType,
          latestMessageDirection: "outgoing",
          latestMessageTimestamp: new Date(),
          incomingMessageCount: 0,
          outgoingMessageCount: 1,
          aiEnabled: true,
        });
      } else {
        await chatSettings.update({
          latestMessage: message,
          latestMessageType: messageType,
          latestMessageDirection: "outgoing",
          latestMessageTimestamp: new Date(),
          outgoingMessageCount: chatSettings.outgoingMessageCount + 1,
        });
      }

      console.log(`Updated chat settings for outgoing ${messageType} to ${phoneNumber}`);
    } catch (error) {
      console.error(`Error updating chat settings for outgoing ${messageType}:`, error);
    }
  }

  /**
   * Determine if AI should be used for this chat
   */
  shouldUseAI(chatSettings, device) {
    if (device.aiEnabled === false) {
      return false;
    }
    return chatSettings.aiEnabled;
  }

  /**
   * Determine if auto-reply should be used
   */
  async shouldUseAutoReply(chatSettings, device) {
    try {
      const activeWarmerCampaign = await WarmerCampaign.findOne({
        where: {
          status: "active",
          selectedDevices: {
            [Op.like]: `%${device.id}%`,
          },
        },
      });

      if (activeWarmerCampaign) {
        console.log(`Device ${device.id} is in warmer campaign, disabling auto-reply`);
        return false;
      }

      if (device.aiEnabled === false) {
        return false;
      }

      return chatSettings.aiEnabled;
    } catch (error) {
      console.error("Error checking warmer campaign status:", error);
      return device.aiEnabled !== false && chatSettings.aiEnabled;
    }
  }

  /**
   * Clean image caption by removing markdown and URLs
   */
  cleanImageCaption(caption) {
    if (!caption || typeof caption !== "string") {
      return "";
    }

    let cleaned = caption;

    // Remove markdown image syntax: ![alt](url)
    cleaned = cleaned.replace(/!\[([^\]]*)\]\s*\([^)]+\)/g, "");

    // Remove file preview URLs (with and without /preview suffix)
    cleaned = cleaned.replace(/\/api\/whatsapp\/files\/[a-f0-9-]+(?:\/preview)?/gi, "");
    cleaned = cleaned.replace(/\/files\/[a-f0-9-]+(?:\/preview)?/gi, "");
    cleaned = cleaned.replace(/https?:\/\/[^\s]+\/api\/whatsapp\/files\/[a-f0-9-]+(?:\/preview)?/gi, "");
    cleaned = cleaned.replace(/https?:\/\/[^\s]+\/files\/[a-f0-9-]+(?:\/preview)?/gi, "");

    // Remove URLs in parentheses
    cleaned = cleaned.replace(/\(\s*\/api\/whatsapp\/files[^)]*\s*\)/g, "");
    cleaned = cleaned.replace(/\(\s*\/files\/[^)]*\s*\)/g, "");
    cleaned = cleaned.replace(/\(\s*https?:\/\/[^)]*\/api\/whatsapp\/files[^)]*\s*\)/g, "");
    cleaned = cleaned.replace(/\(\s*https?:\/\/[^)]*\/files\/[^)]*\s*\)/g, "");

    // Remove URLs after colons (with and without /preview)
    cleaned = cleaned.replace(/:\s*\/api\/whatsapp\/files\/[^\s)]+/g, "");
    cleaned = cleaned.replace(/:\s*\/files\/[^\s)]+/g, "");
    cleaned = cleaned.replace(/:\s*https?:\/\/[^\s]+\/api\/whatsapp\/files\/[^\s)]+/g, "");
    cleaned = cleaned.replace(/:\s*https?:\/\/[^\s]+\/files\/[^\s)]+/g, "");

    // Remove "Image available" patterns (English and Indonesian)
    cleaned = cleaned.replace(/[Ii]mage\s+available\s*:?[^\n]*/gi, "");
    cleaned = cleaned.replace(/[Gg]ambar\s+tersedia\s*:?[^\n]*/gi, "");
    cleaned = cleaned.replace(/[Ff]oto\s+tersedia\s*:?[^\n]*/gi, "");
    
    // Remove standalone "Here's the image:" or similar phrases
    cleaned = cleaned.replace(/[Hh]ere'?s?\s+(?:the\s+)?(?:image|photo|picture)\s*:?\s*/gi, "");
    cleaned = cleaned.replace(/[Bb]erikut\s+(?:ini\s+)?(?:gambar|foto)(?:nya)?\s*:?\s*/gi, "");

    // Remove bare UUIDs that might be left over
    cleaned = cleaned.replace(/\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/gi, "");

    // Clean up multiple newlines, spaces, and trailing punctuation
    cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
    cleaned = cleaned.replace(/\s+/g, " ").trim();
    cleaned = cleaned.replace(/^[,\s:]+|[,\s:]+$/g, "").trim();
    
    // Remove empty parentheses or brackets left behind
    cleaned = cleaned.replace(/\(\s*\)/g, "");
    cleaned = cleaned.replace(/\[\s*\]/g, "");

    return cleaned;
  }
}

export default MessageHandler;

