import { Device, AIProvider, AIModel, AIUsageLog, AICostAlert } from "../models/index.js";
import { Op } from "sequelize";

// Update AI provider settings for a device (Admin only)
export const updateDeviceAIProvider = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { aiProvider, aiModel, aiFallbackProvider, aiFallbackModel } =
      req.body;

    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    // Validate provider exists if provided
    if (aiProvider) {
      const provider = await AIProvider.findOne({
        where: { providerId: aiProvider, enabled: true },
      });
      if (!provider) {
        return res.status(400).json({
          error: `AI provider '${aiProvider}' not found or disabled`,
        });
      }
    }

    // Validate fallback provider exists if provided
    if (aiFallbackProvider) {
      const fallbackProvider = await AIProvider.findOne({
        where: { providerId: aiFallbackProvider, enabled: true },
      });
      if (!fallbackProvider) {
        return res.status(400).json({
          error: `Fallback AI provider '${aiFallbackProvider}' not found or disabled`,
        });
      }
    }

    // Update AI provider settings
    const updates = {};
    if (aiProvider !== undefined) updates.aiProvider = aiProvider;
    if (aiModel !== undefined) updates.aiModel = aiModel;
    if (aiFallbackProvider !== undefined)
      updates.aiFallbackProvider = aiFallbackProvider;
    if (aiFallbackModel !== undefined)
      updates.aiFallbackModel = aiFallbackModel;

    await device.update(updates);

    res.json({
      success: true,
      message: "AI provider settings updated successfully",
      device: {
        id: device.id,
        sessionId: device.sessionId,
        alias: device.alias,
        aiProvider: device.aiProvider,
        aiModel: device.aiModel,
        aiFallbackProvider: device.aiFallbackProvider,
        aiFallbackModel: device.aiFallbackModel,
      },
    });
  } catch (error) {
    console.error("Error updating AI provider settings:", error);
    res.status(500).json({ error: error.message });
  }
};

