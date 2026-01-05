"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // AI Usage Logs - Track every AI request
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

    // AI Usage Summary - Daily aggregated stats
    await queryInterface.createTable("AIUsageSummary", {
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
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: "Date for this summary (YYYY-MM-DD)",
      },
      provider: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: "AI provider",
      },
      model: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: "AI model",
      },
      requestCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Number of requests made",
      },
      successfulRequests: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Number of successful requests",
      },
      totalPromptTokens: {
        type: Sequelize.BIGINT,
        allowNull: false,
        defaultValue: 0,
        comment: "Total input tokens used",
      },
      totalCompletionTokens: {
        type: Sequelize.BIGINT,
        allowNull: false,
        defaultValue: 0,
        comment: "Total output tokens generated",
      },
      totalTokens: {
        type: Sequelize.BIGINT,
        allowNull: false,
        defaultValue: 0,
        comment: "Total tokens used",
      },
      totalCostUSD: {
        type: Sequelize.DECIMAL(12, 8),
        allowNull: false,
        defaultValue: 0.0,
        comment: "Total cost in USD for this day",
      },
      averageResponseTime: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: "Average response time in milliseconds",
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

    // AI Cost Alerts - Track when limits are reached
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

    // Add indexes for better performance
    await queryInterface.addIndex("AIUsageLogs", ["deviceId"]);
    await queryInterface.addIndex("AIUsageLogs", ["sessionId"]);
    await queryInterface.addIndex("AIUsageLogs", ["chatId"]);
    await queryInterface.addIndex("AIUsageLogs", ["provider"]);
    await queryInterface.addIndex("AIUsageLogs", ["createdAt"]);
    await queryInterface.addIndex("AIUsageLogs", ["deviceId", "createdAt"]);

    await queryInterface.addIndex("AIUsageSummary", ["deviceId"]);
    await queryInterface.addIndex("AIUsageSummary", ["date"]);
    await queryInterface.addIndex("AIUsageSummary", ["provider"]);
    await queryInterface.addIndex("AIUsageSummary", ["deviceId", "date"]);
    await queryInterface.addIndex(
      "AIUsageSummary",
      ["deviceId", "date", "provider"],
      {
        unique: true,
        name: "unique_device_date_provider",
      }
    );

    await queryInterface.addIndex("AICostAlerts", ["deviceId"]);
    await queryInterface.addIndex("AICostAlerts", ["alertType"]);
    await queryInterface.addIndex("AICostAlerts", ["resolved"]);
    await queryInterface.addIndex("AICostAlerts", ["createdAt"]);

    console.log("✅ Created AI usage tracking tables:");
    console.log("   - AIUsageLogs: Track every AI request");
    console.log("   - AIUsageSummary: Daily aggregated statistics");
    console.log("   - AICostAlerts: Cost limit notifications");
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("AICostAlerts");
    await queryInterface.dropTable("AIUsageSummary");
    await queryInterface.dropTable("AIUsageLogs");

    console.log("✅ Dropped AI usage tracking tables");
  },
};
