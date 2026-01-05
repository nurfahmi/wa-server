import OpenAI from "openai";
import config from "../config/config.js";
import {
  Message,
  AIConversationMemory,
  Device,
  AIUsageLog,
  AICostAlert,
  AIProvider,
  AIModel,
} from "../models/index.js";
import { Op } from "sequelize";
import { getJakartaTime } from "../utils/timeHelper.js";
import EnhancedAIService from "./EnhancedAIService.js";

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
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

        const historyMessages = await AIConversationMemory.findAll({
          where: {
            sessionId,
            remoteJid,
            timestamp: {
              [Op.gt]: expiryTime,
            },
          },
          order: [["timestamp", "DESC"]],
          limit: maxHistoryLength * 2, // *2 for both user and assistant messages
        });

        // Add history messages in chronological order
        for (const msg of historyMessages.reverse()) {
          messages.push({
            role: msg.role,
            content: msg.content,
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

      console.log("Sending messages to AI provider:", messages);

      // Use Enhanced AI Service for provider-specific processing
      const enhancedAI = new EnhancedAIService({
        Device,
        AIUsageLog,
        AICostAlert,
        AIProvider,
        AIModel,
      });

      // Get device data for AI provider settings
      const device = await Device.findOne({
        where: { id: context.deviceId },
      });

      if (!device) {
        throw new Error(`Device not found for ID: ${context.deviceId}`);
      }

      // Get AI response using device provider settings with tracking
      const aiResult = await enhancedAI.sendWithTracking(
        device,
        messages,
        remoteJid, // chatId
        {
          temperature: context.temperature || device.aiTemperature || 0.7,
          maxTokens: context.maxTokens || device.aiMaxTokens || 500,
        }
      );

      // Get the AI response
      const aiResponse = aiResult?.content;
      if (!aiResponse) {
        throw new Error("Failed to get AI response");
      }
      console.log("Received AI response:", aiResponse);

      // Detect if a product is mentioned and find matching product image
      let productImageId = null;
      const productKnowledge = context.productKnowledge;
      console.log(`[AI-SERVICE] Checking product knowledge:`, {
        hasProductKnowledge: !!productKnowledge,
        type: typeof productKnowledge,
        hasItems: productKnowledge && typeof productKnowledge === "object" && !!productKnowledge.items,
        itemsCount: productKnowledge && typeof productKnowledge === "object" && productKnowledge.items ? productKnowledge.items.length : 0,
      });
      
      if (productKnowledge && typeof productKnowledge === "object" && productKnowledge.items) {
        const items = productKnowledge.items || [];
        const messageTextLower = messageText.toLowerCase();
        const aiResponseLower = aiResponse.toLowerCase();
        
        // Find products mentioned in the user's message or AI response
        // Check for exact matches first, then partial matches
        let bestMatch = null;
        let bestMatchScore = 0;
        
        for (const item of items) {
          if (item.name && item.imageId) {
            const productNameLower = item.name.toLowerCase();
            const productWords = productNameLower.split(/\s+/);
            
            // Calculate match score from user message
            let matchScore = 0;
            
            // Exact match gets highest score
            if (messageTextLower.includes(productNameLower)) {
              matchScore = 100;
            } else {
              // Check for individual word matches
              for (const word of productWords) {
                if (word.length > 2 && messageTextLower.includes(word)) {
                  matchScore += 10;
                }
              }
            }
            
            // Boost score if AI response also mentions the product
            if (aiResponseLower.includes(productNameLower)) {
              matchScore += 50;
            }
            
            // Prefer matches with images
            if (matchScore > bestMatchScore) {
              bestMatchScore = matchScore;
              bestMatch = item;
            }
          }
        }
        
        // Use best match if score is above threshold
        if (bestMatch && bestMatchScore >= 10) {
          productImageId = bestMatch.imageId;
          console.log(`[AI-SERVICE] Found matching product image for "${bestMatch.name}" (score: ${bestMatchScore}):`, {
            productName: bestMatch.name,
            imageId: productImageId,
            imageIdType: typeof productImageId,
            hasImageUrl: !!bestMatch.imageUrl,
            imageUrl: bestMatch.imageUrl,
          });
        } else {
          console.log(`[AI-SERVICE] No product match found (best score: ${bestMatchScore}, threshold: 10)`);
          // Log all available products for debugging
          if (items.length > 0) {
            console.log(`[AI-SERVICE] Available products:`, items.map(item => ({
              name: item.name,
              hasImageId: !!item.imageId,
              imageId: item.imageId,
            })));
          }
        }
      } else {
        console.log(`[AI-SERVICE] Product knowledge structure invalid or empty`);
      }

      // Save messages if memory should be used
      if (shouldUseMemory) {
        console.log(
          "Saving messages to memory (memory enabled or auto-reply active)"
        );
        const now = getJakartaTime();
        const expiresAt = new Date(now.getTime() + expiryMinutes * 60000);

        // Save user message
        await AIConversationMemory.create({
          sessionId,
          remoteJid,
          role: "user",
          content: messageText,
          timestamp: now,
          expiresAt,
        });

        // Save AI response
        await AIConversationMemory.create({
          sessionId,
          remoteJid,
          role: "assistant",
          content: aiResponse,
          timestamp: now,
          expiresAt,
        });
      } else {
        console.log(
          "Skipping message saving - memory and auto-reply are disabled"
        );
      }

      const response = {
        type: "text",
        content: aiResponse,
        shouldRespond: true,
        imageId: productImageId || null, // Include image ID if product was mentioned
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

  // Helper method to clean up expired memories
  async cleanupExpiredMemories() {
    try {
      const now = getJakartaTime();
      await AIConversationMemory.destroy({
        where: {
          expiresAt: {
            [Op.lt]: now,
          },
        },
      });
    } catch (error) {
      console.error("Error cleaning up expired memories:", error);
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
    } = context;

    let prompt = "";

    // Start with custom prompt if provided, otherwise use persuasive sales-focused default
    if (customPrompt) {
      prompt = customPrompt + " ";
    } else {
      prompt = `You are ${
        botName || "Assistant"
      }, a highly skilled and charismatic WhatsApp ${
        isGroup ? "group" : "private"
      } sales assistant. You are PERSUASIVE, REASSURING, PROFESSIONAL, FRIENDLY, and ENTHUSIASTIC. `;

      prompt += "COMMUNICATION STYLE: ";
      prompt += "• Be confident and assertive, not questioning ";
      prompt += "• Focus on benefits and solutions, not problems ";
      prompt += "• Use positive, action-oriented language ";
      prompt += "• Create excitement about products/services ";
      prompt += "• Build trust through expertise and guarantee ";
      prompt += "• Minimize questions - provide value immediately ";
      prompt += "• Use social proof and urgency when appropriate ";

      prompt +=
        "\nYour goal is to CONVERT conversations into sales while providing exceptional customer experience. ";
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
    if (aiLanguage === "id") {
      prompt +=
        "Respond primarily in Bahasa Indonesia unless customer uses English. ";
      prompt +=
        "SALES APPROACH: Gunakan bahasa yang hangat dan meyakinkan seperti 'Pasti cocok untuk Anda!', 'Ini kesempatan terbaik', 'Saya rekomendasikan', 'Dijamin berkualitas'. ";
    } else if (aiLanguage === "en") {
      prompt +=
        "Respond primarily in English unless customer uses another language. ";
      prompt +=
        "SALES APPROACH: Use warm and convincing language like 'Perfect for you!', 'This is the best opportunity', 'I highly recommend', 'Guaranteed quality'. ";
    } else if (aiLanguage === "ms") {
      prompt +=
        "Respond primarily in Bahasa Melayu unless customer uses another language. ";
      prompt +=
        "SALES APPROACH: Gunakan bahasa yang mesra dan meyakinkan seperti 'Pasti sesuai untuk anda!', 'Ini peluang terbaik', 'Saya cadangkan', 'Dijamin berkualiti'. ";
    }

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
