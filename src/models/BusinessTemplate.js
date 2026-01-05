import { DataTypes } from "sequelize";

export default (sequelize) => {
  const BusinessTemplate = sequelize.define(
    "BusinessTemplate",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      businessType: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Type of business (ecommerce, restaurant, healthcare, etc.)",
      },
      language: {
        type: DataTypes.STRING(2),
        allowNull: false,
        defaultValue: "id",
        comment: "Language code (id, en, ms)",
      },
      botName: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Name of the AI assistant",
      },
      prompt: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: "AI system prompt template",
      },
      // Product Knowledge - Structured JSON format
      // Structure: { items: [{name, description, price, promo}], otherDescription: "" }
      productKnowledge: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: { items: [], otherDescription: "" },
        comment: "Product knowledge base template - structured format",
        get() {
          const raw = this.getDataValue("productKnowledge");
          if (!raw) return { items: [], otherDescription: "" };
          
          // Parse JSON string if needed (SQLite/MySQL may store as string)
          let parsed = raw;
          if (typeof raw === "string") {
            try {
              parsed = JSON.parse(raw);
            } catch (e) {
              // If parsing fails, treat as legacy text format
              return { items: [], otherDescription: raw };
            }
          }
          
          // Handle legacy text format (plain string after parsing)
          if (typeof parsed === "string") {
            return { items: [], otherDescription: parsed };
          }
          
          // Ensure it has the correct structure
          if (typeof parsed === "object" && !Array.isArray(parsed)) {
            return {
              items: Array.isArray(parsed.items) ? parsed.items : [],
              otherDescription: parsed.otherDescription || "",
            };
          }
          return { items: [], otherDescription: "" };
        },
        set(value) {
          // Normalize before saving
          if (!value) {
            this.setDataValue("productKnowledge", { items: [], otherDescription: "" });
          } else if (typeof value === "string") {
            // Legacy format - convert to structured
            this.setDataValue("productKnowledge", { items: [], otherDescription: value });
          } else if (typeof value === "object") {
            // Ensure proper structure
            this.setDataValue("productKnowledge", {
              items: Array.isArray(value.items) ? value.items : [],
              otherDescription: value.otherDescription || "",
            });
          } else {
            this.setDataValue("productKnowledge", { items: [], otherDescription: "" });
          }
        },
      },
      // Sales Scripts - Structured JSON format
      // Structure: { items: [{name, response}], detailedResponse: "" }
      salesScripts: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: { items: [], detailedResponse: "" },
        comment: "Sales scripts and responses template - structured format",
        get() {
          const raw = this.getDataValue("salesScripts");
          if (!raw) return { items: [], detailedResponse: "" };
          
          // Parse JSON string if needed (SQLite/MySQL may store as string)
          let parsed = raw;
          if (typeof raw === "string") {
            try {
              parsed = JSON.parse(raw);
            } catch (e) {
              // If parsing fails, treat as legacy text format
              return { items: [], detailedResponse: raw };
            }
          }
          
          // Handle legacy text format (plain string after parsing)
          if (typeof parsed === "string") {
            return { items: [], detailedResponse: parsed };
          }
          
          // Ensure it has the correct structure
          if (typeof parsed === "object" && !Array.isArray(parsed)) {
            return {
              items: Array.isArray(parsed.items) ? parsed.items : [],
              detailedResponse: parsed.detailedResponse || "",
            };
          }
          return { items: [], detailedResponse: "" };
        },
        set(value) {
          // Normalize before saving
          if (!value) {
            this.setDataValue("salesScripts", { items: [], detailedResponse: "" });
          } else if (typeof value === "string") {
            // Legacy format - convert to structured
            this.setDataValue("salesScripts", { items: [], detailedResponse: value });
          } else if (typeof value === "object") {
            // Ensure proper structure
            this.setDataValue("salesScripts", {
              items: Array.isArray(value.items) ? value.items : [],
              detailedResponse: value.detailedResponse || "",
            });
          } else {
            this.setDataValue("salesScripts", { items: [], detailedResponse: "" });
          }
        },
      },
      businessRules: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Business rules and guidelines",
      },
      triggers: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Comma-separated trigger words",
      },
      // Advanced features
      customerSegmentation: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "Customer segmentation rules and responses",
      },
      upsellStrategies: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "Upselling and cross-selling strategies",
      },
      objectionHandling: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "Common objections and responses",
      },
      faqResponses: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "Frequently asked questions and answers",
      },
      seasonalPromotions: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "Seasonal campaigns and promotions",
      },
      escalationRules: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "When and how to escalate to human agents",
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: "Whether this template is active",
      },
      version: {
        type: DataTypes.STRING,
        defaultValue: "1.0",
        comment: "Template version for updates",
      },
    },
    {
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["businessType", "language"],
          name: "unique_business_language",
        },
        {
          fields: ["businessType"],
        },
        {
          fields: ["language"],
        },
        {
          fields: ["isActive"],
        },
      ],
    }
  );

  return BusinessTemplate;
};
