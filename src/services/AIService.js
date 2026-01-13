import OpenAI from "openai";
import config from "../config/config.js";
import {
  Message,
  ChatHistory,
  Device,
  Product,
  ChatSettings,
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

      // Fetch top active products for initial context (so AI isn't blind)
      try {
        const topProducts = await Product.findAll({
           where: { deviceId: context.deviceId, isActive: true },
           limit: 5,
           order: [['stockCount', 'DESC']]
        });
        context.topProducts = topProducts;
      } catch (e) {
        console.error("Failed to fetch top products:", e);
      }

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


      // We allow up to 3 turns to prevent infinite loops (Think -> Tool -> Think -> Reply)
      let turnCount = 0;
      let finalResponse = null;
      let currentMessages = [...messages];

      const tools = [
        {
           type: "function",
           function: {
              name: "search_products",
              description: "Search for products in the catalog by name, category, or description. Use this to find prices, stock, and variants.",
              parameters: {
                 type: "object",
                 properties: {
                    query: { type: "string", description: "Search keywords (e.g. 'iphone', 'blue shirt')" },
                    category: { type: "string", description: "Optional category filter" },
                    limit: { type: "integer", default: 5 }
                 },
                 required: ["query"]
              }
           }
        },
        {
           type: "function",
           function: {
              name: "check_stock_availability",
              description: "Check specific stock count for a list of product names.",
              parameters: {
                 type: "object",
                 properties: {
                    productNames: { type: "array", items: { type: "string" } }
                 },
                 required: ["productNames"]
              }
           }
        },
        {
           type: "function",
           function: {
              name: "analyze_purchase_intent",
              description: "CRITICAL: Call this tool for EVERY user message to analyze their purchase intent level. This helps track leads and prioritize customers.",
              parameters: {
                 type: "object",
                 properties: {
                    intent_score: { 
                       type: "integer", 
                       description: "Purchase intent score from 0-100. 0-20=cold (just browsing), 21-40=curious (asking features), 41-60=interested (asking price/stock), 61-80=hot (negotiating/asking payment), 81-100=closing (ready to buy)"
                    },
                    intent_stage: { 
                       type: "string", 
                       enum: ["cold", "curious", "interested", "hot", "closing"],
                       description: "Current stage of purchase intent"
                    },
                    signals_detected: {
                       type: "array",
                       items: { type: "string" },
                       description: "Buying signals detected: 'asked_price', 'asked_stock', 'compared_products', 'mentioned_budget', 'asked_payment', 'asked_shipping', 'negotiating', 'confirmed_order', 'asked_variants', 'repeat_customer'"
                    },
                    objections: {
                       type: "array", 
                       items: { type: "string" },
                       description: "Objections or hesitations: 'price_concern', 'trust_issue', 'timing_delay', 'needs_comparison', 'unsure_fit', 'waiting_approval'"
                    },
                    products_of_interest: { 
                       type: "array", 
                       items: { type: "string" },
                       description: "Product names the customer asked about or showed interest in"
                    },
                    recommended_action: {
                       type: "string",
                       enum: ["nurture", "educate", "present_offer", "handle_objection", "create_urgency", "close_sale", "handover"],
                       description: "Recommended next action based on intent analysis"
                    },
                    intent_summary: {
                       type: "string",
                       description: "Brief 1-sentence summary of customer's current intent status"
                    }
                 },
                 required: ["intent_score", "intent_stage", "signals_detected", "recommended_action"]
              }
           }
        }
      ];

      while (turnCount < 3) {
        console.log(`[AI-LOOP] Turn ${turnCount + 1}: Calling AI Model...`);
        
        const aiResult = await this.universalAI.chatCompletion(currentMessages, {
          provider: device.aiProvider || "openai",
          model: device.aiModel,
          temperature: context.temperature || device.aiTemperature || 0.7,
          maxTokens: context.maxTokens || device.aiMaxTokens || 500,
          tools: tools,
          tool_choice: "auto"
        });

        // FAILSAFE: If AI output the tool name as text (hallucination), force it to be a tool call
        if ((!aiResult.tool_calls || aiResult.tool_calls.length === 0) && aiResult.content) {
            const content = aiResult.content.trim().toLowerCase();
            // Check for intent analysis keywords in response that suggest AI wanted to call tool
            if (content.includes("analyze_purchase_intent") || content.includes("intent_score")) {
                console.log("[AI-FAILSAFE] Detected intent tool reference in text. Forcing tool execution.");
                aiResult.tool_calls = [{
                     id: "call_" + Date.now(),
                     function: {
                         name: "analyze_purchase_intent",
                         arguments: JSON.stringify({
                             intent_score: 50,
                             intent_stage: "interested",
                             signals_detected: [],
                             recommended_action: "educate"
                         })
                     },
                     type: "function"
                }];
                // Keep content for response but mark tool call
            }
        }

        // 11. Handle Tool Calls
        if (aiResult.tool_calls && aiResult.tool_calls.length > 0) {
           console.log(`[AI-LOOP] AI requested tools:`, aiResult.tool_calls.map(tc => tc.function.name));
           
           // Append assistant's tool request to history required by OpenAI API protocol
           currentMessages.push({
              role: "assistant",
              content: aiResult.content || null,
              tool_calls: aiResult.tool_calls
           });

           // Execute tools
           for (const toolCall of aiResult.tool_calls) {
              // Add device to context for tool usage if needed (e.g. userId for ChatSettings)
              context.device = device; 
              
              const toolResult = await this._executeTool(toolCall, context);
              
              currentMessages.push({
                 role: "tool",
                 tool_call_id: toolCall.id,
                 content: JSON.stringify(toolResult)
              });
           }
           
           turnCount++;
           // Continue loop to get final interpretation from AI
        } else {
           // No more tools, this is the final answer
           finalResponse = aiResult.content;
           break;
        }
      }

      if (!finalResponse) {
         finalResponse = "I apologize, I'm having trouble accessing the information right now. Please try again.";
      }

      // 12. Legacy Product Image Logic (Optional Fallback)
      // Only run if the AI didn't explicitly "attach" an image via the tool (we can enhance tool to return imageIds later)
      // For now, we reuse the existing best-match logic on the final text response
      
      let productImageId = null;
      const productKnowledge = context.productKnowledge;
      const productCatalog = context.aiProductCatalog;
      
      const allProductItems = [
        ...(productKnowledge?.items || []),
        ...(productCatalog?.items || [])
      ];

      if (allProductItems.length > 0 && !productImageId) {
         // ... existing match logic ...
         const items = allProductItems;
         const messageTextLower = messageText.toLowerCase();
         const aiResponseLower = finalResponse.toLowerCase();
         
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
           if (aiResponseLower.includes(namePart)) score += 50;
           const keywords = namePart.split(/\s+/).filter(w => w.length > 2);
           const userMatchCount = keywords.filter(w => messageTextLower.includes(w)).length;
           if (userMatchCount > 0) score += (userMatchCount / keywords.length) * 30;
           const intentKeywords = ["harga", "berapa", "foto", "gambar", "price", "image", "photo"];
           if (intentKeywords.some(ik => messageTextLower.includes(ik)) && userMatchCount > 0) {
             score += 20;
           }
           if (score > highestScore) {
             highestScore = score;
             bestMatch = item;
           }
         }

         if (bestMatch && highestScore >= 40) {
            productImageId = bestMatch.imageId || extractImageIdFromUrl(bestMatch.imageUrl);
         }
      }

      // Handover detection check on Final Response
      let needsHandover = finalResponse.includes("[HANDOVER]");
      const handoverTriggers = context.aiHandoverTriggers || ["human", "agent", "bantuan", "tolong", "staf"];
      if (!needsHandover) {
        needsHandover = handoverTriggers.some(t => messageText.toLowerCase().includes(t.toLowerCase()));
      }

      return {
        type: "text",
        content: finalResponse.replace("[HANDOVER]", "").trim(),
        shouldRespond: true,
        imageId: productImageId,
        needsHandover: needsHandover,
      };

    } catch (error) {
      console.error("[AI-SERVICE] Error processing message:", error);
      return {
        type: "text",
        content: null,
        shouldRespond: false,
        error: error.message
      };
    }
  }

  /**
   * Execute Tool Calls
   */
  async _executeTool(toolCall, context) {
     const { name, arguments: argsString } = toolCall.function;
     console.log(`[AI-TOOL] Executing ${name} with args: ${argsString}`);
     
     try {
        const args = JSON.parse(argsString);
        
        if (name === "search_products") {
           const whereClause = {
              deviceId: context.deviceId,
              isActive: true,
              [Op.or]: [
                 { name: { [Op.like]: `%${args.query}%` } },
                 { description: { [Op.like]: `%${args.query}%` } },
                 { tags: { [Op.like]: `%${args.query}%` } }
              ]
           };
           
           if (args.category) {
              whereClause.category = args.category;
           }

           const products = await Product.findAll({
              where: whereClause,
              limit: args.limit || 5
           });
           
           if (products.length === 0) return { result: "No products found matching query." };
           
           return {
              result: products.map(p => ({
                 name: p.name,
                 price: p.pricing?.formatted || p.pricing?.raw,
                 stock: p.inventoryType === 'always_in_stock' ? 'Available' : p.stockCount,
                 description: p.description ? p.description.substring(0, 100) + "..." : "",
                 promos: p.pricing?.promo
              }))
           };
        }
        
        if (name === "check_stock_availability") {
           const productNames = args.productNames || [];
           if (productNames.length === 0) return { error: "No product names provided" };

           const whereClause = {
              deviceId: context.deviceId,
              isActive: true,
              [Op.or]: []
           };

           // Construct OR clause for each product name
           productNames.forEach(pName => {
              whereClause[Op.or].push({ name: { [Op.like]: `%${pName}%` } });
           });

           const products = await Product.findAll({
              where: whereClause
           });

           if (products.length === 0) return { result: "No products found matching those names." };

           return {
              result: products.map(p => ({
                 name: p.name,
                 stockStatus: p.inventoryType === 'always_in_stock' ? 'Always Available' : `${p.stockCount} units`,
                 canFulfill: p.inventoryType === 'always_in_stock' || p.stockCount > 0
              }))
           };
        }

        if (name === "analyze_purchase_intent") {
           const intentScore = args.intent_score || 0;
           const intentStage = args.intent_stage || "cold";
           const signalsDetected = args.signals_detected || [];
           const objections = args.objections || [];
           const productsOfInterest = args.products_of_interest || [];
           const recommendedAction = args.recommended_action || "nurture";
           const intentSummary = args.intent_summary || "";

           console.log(`[INTENT-ANALYSIS] Device ${context.deviceId} | Chat ${context.remoteJid}`);
           console.log(`[INTENT-ANALYSIS] Score: ${intentScore} | Stage: ${intentStage}`);
           console.log(`[INTENT-ANALYSIS] Signals: ${signalsDetected.join(", ")}`);
           console.log(`[INTENT-ANALYSIS] Objections: ${objections.join(", ")}`);
           console.log(`[INTENT-ANALYSIS] Products: ${productsOfInterest.join(", ")}`);
           console.log(`[INTENT-ANALYSIS] Recommended Action: ${recommendedAction}`);
           
           try {
              // Find or create chat settings
              const [chat, created] = await ChatSettings.findOrCreate({
                 where: { 
                    deviceId: context.deviceId,
                    chatId: context.remoteJid 
                 },
                 defaults: {
                    userId: context.device.userId, 
                    sessionId: context.device.sessionId,
                    phoneNumber: context.remoteJid.replace('@s.whatsapp.net', '')
                 }
              });

              if (chat) {
                 // Get previous values for history tracking
                 const previousScore = chat.purchaseIntentScore || 0;
                 const previousStage = chat.purchaseIntentStage || "cold";
                 
                 // Merge new signals with existing (avoid duplicates)
                 let existingSignals = chat.intentSignals || [];
                 if (typeof existingSignals === 'string') {
                    try { existingSignals = JSON.parse(existingSignals); } catch (e) { existingSignals = []; }
                 }
                 const mergedSignals = [...new Set([...existingSignals, ...signalsDetected])];
                 
                 // Merge objections
                 let existingObjections = chat.intentObjections || [];
                 if (typeof existingObjections === 'string') {
                    try { existingObjections = JSON.parse(existingObjections); } catch (e) { existingObjections = []; }
                 }
                 const mergedObjections = [...new Set([...existingObjections, ...objections])];
                 
                 // Merge products of interest
                 let existingProducts = chat.productsOfInterest || [];
                 if (typeof existingProducts === 'string') {
                    try { existingProducts = JSON.parse(existingProducts); } catch (e) { existingProducts = []; }
                 }
                 const mergedProducts = [...new Set([...existingProducts, ...productsOfInterest])];
                 
                 // Build intent history entry (keep last 20 entries)
                 let intentHistory = chat.intentHistory || [];
                 if (typeof intentHistory === 'string') {
                    try { intentHistory = JSON.parse(intentHistory); } catch (e) { intentHistory = []; }
                 }
                 
                 // Only add to history if score changed
                 if (previousScore !== intentScore) {
                    intentHistory.push({
                       timestamp: new Date().toISOString(),
                       score: intentScore,
                       stage: intentStage,
                       signals: signalsDetected,
                       action: recommendedAction
                    });
                    // Keep only last 20 entries
                    if (intentHistory.length > 20) {
                       intentHistory = intentHistory.slice(-20);
                    }
                 }
                 
                 // Update chat settings
                 chat.purchaseIntentScore = intentScore;
                 chat.purchaseIntentStage = intentStage;
                 chat.intentSignals = mergedSignals;
                 chat.intentObjections = mergedObjections;
                 chat.productsOfInterest = mergedProducts;
                 chat.aiRecommendedAction = recommendedAction;
                 chat.intentUpdatedAt = new Date();
                 chat.intentHistory = intentHistory;
                 
                 // Auto-update priority based on intent
                 if (intentScore >= 80) {
                    chat.priority = 'urgent';
                 } else if (intentScore >= 60) {
                    chat.priority = 'high';
                 } else if (intentScore >= 40) {
                    chat.priority = 'normal';
                 } else {
                    chat.priority = 'low';
                 }
                 
                 // Auto-add labels based on stage
                 let currentLabels = chat.labels || [];
                 if (typeof currentLabels === 'string') {
                    try { currentLabels = JSON.parse(currentLabels); } catch (e) { currentLabels = []; }
                 }
                 if (!Array.isArray(currentLabels)) currentLabels = [];
                 
                 // Remove old intent labels first
                 currentLabels = currentLabels.filter(l => !['cold-lead', 'curious-lead', 'interested-lead', 'hot-lead', 'closing-deal'].includes(l));
                 
                 // Add new intent label
                 const stageLabels = {
                    'cold': 'cold-lead',
                    'curious': 'curious-lead', 
                    'interested': 'interested-lead',
                    'hot': 'hot-lead',
                    'closing': 'closing-deal'
                 };
                 if (stageLabels[intentStage]) {
                    currentLabels.push(stageLabels[intentStage]);
                 }
                 chat.labels = currentLabels;
                 
                 // Track peak intent score (for learning analytics)
                 const currentPeak = chat.peakIntentScore || 0;
                 if (intentScore > currentPeak) {
                    chat.peakIntentScore = intentScore;
                 }
                 
                 // Set first message timestamp if not set
                 if (!chat.firstMessageAt) {
                    chat.firstMessageAt = new Date();
                 }
                 
                 // Increment AI message count (this message is AI-generated)
                 chat.aiMessagesCount = (chat.aiMessagesCount || 0) + 1;
                 chat.totalMessages = (chat.totalMessages || 0) + 1;
                 
                 await chat.save();
                 
                 console.log(`[INTENT-ANALYSIS] ChatSettings updated: score=${intentScore}, stage=${intentStage}, priority=${chat.priority}`);
                 
                 // Return guidance for AI based on recommended action
                 let actionGuidance = "";
                 switch (recommendedAction) {
                    case "nurture":
                       actionGuidance = "This is a cold lead. Be friendly and informative. Don't push for sales yet. Build rapport first.";
                       break;
                    case "educate":
                       actionGuidance = "Customer is curious. Focus on explaining features and benefits. Answer their questions thoroughly.";
                       break;
                    case "present_offer":
                       actionGuidance = "Customer is interested! Present your best offer. Highlight value propositions and any promotions.";
                       break;
                    case "handle_objection":
                       actionGuidance = "Customer has concerns. Address their objections directly. Provide guarantees, testimonials, or alternatives.";
                       break;
                    case "create_urgency":
                       actionGuidance = "Customer is hot! Create urgency - mention limited stock, ending promos, or exclusive deals.";
                       break;
                    case "close_sale":
                       actionGuidance = "CLOSING TIME! Guide the customer to payment. Be clear about payment methods and next steps.";
                       break;
                    case "handover":
                       actionGuidance = "Consider handover to human agent for complex request or high-value lead.";
                       break;
                 }
                 
                 return { 
                    status: "success", 
                    intent_tracked: true,
                    current_score: intentScore,
                    current_stage: intentStage,
                    action_guidance: actionGuidance,
                    priority_updated: chat.priority
                 };
              }
           } catch (dbErr) {
              console.error("[INTENT-ANALYSIS] Failed to update ChatSettings:", dbErr);
           }

           return { 
              status: "success", 
              intent_tracked: true,
              instruction: "Continue the conversation naturally based on the customer's intent level."
           };
        }

        return { result: "Unknown tool" };
     } catch (err) {
        console.error(`[AI-TOOL] Fail:`, err);
        return { error: err.message };
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

    // Start with custom prompt if provided, otherwise use specific persona archetype
    if (customPrompt) {
      prompt = customPrompt + " ";
    } else {
       // -- PERSONA GENERATION LOGIC START --
       prompt = this._generatePersonaPrompt(context, isGroup);
       // -- PERSONA GENERATION LOGIC END --
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

    // Add Product Catalog from context (Top Products or Legacy)
    if (context.topProducts && context.topProducts.length > 0) {
       prompt += "\n\nFEATURED PRODUCTS (Start with these if asked):\n";
       context.topProducts.forEach((p, idx) => {
          prompt += `${idx+1}. ${p.name} - ${p.pricing?.formatted || p.pricing?.raw}\n`;
          if(p.description) prompt += `   ${p.description.substring(0, 100)}...\n`;
       });
       prompt += "\nAlso use the 'search_products' tool to find more items.\n";
    } else if (aiProductCatalog && aiProductCatalog.items && aiProductCatalog.items.length > 0) {
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
      prompt += "9. Guide customers towards making decisions, not just providing information\n";
      prompt += "10. End responses with clear next steps or calls to action\n";
    }

    // CRITICAL: Always Analyze Purchase Intent
    prompt += "\n\n═══════════════════════════════════════════════════════════════\n";
    prompt += "CRITICAL PROTOCOL - PURCHASE INTENT ANALYSIS\n";
    prompt += "═══════════════════════════════════════════════════════════════\n\n";
    
    prompt += "You MUST call the 'analyze_purchase_intent' tool for EVERY user message.\n";
    prompt += "This is MANDATORY - it helps track leads and prioritize customers.\n\n";
    
    prompt += "INTENT SCORING GUIDE:\n";
    prompt += "┌─────────────────────────────────────────────────────────────┐\n";
    prompt += "│ STAGE       │ SCORE  │ SIGNALS                              │\n";
    prompt += "├─────────────────────────────────────────────────────────────┤\n";
    prompt += "│ COLD        │ 0-20   │ General greetings, browsing          │\n";
    prompt += "│ CURIOUS     │ 21-40  │ Asking features, comparing options   │\n";
    prompt += "│ INTERESTED  │ 41-60  │ Asking price, stock, specific items  │\n";
    prompt += "│ HOT         │ 61-80  │ Negotiating, asking payment/shipping │\n";
    prompt += "│ CLOSING     │ 81-100 │ Ready to buy, confirming order       │\n";
    prompt += "└─────────────────────────────────────────────────────────────┘\n\n";
    
    prompt += "BUYING SIGNALS TO DETECT:\n";
    prompt += "• asked_price - Customer asks about price/cost\n";
    prompt += "• asked_stock - Customer checks availability\n";
    prompt += "• asked_variants - Customer asks about colors/sizes/options\n";
    prompt += "• compared_products - Customer compares with alternatives\n";
    prompt += "• mentioned_budget - Customer mentions budget or price range\n";
    prompt += "• asked_payment - Customer asks about payment methods\n";
    prompt += "• asked_shipping - Customer asks about delivery\n";
    prompt += "• negotiating - Customer trying to get discount\n";
    prompt += "• confirmed_order - Customer confirms the purchase\n";
    prompt += "• repeat_customer - Customer mentions previous purchase\n\n";
    
    prompt += "OBJECTIONS TO DETECT:\n";
    prompt += "• price_concern - 'Too expensive', 'Over budget'\n";
    prompt += "• trust_issue - 'Is it genuine?', 'Any guarantee?'\n";
    prompt += "• timing_delay - 'Maybe later', 'Next month'\n";
    prompt += "• needs_comparison - 'Let me check others first'\n";
    prompt += "• unsure_fit - 'Not sure if it's right for me'\n";
    prompt += "• waiting_approval - 'Need to ask partner/boss'\n\n";
    
    prompt += "RECOMMENDED ACTIONS:\n";
    prompt += "• nurture - For cold leads, build relationship first\n";
    prompt += "• educate - For curious leads, explain features/benefits\n";
    prompt += "• present_offer - For interested leads, show best deals\n";
    prompt += "• handle_objection - Address concerns with guarantees/proof\n";
    prompt += "• create_urgency - For hot leads, limited stock/time offers\n";
    prompt += "• close_sale - Guide to payment, clear next steps\n";
    prompt += "• handover - Request human agent takeover\n\n";
    
    prompt += "IMPORTANT:\n";
    prompt += "- Call analyze_purchase_intent BEFORE formulating your response\n";
    prompt += "- Adjust your response tone and strategy based on the intent stage\n";
    prompt += "- Track ALL products the customer mentions\n";
    prompt += "- DO NOT write tool names in your text response\n";
    prompt += "- Use Function Calling / Tool Use feature properly\n";

    return prompt;
  }
  
  /**
   * Generates a specialized system prompt based on the AI Goal / Persona
   */
  _generatePersonaPrompt(context, isGroup) {
      const {
        botName,
        aiBusinessProfile,
        aiBrandVoice = "casual",
        aiLanguage = "id",
        aiPrimaryGoal = "conversion", // conversion | leads | support | qualification | general
      } = context;

      const businessName = aiBusinessProfile?.name || "Our Business";
      const agentName = botName || "Assistant";
      const userType = isGroup ? "a group of users" : "a user";

      let p = `ROLE DEFINITION:\n`;
      p += `You are ${agentName}, representing ${businessName}. You are communicating with ${userType} on WhatsApp.\n`;
      
      if (aiBusinessProfile?.category) {
         p += `INDUSTRY: ${aiBusinessProfile.category}\n`;
      }
      if (aiBusinessProfile?.description) {
         p += `BUSINESS CONTEXT: ${aiBusinessProfile.description}\n`;
      }

      // --- 1. CORE ARCHETYPE SELECTION ---
      p += `\nYOUR CORE OBJECTIVE:\n`;
      
      switch (aiPrimaryGoal) {
         case "conversion": // "Sales Hunter"
            p += `-> ARCHETYPE: **THE SALES HUNTER**\n`;
            p += `-> GOAL: Close the sale. Get the money. Secure the order.\n`;
            p += `-> BEHAVIOR:\n`;
            p += `   - PROACTIVE: Never end a message with a statement. Always end with a question that moves the sale forward.\n`;
            p += `   - PERSUASIVE: Focus on benefits. Why should they buy NOW?\n`;
            p += `   - URGENCY: If stock is low, mention it. If there is a promo, hype it.\n`;
            p += `   - UPSELL: Once they agree to buy, immediately suggest a complementary item.\n`;
            break;

         case "support": // "Customer Success"
            p += `-> ARCHETYPE: **CUSTOMER SUCCESS MANAGER**\n`;
            p += `-> GOAL: Retention, Satisfaction, and Problem Solving.\n`;
            p += `-> BEHAVIOR:\n`;
            p += `   - EMPATHETIC: Start replies with validation ("I understand why you are frustrated...").\n`;
            p += `   - SOLUTION-FIRST: Don't explain *why* it broke, explain *how* access is restored.\n`;
            p += `   - PATIENT: Never argue. De-escalate angry users.\n`;
            p += `   - BOUNDARY: You clarify what you can do. If you can't solve it, offer a handover.\n`;
            break;

         case "leads": // "The Qualifier"
         case "qualification": 
            p += `-> ARCHETYPE: **LEAD QUALIFIER & APPOINTMENT SETTER**\n`;
            p += `-> GOAL: Filter the user and get their contact details/booking.\n`;
            p += `-> BEHAVIOR:\n`;
            p += `   - GATEKEEPER: Do not just give the price immediately. value first.\n`;
            p += `   - DISCOVERY: Ask: "How many units do you need?" or "When are you planning to visit?"\n`;
            p += `   - CLOSING: The 'close' is not money, it is a Phone Number or Meeting Time.\n`;
            break;

         default: // "General Assistant"
            p += `-> ARCHETYPE: **GENERAL ASSISTANT**\n`;
            p += `-> GOAL: Helpful, informative, and polite assistance.\n`;
            p += `-> BEHAVIOR:\n`;
            p += `   - BALANCED: Be friendly but professional.\n`;
            p += `   - ACCURATE: Answer questions based strictly on the provided knowledge.\n`;
            p += `   - HELPFUL: If you don't know, admit it or suggest a handover.\n`;
            break;
      }

      // --- 2. TONE & VOICE ---
      p += `\nYOUR VOICE & TONE:\n`;
      if (aiBrandVoice === "formal") {
         p += `- Formal, Corporate, Respectful. Use 'Anda' (ID) or 'Sir/Madam' (EN). No emojis.\n`;
      } else if (aiBrandVoice === "luxury") {
         p += `- Elegant, Minimalist, Exclusive. Use sophisticated vocabulary. Rare emojis only.\n`;
      } else if (aiBrandVoice === "expert") {
         p += `- Technical, Educational, Authoritative. Explain the 'Why'.\n`;
      } else if (aiBrandVoice === "funny") {
         p += `- Witty, Humorous, Playful. Use memes/jokes if appropriate. Make them smile.\n`;
      } else {
         p += `- Casual, Friendly, Chatty. Use 'Kak/Gan' (ID). Use emojis to match the vibe.\n`;
      }

      // --- 3. LANGUAGE INSTRUCTION ---
      p += `\nLANGUAGE PROTOCOLS:\n`;
      if (aiLanguage === "id") {
          p += `- PRIMARY LANGUAGE: Bahasa Indonesia.\n`;
          p += `- Style: Natural Indonesian (mixed formal/informal as appropriate for the tone).\n`;
          p += `- Terms: Use 'Kak' or 'Gan' for casual, 'Bapak/Ibu' for formal.\n`;
      } else if (aiLanguage === "ms") {
          p += `- PRIMARY LANGUAGE: Bahasa Malaysia.\n`;
          p += `- Style: Natural Malay communication.\n`;
      } else {
          p += `- PRIMARY LANGUAGE: English.\n`;
      }

      return p;
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
