import { DataTypes } from "sequelize";

export default (sequelize) => {
  const AIConversationMemory = sequelize.define(
    "AIConversationMemory",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      sessionId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      remoteJid: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "The WhatsApp JID of the chat/group",
      },
      role: {
        type: DataTypes.ENUM("user", "assistant"),
        allowNull: false,
        comment: "Whether the message is from user or AI assistant",
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: "The actual message content",
      },
      timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: "When this conversation memory should expire",
      },
      deviceId: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: "Foreign key to the device that owns this conversation",
      },
    },
    {
      indexes: [
        {
          // Main index for retrieving conversation history
          fields: ["sessionId", "remoteJid", "timestamp"],
        },
        {
          // Index for cleanup of expired memories
          fields: ["expiresAt"],
        },
        {
          // Index for device-based queries
          fields: ["deviceId"],
        },
      ],
      // Don't need updatedAt for this table
      timestamps: true,
      updatedAt: false,
    }
  );

  return AIConversationMemory;
};
