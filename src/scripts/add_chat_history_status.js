import { sequelize } from "../models/index.js";
import { DataTypes } from "sequelize";

async function addColumns() {
  try {
    const queryInterface = sequelize.getQueryInterface();
    const tableInfo = await queryInterface.describeTable("ChatHistories");

    if (!tableInfo.status) {
      console.log("Adding 'status' column...");
      await queryInterface.addColumn("ChatHistories", "status", {
        type: DataTypes.ENUM("pending", "sent", "delivered", "read", "failed"),
        defaultValue: "pending",
        allowNull: false,
        comment: "Message delivery status",
      });
      console.log("'status' column added.");
    } else {
      console.log("'status' column already exists.");
    }

    if (!tableInfo.sentAt) {
      console.log("Adding 'sentAt' column...");
      await queryInterface.addColumn("ChatHistories", "sentAt", {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Timestamp when message was sent to WhatsApp",
      });
      console.log("'sentAt' column added.");
    } else {
      console.log("'sentAt' column already exists.");
    }

    if (!tableInfo.deliveredAt) {
      console.log("Adding 'deliveredAt' column...");
      await queryInterface.addColumn("ChatHistories", "deliveredAt", {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Timestamp when message was delivered",
      });
      console.log("'deliveredAt' column added.");
    } else {
      console.log("'deliveredAt' column already exists.");
    }

    if (!tableInfo.readAt) {
      console.log("Adding 'readAt' column...");
      await queryInterface.addColumn("ChatHistories", "readAt", {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Timestamp when message was read",
      });
      console.log("'readAt' column added.");
    } else {
      console.log("'readAt' column already exists.");
    }

    console.log("Migration completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

addColumns();
