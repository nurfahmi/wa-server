import OpenAI from "openai";
import config from "../config/config.js";
import {
  Message,
  ChatHistory,
  Device,
} from "../models/index.js";

import { Op } from "sequelize";
import { getJakartaTime } from "../utils/timeHelper.js";

import UniversalAIService from "./UniversalAIService.js";

class AIService {
  constructor() {
    this.universalAI = new UniversalAIService();
  }

  async processMessage(message, context = {}) {
    try {
      const { content, messageType, sender, isGroup } = message;
      const {
        sessionId,
        remoteJid,
        autoReply = false,
        conversationMemoryEnabled = false,
        maxHistoryLength = 10,
        expiryMinutes = 1440, // 24 hours default
      } = context;

      // First check if we should respond to this message
      const shouldRespond = this.shouldRespondToMessage(message, context);
      if (!shouldRespond) {
        console.log("Message does not trigger a response");
        return {
          type: "text",
          content: null,
          shouldRespond: false,
        };
      }

      // Prepare message content for AI processing
      let messageText = "";
      if (typeof content === "object" && content.text) {
        messageText = content.text;
      } else if (typeof content === "string") {
        messageText = content;
      }

      // Skip processing if no text to process
      if (!messageText) {
        console.log("No text content to process");
        return null;
      }

      console.log("Processing message text:", messageText);

      let messages = [
        {
          role: "system",
          content: this.prepareSystemPrompt(context),
        },
      ];

      // If AI is enabled, use memory in two cases:
      // 1. Conversation memory is explicitly enabled
      // 2. Auto-reply is enabled (we want context for ongoing conversations)
      const shouldUseMemory =
        context.aiEnabled && (conversationMemoryEnabled || autoReply);

      if (shouldUseMemory) {
        console.log(
          "Fetching conversation history - memory is enabled or auto-reply is active"
        );
        const now = getJakartaTime();
        const expiryTime = new Date(now.getTime() - expiryMinutes * 60000);
        const historyTimeLimit = context.aiMemoryClearedAt 
          ? new Date(Math.max(expiryTime.getTime(), new Date(context.aiMemoryClearedAt).getTime()))
          : expiryTime;

        const historyMessages = await ChatHistory.findAll({
          where: {
            deviceId: context.deviceId,
            chatId: remoteJid,
            timestamp: {
              [Op.gt]: historyTimeLimit,
            },
            // Include text or messages with captions for better context
            [Op.or]: [
              { messageType: 'text' },
              { caption: { [Op.ne]: null } }
            ]
          },
          order: [["timestamp", "DESC"]],
          limit: maxHistoryLength, 
        });

        // Add history messages in chronological order
        for (const msg of historyMessages.reverse()) {
          messages.push({
            role: msg.direction === 'incoming' ? 'user' : 'assistant',
            content: msg.content || msg.caption,
          });
        }
      } else {
        console.log(
          "Skipping conversation history - memory and auto-reply are disabled"
        );
      }

      // Add current message
      messages.push({
        role: "user",
        content: messageText,
      });

      // Get device data for AI provider settings
      const device = await Device.findOne({
        where: { id: context.deviceId },
      });

      if (!device) {
        throw new Error(`Device not found for ID: ${context.deviceId}`);
      }

      console.log(`Sending messages to AI provider (${device.aiProvider || 'openai'}):`, messages);

      // Get AI response using Universal AI Service (bypassing Enhanced/Tracking as requested)
      const aiResult = await this.universalAI.chatCompletion(messages, {
        provider: device.aiProvider || "openai",
        model: device.aiModel,
        temperature: context.temperature || device.aiTemperature || 0.7,
        maxTokens: context.maxTokens || device.aiMaxTokens || 500,
      });

      // Get the AI response
      const aiResponse = aiResult?.content;
      if (!aiResponse) {
        throw new Error("Failed to get AI response");
      }
      console.log("Received AI response:", aiResponse);

      // Detect if a product is mentioned and find matching product image
      let productImageId = null;
      const productKnowledge = context.productKnowledge;
      const productCatalog = context.aiProductCatalog;
      console.log(`[AI-SERVICE] Checking product knowledge & catalog:`, {
        hasProductKnowledge: !!productKnowledge,
        hasProductCatalog: !!productCatalog,
        itemsCount: (productKnowledge?.items?.length || 0) + (productCatalog?.items?.length || 0),
      });
      
      const allProductItems = [
        ...(productKnowledge?.items || []),
        ...(productCatalog?.items || [])
      ];

      if (allProductItems.length > 0) {
        const items = allProductItems;
        const messageTextLower = messageText.toLowerCase();
        const aiResponseLower = aiResponse.toLowerCase();
        
        // Helper function to extract imageId from it
        const extractImageIdFromUrl = (url) => {
          if (!url) return null;
          const uuidPatterns = [
            /\/files\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i,
            /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i,
          ];
          for (const pattern of uuidPatterns) {
            const match = url.match(pattern);
            if (match && match[1]) return match[1];
          }
          return null;
        };
        
        let bestMatch = null;
        let highestScore = 0;

        for (const item of items) {
          if (!item.name) continue;
          
          let score = 0;
          const namePart = item.name.toLowerCase();
          
          // Check if product name is in the AI response (strong indicator)
          if (aiResponseLower.includes(namePart)) score += 50;
          
          // Check if specific keywords are in user query
          const keywords = namePart.split(/\s+/).filter(w => w.length > 2);
          const userMatchCount = keywords.filter(w => messageTextLower.includes(w)).length;
          if (userMatchCount > 0) score += (userMatchCount / keywords.length) * 30;

          // Multiplier if asking for image/price
          const intentKeywords = ["harga", "berapa", "foto", "gambar", "price", "image", "photo"];
          if (intentKeywords.some(ik => messageTextLower.includes(ik)) && userMatchCount > 0) {
            score += 20;
          }

          if (score > highestScore) {
            highestScore = score;
            bestMatch = item;
          }
        }

        if (bestMatch && highestScore >= 40) { // Threshold for auto-attaching images
           productImageId = bestMatch.imageId || extractImageIdFromUrl(bestMatch.imageUrl);
           console.log(`[RAG-LITE] Auto-selected image for product: ${bestMatch.name} (Score: ${highestScore})`);
        }
      }

      // No need to save messages here anymore, as they are saved to ChatHistory 
      // automatically by MessageHandler for both incoming and outgoing messages.
      console.log("[AI-SERVICE] Skipping redundant memory save - using ChatHistory source.");


      // Handover detection: Check if AI response contains [HANDOVER] or matches user triggers
      let needsHandover = aiResponse.includes("[HANDOVER]");
      const handoverTriggers = context.aiHandoverTriggers || ["human", "agent", "bantuan", "tolong", "staf"];
      
      if (!needsHandover) {
        const lowerMsg = messageText.toLowerCase();
        needsHandover = handoverTriggers.some(t => lowerMsg.includes(t.toLowerCase()));
      }

      const response = {
        type: "text",
        content: aiResponse.replace("[HANDOVER]", "").trim(),
        shouldRespond: true,
        imageId: productImageId || null,
        needsHandover: needsHandover,
      };
      
      console.log(`[AI-SERVICE] Returning response:`, {
        hasContent: !!response.content,
        hasImageId: !!response.imageId,
        imageId: response.imageId,
      });
      
      return response;
    } catch (error) {
      console.error("[AI-SERVICE] Error processing message with AI:", error);
      console.error("[AI-SERVICE] Error stack:", error.stack);
      console.error("[AI-SERVICE] Context:", {
        sessionId: context.sessionId,
        remoteJid: context.remoteJid,
        deviceId: context.deviceId,
        autoReply: context.autoReply,
        aiEnabled: context.aiEnabled,
      });
      // Return error information instead of null for better debugging
      return {
        type: "text",
        content: null,
        shouldRespond: false,
        error: error.message,
      };
    }
  }

