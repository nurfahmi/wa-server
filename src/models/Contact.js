import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Contact = sequelize.define(
    "Contact",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "User ID who owns this contact",
      },
      sessionId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "WhatsApp session ID",
      },
      jid: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "WhatsApp JID - can be PN (@s.whatsapp.net) or LID (@lid)",
      },
      // Baileys v7.0.0 LID Support
      lid: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "WhatsApp LID (Local Identifier) - new in Baileys v7.0.0",
      },
      pn: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Phone Number JID (@s.whatsapp.net format) - for LID mapping",
      },
      phoneNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Phone number without country code symbols",
      },
      name: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Contact display name",
      },
      notify: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "WhatsApp notify name",
      },
      verifiedName: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "WhatsApp verified business name",
      },
      status: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "WhatsApp status message",
      },
      pictureUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Profile picture URL",
      },
      isContact: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: "Whether this is a real contact or just a chat participant",
      },
      isBlocked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: "Whether this contact is blocked",
      },
      source: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: "Source of contact data (which Baileys event or sync method)",
      },
      lastSeen: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Last seen timestamp",
      },
      businessProfile: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "Business profile data if applicable",
      },
      // Baileys v7.0.0 - addressing mode preference
      addressingMode: {
        type: DataTypes.ENUM("pn", "lid", "unknown"),
        defaultValue: "pn",
        comment: "Preferred addressing mode for this contact (PN or LID)",
      },
    },
    {
      indexes: [
        {
          unique: true,
          fields: ["sessionId", "jid"],
          name: "unique_session_jid_contact",
        },
        {
          fields: ["userId"],
        },
        {
          fields: ["phoneNumber"],
        },
        {
          fields: ["source"],
        },
        {
          fields: ["isContact"],
        },
        {
          fields: ["lid"],
          name: "idx_contact_lid",
        },
        {
          fields: ["pn"],
          name: "idx_contact_pn",
        },
      ],
      timestamps: true,
    }
  );

  return Contact;
};
