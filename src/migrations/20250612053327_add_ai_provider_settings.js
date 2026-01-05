"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("Devices", "aiProvider", {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: "openai",
      comment: "AI provider (openai, deepseek, claude, gemini, groq)",
    });

    await queryInterface.addColumn("Devices", "aiModel", {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: "Specific AI model to use (leave null for provider default)",
    });

    await queryInterface.addColumn("Devices", "aiFallbackProvider", {
      type: Sequelize.STRING(50),
      allowNull: true,
      defaultValue: "deepseek",
      comment: "Fallback provider if primary fails",
    });

    await queryInterface.addColumn("Devices", "aiCostLimitDaily", {
      type: Sequelize.DECIMAL(10, 6),
      allowNull: true,
      defaultValue: 1.0,
      comment: "Daily cost limit in USD",
    });

    await queryInterface.addColumn("Devices", "aiCostLimitMonthly", {
      type: Sequelize.DECIMAL(10, 6),
      allowNull: true,
      defaultValue: 20.0,
      comment: "Monthly cost limit in USD",
    });

    await queryInterface.addColumn("Devices", "aiCostAlertThreshold", {
      type: Sequelize.DECIMAL(10, 6),
      allowNull: true,
      defaultValue: 0.8,
      comment: "Alert when cost reaches this percentage of limit (0.8 = 80%)",
    });

    await queryInterface.addColumn("Devices", "aiCostTrackingEnabled", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: "Enable cost tracking and limits",
    });

    console.log("✅ Added AI provider settings to Devices table");
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("Devices", "aiProvider");
    await queryInterface.removeColumn("Devices", "aiModel");
    await queryInterface.removeColumn("Devices", "aiFallbackProvider");
    await queryInterface.removeColumn("Devices", "aiCostLimitDaily");
    await queryInterface.removeColumn("Devices", "aiCostLimitMonthly");
    await queryInterface.removeColumn("Devices", "aiCostAlertThreshold");
    await queryInterface.removeColumn("Devices", "aiCostTrackingEnabled");

    console.log("✅ Removed AI provider settings from Devices table");
  },
};