  // Helper method to clean up old conversation memories globally (called by cron/interval)
  async cleanupExpiredMemories() {
    try {
      const now = getJakartaTime();
      // Use setting from config or default to 48 hours for global cleanup
      const hours = config.ai?.memoryRetentionHours || 48;
      const expiryDate = new Date(now.getTime() - (hours * 60 * 60 * 1000));
      
      const deletedCount = await ChatHistory.destroy({
        where: {
          timestamp: {
            [Op.lt]: expiryDate,
          },
        },
      });
      
      if (deletedCount > 0) {
        console.log(`[CLEANUP] Deleted ${deletedCount} expired conversation memories older than ${hours} hours`);
      }
      return deletedCount;
    } catch (error) {
      console.error("Error cleaning up expired memories:", error);
      throw error;
    }
  }

  // Helper method to clean up old chat history for a specific device (usually handled by global policy)
  async cleanupExpiredHistory(deviceId, months = 3) {
    try {
      if (!deviceId) {
        return this.cleanupExpiredMemories();
      }
      
      const now = getJakartaTime();
      const expiryDate = new Date(now.getTime() - (months * 30 * 24 * 60 * 60 * 1000));
      await ChatHistory.destroy({
        where: {
          deviceId,
          timestamp: {
            [Op.lt]: expiryDate,
          },
        },
      });
    } catch (error) {
      console.error("Error cleaning up old history:", error);
    }
  }

