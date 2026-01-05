const { AIProvider, AIModel } = require("../models");

/**
 * Seed AI Providers and Models
 * Comprehensive seeder for all major AI providers with current pricing (2024/2025)
 */

async function seedAIProviders() {
  try {
    console.log("🤖 Seeding AI Providers and Models...");

    const providers = [
      {
        providerId: "openai",
        name: "OpenAI",
        enabled: true,
        baseURL: "https://api.openai.com/v1",
        requestFormat: "openai",
        headers: {
          "Content-Type": "application/json",
        },
        priority: 10,
        models: [
          {
            modelId: "gpt-4o",
            name: "GPT-4o",
            enabled: true,
            maxTokens: 4096,
            contextWindow: 128000,
            inputPricing: 0.0025, // $2.50 per 1M tokens
            outputPricing: 0.01, // $10.00 per 1M tokens
            capabilities: ["chat", "completion", "vision", "function_calling"],
            recommended: "balanced",
            isDefault: true,
            priority: 10,
          },
          {
            modelId: "gpt-4o-mini",
            name: "GPT-4o Mini",
            enabled: true,
            maxTokens: 16384,
            contextWindow: 128000,
            inputPricing: 0.00015, // $0.15 per 1M tokens
            outputPricing: 0.0006, // $0.60 per 1M tokens
            capabilities: ["chat", "completion", "vision", "function_calling"],
            recommended: "budget",
            isDefault: false,
            priority: 20,
          },
          {
            modelId: "gpt-4-turbo",
            name: "GPT-4 Turbo",
            enabled: true,
            maxTokens: 4096,
            contextWindow: 128000,
            inputPricing: 0.01, // $10.00 per 1M tokens
            outputPricing: 0.03, // $30.00 per 1M tokens
            capabilities: ["chat", "completion", "vision", "function_calling"],
            recommended: "premium",
            isDefault: false,
            priority: 30,
          },
          {
            modelId: "gpt-3.5-turbo",
            name: "GPT-3.5 Turbo",
            enabled: true,
            maxTokens: 4096,
            contextWindow: 16384,
            inputPricing: 0.0005, // $0.50 per 1M tokens
            outputPricing: 0.0015, // $1.50 per 1M tokens
            capabilities: ["chat", "completion", "function_calling"],
            recommended: "budget",
            isDefault: false,
            priority: 40,
          },
        ],
      },
      {
        providerId: "deepseek",
        name: "DeepSeek",
        enabled: true,
        baseURL: "https://api.deepseek.com/v1",
        requestFormat: "openai",
        headers: {
          "Content-Type": "application/json",
        },
        priority: 20,
        models: [
          {
            modelId: "deepseek-chat",
            name: "DeepSeek Chat (V3)",
            enabled: true,
            maxTokens: 8192,
            contextWindow: 64000,
            inputPricing: 0.00027, // $0.27 per 1M tokens
            outputPricing: 0.0011, // $1.10 per 1M tokens
            capabilities: ["chat", "completion", "function_calling"],
            recommended: "budget",
            isDefault: true,
            priority: 10,
          },
          {
            modelId: "deepseek-reasoner",
            name: "DeepSeek Reasoner (R1)",
            enabled: true,
            maxTokens: 8192,
            contextWindow: 64000,
            inputPricing: 0.00055, // $0.55 per 1M tokens
            outputPricing: 0.00219, // $2.19 per 1M tokens
            capabilities: [
              "chat",
              "completion",
              "reasoning",
              "function_calling",
            ],
            recommended: "balanced",
            isDefault: false,
            priority: 20,
          },
        ],
      },
      {
        providerId: "anthropic",
        name: "Anthropic",
        enabled: true,
        baseURL: "https://api.anthropic.com/v1",
        requestFormat: "anthropic",
        headers: {
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
        },
        priority: 30,
        models: [
          {
            modelId: "claude-3-5-sonnet-20241022",
            name: "Claude 3.5 Sonnet",
            enabled: true,
            maxTokens: 8192,
            contextWindow: 200000,
            inputPricing: 0.003, // $3.00 per 1M tokens
            outputPricing: 0.015, // $15.00 per 1M tokens
            capabilities: ["chat", "completion", "vision", "function_calling"],
            recommended: "balanced",
            isDefault: true,
            priority: 10,
          },
          {
            modelId: "claude-3-5-haiku-20241022",
            name: "Claude 3.5 Haiku",
            enabled: true,
            maxTokens: 8192,
            contextWindow: 200000,
            inputPricing: 0.0008, // $0.80 per 1M tokens
            outputPricing: 0.004, // $4.00 per 1M tokens
            capabilities: ["chat", "completion", "vision", "function_calling"],
            recommended: "budget",
            isDefault: false,
            priority: 20,
          },
          {
            modelId: "claude-3-opus-20240229",
            name: "Claude 3 Opus",
            enabled: true,
            maxTokens: 4096,
            contextWindow: 200000,
            inputPricing: 0.015, // $15.00 per 1M tokens
            outputPricing: 0.075, // $75.00 per 1M tokens
            capabilities: ["chat", "completion", "vision", "function_calling"],
            recommended: "premium",
            isDefault: false,
            priority: 30,
          },
        ],
      },
      {
        providerId: "google",
        name: "Google AI",
        enabled: true,
        baseURL: "https://generativelanguage.googleapis.com/v1beta",
        requestFormat: "gemini",
        headers: {
          "Content-Type": "application/json",
        },
        priority: 40,
        models: [
          {
            modelId: "gemini-1.5-pro",
            name: "Gemini 1.5 Pro",
            enabled: true,
            maxTokens: 8192,
            contextWindow: 2097152, // 2M tokens
            inputPricing: 0.00125, // $1.25 per 1M tokens
            outputPricing: 0.005, // $5.00 per 1M tokens
            capabilities: ["chat", "completion", "vision", "function_calling"],
            recommended: "balanced",
            isDefault: true,
            priority: 10,
          },
          {
            modelId: "gemini-1.5-flash",
            name: "Gemini 1.5 Flash",
            enabled: true,
            maxTokens: 8192,
            contextWindow: 1000000, // 1M tokens
            inputPricing: 0.000075, // $0.075 per 1M tokens
            outputPricing: 0.0003, // $0.30 per 1M tokens
            capabilities: ["chat", "completion", "vision", "function_calling"],
            recommended: "budget",
            isDefault: false,
            priority: 20,
          },
          {
            modelId: "gemini-pro",
            name: "Gemini Pro",
            enabled: true,
            maxTokens: 8192,
            contextWindow: 32768,
            inputPricing: 0.0005, // $0.50 per 1M tokens
            outputPricing: 0.0015, // $1.50 per 1M tokens
            capabilities: ["chat", "completion", "function_calling"],
            recommended: "budget",
            isDefault: false,
            priority: 30,
          },
        ],
      },
      {
        providerId: "groq",
        name: "Groq",
        enabled: true,
        baseURL: "https://api.groq.com/openai/v1",
        requestFormat: "openai",
        headers: {
          "Content-Type": "application/json",
        },
        priority: 50,
        models: [
          {
            modelId: "llama-3.1-70b-versatile",
            name: "Llama 3.1 70B",
            enabled: true,
            maxTokens: 8192,
            contextWindow: 131072,
            inputPricing: 0.00059, // $0.59 per 1M tokens
            outputPricing: 0.00079, // $0.79 per 1M tokens
            capabilities: ["chat", "completion", "function_calling"],
            recommended: "budget",
            isDefault: true,
            priority: 10,
          },
          {
            modelId: "llama-3.1-8b-instant",
            name: "Llama 3.1 8B",
            enabled: true,
            maxTokens: 8192,
            contextWindow: 131072,
            inputPricing: 0.00005, // $0.05 per 1M tokens
            outputPricing: 0.00008, // $0.08 per 1M tokens
            capabilities: ["chat", "completion", "function_calling"],
            recommended: "budget",
            isDefault: false,
            priority: 20,
          },
          {
            modelId: "mixtral-8x7b-32768",
            name: "Mixtral 8x7B",
            enabled: true,
            maxTokens: 32768,
            contextWindow: 32768,
            inputPricing: 0.00024, // $0.24 per 1M tokens
            outputPricing: 0.00024, // $0.24 per 1M tokens
            capabilities: ["chat", "completion", "function_calling"],
            recommended: "budget",
            isDefault: false,
            priority: 30,
          },
        ],
      },
    ];

    let totalCreated = 0;

    for (const providerData of providers) {
      // Extract models from provider data
      const { models, ...providerInfo } = providerData;

      // Check if provider already exists
      let provider = await AIProvider.findOne({
        where: { providerId: providerData.providerId },
      });

      if (!provider) {
        // Create new provider
        provider = await AIProvider.create(providerInfo);
        console.log(`✅ Created provider: ${provider.name}`);
      } else {
        // Update existing provider
        await provider.update(providerInfo);
        console.log(`🔄 Updated provider: ${provider.name}`);
      }

      // Create or update models for this provider
      for (const modelData of models) {
        // Check if model already exists
        let model = await AIModel.findOne({
          where: {
            providerId: provider.id,
            modelId: modelData.modelId,
          },
        });

        if (!model) {
          // Create new model
          model = await AIModel.create({
            ...modelData,
            providerId: provider.id,
          });
          console.log(`  ✅ Created model: ${model.name}`);
          totalCreated++;
        } else {
          // Update existing model
          await model.update(modelData);
          console.log(`  🔄 Updated model: ${model.name}`);
        }
      }
    }

    console.log(`\n🎉 AI Providers and Models seeding completed!`);
    console.log(`📊 Total models processed: ${totalCreated}`);
    console.log(`🔧 Providers: ${providers.length}`);

    // Get final summary
    const allProviders = await AIProvider.findAll({
      include: [
        {
          model: AIModel,
          as: "models",
          where: { enabled: true },
          required: false,
        },
      ],
    });

    console.log(`\n📈 Final provider summary:`);
    allProviders.forEach((provider) => {
      const modelCount = provider.models ? provider.models.length : 0;
      console.log(`🔹 ${provider.name}: ${modelCount} models`);
    });

    return allProviders;
  } catch (error) {
    console.error("❌ Error seeding AI providers and models:", error);
    throw error;
  }
}

// Export the main seeding function
module.exports = {
  seedAIProviders,
};

// Auto-run if called directly
if (require.main === module) {
  (async () => {
    try {
      const { sequelize } = require("../models");
      await sequelize.authenticate();
      console.log("📊 Database connected");

      await seedAIProviders();

      process.exit(0);
    } catch (error) {
      console.error("💥 AI providers seeding failed:", error);
      process.exit(1);
    }
  })();
}
