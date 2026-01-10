import { DataTypes } from "sequelize";

export default (sequelize) => {
  const ChatSettings = sequelize.define(
    "ChatSettings",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "User ID who owns this chat",
      },
      deviceId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: "Device ID this chat belongs to",
      },
      sessionId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "WhatsApp session ID",
      },
      chatId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "WhatsApp chat ID (phone@s.whatsapp.net)",
      },
      phoneNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Contact phone number (without @s.whatsapp.net)",
      },
      contactName: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Contact display name",
      },
      profilePictureUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "URL of the contact's profile picture",
      },
      // AI Settings - Core functionality
      aiEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true, // Default to AI enabled for better UX
        comment: "AI auto-reply enabled for this specific chat",
      },
      // Essential message info for quick overview
      lastMessageContent: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Content of the last message (for quick preview)",
      },
      lastMessageTimestamp: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Timestamp of the last message",
      },
      lastMessageDirection: {
        type: DataTypes.ENUM("incoming", "outgoing"),
        allowNull: true,
        comment: "Direction of the last message",
      },
      // Customer Management
      customerSegment: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Customer segment (new, returning, vip, or custom)",
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Internal notes about this chat/customer",
      },
      // CS Agent Assignment
      assignedAgentId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Assigned CS agent/user ID",
      },
      assignedAgentName: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Assigned agent display name",
      },
      assignedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "When the chat was assigned to agent",
      },
      // Labels for categorization
      labels: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: "Array of labels: ['hot-lead', 'follow-up', 'purchased']",
      },
      // Human Takeover (AI Override)
      humanTakeover: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: "True when human agent takes over from AI",
      },
      humanTakeoverAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "When human took over",
      },
      humanTakeoverBy: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Agent ID who took over",
      },
      // Chat Status & Priority
      status: {
        type: DataTypes.ENUM("open", "pending", "resolved", "closed"),
        defaultValue: "open",
        comment: "Chat status for CS workflow",
      },
      priority: {
        type: DataTypes.ENUM("low", "normal", "high", "urgent"),
        defaultValue: "normal",
        comment: "Chat priority level",
      },
      // AI Memory Control
      aiMemoryClearedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Timestamp when AI memory was manually cleared",
      },
    },
    {
      indexes: [
        {
          unique: true,
          fields: ["sessionId", "chatId"],
          name: "unique_session_chat",
        },
        {
          fields: ["userId"],
        },
        {
          fields: ["deviceId"],
        },
        {
          fields: ["phoneNumber"],
        },
        {
          fields: ["aiEnabled"],
        },
        {
          fields: ["lastMessageTimestamp"],
        },
      ],
      timestamps: true,
    }
  );

  return ChatSettings;
};
