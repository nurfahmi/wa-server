/**
 * Universal AI Service
 * Works with multiple AI providers through a unified interface
 * Supports OpenAI, DeepSeek, Claude, Gemini, Groq, and more
 */

import axios from "axios";
import { AIProvider, AIModel } from "../models/index.js";
import config from "../config/config.js";

class UniversalAIService {
  constructor(defaultProvider = "openai", defaultModel = null) {
    this.defaultProvider = defaultProvider;
    this.defaultModel = defaultModel;
    this.requestCount = 0;
    this.totalCost = 0;
    this.stats = {
      requests: 0,
      tokens: { input: 0, output: 0 },
      costs: { total: 0, byProvider: {} },
    };
  }

  /**
   * Send a chat completion request to any AI provider
   * @param {Array} messages - Array of message objects
   * @param {Object} options - Request options
   * @returns {Object} AI response
   */
  async chatCompletion(messages, options = {}) {
    const {
      provider = this.defaultProvider,
      model = this.defaultModel,
      maxTokens = 1000,
      temperature = 0.7,
      stream = false,
    } = options;

    try {
      // Get provider and model configuration from database
      const providerConfig = await AIProvider.findOne({
        where: { providerId: provider, enabled: true },
        include: [
          {
            model: AIModel,
            as: "models",
            where: { enabled: true },
            required: false,
          },
        ],
      });

      if (!providerConfig) {
        throw new Error(`Provider '${provider}' not found or disabled`);
      }

      // Check if API key is configured in database, if not, try environment variables as fallback
      if (!providerConfig.isApiKeyConfigured()) {
        // Fallback to environment variables
        let envApiKey = null;
        
        switch (provider) {
          case "openai":
            envApiKey = config.aiProviders.openai?.apiKey || config.openai?.apiKey;
            break;
          case "deepseek":
            envApiKey = config.aiProviders.deepseek?.apiKey;
            break;
          case "claude":
            envApiKey = config.aiProviders.claude?.apiKey;
            break;
          case "google":
          case "gemini":
            envApiKey = config.aiProviders.gemini?.apiKey;
            break;
          case "groq":
            envApiKey = config.aiProviders.groq?.apiKey;
            break;
        }
        
        if (envApiKey && envApiKey.trim().length > 0) {
          // Use environment variable as fallback
          console.log(`[AI-SERVICE] Using environment variable API key for provider '${provider}'`);
          providerConfig.apiKey = envApiKey;
        } else {
          throw new Error(
            `API key not configured for provider '${provider}'. ` +
            `Please set it in the database (via admin API) or environment variable (${provider.toUpperCase()}_API_KEY)`
          );
        }
      }

      // Find the model
      let selectedModel = null;
      if (model) {
        selectedModel = providerConfig.models.find((m) => m.modelId === model);
      }
      if (!selectedModel && providerConfig.models.length > 0) {
        // Use default model or first available
        selectedModel =
          providerConfig.models.find((m) => m.isDefault) ||
          providerConfig.models[0];
      }

      if (!selectedModel) {
        throw new Error(`No valid model found for provider '${provider}'`);
      }

      // Build model configuration
      const modelConfig = {
        provider: providerConfig.providerId,
        model: selectedModel.modelId,
        name: selectedModel.name,
        baseURL: providerConfig.baseURL,
        requestFormat: providerConfig.requestFormat,
        headers: providerConfig.getHeaders(),
        pricing: {
          input: parseFloat(selectedModel.inputPricing),
          output: parseFloat(selectedModel.outputPricing),
        },
      };

      // Build request based on provider format
      const requestData = this.buildRequest(messages, modelConfig, {
        maxTokens,
        temperature,
        stream,
      });

      // Make API request
      const response = await this.makeRequest(modelConfig, requestData);

      // Parse response based on provider format
      const parsedResponse = this.parseResponse(response.data, modelConfig);

      // Statistics tracking removed as requested

      return parsedResponse;
    } catch (error) {
      console.error(`[AI-SERVICE] Error with ${provider}:`, error.message);
      throw new Error(`AI request failed: ${error.message}`);
    }
  }