  prepareSystemPrompt(context) {
    const {
      isGroup,
      botName,
      rules = [],
      conversationMemoryEnabled = true,
      customPrompt,
      productKnowledge,
      salesScripts,
      aiLanguage = "id",
      aiBrandVoice = "casual",
      aiBusinessFAQ,
      aiPrimaryGoal = "conversion",
      aiOperatingHours,
      aiBoundariesEnabled = true,
      businessType,
      upsellStrategies,
      objectionHandling,
      aiBusinessProfile,
      aiProductCatalog,
    } = context;

    let prompt = "";

    // Start with custom prompt if provided, otherwise use persuasive sales-focused default
    if (customPrompt) {
      prompt = customPrompt + " ";
    } else {
      prompt = `You are ${
        botName || aiBusinessProfile?.name || "Assistant"
      }, a highly skilled and charismatic WhatsApp ${
        isGroup ? "group" : "private"
      } sales assistant${aiBusinessProfile?.name ? ` for ${aiBusinessProfile.name}` : ""}. You are PERSUASIVE, REASSURING, PROFESSIONAL, FRIENDLY, and ENTHUSIASTIC. `;

      if (aiBusinessProfile?.category) {
        prompt += `Our business operates in the ${aiBusinessProfile.category} sector. `;
      }
      if (aiBusinessProfile?.description) {
        prompt += `ABOUT US: ${aiBusinessProfile.description} `;
      }

      prompt += "COMMUNICATION STYLE: ";
      
      // Brand Voice Mapping
      if (aiBrandVoice === "formal") {
        prompt += "• Use formal and respectful language (Bahasa Baku/Formal) ";
        prompt += "• Be polished, authoritative, and professional ";
        prompt += "• Avoid slang and maintain a high-level corporate tone ";
      } else if (aiBrandVoice === "expert") {
        prompt += "• Use technical, precise, and educational language ";
        prompt += "• Be the ultimate authority in your field ";
        prompt += "• Provide deep insights and value-driven explanations ";
      } else if (aiBrandVoice === "luxury") {
        prompt += "• Use sophisticated, exclusive, and elegant language ";
        prompt += "• Focus on prestige, quality, and 'white-glove' service ";
        prompt += "• Be understated yet highly persuasive ";
      } else {
        // Casual (Default)
        prompt += "• Use friendly, approachable, and warm language ";
        prompt += "• Be lively and energetic but stay professional ";
        prompt += "• Use appropriate emojis to feel human ";
      }

      prompt += "• Focus on benefits and solutions, not problems ";
      prompt += "• Use positive, action-oriented language ";
      prompt += "• Create excitement about products/services ";
      prompt += "• Build trust through expertise and guarantee ";
      prompt += "• Minimize questions - provide value immediately ";
      prompt += "• Use social proof and urgency when appropriate ";

      prompt += `\nYour primary goal is: ${aiPrimaryGoal.toUpperCase()}. `;
      if (aiPrimaryGoal === "conversion") {
        prompt += "Guide the user to make a purchase or visit the checkout link. ";
      } else if (aiPrimaryGoal === "leads") {
        prompt += "Get the user's contact information or interest for a follow-up. ";
      } else if (aiPrimaryGoal === "support") {
        prompt += "Resolve the inquiry thoroughly and ensure high satisfaction. ";
      }
    }

    // Add memory instructions
    if (conversationMemoryEnabled) {
      prompt +=
        "You have access to the full conversation history and can remember all previous messages in this chat. ";
      prompt +=
        "Always use this context to provide relevant, personalized responses. ";
      prompt +=
        "When referencing previous messages, be natural about it - don't explain that you're looking at history. ";
    } else {
      prompt +=
        "You only see the current message without previous conversation history. ";
    }

    // Add language instruction with sales focus
    prompt += "\nLANGUAGE FOCUS:\n";
    if (aiLanguage === "id") {
      prompt += "• Primary Language: Bahasa Indonesia.\n";
      prompt += "• Respond in Bahasa Indonesia with a polite, warm, and helpful tone (Ramah & Sopan).\n";
      prompt += "• Use Indonesian cultural norms of politeness (e.g., using 'Kak', 'Sis', 'Gan', or 'Bapak/Ibu' appropriately).\n";
      prompt += "• SALES APPROACH: Gunakan kata-kata yang meyakinkan seperti 'Pasti cocok untuk Anda!', 'Ini kesempatan terbaik', 'Saya rekomendasikan', 'Dijamin berkualitas'.\n";
    } else if (aiLanguage === "ms") {
      prompt += "• Primary Language: Bahasa Malaysia.\n";
      prompt += "• Respond in Bahasa Malaysia with a friendly and respectful tone (Mesra & Hormat).\n";
      prompt += "• Use Malaysian local preferences (e.g., 'Tuan/Puan', 'Cik', 'Abang/Kakak').\n";
      prompt += "• SALES APPROACH: Gunakan bahasa yang mesra dan meyakinkan seperti 'Pasti sesuai untuk anda!', 'Ini peluang terbaik', 'Saya cadangkan', 'Dijamin berkualiti'.\n";
    } else {
      // English or Default
      prompt += "• Primary Language: English.\n";
      prompt += "• Respond in clear, professional, yet friendly English.\n";
      prompt += "• SALES APPROACH: Use warm and convincing language like 'Perfect for you!', 'This is the best opportunity', 'I highly recommend', 'Guaranteed quality'.\n";
    }
    prompt += "• Note: If the customer uses a different language among these three, you may switch to match their preference, but prioritize the Primary Language for initial contact.\n";

    // Add product knowledge if available
    // Handle both string format (legacy) and structured format (new)
    if (productKnowledge) {
      let productKnowledgeText = "";
      if (typeof productKnowledge === "string") {
        // Legacy string format
        productKnowledgeText = productKnowledge.trim();
      } else if (typeof productKnowledge === "object") {
        // Structured format with items array
        const items = productKnowledge.items || [];
        const otherDesc = productKnowledge.otherDescription || "";
        
        // Format product items
        if (items.length > 0) {
          productKnowledgeText = "PRODUCTS/SERVICES:\n";
          items.forEach((item, index) => {
            productKnowledgeText += `${index + 1}. ${item.name || "Unnamed"}`;
            if (item.price) productKnowledgeText += ` - ${item.price}`;
            if (item.description) productKnowledgeText += `\n   ${item.description}`;
            if (item.promo) productKnowledgeText += `\n   Promo: ${item.promo}`;
            if (item.imageUrl || item.imageId) {
              const imageUrl = item.imageUrl || (item.imageId ? `/api/whatsapp/files/${item.imageId}/preview` : "");
              if (imageUrl) productKnowledgeText += `\n   Image available: ${imageUrl}`;
            }
            productKnowledgeText += "\n";
          });
        }
        
        // Add other description if available
        if (otherDesc.trim()) {
          if (productKnowledgeText) productKnowledgeText += "\n";
          productKnowledgeText += otherDesc.trim();
        }
      }
      
      if (productKnowledgeText) {
        prompt += "\n\nPRODUCT KNOWLEDGE:\n" + productKnowledgeText + "\n";
        prompt +=
          "Use this product information to answer customer questions accurately. ";
      }
    }

    // Add Product Catalog if available
    if (aiProductCatalog && aiProductCatalog.items && aiProductCatalog.items.length > 0) {
      prompt += "\n\nOFFICIAl PRODUCT CATALOG:\n";
      aiProductCatalog.items.forEach((item, index) => {
        prompt += `${index + 1}. ${item.name || "Unnamed"}`;
        if (item.price) prompt += ` - ${item.currency || "IDR"} ${item.price}`;
        if (item.description) prompt += `\n   Description: ${item.description}`;
        if (item.inStock === false) prompt += `\n   STATUS: Currently Out of Stock`;
        const images = item.images || (item.imageUrl ? [item.imageUrl] : []);
        if (images.length > 0) {
          prompt += `\n   Images available: ${images.join(", ")}`;
        }
        prompt += "\n";
      });
      prompt += "Reference these products when customers ask for recommendations or specific items.\n";
    }

    // Add FAQ
    if (aiBusinessFAQ && aiBusinessFAQ.items && aiBusinessFAQ.items.length > 0) {
      prompt += "\n\nCOMPANY POLICIES & FAQ:\n";
      aiBusinessFAQ.items.forEach(faq => {
        prompt += `Q: ${faq.question}\nA: ${faq.answer}\n`;
      });
    }

    // Add Business Info
    if (businessType) prompt += `\nBUSINESS TYPE: ${businessType}\n`;
    if (upsellStrategies) prompt += `UPSELL STRATEGIES: ${upsellStrategies}\n`;
    if (objectionHandling) prompt += `OBJECTION HANDLING: ${objectionHandling}\n`;

    // Add Boundaries (Guardrails)
    if (aiBoundariesEnabled) {
      prompt += "\nSTRICT BUSINESS BOUNDARIES:\n";
      prompt += "1. You are a dedicated commercial assistant. ONLY discuss topics related to our products, services, company policies, and business operations.\n";
      prompt += "2. DO NOT answer general knowledge, politics, celebrities, history, religion, or trivia.\n";
      
      let refusalMsg = "";
      if (aiLanguage === "id") refusalMsg = "Maaf, saya hanya dapat membantu hal-hal terkait produk dan layanan bisnis kami.";
      else if (aiLanguage === "ms") refusalMsg = "Maaf, saya hanya boleh membantu urusan berkaitan produk dan perkhidmatan perniagaan kami sahaja.";
      else refusalMsg = "I'm sorry, I can only assist with matters related to our products and business services.";
      
      prompt += `3. If the user asks an off-topic question, politely refuse using this exact sentiment: '${refusalMsg}'\n`;
    }

    // Handover instructions
    prompt += "\nHANDOVER INSTRUCTION:\n";
    let handoverKeywords = "";
    if (aiLanguage === "id") handoverKeywords = "'admin', 'manusia', 'staf', 'orang', 'hubungi seller'";
    else if (aiLanguage === "ms") handoverKeywords = "'admin', 'manusia', 'staf', 'orang', 'hubungi penjual'";
    else handoverKeywords = "'agent', 'human', 'person', 'staff', 'manager'";
    
    prompt += `1. If the customer requests to talk to a real person (e.g., using keywords like ${handoverKeywords}), append '[HANDOVER]' to the end of your response.\n`;
    prompt += "2. If you cannot answer a complex question even after checking knowledge bases, or if the customer is frustrated, append '[HANDOVER]'.\n";

    // Add sales scripts if available
    // Handle both string format (legacy) and structured format (new)
    if (salesScripts) {
      let salesScriptsText = "";
      if (typeof salesScripts === "string") {
        // Legacy string format
        salesScriptsText = salesScripts.trim();
      } else if (typeof salesScripts === "object") {
        // Structured format with items array
        const items = salesScripts.items || [];
        const detailedResponse = salesScripts.detailedResponse || "";
        
        // Format sales script items
        if (items.length > 0) {
          salesScriptsText = "SALES SCRIPTS:\n";
          items.forEach((item, index) => {
            salesScriptsText += `${index + 1}. ${item.name || "Unnamed"}`;
            if (item.response) {
              salesScriptsText += `\n   ${item.response}`;
            }
            salesScriptsText += "\n";
          });
        }
        
        // Add detailed response if available
        if (detailedResponse.trim()) {
          if (salesScriptsText) salesScriptsText += "\n";
          salesScriptsText += detailedResponse.trim();
        }
      }
      
      if (salesScriptsText) {
        prompt +=
          "\n\nSALES SCRIPTS & PROCEDURES:\n" + salesScriptsText + "\n";
        prompt +=
          "Follow these scripts and procedures for consistent customer service. ";
      }
    }

    // Add specific rules
    if (rules.length > 0) {
      prompt += "\n\nIMPORTANT RULES:\n";
      rules.forEach((rule, index) => (prompt += `${index + 1}. ${rule}\n`));
    }

    // Add default persuasive rules if no custom rules provided
    if (rules.length === 0) {
      prompt += "\n\nPERSUASIVE SALES RULES:\n";
      prompt += "1. Always lead with benefits and value propositions\n";
      prompt += "2. Use confident, positive language that builds excitement\n";
      prompt +=
        "3. Provide solutions immediately rather than asking many questions\n";
      prompt +=
        "4. Create urgency when appropriate (limited stock, special offers)\n";
      prompt += "5. Use social proof and testimonials to build trust\n";
      prompt += "6. Focus on how the product/service will improve their life\n";
      prompt +=
        "7. Be enthusiastic and genuinely excited about your offerings\n";
      prompt +=
        "8. Offer guarantees and risk-free options to overcome objections\n";
      prompt +=
        "9. Guide customers towards making decisions, not just providing information\n";
      prompt += "10. End responses with clear next steps or calls to action\n";
    }

    return prompt;
  }

