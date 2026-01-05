import { DataTypes } from "sequelize";

export default (sequelize) => {
  const WarmerConversationTemplate = sequelize.define(
    "WarmerConversationTemplate",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      campaignId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: "Reference to warmer campaign",
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Template name for easy identification",
      },
      category: {
        type: DataTypes.ENUM(
          "greeting",
          "casual_chat",
          "business_talk",
          "follow_up",
          "question_answer",
          "sharing_update",
          "planning",
          "random"
        ),
        defaultValue: "casual_chat",
        allowNull: false,
        comment: "Category of conversation template",
      },
      // Conversation flow - array of messages with sender info
      conversationFlow: {
        type: DataTypes.TEXT,
        allowNull: false,
        get() {
          const raw = this.getDataValue("conversationFlow");
          return raw ? JSON.parse(raw) : [];
        },
        set(value) {
          this.setDataValue("conversationFlow", JSON.stringify(value));
        },
        comment: "Array of conversation steps with sender and message content",
      },
      // Variables that can be replaced in messages
      variables: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
          const raw = this.getDataValue("variables");
          return raw ? JSON.parse(raw) : {};
        },
        set(value) {
          this.setDataValue("variables", JSON.stringify(value));
        },
        comment:
          "Variables that can be replaced in conversation (e.g., {name}, {time}, etc.)",
      },
      // Settings for this template
      settings: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: JSON.stringify({
          minDevicesRequired: 2,
          maxDevicesInConversation: 4,
          messageDelaySeconds: { min: 10, max: 60 },
          canBeRepeated: true,
          weight: 1, // For random selection probability
        }),
        get() {
          const raw = this.getDataValue("settings");
          return raw ? JSON.parse(raw) : {};
        },
        set(value) {
          this.setDataValue("settings", JSON.stringify(value));
        },
        comment: "Template configuration settings",
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      usageCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: "How many times this template has been used",
      },
      lastUsedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "warmer_conversation_templates",
      timestamps: true,
      indexes: [
        {
          fields: ["campaignId"],
        },
        {
          fields: ["category"],
        },
        {
          fields: ["isActive"],
        },
        {
          fields: ["campaignId", "isActive"],
        },
      ],
    }
  );

  // Associations
  WarmerConversationTemplate.associate = (models) => {
    // Belongs to a warmer campaign
    WarmerConversationTemplate.belongsTo(models.WarmerCampaign, {
      foreignKey: "campaignId",
      as: "campaign",
    });
  };

  return WarmerConversationTemplate;
};