  /**
   * Build request data based on provider format
   * @param {Array} messages - Messages array
   * @param {Object} modelConfig - Model configuration
   * @param {Object} options - Request options
   * @returns {Object} Request data
   */
  buildRequest(messages, modelConfig, options) {
    const { requestFormat, model } = modelConfig;
    const { maxTokens, temperature, stream } = options;

    switch (requestFormat) {
      case "openai":
        // OpenAI, DeepSeek, Groq format
        return {
          model: model,
          messages: messages,
          max_tokens: maxTokens,
          temperature: temperature,
          stream: stream,
        };

      case "anthropic":
        // Claude format
        const systemMessage = messages.find((m) => m.role === "system");
        const conversationMessages = messages.filter(
          (m) => m.role !== "system"
        );

        return {
          model: model,
          max_tokens: maxTokens,
          temperature: temperature,
          system: systemMessage ? systemMessage.content : undefined,
          messages: conversationMessages,
        };

      case "gemini":
        // Google Gemini format
        const contents = messages.map((msg) => ({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        }));

        return {
          contents: contents,
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: temperature,
          },
        };

      default:
        throw new Error(`Unsupported request format: ${requestFormat}`);
    }
  }

  /**
   * Make HTTP request to AI provider
   * @param {Object} modelConfig - Model configuration
   * @param {Object} requestData - Request data
   * @returns {Object} HTTP response
   */
  async makeRequest(modelConfig, requestData) {
    const { baseURL, headers, requestFormat, model } = modelConfig;

    let url = baseURL;

    // Build endpoint URL based on provider
    switch (requestFormat) {
      case "openai":
        url += "/chat/completions";
        break;
      case "anthropic":
        url += "/messages";
        break;
      case "gemini":
        // For Gemini, API key goes in URL
        const apiKey =
          headers.Authorization?.replace("Bearer ", "") ||
          headers["x-goog-api-key"] ||
          Object.values(headers).find(
            (h) => h && typeof h === "string" && h.startsWith("AIza")
          );
        url += `/models/${model}:generateContent?key=${apiKey}`;
        break;
    }

    const config = {
      method: "POST",
      url: url,
      headers: headers,
      data: requestData,
      timeout: 30000, // 30 second timeout
    };

    return await axios(config);
  }

  /**
   * Parse response based on provider format
   * @param {Object} responseData - Raw response data
   * @param {Object} modelConfig - Model configuration
   * @returns {Object} Parsed response
   */
  parseResponse(responseData, modelConfig) {
    const { requestFormat, provider, model } = modelConfig;

    switch (requestFormat) {
      case "openai":
        // OpenAI, DeepSeek, Groq format
        const choice = responseData.choices[0];
        return {
          content: choice.message.content,
          finishReason: choice.finish_reason,
          usage: responseData.usage,
          provider: provider,
          model: model,
          raw: responseData,
        };

      case "anthropic":
        // Claude format
        return {
          content: responseData.content[0].text,
          finishReason: responseData.stop_reason,
          usage: {
            prompt_tokens: responseData.usage.input_tokens,
            completion_tokens: responseData.usage.output_tokens,
            total_tokens:
              responseData.usage.input_tokens +
              responseData.usage.output_tokens,
          },
          provider: provider,
          model: model,
          raw: responseData,
        };

      case "gemini":
        // Gemini format
        const candidate = responseData.candidates[0];
        return {
          content: candidate.content.parts[0].text,
          finishReason: candidate.finishReason,
          usage: {
            prompt_tokens: responseData.usageMetadata?.promptTokenCount || 0,
            completion_tokens:
              responseData.usageMetadata?.candidatesTokenCount || 0,
            total_tokens: responseData.usageMetadata?.totalTokenCount || 0,
          },
          provider: provider,
          model: model,
          raw: responseData,
        };

      default:
        throw new Error(`Unsupported response format: ${requestFormat}`);
    }
  }

  /**
   * Update usage statistics
   * @param {string} provider - Provider name
   * @param {string} model - Model name
   * @param {Object} response - Parsed response
   * @param {Object} pricing - Pricing information
   */
  updateStats(provider, model, response, pricing = {}) {
    // Statistics tracking removed
  }

  /**
   * Get usage statistics
   * @returns {Object} Usage statistics
   */
  getStats() {
    return {
      ...this.stats,
      averageCostPerRequest:
        this.stats.requests > 0
          ? this.stats.costs.total / this.stats.requests
          : 0,
      formattedTotalCost: `$${this.stats.costs.total.toFixed(6)} USD`,
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      requests: 0,
      tokens: { input: 0, output: 0 },
      costs: { total: 0, byProvider: {} },
    };
  }

  /**
   * Test connection to a provider
   * @param {string} provider - Provider name
   * @param {string} model - Model name (optional)
   * @returns {Object} Test result
   */
  async testProvider(provider, model = null) {
    try {
      const testMessages = [
        {
          role: "user",
          content:
            'Hello! Please respond with just "OK" to confirm the connection.',
        },
      ];

      const response = await this.chatCompletion(testMessages, {
        provider: provider,
        model: model,
        maxTokens: 10,
        temperature: 0,
      });

      return {
        success: true,
        provider: provider,
        model: response.model,
        response: response.content,
        latency: Date.now() - Date.now(), // Would need proper timing
        cost: {
          total: 0, // Would need pricing info to calculate
          formatted: "$0.000000 USD",
        },
      };
    } catch (error) {
      return {
        success: false,
        provider: provider,
        error: error.message,
      };
    }
  }

  /**
   * Compare multiple providers with the same prompt
   * @param {Array} messages - Messages to send
   * @param {Array} providers - Array of provider configs [{provider, model}, ...]
   * @returns {Array} Comparison results
   */
  async compareProviders(messages, providers) {
    const results = [];

    for (const providerConfig of providers) {
      const startTime = Date.now();

      try {
        const response = await this.chatCompletion(messages, {
          provider: providerConfig.provider,
          model: providerConfig.model,
          maxTokens: 1000,
          temperature: 0.7,
        });

        const endTime = Date.now();
        const latency = endTime - startTime;

        results.push({
          provider: providerConfig.provider,
          model: response.model,
          success: true,
          response: response.content,
          latency: latency,
          usage: response.usage,
          cost: {
            total: 0, // Would need pricing info to calculate
            formatted: "$0.000000 USD",
          },
        });
      } catch (error) {
        results.push({
          provider: providerConfig.provider,
          model: providerConfig.model,
          success: false,
          error: error.message,
          latency: Date.now() - startTime,
        });
      }
    }

    return results;
  }
}

export default UniversalAIService;
