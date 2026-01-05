import { DataTypes } from "sequelize";

export default (sequelize) => {
  const UserAISettings = sequelize.define(
    "UserAISettings",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: "User ID (UUID format) for AI settings",
      },
      // Quota Management
      maxDevicesWithAI: {
        type: DataTypes.INTEGER,
        defaultValue: -1, // -1 means unlimited
        comment: "Maximum number of devices allowed to use AI features",
      },
      monthlyMessageLimit: {
        type: DataTypes.INTEGER,
        defaultValue: -1, // -1 means unlimited
        comment: "Monthly message limit across all devices",
      },
      currentMonthMessages: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: "Current month's message count",
      },
      lastResetDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: "Last time the message counter was reset",
      },
      // Billing Tier
      aiTier: {
        type: DataTypes.STRING,
        defaultValue: "basic",
        comment: "User's AI service tier (basic, premium, enterprise)",
      },
      // Global Defaults (used only when device settings are not specified)
      defaultAIEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: "Default AI enabled state for new devices",
      },
      defaultMaxTokens: {
        type: DataTypes.INTEGER,
        defaultValue: 500,
        comment: "Default token limit for new devices",
      },
    },
    {
      indexes: [
        {
          fields: ["userId"],
        },
      ],
    }
  );

  return UserAISettings;
};
