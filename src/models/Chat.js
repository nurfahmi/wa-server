import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Chat = sequelize.define(
    "Chat",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "User ID who owns this chat",
      },
      sessionId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "WhatsApp session ID",
      },
      jid: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "WhatsApp JID (e.g., 1234567890@s.whatsapp.net or group@g.us)",
      },
      name: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Chat display name",
      },
      type: {
        type: DataTypes.ENUM("individual", "group", "broadcast"),
        allowNull: false,
        comment: "Type of chat",
      },
      conversationTimestamp: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Last conversation timestamp",
      },
      unreadCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: "Number of unread messages",
      },
      archived: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: "Whether chat is archived",
      },
      pinned: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: "Whether chat is pinned",
      },
      muted: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Mute expiry date, null if not muted",
      },
      readOnly: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: "Whether chat is read-only",
      },
      ephemeralExpiration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Disappearing messages duration in seconds",
      },
      lastMessageTimestamp: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Timestamp of last message",
      },
      source: {
        type: DataTypes.ENUM("chats_upsert", "chats_set"),
        allowNull: false,
        comment: "Source of chat data (which Baileys event)",
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "Additional chat metadata",
      },
    },
    {
      indexes: [
        {
          unique: true,
          fields: ["sessionId", "jid"],
          name: "unique_session_jid_chat",
        },
        {
          fields: ["userId"],
        },
        {
          fields: ["type"],
        },
        {
          fields: ["source"],
        },
        {
          fields: ["conversationTimestamp"],
        },
        {
          fields: ["unreadCount"],
        },
        {
          fields: ["archived"],
        },
      ],
      timestamps: true,
    }
  );

  return Chat;
};
