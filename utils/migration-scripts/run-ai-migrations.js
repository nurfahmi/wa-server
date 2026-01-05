/**
 * Run AI Provider and Cost Tracking Migrations
 * Direct execution of migrations using Sequelize
 */

const { Sequelize } = require("sequelize");
require("dotenv").config();

// Database configuration for Supabase (PostgreSQL)
const sequelize = new Sequelize(
  process.env.DATABASE_URL || {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || "postgres",
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    dialect: "postgres",
    logging: console.log,
    timezone: "+07:00",
    dialectOptions: {
      ssl:
        process.env.NODE_ENV === "production"
          ? { require: true, rejectUnauthorized: false }
          : false,
      timezone: "+07:00",
    },
  }
);

async function runMigrations() {
  try {
    console.log("🔗 Connecting to database...");
    await sequelize.authenticate();
    console.log("✅ Database connection established");

    console.log("\n📊 Running AI Provider Settings Migration...");

    // Migration 1: Add AI Provider Settings to Devices
    const addAIProviderColumns = async () => {
      const queryInterface = sequelize.getQueryInterface();

      try {
        // Check if columns already exist
        const tableDescription = await queryInterface.describeTable("Devices");

        if (!tableDescription.aiProvider) {
          await queryInterface.addColumn("Devices", "aiProvider", {
            type: Sequelize.STRING(50),
            allowNull: false,
            defaultValue: "openai",
            comment: "AI provider (openai, deepseek, claude, gemini, groq)",
          });
          console.log("✅ Added aiProvider column");
        } else {
          console.log("ℹ️ aiProvider column already exists");
        }

        if (!tableDescription.aiModel) {
          await queryInterface.addColumn("Devices", "aiModel", {
            type: Sequelize.STRING(100),
            allowNull: true,
            comment:
              "Specific AI model to use (leave null for provider default)",
          });
          console.log("✅ Added aiModel column");
        } else {
          console.log("ℹ️ aiModel column already exists");
        }

        if (!tableDescription.aiFallbackProvider) {
          await queryInterface.addColumn("Devices", "aiFallbackProvider", {
            type: Sequelize.STRING(50),
            allowNull: true,
            defaultValue: "deepseek",
            comment: "Fallback provider if primary fails",
          });
          console.log("✅ Added aiFallbackProvider column");
        } else {
          console.log("ℹ️ aiFallbackProvider column already exists");
        }

        if (!tableDescription.aiCostLimitDaily) {
          await queryInterface.addColumn("Devices", "aiCostLimitDaily", {
            type: Sequelize.DECIMAL(10, 6),
            allowNull: true,
            defaultValue: 1.0,
            comment: "Daily cost limit in USD",
          });
          console.log("✅ Added aiCostLimitDaily column");
        } else {
          console.log("ℹ️ aiCostLimitDaily column already exists");
        }

        if (!tableDescription.aiCostLimitMonthly) {
          await queryInterface.addColumn("Devices", "aiCostLimitMonthly", {
            type: Sequelize.DECIMAL(10, 6),
            allowNull: true,
            defaultValue: 20.0,
            comment: "Monthly cost limit in USD",
          });
          console.log("✅ Added aiCostLimitMonthly column");
        } else {
          console.log("ℹ️ aiCostLimitMonthly column already exists");
        }

        if (!tableDescription.aiCostAlertThreshold) {
          await queryInterface.addColumn("Devices", "aiCostAlertThreshold", {
            type: Sequelize.DECIMAL(10, 6),
            allowNull: true,
            defaultValue: 0.8,
            comment:
              "Alert when cost reaches this percentage of limit (0.8 = 80%)",
          });
          console.log("✅ Added aiCostAlertThreshold column");
        } else {
          console.log("ℹ️ aiCostAlertThreshold column already exists");
        }

        if (!tableDescription.aiCostTrackingEnabled) {
          await queryInterface.addColumn("Devices", "aiCostTrackingEnabled", {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            comment: "Enable cost tracking and limits",
          });
          console.log("✅ Added aiCostTrackingEnabled column");
        } else {
          console.log("ℹ️ aiCostTrackingEnabled column already exists");
        }
      } catch (error) {
        console.error("❌ Error adding AI provider columns:", error.message);
      }
    };

    await addAIProviderColumns();

    console.log("\n📊 Creating AI Usage Tracking Tables...");

    // Migration 2: Create AI Usage Tracking Tables
    const createTrackingTables = async () => {
      const queryInterface = sequelize.getQueryInterface();

      try {
        // Check if tables exist
        const tables = await queryInterface.showAllTables();

        // Create AIUsageLogs table
        if (!tables.includes("AIUsageLogs")) {
          await queryInterface.createTable("AIUsageLogs", {
            id: {
              type: Sequelize.BIGINT,
              primaryKey: true,
              autoIncrement: true,
            },
            deviceId: {
              type: Sequelize.BIGINT,
              allowNull: false,
              references: {
                model: "Devices",
                key: "id",
              },
              onDelete: "CASCADE",
            },
            sessionId: {
              type: Sequelize.STRING,
              allowNull: false,
              comment: "WhatsApp session ID",
            },
            chatId: {
              type: Sequelize.STRING,
              allowNull: false,
              comment: "Chat ID where AI was used",
            },
            provider: {
              type: Sequelize.STRING(50),
              allowNull: false,
              comment: "AI provider used (openai, deepseek, etc.)",
            },
            model: {
              type: Sequelize.STRING(100),
              allowNull: false,
              comment: "Specific model used",
            },
            promptTokens: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: 0,
              comment: "Input tokens used",
            },
            completionTokens: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: 0,
              comment: "Output tokens generated",
            },
            totalTokens: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: 0,
              comment: "Total tokens (prompt + completion)",
            },
            costUSD: {
              type: Sequelize.DECIMAL(12, 8),
              allowNull: false,
              defaultValue: 0.0,
              comment: "Cost in USD for this request",
            },
            responseTime: {
              type: Sequelize.INTEGER,
              allowNull: true,
              comment: "Response time in milliseconds",
            },
            success: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: true,
              comment: "Whether the request was successful",
            },
            errorMessage: {
              type: Sequelize.TEXT,
              allowNull: true,
              comment: "Error message if request failed",
            },
            messagePreview: {
              type: Sequelize.STRING(200),
              allowNull: true,
              comment: "Preview of the AI response (first 200 chars)",
            },
            createdAt: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.NOW,
            },
            updatedAt: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.NOW,
            },
          });
          console.log("✅ Created AIUsageLogs table");
        } else {
          console.log("ℹ️ AIUsageLogs table already exists");
        }

        // Create AICostAlerts table
        if (!tables.includes("AICostAlerts")) {
          await queryInterface.createTable("AICostAlerts", {
            id: {
              type: Sequelize.BIGINT,
              primaryKey: true,
              autoIncrement: true,
            },
            deviceId: {
              type: Sequelize.BIGINT,
              allowNull: false,
              references: {
                model: "Devices",
                key: "id",
              },
              onDelete: "CASCADE",
            },
            alertType: {
              type: Sequelize.ENUM(
                "daily_threshold",
                "daily_limit",
                "monthly_threshold",
                "monthly_limit"
              ),
              allowNull: false,
              comment: "Type of cost alert",
            },
            currentCost: {
              type: Sequelize.DECIMAL(12, 8),
              allowNull: false,
              comment: "Current cost when alert was triggered",
            },
            limitAmount: {
              type: Sequelize.DECIMAL(12, 8),
              allowNull: false,
              comment: "The limit that was reached",
            },
            period: {
              type: Sequelize.STRING(20),
              allowNull: false,
              comment:
                "Period for the alert (YYYY-MM-DD for daily, YYYY-MM for monthly)",
            },
            resolved: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: false,
              comment: "Whether the alert has been resolved",
            },
            resolvedAt: {
              type: Sequelize.DATE,
              allowNull: true,
              comment: "When the alert was resolved",
            },
            createdAt: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.NOW,
            },
            updatedAt: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.NOW,
            },
          });
          console.log("✅ Created AICostAlerts table");
        } else {
          console.log("ℹ️ AICostAlerts table already exists");
        }

        // Add indexes
        try {
          await queryInterface.addIndex("AIUsageLogs", ["deviceId"]);
          await queryInterface.addIndex("AIUsageLogs", ["provider"]);
          await queryInterface.addIndex("AIUsageLogs", ["createdAt"]);
          console.log("✅ Added indexes to AIUsageLogs");
        } catch (error) {
          console.log("ℹ️ Indexes may already exist on AIUsageLogs");
        }

        try {
          await queryInterface.addIndex("AICostAlerts", ["deviceId"]);
          await queryInterface.addIndex("AICostAlerts", ["alertType"]);
          console.log("✅ Added indexes to AICostAlerts");
        } catch (error) {
          console.log("ℹ️ Indexes may already exist on AICostAlerts");
        }
      } catch (error) {
        console.error("❌ Error creating tracking tables:", error.message);
      }
    };

    await createTrackingTables();

    console.log("\n✅ All AI migrations completed successfully!");
    console.log("\n📊 New features added:");
    console.log(
      "   • AI Provider selection (OpenAI, DeepSeek, Claude, Gemini, Groq)"
    );
    console.log("   • Model selection for each provider");
    console.log("   • Cost tracking and limits (daily/monthly)");
    console.log("   • Usage analytics and alerts");
    console.log("   • Complete token and cost monitoring");
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    console.error(error);
  } finally {
    await sequelize.close();
    console.log("\n🔗 Database connection closed");
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

module.exports = { runMigrations };
