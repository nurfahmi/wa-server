import { DataTypes } from "sequelize";

export default (sequelize) => {
  const ContactData = sequelize.define(
    "ContactData",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "User ID (UUID format) who owns this contact",
        validate: {
          notEmpty: true,
        },
      },
      sessionId: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      type: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "false = private chat, true = group",
      },
      phoneNumber: {
        type: DataTypes.STRING(50),
        allowNull: true,
        validate: {
          isValidPhone(value) {
            if (value && !/^\+?[\d\s-]+$/.test(value)) {
              throw new Error("Invalid phone number format");
            }
          },
        },
      },
      contactName: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      whatsappName: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      source: {
        type: DataTypes.ENUM(
          "contact",
          "chat",
          "groupMember",
          "messaging_history",
          "messaging_history_chats",
          "recent_chats_fallback"
        ),
        allowNull: false,
        validate: {
          isIn: [
            [
              "contact",
              "chat",
              "groupMember",
              "messaging_history",
              "messaging_history_chats",
              "recent_chats_fallback",
            ],
          ],
        },
      },
      sourceDetail: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      jid: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          isValidJid(value) {
            if (!value.includes("@")) {
              throw new Error("Invalid JID format");
            }
          },
        },
      },
      lastSeen: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      lastUpdated: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
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
      tableName: "contact_data",
      timestamps: true,
      indexes: [
        {
          fields: ["userId"],
        },
        {
          fields: ["sessionId"],
        },
        {
          fields: ["jid"],
        },
        {
          fields: ["phoneNumber"],
        },
        {
          fields: ["sessionId", "jid"],
          unique: true,
          name: "contact_data_session_jid_unique",
        },
      ],
    }
  );

  return ContactData;
};
