import { DataTypes } from "sequelize";

export default (sequelize) => {
  const WarmerConversationLog = sequelize.define(
    "WarmerConversationLog",
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
      templateId: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: "Reference to conversation template used (if any)",
      },
      conversationId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Unique identifier for this conversation instance",
      },
      senderSessionId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Session ID of device that sent the message",
      },
      receiverSessionId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Session ID of device that received the message",
      },
      messageContent: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: "Content of the message sent",
      },
      messageType: {
        type: DataTypes.ENUM("text", "image", "video", "audio", "document"),
        defaultValue: "text",
        allowNull: false,
      },
      sequenceNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "Order of this message in the conversation",
      },
      status: {
        type: DataTypes.ENUM("pending", "sent", "delivered", "read", "failed"),
        defaultValue: "pending",
        allowNull: false,
      },
      deliveredAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      readAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
          const raw = this.getDataValue("metadata");
          return raw ? JSON.parse(raw) : {};
        },
        set(value) {
          this.setDataValue("metadata", JSON.stringify(value));
        },
        comment:
          "Additional metadata (e.g., template variables used, timing info)",
      },
      sentAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },
    },
    {
      tableName: "warmer_conversation_logs",
      timestamps: true,
      indexes: [
        {
          fields: ["campaignId"],
        },
        {
          fields: ["conversationId"],
        },
        {
          fields: ["senderSessionId"],
        },
        {
          fields: ["receiverSessionId"],
        },
        {
          fields: ["status"],
        },
        {
          fields: ["sentAt"],
        },
        {
          fields: ["campaignId", "conversationId"],
        },
        {
          fields: ["campaignId", "sentAt"],
        },
      ],
    }
  );

  // Associations
  WarmerConversationLog.associate = (models) => {
    // Belongs to a warmer campaign
    WarmerConversationLog.belongsTo(models.WarmerCampaign, {
      foreignKey: "campaignId",
      as: "campaign",
    });

    // Belongs to a conversation template (optional)
    WarmerConversationLog.belongsTo(models.WarmerConversationTemplate, {
      foreignKey: "templateId",
      as: "template",
    });
  };

  return WarmerConversationLog;
};
