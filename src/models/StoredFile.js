import { DataTypes } from "sequelize";

export default (sequelize) => {
  const StoredFile = sequelize.define(
    "StoredFile",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "User ID who owns this file",
      },
      deviceId: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: "Optional device association",
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
        defaultValue: [],
        comment: "Tags for categorization and search",
        get() {
          const raw = this.getDataValue("tags");
          return raw || [];
        },
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
      // Metadata for different file types
      metadata: {
        type: DataTypes.JSON,
        defaultValue: {},
        comment: "Additional file metadata (dimensions, duration, etc.)",
        get() {
          const raw = this.getDataValue("metadata");
          return raw || {};
        },
      },
    },
    {
      tableName: "stored_files",
      timestamps: true,
      indexes: [
        {
          fields: ["userId"],
        },
        {
          fields: ["fileType"],
        },
        {
          fields: ["mimeType"],
        },
        {
          fields: ["usageCount"],
        },
        {
          fields: ["expiresAt"],
        },
      ],
    }
  );

  // Instance methods
  StoredFile.prototype.incrementUsage = async function () {
    await this.update({
      usageCount: this.usageCount + 1,
      lastUsed: new Date(),
    });
  };

  StoredFile.prototype.isExpired = function () {
    return this.expiresAt && new Date() > this.expiresAt;
  };

  StoredFile.prototype.getFileTypeFromMime = function () {
    const mimeType = this.mimeType.toLowerCase();

    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
    return "document";
  };

  // Static methods
  StoredFile.findByTags = function (tags, userId = null) {
    const where = {
      tags: {
        [sequelize.Sequelize.Op.overlap]: tags,
      },
    };

    if (userId) {
      where.userId = userId;
    }

    return this.findAll({ where });
  };

  StoredFile.cleanupExpired = async function () {
    const fs = require("fs").promises;
    const path = require("path");

    const expiredFiles = await this.findAll({
      where: {
        expiresAt: {
          [sequelize.Sequelize.Op.lt]: new Date(),
        },
      },
    });

    for (const file of expiredFiles) {
      try {
        // Delete physical file
        const fullPath = path.join(process.cwd(), file.filePath);
        await fs.unlink(fullPath);

        // Delete database record
        await file.destroy();

        console.log(`Cleaned up expired file: ${file.originalName}`);
      } catch (error) {
        console.error(`Failed to cleanup file ${file.id}:`, error);
      }
    }

    return expiredFiles.length;
  };

  return StoredFile;
};
