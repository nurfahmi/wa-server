import "dotenv/config";

export default {
  port: process.env.PORT || 3000,
  wsPort: process.env.WS_PORT || 3001,
  apiToken: process.env.API_TOKEN || "your-secret-api-token",
  adminToken: process.env.ADMIN_TOKEN || "your-secret-admin-token",
  environment: process.env.NODE_ENV || "development",
  database: {
    // MySQL configuration
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT) || 3306,
    username: process.env.DB_USERNAME || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_DATABASE || "waserver",
    dialect: "mysql",
    saveMessages: process.env.SAVE_MESSAGES !== "false",
    saveContacts: process.env.SAVE_CONTACTS === "true",
    timezone: "+07:00", // Jakarta timezone offset (fixes MySQL2 warning)
    dialectOptions: {
      charset: "utf8mb4",
    },
    define: {
      charset: "utf8mb4",
      timestamps: true,
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
  },
  // Multi-Provider AI Configuration
  aiProviders: {
    // Provider API Keys
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
    },
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY,
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
    },
    claude: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022",
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
    },
    groq: {
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || "llama-3.1-70b-versatile",
    },

    // Provider Settings
    defaultProvider: process.env.AI_DEFAULT_PROVIDER || "openai",
    fallbackProvider: process.env.AI_FALLBACK_PROVIDER || "deepseek",
    maxRetries: parseInt(process.env.AI_MAX_RETRIES || "3"),

    // Cost Controls
    costTracking: process.env.AI_COST_TRACKING !== "false",
    dailyCostLimit: parseFloat(process.env.AI_DAILY_COST_LIMIT || "10.00"),
    monthlyCostLimit: parseFloat(process.env.AI_MONTHLY_COST_LIMIT || "100.00"),
    costAlertThreshold: parseFloat(
      process.env.AI_COST_ALERT_THRESHOLD || "5.00"
    ),

    // Performance Settings
    requestTimeout: parseInt(process.env.AI_REQUEST_TIMEOUT || "30000"),
    concurrentRequests: parseInt(process.env.AI_CONCURRENT_REQUESTS || "5"),
    rateLimitRequests: parseInt(process.env.AI_RATE_LIMIT_REQUESTS || "100"),
    rateLimitWindow: parseInt(process.env.AI_RATE_LIMIT_WINDOW || "60000"),

    // Quality Settings
    temperature: parseFloat(process.env.AI_TEMPERATURE || "0.7"),
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || "1000"),
    topP: parseFloat(process.env.AI_TOP_P || "1.0"),

    // Auto-switching
    autoSwitchOnError: process.env.AI_AUTO_SWITCH_ON_ERROR !== "false",
    autoSwitchOnRateLimit: process.env.AI_AUTO_SWITCH_ON_RATE_LIMIT !== "false",
    switchBackDelay: parseInt(process.env.AI_SWITCH_BACK_DELAY || "300000"),

    // Security
    encryptionKey:
      process.env.AI_KEYS_ENCRYPTION_KEY ||
      "default-key-please-change-in-production",
  },

  // Legacy OpenAI support (for backward compatibility)
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || "500"),
  },

  ai: {
    defaultRules: [
      "Be persuasive, confident, and solution-focused in every response",
      "Lead with benefits and value propositions, not questions",
      "Create excitement and urgency about products/services",
      "Use positive, action-oriented language that builds trust",
      "Provide immediate solutions rather than asking many questions",
      "End every response with a clear call-to-action or next step",
      "Focus on how offerings will improve the customer's life",
      "Use social proof and guarantees to overcome objections",
      "Don't share personal information or generate harmful content",
      "Respect user privacy while maximizing sales conversion",
    ],
    defaultTriggers: ["@ai", "@bot", "@assistant"],
    autoReplyEnabled: process.env.AI_AUTO_REPLY === "true",
    // Conversation Memory Settings
    memoryRetentionHours: parseInt(
      process.env.AI_MEMORY_RETENTION_HOURS || "48"
    ), // 48 hours default
    maxHistoryMessages: parseInt(process.env.AI_MAX_HISTORY_MESSAGES || "20"), // 20 exchanges default
    memoryCleanupInterval: parseInt(
      process.env.AI_MEMORY_CLEANUP_INTERVAL || "3600"
    ), // 1 hour in seconds
    conversationMemoryEnabled: process.env.AI_CONVERSATION_MEMORY !== "false", // Enabled by default
    // Natural Reply Settings
    naturalReply: {
      enabled: process.env.AI_NATURAL_REPLY !== "false", // Enabled by default
      markAsRead: process.env.AI_MARK_AS_READ !== "false", // Mark messages as read
      showTyping: process.env.AI_SHOW_TYPING !== "false", // Show typing indicator
      baseDelay: parseInt(process.env.AI_BASE_DELAY || "1000"), // Base delay in ms
      charDelay: parseInt(process.env.AI_CHAR_DELAY || "50"), // Delay per character in ms
      maxDelay: parseInt(process.env.AI_MAX_DELAY || "5000"), // Maximum delay in ms
      minDelay: parseInt(process.env.AI_MIN_DELAY || "500"), // Minimum delay in ms
    },
  },

  // Warmer System Configuration
  warmer: {
    enabled: process.env.WARMER_ENABLED !== "false", // Enabled by default
    autoStartCampaigns: process.env.WARMER_AUTO_START_CAMPAIGNS !== "false", // Auto-start enabled by default
  },

  // Bunny.net Storage Configuration
  bunny: {
    apiKey: process.env.BUNNY_STORAGE_API_KEY,
    storageZoneName: process.env.BUNNY_STORAGE_ZONE_NAME,
    storageRegion: process.env.BUNNY_STORAGE_REGION || "ny", // ny, la, sg, syd, uk, de, etc.
    pullZoneUrl: process.env.BUNNY_PULL_ZONE_URL || "", // base URL for public access
    folder: process.env.BUNNY_FOLDER || "whatsapp-media",
  },
};
