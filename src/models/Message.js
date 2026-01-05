import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Message = sequelize.define(
    "Message",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "User ID (UUID format) who sent this message",
      },
      deviceId: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      sessionId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      phoneNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Target phone number/recipient",
      },
      messageType: {
        type: DataTypes.ENUM("text", "image", "video", "document", "audio"),
        defaultValue: "text",
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
        get() {
          const rawValue = this.getDataValue("content");
          return rawValue ? JSON.parse(rawValue) : null;
        },
        set(value) {
          this.setDataValue("content", JSON.stringify(value));
        },
      },
      type: {
        type: DataTypes.ENUM("incoming", "outgoing"),
        allowNull: false,
        comment: "Direction of the message",
      },
      status: {
        type: DataTypes.ENUM("pending", "sent", "delivered", "read", "failed"),
        defaultValue: "pending",
        allowNull: false,
        comment: "Message delivery status",
      },
      whatsappMessageId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "WhatsApp message ID for tracking",
      },
      errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Error message if sending failed",
      },
      originalMessageId: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: "Reference to original message if this is a resend",
      },
      sentAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Timestamp when message was sent to WhatsApp",
      },
      deliveredAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Timestamp when message was delivered",
      },
      readAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Timestamp when message was read",
      },
      timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: "Original message timestamp",
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      indexes: [
        {
          fields: ["userId"],
        },
        {
          fields: ["deviceId"],
        },
        {
          fields: ["sessionId"],
        },
        {
          fields: ["status"],
        },
        {
          fields: ["type"],
        },
        {
          fields: ["whatsappMessageId"],
        },
        {
          fields: ["createdAt"],
        },
        {
          fields: ["timestamp"],
        },
        {
          fields: ["originalMessageId"],
        },
      ],
    }
  );

  return Message;
};
