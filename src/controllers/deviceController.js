import { Device, AIUsageLog, sequelize, AIProvider, AIModel } from "../models/index.js";
import WhatsAppService from "../services/WhatsAppService.js";
import AIService from "../services/AIService.js";
import { Op } from "sequelize";
import { getJakartaTime } from "../utils/timeHelper.js";
import config from "../config/config.js";

// Create new device and start WhatsApp session
export const createDevice = async (req, res) => {
  try {
    const { userId, alias, phoneNumber } = req.body;

    if (!userId || !alias) {
      return res.status(400).json({
        error: "User ID and alias are required",
      });
    }

    // Validate userId format (should be UUID or string)
    if (typeof userId !== "string" || userId.trim().length === 0) {
      return res.status(400).json({
        error: "User ID must be a valid string (UUID format recommended)",
      });
    }

    // Check if device already exists
    const existingDevice = await Device.findOne({
      where: { userId, alias },
    });

    if (existingDevice) {
      return res.status(409).json({
        error: "Device with this alias already exists for this user",
        device: existingDevice,
      });
    }

    // Start WhatsApp session (this will create the device record)
    const result = await WhatsAppService.createSession(
      userId,
      alias,
      phoneNumber
    );

    // Get the newly created device
    const device = await Device.findOne({
      where: { sessionId: result.sessionId },
      attributes: { include: ["apiKey"] }, // Explicitly include API key
    });

    res.json({
      message: "Device creation and session initialization started",
      device: {
        ...device.toJSON(),
        apiKey: device.apiKey, // Ensure API key is included in response
      },
      qr: result.qr,
      wsEndpoint: result.wsEndpoint,
    });
  } catch (error) {
    console.error("Error creating device:", error);
    res.status(500).json({
      error: error.message,
      details: error.stack,
    });
  }
};

