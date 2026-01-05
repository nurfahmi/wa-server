/**
 * AI Providers Configuration
 * Supports multiple AI providers with different models, pricing, and capabilities
 *
 * Usage:
 * const { getAIProvider, switchProvider } = require('./config/aiProviders');
 * const provider = getAIProvider('openai'); // or 'deepseek', 'claude', etc.
 */

const aiProviders = {
  // OpenAI Configuration
  openai: {
    name: "OpenAI",
    enabled: true,
    baseURL: "https://api.openai.com/v1",
    apiKey: process.env.OPENAI_API_KEY,
    models: {
      "gpt-3.5-turbo": {
        name: "GPT-3.5 Turbo",
        maxTokens: 4096,
        contextWindow: 16385,
        pricing: {
          input: 0.001, // per 1K tokens
          output: 0.002, // per 1K tokens
          currency: "USD",
        },
        capabilities: ["chat", "completion"],
        recommended: "budget",
      },
      "gpt-4o": {
        name: "GPT-4o",
        maxTokens: 4096,
        contextWindow: 128000,
        pricing: {
          input: 0.0025,
          output: 0.01,
          currency: "USD",
        },
        capabilities: ["chat", "completion", "vision"],
        recommended: "premium",
      },
      "gpt-4o-mini": {
        name: "GPT-4o Mini",
        maxTokens: 16384,
        contextWindow: 128000,
        pricing: {
          input: 0.00015,
          output: 0.0006,
          currency: "USD",
        },
        capabilities: ["chat", "completion"],
        recommended: "balanced",
      },
    },
    defaultModel: "gpt-3.5-turbo",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    requestFormat: "openai", // Standard OpenAI format
  },

  // DeepSeek Configuration
  deepseek: {
    name: "DeepSeek",
    enabled: true,
    baseURL: "https://api.deepseek.com/v1",
    apiKey: process.env.DEEPSEEK_API_KEY,
    models: {
      "deepseek-chat": {
        name: "DeepSeek Chat",
        maxTokens: 4096,
        contextWindow: 32768,
        pricing: {
          input: 0.00014, // Extremely cheap!
          output: 0.00028,
          currency: "USD",
        },
        capabilities: ["chat", "completion"],
        recommended: "budget",
      },
      "deepseek-coder": {
        name: "DeepSeek Coder",
        maxTokens: 4096,
        contextWindow: 16384,
        pricing: {
          input: 0.00014,
          output: 0.00028,
          currency: "USD",
        },
        capabilities: ["chat", "completion", "coding"],
        recommended: "coding",
      },
    },
    defaultModel: "deepseek-chat",
    headers: {
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      "Content-Type": "application/json",
    },
    requestFormat: "openai", // Compatible with OpenAI format
  },

  // Anthropic Claude Configuration
  claude: {
    name: "Anthropic Claude",
    enabled: true,
    baseURL: "https://api.anthropic.com/v1",
    apiKey: process.env.ANTHROPIC_API_KEY,
    models: {
      "claude-3-5-sonnet-20241022": {
        name: "Claude 3.5 Sonnet",
        maxTokens: 8192,
        contextWindow: 200000,
        pricing: {
          input: 0.003,
          output: 0.015,
          currency: "USD",
        },
        capabilities: ["chat", "completion", "analysis"],
        recommended: "premium",
      },
      "claude-3-haiku-20240307": {
        name: "Claude 3 Haiku",
        maxTokens: 4096,
        contextWindow: 200000,
        pricing: {
          input: 0.00025,
          output: 0.00125,
          currency: "USD",
        },
        capabilities: ["chat", "completion"],
        recommended: "budget",
      },
    },
    defaultModel: "claude-3-5-sonnet-20241022",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    requestFormat: "anthropic", // Different format from OpenAI
  },

  // Google Gemini Configuration
  gemini: {
    name: "Google Gemini",
    enabled: true,
    baseURL: "https://generativelanguage.googleapis.com/v1beta",
    apiKey: process.env.GEMINI_API_KEY,
    models: {
      "gemini-1.5-pro": {
        name: "Gemini 1.5 Pro",
        maxTokens: 8192,
        contextWindow: 2000000, // 2M tokens!
        pricing: {
          input: 0.00125,
          output: 0.005,
          currency: "USD",
        },
        capabilities: ["chat", "completion", "vision", "multimodal"],
        recommended: "premium",
      },
      "gemini-1.5-flash": {
        name: "Gemini 1.5 Flash",
        maxTokens: 8192,
        contextWindow: 1000000,
        pricing: {
          input: 0.000075,
          output: 0.0003,
          currency: "USD",
        },
        capabilities: ["chat", "completion"],
        recommended: "balanced",
      },
    },
    defaultModel: "gemini-1.5-flash",
    headers: {
      "Content-Type": "application/json",
    },
    requestFormat: "gemini", // Google's format
  },

  // Groq Configuration (Fast inference)
  groq: {
    name: "Groq",
    enabled: true,
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: process.env.GROQ_API_KEY,
    models: {
      "llama-3.1-70b-versatile": {
        name: "Llama 3.1 70B",
        maxTokens: 8192,
        contextWindow: 131072,
        pricing: {
          input: 0.00059,
          output: 0.00079,
          currency: "USD",
        },
        capabilities: ["chat", "completion"],
        recommended: "balanced",
        speed: "ultra-fast", // Groq's specialty
      },
      "mixtral-8x7b-32768": {
        name: "Mixtral 8x7B",
        maxTokens: 32768,
        contextWindow: 32768,
        pricing: {
          input: 0.00024,
          output: 0.00024,
          currency: "USD",
        },
        capabilities: ["chat", "completion"],
        recommended: "budget",
      },
    },
    defaultModel: "llama-3.1-70b-versatile",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    requestFormat: "openai", // Compatible with OpenAI format
  },
};