  shouldRespondToMessage(message, context) {
    const {
      autoReply = false,
      replyTriggers = [],
      customTriggers = [],
      triggerRequired = false,
    } = context;

    // First check if AI is enabled at all
    if (!context.aiEnabled) {
      console.log("AI is disabled, skipping message");
      return false;
    }

    // Check Operating Hours if enabled
    if (context.aiOperatingHours && context.aiOperatingHours.enabled) {
      const { schedule } = context.aiOperatingHours;
      const now = getJakartaTime();
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDay = days[now.getDay()];
      const daySchedule = schedule[currentDay];
      
      if (daySchedule && daySchedule.open && daySchedule.close) {
        const [openH, openM] = daySchedule.open.split(':').map(Number);
        const [closeH, closeM] = daySchedule.close.split(':').map(Number);
        const currentH = now.getHours();
        const currentM = now.getMinutes();
        const currentTimeInM = currentH * 60 + currentM;
        const openTimeInM = openH * 60 + openM;
        const closeTimeInM = closeH * 60 + closeM;
        
        if (currentTimeInM < openTimeInM || currentTimeInM > closeTimeInM) {
          console.log(`[OPERATING-HOURS] Outside of business hours (${daySchedule.open}-${daySchedule.close}). Skipping AI response.`);
          return false;
        }
      }
    }

    // If auto-reply is enabled, respond to all messages
    if (autoReply) {
      console.log("Auto-reply is enabled, will respond");
      return true;
    }

    // If triggers are not required, respond to all messages
    if (!triggerRequired) {
      console.log("Triggers not required, will respond to any message");
      return true;
    }

    // If triggers are required, check for matching triggers
    const triggers =
      customTriggers && customTriggers.length > 0
        ? customTriggers
        : replyTriggers;
    if (triggers && triggers.length > 0) {
      const messageText =
        typeof message.content === "object"
          ? message.content.text
          : message.content;
      const hasMatchingTrigger = triggers.some((trigger) =>
        messageText.toLowerCase().includes(trigger.toLowerCase())
      );

      if (hasMatchingTrigger) {
        console.log("Found matching trigger word, will respond");
        return true;
      }
    }

    console.log(
      "Triggers required but no matching triggers found, skipping message"
    );
    return false;
  }
}

export default AIService;
