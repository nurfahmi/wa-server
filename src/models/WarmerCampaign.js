import { DataTypes } from "sequelize";

export default (sequelize) => {
  const WarmerCampaign = sequelize.define(
    "WarmerCampaign",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "User ID who owns this warmer campaign",
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Campaign name for easy identification",
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Optional campaign description",
      },
      status: {
        type: DataTypes.ENUM("active", "paused", "stopped", "completed"),
        defaultValue: "active",
        allowNull: false,
      },
      // Selected devices for this campaign (JSON array of device IDs)
      selectedDevices: {
        type: DataTypes.TEXT,
        allowNull: false,
        get() {
          const raw = this.getDataValue("selectedDevices");
          return raw ? JSON.parse(raw) : [];
        },
        set(value) {
          this.setDataValue("selectedDevices", JSON.stringify(value));
        },
        comment: "Array of device IDs participating in this campaign",
      },
      // Daily message progression settings
      dailyMessageSettings: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: JSON.stringify({
          day1_7: { min: 3, max: 5 }, // First week: 3-5 messages per day
          day8_14: { min: 5, max: 8 }, // Second week: 5-8 messages per day
          day15_21: { min: 8, max: 12 }, // Third week: 8-12 messages per day
          day22_plus: { min: 10, max: 15 }, // After 3 weeks: 10-15 messages per day
        }),
        get() {
          const raw = this.getDataValue("dailyMessageSettings");
          return raw ? JSON.parse(raw) : {};
        },
        set(value) {
          this.setDataValue("dailyMessageSettings", JSON.stringify(value));
        },
        comment: "Customizable daily message progression by day ranges",
      },
      // Timing settings
      timingSettings: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: JSON.stringify({
          workingHours: { start: "09:00", end: "17:00" },
          timezone: "Asia/Jakarta",
          intervalMinutes: { min: 30, max: 180 }, // 30min to 3 hours between messages
          pauseDays: [], // Days to pause (0=Sunday, 1=Monday, etc.)
        }),
        get() {
          const raw = this.getDataValue("timingSettings");
          return raw ? JSON.parse(raw) : {};
        },
        set(value) {
          this.setDataValue("timingSettings", JSON.stringify(value));
        },
        comment: "Working hours and timing configuration",
      },
      // Statistics
      totalMessagesSent: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      totalConversations: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      lastActivityAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      startedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "warmer_campaigns",
      timestamps: true,
      indexes: [
        {
          fields: ["userId"],
        },
        {
          fields: ["status"],
        },
        {
          fields: ["userId", "status"],
        },
      ],
    }
  );

  // Associations will be defined in index.js
  WarmerCampaign.associate = (models) => {
    // A campaign can have many conversation templates
    WarmerCampaign.hasMany(models.WarmerConversationTemplate, {
      foreignKey: "campaignId",
      as: "conversationTemplates",
      onDelete: "CASCADE",
    });

    // A campaign can have many conversation logs
    WarmerCampaign.hasMany(models.WarmerConversationLog, {
      foreignKey: "campaignId",
      as: "conversationLogs",
      onDelete: "CASCADE",
    });
  };

  return WarmerCampaign;
};