// Get all devices for a user with their connection status
export const getUserDevices = async (req, res) => {
  try {
    const { userId } = req.params;
    const devices = await Device.findAll({
      where: { userId },
      order: [["lastConnection", "DESC"]],
    });

    // Enhance with real-time connection status
    const devicesWithStatus = devices.map((device) => ({
      ...device.toJSON(),
      isConnected: WhatsAppService.isSessionActive(device.sessionId),
    }));

    res.json({ devices: devicesWithStatus });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single device with current status
export const getDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = await Device.findByPk(deviceId);

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    // Get current WhatsApp connection status
    const isConnected = WhatsAppService.isSessionActive(device.sessionId);
    const qr = await WhatsAppService.getCurrentQR(device.sessionId);

    res.json({
      device: {
        ...device.toJSON(),
        isConnected,
        qr: qr || null,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update device metadata
export const updateDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { alias, phoneNumber, description } = req.body;

    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    // Only update allowed fields
    if (alias) device.alias = alias;
    if (phoneNumber !== undefined) device.phoneNumber = phoneNumber;
    if (description !== undefined) device.description = description;

    await device.save();

    res.json({ device });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Connect/Reconnect device to WhatsApp
export const connectDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = await Device.findByPk(deviceId);

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    // Start or restart WhatsApp session using correct parameters (userId, alias)
    const result = await WhatsAppService.createSession(
      device.userId,
      device.alias,
      device.phoneNumber
    );

    device.status = "connecting";
    await device.save();

    res.json({
      message: "Device connection initiated",
      qr: result.qr,
      device,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Logout device from WhatsApp (clear session but keep device record)
export const logoutDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = await Device.findByPk(deviceId);

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    // Logout from WhatsApp session and clear auth credentials
    await WhatsAppService.logoutSessionWithAuthClear(device.sessionId);

    device.status = "logged_out";
    await device.save();

    res.json({
      message:
        "Device logged out successfully. Auth cleared - new QR code required for login.",
      device,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Login device to WhatsApp (works for both new login and relogin)
export const loginDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = await Device.findByPk(deviceId);

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    // Reset QR attempts for manual login (allow user to retry after timeout)
    console.log(
      `[LOGIN] Resetting QR attempts for device ${deviceId} (manual login)`
    );
    WhatsAppService.resetQRAttempts(device.sessionId);

    let result;

    // If device is connected, force relogin (new QR)
    if (device.status === "connected") {
      result = await WhatsAppService.reloginSession(device.sessionId);
      console.log(`Relogin initiated for connected device ${deviceId}`);
    } else {
      // For logged_out or other statuses, start fresh session
      result = await WhatsAppService.restoreSession(device.sessionId, device);
      console.log(
        `Login initiated for device ${deviceId} with status: ${device.status}`
      );
    }

    device.status = "connecting";
    await device.save();

    // Get current QR code (it might be generated asynchronously)
    let qrCode = null;
    try {
      // Wait a moment for QR generation
      await new Promise((resolve) => setTimeout(resolve, 2000));
      qrCode = await WhatsAppService.getCurrentQR(device.sessionId);
    } catch (qrError) {
      console.warn(
        `Could not get QR code for ${device.sessionId}:`,
        qrError.message
      );
    }

    // Provide WebSocket endpoint for real-time updates
    const wsEndpoint = `ws://localhost:3001/?token=test123`;

    res.json({
      message: "Device login initiated. Scan QR code to connect.",
      device,
      qr: qrCode,
      wsEndpoint: wsEndpoint,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete device and cleanup WhatsApp session
export const deleteDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = await Device.findByPk(deviceId);

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    // Try to close WhatsApp session if exists (don't fail if already closed)
    try {
      await WhatsAppService.closeSession(device.sessionId);
    } catch (sessionError) {
      // Log the error but continue with device deletion
      console.warn(`Warning during session cleanup for ${device.sessionId}:`, sessionError.message);
    }

    // Delete device record (CASCADE will handle related records via associations)
    // If cascade is not set in DB, we'll get an error and should handle it
    try {
      await device.destroy();
    } catch (deleteError) {
      // If foreign key constraint error, manually delete related records first
      if (deleteError.name === 'SequelizeForeignKeyConstraintError') {
        console.log(`Manually cleaning up related records for device ${deviceId}`);
        
        // Import models dynamically to avoid circular dependency
        const { AIUsageLog, AIConversationMemory, ChatSettings, StoredFile } = await import('../models/index.js');
        
        // Delete related records manually
        await AIUsageLog.destroy({ where: { deviceId } });
        await AIConversationMemory.destroy({ where: { deviceId } });
        await ChatSettings.destroy({ where: { deviceId } });
        await StoredFile.destroy({ where: { deviceId } });
        
        // Try to delete device again
        await device.destroy();
      } else {
        throw deleteError;
      }
    }

    res.json({ message: "Device deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get QR code for device pairing
export const getDeviceQR = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = await Device.findByPk(deviceId);

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    const qr = await WhatsAppService.getCurrentQR(device.sessionId);

    if (!qr) {
      return res.status(404).json({
        status: device.status,
        message: "QR code not available",
        device,
      });
    }

    res.json({
      status: device.status,
      qr,
      device,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get AI settings for a device (Simplified - provider/model from environment)
export const getAISettings = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = await Device.findByPk(deviceId);

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    // Get defaults from environment/config
    const envModel = process.env.OPENAI_MODEL || "gpt-3.5-turbo";
    const envTemperature = parseFloat(process.env.AI_TEMPERATURE) || 0.7;
    const envMaxTokens = parseInt(process.env.AI_MAX_TOKENS) || 500;

    res.json({
      // Device info
      userId: device.userId,
      
      // User-configurable settings
      aiEnabled: device.aiEnabled || false,
      aiAutoReply: device.aiAutoReply || false,
      aiBotName: device.aiBotName || "Assistant",
      aiPromptTemplate: device.aiPromptTemplate || "",
      aiLanguage: device.aiLanguage || "id",
      aiTriggers: device.aiTriggers || ["@ai", "@bot"],
      
      // Business context (optional) - structured format
      productKnowledge: device.productKnowledge || { items: [], otherDescription: "" },
      salesScripts: device.salesScripts || { items: [], detailedResponse: "" },
      businessType: device.businessType || "",
      upsellStrategies: device.upsellStrategies || "",
      objectionHandling: device.objectionHandling || "",
      
      // Conversation memory settings
      conversationMemoryEnabled: device.aiConversationMemoryEnabled || false,
      maxHistoryLength: device.aiMaxHistoryLength || 10,
      expiryDays: device.aiConversationExpiryDays || 1,

      // Read-only: From environment (shown for info only)
      _systemDefaults: {
        provider: "openai",
        model: envModel,
        temperature: envTemperature,
        maxTokens: envMaxTokens,
        note: "Provider, model, and temperature are configured by system administrator"
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update AI settings for a device (Simplified - only user-configurable settings)
export const updateAISettings = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = await Device.findByPk(deviceId);

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    // Only allow user-configurable settings (provider/model/temperature from env)
    const updates = {
      // Core AI settings
      aiEnabled: req.body.aiEnabled ?? device.aiEnabled,
      aiAutoReply: req.body.aiAutoReply ?? device.aiAutoReply,
      aiBotName: req.body.aiBotName ?? device.aiBotName,
      aiPromptTemplate: req.body.aiPromptTemplate ?? device.aiPromptTemplate,
      aiLanguage: req.body.aiLanguage ?? device.aiLanguage,
      aiTriggers: req.body.aiTriggers ?? device.aiTriggers,
      
      // Business context (optional) - structured format
      productKnowledge: req.body.productKnowledge !== undefined 
        ? (typeof req.body.productKnowledge === 'object' 
            ? req.body.productKnowledge 
            : { items: [], otherDescription: req.body.productKnowledge })
        : device.productKnowledge,
      salesScripts: req.body.salesScripts !== undefined
        ? (typeof req.body.salesScripts === 'object'
            ? req.body.salesScripts
            : { items: [], detailedResponse: req.body.salesScripts })
        : device.salesScripts,
      businessType: req.body.businessType ?? device.businessType,
      upsellStrategies: req.body.upsellStrategies ?? device.upsellStrategies,
      objectionHandling: req.body.objectionHandling ?? device.objectionHandling,
      
      // Conversation memory settings
      aiConversationMemoryEnabled:
        typeof req.body.conversationMemoryEnabled === "boolean"
          ? req.body.conversationMemoryEnabled
          : device.aiConversationMemoryEnabled,
      aiMaxHistoryLength:
        req.body.maxHistoryLength !== undefined
          ? Math.max(1, Math.min(50, req.body.maxHistoryLength))
          : device.aiMaxHistoryLength,
      aiConversationExpiryDays:
        req.body.expiryDays !== undefined
          ? Math.max(1, Math.min(30, req.body.expiryDays))
          : device.aiConversationExpiryDays,

      // Provider settings are now fixed to OpenAI from environment
      aiProvider: "openai",
      aiModel: null, // Will use env default
      aiFallbackProvider: "openai",
      aiFallbackModel: null,
    };

    await device.update(updates);

    // Get environment defaults for response
    const envModel = process.env.OPENAI_MODEL || "gpt-3.5-turbo";
    const envTemperature = parseFloat(process.env.AI_TEMPERATURE) || 0.7;
    const envMaxTokens = parseInt(process.env.AI_MAX_TOKENS) || 500;

    // Reload device to get updated values with proper getters
    await device.reload();
    
    res.json({
      message: "AI settings updated successfully",
      settings: {
        aiEnabled: device.aiEnabled,
        aiAutoReply: device.aiAutoReply,
        aiBotName: device.aiBotName,
        aiPromptTemplate: device.aiPromptTemplate,
        aiLanguage: device.aiLanguage,
        aiTriggers: device.aiTriggers,
        productKnowledge: device.productKnowledge || { items: [], otherDescription: "" },
        salesScripts: device.salesScripts || { items: [], detailedResponse: "" },
        businessType: device.businessType,
        upsellStrategies: device.upsellStrategies,
        objectionHandling: device.objectionHandling,
        conversationMemoryEnabled: device.aiConversationMemoryEnabled,
        maxHistoryLength: device.aiMaxHistoryLength,
        expiryDays: device.aiConversationExpiryDays,
      },
      _systemDefaults: {
        provider: "openai",
        model: envModel,
        temperature: envTemperature,
        maxTokens: envMaxTokens,
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get webhook settings for a device
export const getWebhookSettings = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = await Device.findByPk(deviceId);

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    res.json({
      webhookUrl: device.webhookUrl || "",
      webhookEvents: device.webhookEvents || [],
      webhookEnabled: device.webhookEnabled || false,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update webhook settings for a device
export const updateWebhookSettings = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = await Device.findByPk(deviceId);

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    const webhookSettings = {
      webhookUrl: req.body.webhookUrl ?? device.webhookUrl,
      webhookEvents: req.body.webhookEvents ?? device.webhookEvents,
      webhookEnabled: req.body.webhookEnabled ?? device.webhookEnabled,
    };

    await device.update(webhookSettings);

    res.json({
      message: "Webhook settings updated successfully",
      settings: webhookSettings,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all sessions
export const getSessions = async (req, res) => {
  try {
    const devices = await Device.findAll({
      attributes: [
        "id",
        "sessionId",
        "userId",
        "alias",
        "status",
        "lastConnection",
        "phoneNumber",
      ],
      where: {
        status: {
          [Op.ne]: "deleted",
        },
      },
      order: [["lastConnection", "DESC"]],
    });

    res.json({
      success: true,
      sessions: devices,
    });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch sessions",
    });
  }
};

// Cancel session
export const cancelSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const device = await Device.findOne({ where: { sessionId } });

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    // Cancel WhatsApp session (preserves device record)
    await WhatsAppService.cancelSession(device.sessionId);

    // Update device status
    await device.update({
      status: "disconnected",
      lastError: "Session cancelled by user",
      lastConnection: getJakartaTime(),
    });

    res.json({
      message: "Session cancelled successfully",
      device,
    });
  } catch (error) {
    console.error("Error cancelling session:", error);
    res.status(500).json({ error: error.message });
  }
};

// Test AI response for a device
export const testAI = async (req, res) => {
  try {
    const { deviceId, message } = req.body;

    if (!deviceId || !message) {
      return res.status(400).json({
        error: "Device ID and message are required",
      });
    }

    // Get device details
    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    // Create AI service instance
    const aiService = new AIService();

    // Prepare AI context from device settings
    const aiContext = {
      deviceId: device.id, // Add missing deviceId for AI service
      sessionId: device.sessionId,
      remoteJid: "test@s.whatsapp.net", // Test JID
      aiEnabled: true,
      autoReply: true, // For testing, enable auto-reply to bypass trigger requirements
      conversationMemoryEnabled: device.aiConversationMemoryEnabled || false,
      maxHistoryLength: device.aiMaxHistoryLength || 10,
      expiryMinutes: (device.aiConversationExpiryDays || 1) * 24 * 60, // Convert days to minutes
      botName: device.aiBotName || device.alias || "Assistant",
      temperature: device.aiTemperature || 0.7,
      maxTokens: device.aiMaxTokens || 500,
      customPrompt: device.aiPromptTemplate,
      customTriggers: [], // For testing, ignore triggers to allow any message
      triggerRequired: false, // For testing, disable trigger requirements
      productKnowledge: device.productKnowledge,
      salesScripts: device.salesScripts,
      aiLanguage: device.aiLanguage || "id",
      rules: device.aiRules,
      isGroup: false,
    };

    // Process message with AI
    const aiResponse = await aiService.processMessage(
      {
        content: message,
        messageType: "text",
        sender: "test@s.whatsapp.net",
        isGroup: false,
      },
      aiContext
    );

    if (aiResponse && aiResponse.content) {
      res.json({
        success: true,
        response: aiResponse.content,
        settings: {
          botName: aiContext.botName,
          temperature: aiContext.temperature,
          maxTokens: aiContext.maxTokens,
          language: aiContext.aiLanguage,
        },
      });
    } else {
      // Return detailed error information if available
      const errorMessage = aiResponse?.error 
        ? `AI Error: ${aiResponse.error}` 
        : "AI did not generate a response. Check if AI provider is configured and API keys are set.";
      res.json({
        success: false,
        message: errorMessage,
        error: aiResponse?.error || null,
        response: null,
      });
    }
  } catch (error) {
    console.error("Error testing AI:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get available AI providers and models
export const getAIProviders = async (req, res) => {
  try {

    // Fetch enabled providers with their models
    const providers = await AIProvider.findAll({
      where: { enabled: true },
      include: [
        {
          model: AIModel,
          as: "models",
          where: { enabled: true },
          required: false,
          attributes: [
            "modelId",
            "name",
            "inputPricing",
            "outputPricing",
            "maxTokens",
            "contextWindow",
            "capabilities",
            "recommended",
            "isDefault",
            "priority",
          ],
        },
      ],
      order: [
        ["priority", "ASC"],
        [{ model: AIModel, as: "models" }, "priority", "ASC"],
      ],
    });

    // Transform data for frontend consumption
    const providersData = providers.map((provider) => ({
      id: provider.providerId,
      name: provider.name,
      enabled: provider.enabled,
      apiKeyConfigured: provider.isApiKeyConfigured(),
      models: provider.models.map((model) => ({
        id: model.modelId,
        name: model.name,
        pricing: {
          input: `$${parseFloat(model.inputPricing).toFixed(6)}/1K tokens`,
          output: `$${parseFloat(model.outputPricing).toFixed(6)}/1K tokens`,
        },
        maxTokens: model.maxTokens,
        contextWindow: model.contextWindow,
        capabilities: model.capabilities,
        recommended: model.recommended,
        isDefault: model.isDefault,
      })),
      defaultModel:
        provider.models.find((m) => m.isDefault)?.modelId ||
        provider.models[0]?.modelId,
    }));

    res.json({
      success: true,
      providers: providersData,
    });
  } catch (error) {
    console.error("Error fetching AI providers:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch AI providers",
    });
  }
};

// Get global AI cost statistics (admin only)
export const getGlobalAICosts = async (req, res) => {
  try {

    // Get date ranges
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Daily costs
    const dailyCosts = await AIUsageLog.findOne({
      attributes: [
        [sequelize.fn("SUM", sequelize.col("costUSD")), "totalCost"],
        [
          sequelize.fn("SUM", sequelize.col("promptTokens")),
          "totalInputTokens",
        ],
        [
          sequelize.fn("SUM", sequelize.col("completionTokens")),
          "totalOutputTokens",
        ],
      ],
      where: {
        createdAt: {
          [Op.gte]: startOfDay,
        },
        success: true,
      },
    });

    // Monthly costs
    const monthlyCosts = await AIUsageLog.findOne({
      attributes: [
        [sequelize.fn("SUM", sequelize.col("costUSD")), "totalCost"],
        [
          sequelize.fn("SUM", sequelize.col("promptTokens")),
          "totalInputTokens",
        ],
        [
          sequelize.fn("SUM", sequelize.col("completionTokens")),
          "totalOutputTokens",
        ],
      ],
      where: {
        createdAt: {
          [Op.gte]: startOfMonth,
        },
        success: true,
      },
    });

    // Provider breakdown (monthly)
    const providerBreakdown = await AIUsageLog.findAll({
      attributes: [
        "provider",
        "model",
        [sequelize.fn("SUM", sequelize.col("costUSD")), "totalCost"],
        [sequelize.fn("COUNT", sequelize.col("id")), "requestCount"],
      ],
      where: {
        createdAt: {
          [Op.gte]: startOfMonth,
        },
        success: true,
      },
      group: ["provider", "model"],
      order: [[sequelize.fn("SUM", sequelize.col("costUSD")), "DESC"]],
    });

    // Recent usage (last 24 hours)
    const recentUsage = await AIUsageLog.findAll({
      attributes: [
        "provider",
        "model",
        "costUSD",
        "promptTokens",
        "completionTokens",
        "createdAt",
      ],
      where: {
        createdAt: {
          [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
        success: true,
      },
      order: [["createdAt", "DESC"]],
      limit: 50,
    });

    res.json({
      success: true,
      costs: {
        daily: {
          totalCost: parseFloat(dailyCosts?.dataValues?.totalCost || 0),
          totalInputTokens: parseInt(
            dailyCosts?.dataValues?.totalInputTokens || 0
          ),
          totalOutputTokens: parseInt(
            dailyCosts?.dataValues?.totalOutputTokens || 0
          ),
        },
        monthly: {
          totalCost: parseFloat(monthlyCosts?.dataValues?.totalCost || 0),
          totalInputTokens: parseInt(
            monthlyCosts?.dataValues?.totalInputTokens || 0
          ),
          totalOutputTokens: parseInt(
            monthlyCosts?.dataValues?.totalOutputTokens || 0
          ),
        },
        providerBreakdown: providerBreakdown.map((item) => ({
          provider: item.provider,
          model: item.model,
          totalCost: parseFloat(item.dataValues.totalCost),
          requestCount: parseInt(item.dataValues.requestCount),
        })),
        recentUsage: recentUsage,
      },
    });
  } catch (error) {
    console.error("Error fetching global AI costs:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch AI cost statistics",
    });
  }
};
