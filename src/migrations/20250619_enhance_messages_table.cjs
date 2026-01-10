const { DataTypes } = require("sequelize");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Add new fields to messages table
      await queryInterface.addColumn(
        "messages",
        "type",
        {
          type: DataTypes.ENUM("incoming", "outgoing"),
          allowNull: true, // Allow null for existing records
          comment: "Direction of the message",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "messages",
        "status",
        {
          type: DataTypes.ENUM(
            "pending",
            "sent",
            "delivered",
            "read",
            "failed"
          ),
          defaultValue: "pending",
          allowNull: false,
          comment: "Message delivery status",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "messages",
        "whatsappMessageId",
        {
          type: DataTypes.STRING,
          allowNull: true,
          comment: "WhatsApp message ID for tracking",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "messages",
        "errorMessage",
        {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: "Error message if sending failed",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "messages",
        "originalMessageId",
        {
          type: DataTypes.BIGINT,
          allowNull: true,
          comment: "Reference to original message if this is a resend",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "messages",
        "sentAt",
        {
          type: DataTypes.DATE,
          allowNull: true,
          comment: "Timestamp when message was sent to WhatsApp",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "messages",
        "deliveredAt",
        {
          type: DataTypes.DATE,
          allowNull: true,
          comment: "Timestamp when message was delivered",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "messages",
        "readAt",
        {
          type: DataTypes.DATE,
          allowNull: true,
          comment: "Timestamp when message was read",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "messages",
        "timestamp",
        {
          type: DataTypes.DATE,
          allowNull: true, // Allow null for existing records
          defaultValue: DataTypes.NOW,
          comment: "Original message timestamp",
        },
        { transaction }
      );

      // Update messageType enum to include audio
      await queryInterface.changeColumn(
        "messages",
        "messageType",
        {
          type: DataTypes.ENUM("text", "image", "video", "document", "audio"),
          defaultValue: "text",
        },
        { transaction }
      );

      // Add indexes for new fields
      await queryInterface.addIndex("messages", ["status"], { transaction });
      await queryInterface.addIndex("messages", ["type"], { transaction });
      await queryInterface.addIndex("messages", ["whatsappMessageId"], {
        transaction,
      });
      await queryInterface.addIndex("messages", ["timestamp"], { transaction });
      await queryInterface.addIndex("messages", ["originalMessageId"], {
        transaction,
      });

      // Update existing records to set default values
      await queryInterface.sequelize.query(
        `
        UPDATE messages 
        SET 
          type = 'outgoing',
          timestamp = createdAt
        WHERE type IS NULL
      `,
        { transaction }
      );

      // Make type field non-nullable after updating existing records
      await queryInterface.changeColumn(
        "messages",
        "type",
        {
          type: DataTypes.ENUM("incoming", "outgoing"),
          allowNull: false,
          comment: "Direction of the message",
        },
        { transaction }
      );

      await queryInterface.changeColumn(
        "messages",
        "timestamp",
        {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          comment: "Original message timestamp",
        },
        { transaction }
      );

      await transaction.commit();
      console.log("✅ Enhanced messages table with status tracking fields");
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Error enhancing messages table:", error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Remove indexes
      await queryInterface.removeIndex("messages", ["status"], { transaction });
      await queryInterface.removeIndex("messages", ["type"], { transaction });
      await queryInterface.removeIndex("messages", ["whatsappMessageId"], {
        transaction,
      });
      await queryInterface.removeIndex("messages", ["timestamp"], {
        transaction,
      });
      await queryInterface.removeIndex("messages", ["originalMessageId"], {
        transaction,
      });

      // Remove columns
      await queryInterface.removeColumn("messages", "type", { transaction });
      await queryInterface.removeColumn("messages", "status", { transaction });
      await queryInterface.removeColumn("messages", "whatsappMessageId", {
        transaction,
      });
      await queryInterface.removeColumn("messages", "errorMessage", {
        transaction,
      });
      await queryInterface.removeColumn("messages", "originalMessageId", {
        transaction,
      });
      await queryInterface.removeColumn("messages", "sentAt", { transaction });
      await queryInterface.removeColumn("messages", "deliveredAt", {
        transaction,
      });
      await queryInterface.removeColumn("messages", "readAt", { transaction });
      await queryInterface.removeColumn("messages", "timestamp", {
        transaction,
      });

      // Revert messageType enum
      await queryInterface.changeColumn(
        "messages",
        "messageType",
        {
          type: DataTypes.ENUM("text", "image", "video", "document"),
          defaultValue: "text",
        },
        { transaction }
      );

      await transaction.commit();
      console.log("✅ Reverted messages table enhancements");
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Error reverting messages table:", error);
      throw error;
    }
  },
};