/**
 * Get AI provider configuration
 * @param {string} providerName - Name of the provider (openai, deepseek, claude, etc.)
 * @returns {object} Provider configuration
 */
function getAIProvider(providerName = "openai") {
  const provider = aiProviders[providerName.toLowerCase()];

  if (!provider) {
    throw new Error(
      `AI provider '${providerName}' not found. Available providers: ${Object.keys(
        aiProviders
      ).join(", ")}`
    );
  }

  if (!provider.enabled) {
    throw new Error(`AI provider '${providerName}' is disabled`);
  }

  if (!provider.apiKey) {
    throw new Error(
      `API key not found for provider '${providerName}'. Please set the environment variable.`
    );
  }

  return provider;
}

/**
 * Get all available providers
 * @returns {object} All provider configurations
 */
function getAllProviders() {
  return aiProviders;
}

/**
 * Get enabled providers only
 * @returns {object} Enabled provider configurations
 */
function getEnabledProviders() {
  const enabled = {};
  Object.keys(aiProviders).forEach((key) => {
    if (aiProviders[key].enabled && aiProviders[key].apiKey) {
      enabled[key] = aiProviders[key];
    }
  });
  return enabled;
}

/**
 * Get model information for a provider
 * @param {string} providerName - Provider name
 * @param {string} modelName - Model name (optional, returns default if not specified)
 * @returns {object} Model configuration
 */
function getModel(providerName, modelName = null) {
  const provider = getAIProvider(providerName);
  const targetModel = modelName || provider.defaultModel;

  if (!provider.models[targetModel]) {
    throw new Error(
      `Model '${targetModel}' not found for provider '${providerName}'. Available models: ${Object.keys(
        provider.models
      ).join(", ")}`
    );
  }

  return {
    provider: providerName,
    model: targetModel,
    config: provider.models[targetModel],
    headers: provider.headers,
    baseURL: provider.baseURL,
    requestFormat: provider.requestFormat,
  };
}

/**
 * Calculate estimated cost for a request
 * @param {string} providerName - Provider name
 * @param {string} modelName - Model name
 * @param {number} inputTokens - Number of input tokens
 * @param {number} outputTokens - Number of output tokens
 * @returns {object} Cost breakdown
 */
function calculateCost(providerName, modelName, inputTokens, outputTokens) {
  const model = getModel(providerName, modelName);
  const pricing = model.config.pricing;

  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;
  const totalCost = inputCost + outputCost;

  return {
    provider: providerName,
    model: modelName,
    inputTokens,
    outputTokens,
    costs: {
      input: inputCost,
      output: outputCost,
      total: totalCost,
      currency: pricing.currency,
    },
    formatted: `$${totalCost.toFixed(6)} ${pricing.currency}`,
  };
}

/**
 * Get recommended models by use case
 * @param {string} useCase - Use case: 'budget', 'balanced', 'premium', 'coding'
 * @returns {array} Recommended models
 */
function getRecommendedModels(useCase = "balanced") {
  const recommendations = [];

  Object.keys(aiProviders).forEach((providerName) => {
    const provider = aiProviders[providerName];
    if (!provider.enabled || !provider.apiKey) return;

    Object.keys(provider.models).forEach((modelName) => {
      const model = provider.models[modelName];
      if (model.recommended === useCase) {
        recommendations.push({
          provider: providerName,
          model: modelName,
          name: model.name,
          pricing: model.pricing,
          capabilities: model.capabilities,
        });
      }
    });
  });

  // Sort by cost (input + output average)
  recommendations.sort((a, b) => {
    const costA = (a.pricing.input + a.pricing.output) / 2;
    const costB = (b.pricing.input + b.pricing.output) / 2;
    return costA - costB;
  });

  return recommendations;
}

/**
 * Validate provider configuration
 * @param {string} providerName - Provider name
 * @returns {object} Validation result
 */
function validateProvider(providerName) {
  try {
    const provider = getAIProvider(providerName);
    return {
      valid: true,
      provider: providerName,
      hasApiKey: !!provider.apiKey,
      modelsCount: Object.keys(provider.models).length,
      defaultModel: provider.defaultModel,
    };
  } catch (error) {
    return {
      valid: false,
      provider: providerName,
      error: error.message,
    };
  }
}

module.exports = {
  // Main functions
  getAIProvider,
  getAllProviders,
  getEnabledProviders,
  getModel,

  // Utility functions
  calculateCost,
  getRecommendedModels,
  validateProvider,

  // Constants
  PROVIDERS: Object.keys(aiProviders),
  USE_CASES: ["budget", "balanced", "premium", "coding"],
};
