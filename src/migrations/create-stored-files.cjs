const { DataTypes } = require("sequelize");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("stored_files", {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "User ID who owns this file",
      },
      deviceId: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: "Optional device association",
        references: {
          model: "Devices",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      originalName: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Original filename from upload",
      },
      storedName: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Stored filename on server",
      },
      mimeType: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "File MIME type",
      },
      fileType: {
        type: DataTypes.ENUM("image", "video", "document", "audio"),
        allowNull: false,
        comment: "Categorized file type",
      },
      size: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: "File size in bytes",
      },
      filePath: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Relative path to stored file",
      },
      isPublic: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: "Whether file can be accessed publicly",
      },
      tags: {
        type: DataTypes.JSON,
        defaultValue: "[]",
        comment: "Tags for categorization and search",
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Optional file description",
      },
      usageCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: "Number of times file has been sent",
      },
      lastUsed: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Last time file was used for sending",
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Optional expiration date for auto-cleanup",
      },
      metadata: {
        type: DataTypes.JSON,
        defaultValue: "{}",
        comment: "Additional file metadata (dimensions, duration, etc.)",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // Add indexes for better query performance
    await queryInterface.addIndex("stored_files", ["userId"]);
    await queryInterface.addIndex("stored_files", ["fileType"]);
    await queryInterface.addIndex("stored_files", ["mimeType"]);
    await queryInterface.addIndex("stored_files", ["usageCount"]);
    await queryInterface.addIndex("stored_files", ["expiresAt"]);
    await queryInterface.addIndex("stored_files", ["createdAt"]);

    // Composite indexes for common queries
    await queryInterface.addIndex("stored_files", ["userId", "fileType"]);
    await queryInterface.addIndex("stored_files", ["userId", "expiresAt"]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("stored_files");
  },
};