// View AI usage logs (Admin only)
export const getAIUsageLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      deviceId,
      provider,
      startDate,
      endDate,
    } = req.query;


    // Build where clause
    const whereClause = {};
    if (deviceId) whereClause.deviceId = deviceId;
    if (provider) whereClause.provider = provider;
    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }

    const offset = (page - 1) * limit;
    const result = await AIUsageLog.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: offset,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Device,
          attributes: ["alias", "sessionId"],
        },
      ],
    });

    res.json({
      success: true,
      logs: result.rows,
      pagination: {
        total: result.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(result.count / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching AI usage logs:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get all device AI settings for admin overview (Admin only)
export const getAllDevicesAISettings = async (req, res) => {
  try {
    const devices = await Device.findAll({
      attributes: [
        "id",
        "userId",
        "sessionId",
        "alias",
        "status",
        "aiProvider",
        "aiModel",
        "aiFallbackProvider",
        "aiFallbackModel",

        "aiEnabled",
        "lastConnection",
      ],
      where: {
        status: { [Op.ne]: "deleted" },
      },
      order: [["lastConnection", "DESC"]],
    });

    res.json({
      success: true,
      devices: devices,
      totalDevices: devices.length,
      enabledDevices: devices.filter((d) => d.aiEnabled).length,
    });
  } catch (error) {
    console.error("Error fetching devices AI settings:", error);
    res.status(500).json({ error: error.message });
  }
};

// Bulk update AI provider settings for multiple devices (Admin only)
export const bulkUpdateAIProvider = async (req, res) => {
  try {
    const {
      deviceIds,
      aiProvider,
      aiModel,
      aiFallbackProvider,
      aiFallbackModel,
    } = req.body;

    if (!deviceIds || !Array.isArray(deviceIds) || deviceIds.length === 0) {
      return res.status(400).json({ error: "deviceIds array is required" });
    }

    // Validate provider exists if provided
    if (aiProvider) {
      const provider = await AIProvider.findOne({
        where: { providerId: aiProvider, enabled: true },
      });
      if (!provider) {
        return res.status(400).json({
          error: `AI provider '${aiProvider}' not found or disabled`,
        });
      }
    }

    // Build update object
    const updates = {};
    if (aiProvider !== undefined) updates.aiProvider = aiProvider;
    if (aiModel !== undefined) updates.aiModel = aiModel;
    if (aiFallbackProvider !== undefined)
      updates.aiFallbackProvider = aiFallbackProvider;
    if (aiFallbackModel !== undefined)
      updates.aiFallbackModel = aiFallbackModel;

    // Update devices
    const [updatedCount] = await Device.update(updates, {
      where: { id: { [Op.in]: deviceIds } },
    });

    res.json({
      success: true,
      message: `Updated AI provider settings for ${updatedCount} devices`,
      updatedCount,
      settings: updates,
    });
  } catch (error) {
    console.error("Error bulk updating AI provider settings:", error);
    res.status(500).json({ error: error.message });
  }
};

// View AI cost alerts (Admin only)
export const getAICostAlerts = async (req, res) => {
  try {
    const { page = 1, limit = 50, deviceId, resolved, alertType } = req.query;


    // Build where clause
    const whereClause = {};
    if (deviceId) whereClause.deviceId = deviceId;
    if (resolved !== undefined) whereClause.resolved = resolved === "true";
    if (alertType) whereClause.alertType = alertType;

    const offset = (page - 1) * limit;
    const result = await AICostAlert.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: offset,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Device,
          attributes: ["alias", "sessionId"],
        },
      ],
    });

    res.json({
      success: true,
      alerts: result.rows,
      pagination: {
        total: result.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(result.count / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching AI cost alerts:", error);
    res.status(500).json({ error: error.message });
  }
};

// Manage AI Providers (Admin only)
export const updateAIProvider = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { enabled, priority, headers, apiKey } = req.body;

    const provider = await AIProvider.findOne({
      where: { providerId },
    });

    if (!provider) {
      return res.status(404).json({ error: "AI provider not found" });
    }

    // Update provider settings
    const updates = {};
    if (enabled !== undefined) updates.enabled = enabled;
    if (priority !== undefined) updates.priority = priority;
    if (headers !== undefined) updates.headers = headers;
    if (apiKey !== undefined) {
      // Allow updating API key (should be encrypted in production)
      updates.apiKey = apiKey.trim();
    }

    await provider.update(updates);

    // Reload to get updated values
    await provider.reload();

    res.json({
      success: true,
      message: "AI provider updated successfully",
      provider: {
        id: provider.id,
        providerId: provider.providerId,
        name: provider.name,
        enabled: provider.enabled,
        priority: provider.priority,
        baseURL: provider.baseURL,
        requestFormat: provider.requestFormat,
        headers: provider.headers,
        apiKeyConfigured: provider.isApiKeyConfigured(),
        // Don't expose the actual API key in response
        createdAt: provider.createdAt,
        updatedAt: provider.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error updating AI provider:", error);
    res.status(500).json({ error: error.message });
  }
};

// Manage AI Models (Admin only)
export const updateAIModel = async (req, res) => {
  try {
    const { modelId } = req.params;
    const {
      enabled,
      inputPricing,
      outputPricing,
      maxTokens,
      contextWindow,
      isDefault,
      priority,
    } = req.body;

    const model = await AIModel.findByPk(modelId);
    if (!model) {
      return res.status(404).json({ error: "AI model not found" });
    }

    // Update model settings
    const updates = {};
    if (enabled !== undefined) updates.enabled = enabled;
    if (inputPricing !== undefined) updates.inputPricing = inputPricing;
    if (outputPricing !== undefined) updates.outputPricing = outputPricing;
    if (maxTokens !== undefined) updates.maxTokens = maxTokens;
    if (contextWindow !== undefined) updates.contextWindow = contextWindow;
    if (isDefault !== undefined) updates.isDefault = isDefault;
    if (priority !== undefined) updates.priority = priority;

    await model.update(updates);

    res.json({
      success: true,
      message: "AI model updated successfully",
      model: model,
    });
  } catch (error) {
    console.error("Error updating AI model:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get all AI providers (Admin only)
export const getAIProviders = async (req, res) => {
  try {
    const providers = await AIProvider.findAll({
      order: [
        ["priority", "ASC"],
        ["createdAt", "ASC"],
      ],
      include: [
        {
          model: AIModel,
          as: "models",
          order: [
            ["priority", "ASC"],
            ["createdAt", "ASC"],
          ],
        },
      ],
    });

    res.json({
      success: true,
      providers: providers,
    });
  } catch (error) {
    console.error("Error fetching AI providers:", error);
    res.status(500).json({ error: error.message });
  }
};

// Create new AI provider (Admin only)
export const createAIProvider = async (req, res) => {
  try {
    const {
      providerId,
      name,
      baseUrl,
      enabled = true,
      priority = 0,
      headers = {},
    } = req.body;

    if (!providerId || !name || !baseUrl) {
      return res.status(400).json({
        error: "providerId, name, and baseUrl are required",
      });
    }

    // Check if provider already exists
    const existingProvider = await AIProvider.findOne({
      where: { providerId },
    });

    if (existingProvider) {
      return res.status(400).json({
        error: `AI provider '${providerId}' already exists`,
      });
    }

    const provider = await AIProvider.create({
      providerId,
      name,
      baseUrl,
      enabled,
      priority,
      headers,
    });

    res.status(201).json({
      success: true,
      message: "AI provider created successfully",
      provider: provider,
    });
  } catch (error) {
    console.error("Error creating AI provider:", error);
    res.status(500).json({ error: error.message });
  }
};

// Delete AI provider (Admin only)
export const deleteAIProvider = async (req, res) => {
  try {
    const { providerId } = req.params;

    const provider = await AIProvider.findOne({
      where: { providerId },
    });

    if (!provider) {
      return res.status(404).json({ error: "AI provider not found" });
    }

    // Check if any devices are using this provider
    const devicesUsingProvider = await Device.count({
      where: {
        [Op.or]: [
          { aiProvider: providerId },
          { aiFallbackProvider: providerId },
        ],
      },
    });

    if (devicesUsingProvider > 0) {
      return res.status(400).json({
        error: `Cannot delete provider '${providerId}'. ${devicesUsingProvider} device(s) are still using it.`,
      });
    }

    await provider.destroy();

    res.json({
      success: true,
      message: "AI provider deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting AI provider:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get all AI models (Admin only)
export const getAIModels = async (req, res) => {
  try {
    const { providerId } = req.query;

    const whereClause = {};
    if (providerId) {
      whereClause.providerId = providerId;
    }

    const models = await AIModel.findAll({
      where: whereClause,
      order: [
        ["priority", "ASC"],
        ["createdAt", "ASC"],
      ],
      include: [
        {
          model: AIProvider,
          as: "provider",
          attributes: ["providerId", "name"],
        },
      ],
    });

    res.json({
      success: true,
      models: models,
    });
  } catch (error) {
    console.error("Error fetching AI models:", error);
    res.status(500).json({ error: error.message });
  }
};

// Create new AI model (Admin only)
export const createAIModel = async (req, res) => {
  try {
    const {
      modelId,
      providerId,
      name,
      enabled = true,
      inputPricing = 0,
      outputPricing = 0,
      maxTokens = 4000,
      contextWindow = 4000,
      isDefault = false,
      priority = 0,
    } = req.body;

    if (!modelId || !providerId || !name) {
      return res.status(400).json({
        error: "modelId, providerId, and name are required",
      });
    }

    // Check if provider exists
    const provider = await AIProvider.findOne({
      where: { providerId },
    });

    if (!provider) {
      return res.status(400).json({
        error: `AI provider '${providerId}' not found`,
      });
    }

    // Check if model already exists
    const existingModel = await AIModel.findOne({
      where: { modelId, providerId },
    });

    if (existingModel) {
      return res.status(400).json({
        error: `AI model '${modelId}' already exists for provider '${providerId}'`,
      });
    }

    const model = await AIModel.create({
      modelId,
      providerId,
      name,
      enabled,
      inputPricing,
      outputPricing,
      maxTokens,
      contextWindow,
      isDefault,
      priority,
    });

    res.status(201).json({
      success: true,
      message: "AI model created successfully",
      model: model,
    });
  } catch (error) {
    console.error("Error creating AI model:", error);
    res.status(500).json({ error: error.message });
  }
};

// Delete AI model (Admin only)
export const deleteAIModel = async (req, res) => {
  try {
    const { modelId } = req.params;

    const model = await AIModel.findByPk(modelId);
    if (!model) {
      return res.status(404).json({ error: "AI model not found" });
    }

    // Check if any devices are using this model
    const devicesUsingModel = await Device.count({
      where: {
        [Op.or]: [
          { aiModel: model.modelId },
          { aiFallbackModel: model.modelId },
        ],
      },
    });

    if (devicesUsingModel > 0) {
      return res.status(400).json({
        error: `Cannot delete model '${model.modelId}'. ${devicesUsingModel} device(s) are still using it.`,
      });
    }

    await model.destroy();

    res.json({
      success: true,
      message: "AI model deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting AI model:", error);
    res.status(500).json({ error: error.message });
  }
};
