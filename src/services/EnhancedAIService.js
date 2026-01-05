/**
 * Enhanced AI Service with Cost Tracking
 * Integrates UniversalAIService with database cost tracking and limits
 */

import UniversalAIService from "./UniversalAIService.js";
import { AIProvider, AIModel } from "../models/index.js";

class EnhancedAIService extends UniversalAIService {
  constructor(db) {
    super();
    this.db = db;
    this.Device = db.Device;
    this.AIUsageLog = db.AIUsageLog;
    this.AICostAlert = db.AICostAlert;
  }

  /**
   * Send AI request with cost tracking and limits
   * @param {Object} device - Device configuration
   * @param {Array} messages - Chat messages
   * @param {string} chatId - Chat ID for tracking
   * @param {Object} options - Request options
   * @returns {Object} AI response with cost tracking
   */
  async sendWithTracking(device, messages, chatId, options = {}) {
    const startTime = Date.now();
    let usageLog = null;

    try {
      // Get device AI settings
      const aiConfig = this.getDeviceAIConfig(device);

      // Check cost limits before making request
      if (aiConfig.costTrackingEnabled) {
        const canProceed = await this.checkCostLimits(device.id, aiConfig);
        if (!canProceed.allowed) {
          throw new Error(`Cost limit exceeded: ${canProceed.reason}`);
        }
      }

      // Determine provider and model
      const provider = options.provider || aiConfig.provider;
      const model = options.model || aiConfig.model;

      // Create initial usage log entry
      usageLog = await this.AIUsageLog.create({
        deviceId: device.id,
        sessionId: device.sessionId,
        chatId: chatId,
        provider: provider,
        model: model || "default",
        success: false,
      });

      // Make AI request
      const response = await this.chatCompletion(messages, {
        provider: provider,
        model: model,
        maxTokens: aiConfig.maxTokens,
        temperature: aiConfig.temperature,
        ...options,
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Calculate actual cost (pricing info comes from database)
      // For now, use a simple calculation - this will be enhanced in chatCompletion
      const inputTokens = response.usage.prompt_tokens || 0;
      const outputTokens = response.usage.completion_tokens || 0;
      const totalCost = 0.000001 * (inputTokens + outputTokens); // Default fallback

      const cost = {
        costs: { total: totalCost },
        formatted: `$${totalCost.toFixed(6)} USD`,
      };

      // Update usage log with success data
      await usageLog.update({
        model: response.model,
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
        costUSD: cost.costs.total,
        responseTime: responseTime,
        success: true,
        messagePreview: response.content.substring(0, 200),
      });

      // Check if we need to create cost alerts
      if (aiConfig.costTrackingEnabled) {
        await this.checkAndCreateAlerts(device.id, aiConfig, cost.costs.total);
      }

      // Log success
      console.log(
        `[AI-ENHANCED] ${provider}/${response.model} - Cost: ${cost.formatted}, Time: ${responseTime}ms`
      );

      return {
        ...response,
        cost: cost,
        responseTime: responseTime,
        usageLogId: usageLog.id,
      };
    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Update usage log with error
      if (usageLog) {
        await usageLog.update({
          success: false,
          errorMessage: error.message,
          responseTime: responseTime,
        });
      }

      console.error(
        `[AI-ENHANCED] Error: ${error.message}, Time: ${responseTime}ms`
      );
      throw error;
    }
  }

  /**
   * Get device AI configuration
   * @param {Object} device - Device model instance
   * @returns {Object} AI configuration
   */
  getDeviceAIConfig(device) {
    return {
      provider: device.aiProvider || "openai",
      model: device.aiModel || null,
      fallbackProvider: device.aiFallbackProvider || "deepseek",
      maxTokens: device.aiMaxTokens || 500,
      temperature: device.aiTemperature || 0.7,
      costTrackingEnabled: device.aiCostTrackingEnabled !== false,
      dailyLimit: device.aiCostLimitDaily || 1.0,
      monthlyLimit: device.aiCostLimitMonthly || 20.0,
      alertThreshold: device.aiCostAlertThreshold || 0.8,
    };
  }

  /**
   * Check if device is within cost limits
   * @param {number} deviceId - Device ID
   * @param {Object} aiConfig - AI configuration
   * @returns {Object} {allowed: boolean, reason?: string}
   */
  async checkCostLimits(deviceId, aiConfig) {
    try {
      // Get today's costs
      const today = new Date();
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      const todayCosts = await this.AIUsageLog.getTotalCostByDevice(
        deviceId,
        startOfDay,
        endOfDay
      );

      // Check daily limit
      if (todayCosts.totalCost >= aiConfig.dailyLimit) {
        return {
          allowed: false,
          reason: `Daily limit of $${
            aiConfig.dailyLimit
          } exceeded (current: $${todayCosts.totalCost.toFixed(6)})`,
        };
      }

      // Get this month's costs
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0,
        23,
        59,
        59
      );

      const monthlyCosts = await this.AIUsageLog.getTotalCostByDevice(
        deviceId,
        startOfMonth,
        endOfMonth
      );

      // Check monthly limit
      if (monthlyCosts.totalCost >= aiConfig.monthlyLimit) {
        return {
          allowed: false,
          reason: `Monthly limit of $${
            aiConfig.monthlyLimit
          } exceeded (current: $${monthlyCosts.totalCost.toFixed(6)})`,
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error("[AI-ENHANCED] Error checking cost limits:", error);
      // Default to allowing request if we can't check limits
      return { allowed: true };
    }
  }

  /**
   * Check and create cost alerts if thresholds are reached
   * @param {number} deviceId - Device ID
   * @param {Object} aiConfig - AI configuration
   * @param {number} newCost - Cost of the new request
   */
  async checkAndCreateAlerts(deviceId, aiConfig, newCost) {
    try {
      const today = new Date();
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      // Get current daily costs
      const todayCosts = await this.AIUsageLog.getTotalCostByDevice(
        deviceId,
        startOfDay,
        endOfDay
      );

      const dailyThreshold = aiConfig.dailyLimit * aiConfig.alertThreshold;

      // Check daily threshold
      if (todayCosts.totalCost >= dailyThreshold) {
        const dateStr = today.toISOString().split("T")[0];

        // Check if alert already exists for today
        const existingAlert = await this.AICostAlert.findOne({
          where: {
            deviceId: deviceId,
            alertType: "daily_threshold",
            period: dateStr,
            resolved: false,
          },
        });

        if (!existingAlert) {
          await this.AICostAlert.create({
            deviceId: deviceId,
            alertType: "daily_threshold",
            currentCost: todayCosts.totalCost,
            limitAmount: dailyThreshold,
            period: dateStr,
          });

          console.log(
            `[AI-ALERT] Daily threshold alert for device ${deviceId}: $${todayCosts.totalCost.toFixed(
              6
            )}/$${dailyThreshold.toFixed(6)}`
          );
        }
      }

      // Similar check for monthly limits
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0,
        23,
        59,
        59
      );

      const monthlyCosts = await this.AIUsageLog.getTotalCostByDevice(
        deviceId,
        startOfMonth,
        endOfMonth
      );

      const monthlyThreshold = aiConfig.monthlyLimit * aiConfig.alertThreshold;

      if (monthlyCosts.totalCost >= monthlyThreshold) {
        const monthStr = `${today.getFullYear()}-${String(
          today.getMonth() + 1
        ).padStart(2, "0")}`;

        const existingMonthlyAlert = await this.AICostAlert.findOne({
          where: {
            deviceId: deviceId,
            alertType: "monthly_threshold",
            period: monthStr,
            resolved: false,
          },
        });

        if (!existingMonthlyAlert) {
          await this.AICostAlert.create({
            deviceId: deviceId,
            alertType: "monthly_threshold",
            currentCost: monthlyCosts.totalCost,
            limitAmount: monthlyThreshold,
            period: monthStr,
          });

          console.log(
            `[AI-ALERT] Monthly threshold alert for device ${deviceId}: $${monthlyCosts.totalCost.toFixed(
              6
            )}/$${monthlyThreshold.toFixed(6)}`
          );
        }
      }
    } catch (error) {
      console.error("[AI-ENHANCED] Error creating cost alerts:", error);
    }
  }

  /**
   * Get cost analytics for a device
   * @param {number} deviceId - Device ID
   * @param {number} days - Number of days to analyze
   * @returns {Object} Cost analytics
   */
  async getCostAnalytics(deviceId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const endDate = new Date();

      const [totalCosts, providerCosts, dailyCosts] = await Promise.all([
        this.AIUsageLog.getTotalCostByDevice(deviceId, startDate, endDate),
        this.AIUsageLog.getCostByProvider(deviceId, startDate, endDate),
        this.AIUsageLog.getDailyCosts(deviceId, days),
      ]);

      // Get current month costs
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyCosts = await this.AIUsageLog.getTotalCostByDevice(
        deviceId,
        startOfMonth,
        endDate
      );

      // Get today's costs
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
      const todayCosts = await this.AIUsageLog.getTotalCostByDevice(
        deviceId,
        startOfDay,
        endDate
      );

      return {
        summary: {
          totalCost: totalCosts.totalCost,
          totalRequests: totalCosts.totalRequests,
          totalTokens: totalCosts.totalTokens,
          averageCostPerRequest:
            totalCosts.totalRequests > 0
              ? totalCosts.totalCost / totalCosts.totalRequests
              : 0,
          period: `${days} days`,
        },
        current: {
          todayCost: todayCosts.totalCost,
          todayRequests: todayCosts.totalRequests,
          monthlyCost: monthlyCosts.totalCost,
          monthlyRequests: monthlyCosts.totalRequests,
        },
        byProvider: providerCosts,
        dailyTrend: dailyCosts,
      };
    } catch (error) {
      console.error("[AI-ENHANCED] Error getting cost analytics:", error);
      return null;
    }
  }

  /**
   * Test provider with cost tracking
   * @param {number} deviceId - Device ID
   * @param {string} provider - Provider name
   * @param {string} model - Model name
   * @returns {Object} Test result with cost
   */
  async testProviderWithTracking(deviceId, provider, model = null) {
    try {
      const device = await this.Device.findByPk(deviceId);
      if (!device) {
        throw new Error("Device not found");
      }

      const testMessages = [
        { role: "user", content: 'Test connection - please respond with "OK"' },
      ];

      const result = await this.sendWithTracking(
        device,
        testMessages,
        "test_connection",
        {
          provider: provider,
          model: model,
          maxTokens: 10,
        }
      );

      return {
        success: true,
        provider: result.provider,
        model: result.model,
        response: result.content,
        cost: result.cost.formatted,
        responseTime: result.responseTime,
      };
    } catch (error) {
      return {
        success: false,
        provider: provider,
        model: model,
        error: error.message,
      };
    }
  }

  /**
   * Get available providers for a device
   * @param {number} deviceId - Device ID
   * @returns {Object} Available providers with pricing
   */
  async getAvailableProviders(deviceId = null) {
    try {
      const enabledProviders = await AIProvider.findAll({
        where: { enabled: true },
        include: [
          {
            model: AIModel,
            as: "models",
            where: { enabled: true },
            required: false,
          },
        ],
        order: [
          ["priority", "ASC"],
          ["createdAt", "ASC"],
        ],
      });

      const providers = {};

      for (const provider of enabledProviders) {
        providers[provider.providerId] = {
          name: provider.name,
          models: provider.models.map((model) => ({
            id: model.modelId,
            name: model.name,
            isDefault: model.isDefault,
            inputPricing: model.inputPricing,
            outputPricing: model.outputPricing,
          })),
          defaultModel:
            provider.models.find((m) => m.isDefault)?.modelId ||
            (provider.models.length > 0 ? provider.models[0].modelId : null),
          available: provider.isApiKeyConfigured(),
        };
      }

      return providers;
    } catch (error) {
      console.error("[AI-ENHANCED] Error getting available providers:", error);
      return {};
    }
  }
}

export default EnhancedAIService;
