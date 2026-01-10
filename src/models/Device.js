import { DataTypes } from "sequelize";
import config from "../config/config.js";
import crypto from "crypto";

export default (sequelize) => {
  const Device = sequelize.define(
    "Device",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "User ID who owns this device (matches User.id)",
      },
      sessionId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      alias: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      phoneNumber: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      apiKey: {
        type: DataTypes.STRING(64),
        allowNull: true,
        unique: true,
      },
      status: {
        type: DataTypes.ENUM(
          "pending",
          "connecting",
          "synchronizing",
          "connected",
          "disconnected",
          "disconnecting",
          "error",
          "auth_failed",
          "logged_out",
          "reconnecting",
          "conflict",
          "deleted"
        ),
        defaultValue: "pending",
      },
      lastConnection: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        get() {
          const date = this.getDataValue("lastConnection");
          return date
            ? new Date(
                date.toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
              )
            : null;
        },
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      lastError: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      // Webhook Settings
      webhookEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      webhookUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      webhookEvents: {
        type: DataTypes.TEXT,
        get() {
          const raw = this.getDataValue("webhookEvents");
          return raw ? JSON.parse(raw) : ["message", "connection", "qr"];
        },
        set(value) {
          this.setDataValue("webhookEvents", JSON.stringify(value));
        },
      },
      // AI Settings integrated directly
      aiEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      aiAutoReply: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      aiBotName: {
        type: DataTypes.STRING,
        defaultValue: "Assistant",
      },
      aiRules: {
        type: DataTypes.TEXT,
        get() {
          const raw = this.getDataValue("aiRules");
          return raw ? JSON.parse(raw) : config.ai.defaultRules;
        },
        set(value) {
          this.setDataValue("aiRules", JSON.stringify(value));
        },
      },
      aiTriggers: {
        type: DataTypes.TEXT,
        get() {
          const raw = this.getDataValue("aiTriggers");
          return raw ? JSON.parse(raw) : config.ai.defaultTriggers;
        },
        set(value) {
          this.setDataValue("aiTriggers", JSON.stringify(value));
        },
      },
      aiPromptTemplate: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      aiMaxTokens: {
        type: DataTypes.INTEGER,
        defaultValue: config.openai.maxTokens || 500,
      },
      aiTemperature: {
        type: DataTypes.FLOAT,
        defaultValue: 0.7,
      },
      // Conversation Memory Settings
      aiConversationMemoryEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      aiMaxHistoryLength: {
        type: DataTypes.INTEGER,
        defaultValue: 10,
      },
      aiConversationExpiryDays: {
        type: DataTypes.INTEGER,
        defaultValue: 1, // 1 day by default
      },
      // Language Settings
      aiLanguage: {
        type: DataTypes.STRING(2),
        defaultValue: "id", // Default to Bahasa Indonesia
        allowNull: false,
      },
      // Trigger Requirements
      aiTriggerRequired: {
        type: DataTypes.BOOLEAN,
        defaultValue: false, // Default to false - triggers are optional
        allowNull: false,
      },
      // Product Knowledge - Structured JSON format stored as TEXT
      // Structure: { items: [{name, description, price, promo}], otherDescription: "" }
      productKnowledge: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
          const raw = this.getDataValue("productKnowledge");
          if (!raw || raw === "" || raw === "null") return { items: [], otherDescription: "" };
          // Handle legacy text format (non-JSON string)
          if (typeof raw === "string") {
            try {
              const parsed = JSON.parse(raw);
              if (typeof parsed === "object" && !Array.isArray(parsed)) {
                return {
                  items: Array.isArray(parsed.items) ? parsed.items : [],
                  otherDescription: parsed.otherDescription || "",
                };
              }
              return { items: [], otherDescription: "" };
            } catch (e) {
              // Legacy plain text format
              return { items: [], otherDescription: raw };
            }
          }
          // Already parsed object (MySQL JSON type returns object)
          if (typeof raw === "object" && !Array.isArray(raw)) {
            return {
              items: Array.isArray(raw.items) ? raw.items : [],
              otherDescription: raw.otherDescription || "",
            };
          }
          return { items: [], otherDescription: "" };
        },
        set(value) {
          // Normalize and serialize to JSON string
          if (!value) {
            this.setDataValue("productKnowledge", JSON.stringify({ items: [], otherDescription: "" }));
          } else if (typeof value === "string") {
            // Check if it's already valid JSON
            try {
              JSON.parse(value);
              this.setDataValue("productKnowledge", value);
            } catch (e) {
              // Legacy format - convert to structured
              this.setDataValue("productKnowledge", JSON.stringify({ items: [], otherDescription: value }));
            }
          } else if (typeof value === "object") {
            // Ensure proper structure
            this.setDataValue("productKnowledge", JSON.stringify({
              items: Array.isArray(value.items) ? value.items : [],
              otherDescription: value.otherDescription || "",
            }));
          } else {
            this.setDataValue("productKnowledge", JSON.stringify({ items: [], otherDescription: "" }));
          }
        },
      },
      // Sales Scripts - Structured JSON format stored as TEXT
      // Structure: { items: [{name, response}], detailedResponse: "" }
      salesScripts: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
          const raw = this.getDataValue("salesScripts");
          if (!raw || raw === "" || raw === "null") return { items: [], detailedResponse: "" };
          // Handle legacy text format (non-JSON string)
          if (typeof raw === "string") {
            try {
              const parsed = JSON.parse(raw);
              if (typeof parsed === "object" && !Array.isArray(parsed)) {
                return {
                  items: Array.isArray(parsed.items) ? parsed.items : [],
                  detailedResponse: parsed.detailedResponse || "",
                };
              }
              return { items: [], detailedResponse: "" };
            } catch (e) {
              // Legacy plain text format
              return { items: [], detailedResponse: raw };
            }
          }
          // Already parsed object (MySQL JSON type returns object)
          if (typeof raw === "object" && !Array.isArray(raw)) {
            return {
              items: Array.isArray(raw.items) ? raw.items : [],
              detailedResponse: raw.detailedResponse || "",
            };
          }
          return { items: [], detailedResponse: "" };
        },
        set(value) {
          // Normalize and serialize to JSON string
          if (!value) {
            this.setDataValue("salesScripts", JSON.stringify({ items: [], detailedResponse: "" }));
          } else if (typeof value === "string") {
            // Check if it's already valid JSON
            try {
              JSON.parse(value);
              this.setDataValue("salesScripts", value);
            } catch (e) {
              // Legacy format - convert to structured
              this.setDataValue("salesScripts", JSON.stringify({ items: [], detailedResponse: value }));
            }
          } else if (typeof value === "object") {
            // Ensure proper structure
            this.setDataValue("salesScripts", JSON.stringify({
              items: Array.isArray(value.items) ? value.items : [],
              detailedResponse: value.detailedResponse || "",
            }));
          } else {
            this.setDataValue("salesScripts", JSON.stringify({ items: [], detailedResponse: "" }));
          }
        },
      },
      // Business Type
      businessType: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      // Upsell Strategies
      upsellStrategies: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      // Objection Handling
      objectionHandling: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // AI Provider Settings
      aiProvider: {
        type: DataTypes.STRING(50),
        defaultValue: "openai",
        allowNull: false,
      },
      aiModel: {
        type: DataTypes.STRING(100),
        allowNull: true, // Will use default from provider config if null
      },
      aiFallbackProvider: {
        type: DataTypes.STRING(50),
        defaultValue: "deepseek",
        allowNull: true,
      },
      aiFallbackModel: {
        type: DataTypes.STRING(100),
        allowNull: true, // Will use default from fallback provider if null
      },
      // Enhanced Business Settings
      aiBrandVoice: {
        type: DataTypes.STRING,
        defaultValue: "casual", // casual, formal, expert, luxury
      },
      aiBusinessFAQ: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
          const raw = this.getDataValue("aiBusinessFAQ");
          return raw ? JSON.parse(raw) : { items: [] };
        },
        set(value) {
          this.setDataValue("aiBusinessFAQ", JSON.stringify(value));
        },
      },
      aiProductCatalog: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
          const raw = this.getDataValue("aiProductCatalog");
          return raw ? JSON.parse(raw) : { items: [] };
        },
        set(value) {
          this.setDataValue("aiProductCatalog", JSON.stringify(value));
        },
      },
      aiPrimaryGoal: {
        type: DataTypes.STRING,
        defaultValue: "conversion", // conversion, leads, support
      },
      aiOperatingHours: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
          const raw = this.getDataValue("aiOperatingHours");
          return raw ? JSON.parse(raw) : { enabled: false, schedule: {} };
        },
        set(value) {
          this.setDataValue("aiOperatingHours", JSON.stringify(value));
        },
      },
      aiBoundariesEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      aiHandoverTriggers: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
          const raw = this.getDataValue("aiHandoverTriggers");
          return raw ? JSON.parse(raw) : ["human", "agent", "bantuan", "tolong"];
        },
        set(value) {
          this.setDataValue("aiHandoverTriggers", JSON.stringify(value));
        },
      },
      aiBusinessProfile: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
          const raw = this.getDataValue("aiBusinessProfile");
          return raw ? JSON.parse(raw) : { name: "", category: "", logo: "", description: "" };
        },
        set(value) {
          this.setDataValue("aiBusinessProfile", JSON.stringify(value));
        },
      },
      aiBusinessAddress: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
          const raw = this.getDataValue("aiBusinessAddress");
          return raw ? JSON.parse(raw) : { street: "", city: "", state: "", zip: "", country: "" };
        },
        set(value) {
          this.setDataValue("aiBusinessAddress", JSON.stringify(value));
        },
      },
    },
    {
      timestamps: true,
      indexes: [
        {
          fields: ["userId"],
        },
        // Note: sessionId index removed - already has unique: true in column definition
        {
          fields: ["userId", "alias"],
          unique: true,
          name: "unique_user_device_alias",
        },
        {
          fields: ["createdAt"],
        },
      ],
      hooks: {
        beforeCreate: async (device) => {
          // Generate a random 64-character hexadecimal API key
          if (!device.apiKey) {
            device.apiKey = crypto.randomBytes(32).toString("hex");
          }
        },
      },
    }
  );

  return Device;
};
