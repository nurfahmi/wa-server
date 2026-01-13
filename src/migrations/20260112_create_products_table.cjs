const { DataTypes } = require("sequelize");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("Products", {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      deviceId: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: "Devices",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      sku: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      category: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      inventoryType: {
        type: Sequelize.ENUM("manage_stock", "always_in_stock", "unavailable"),
        defaultValue: "always_in_stock",
      },
      stockCount: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      // Complex Pricing: { normal: 1000, promo: 900, currency: "IDR", bundling: [{qty: 2, price: 1800}] }
      pricing: {
        type: Sequelize.TEXT, // Using TEXT for JSON content to ensure compatibility
        allowNull: true,
        defaultValue: JSON.stringify({}),
      },
      // Images with metadata: [{url: "...", caption: "Front", variant: "Blue"}]
      images: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: JSON.stringify([]),
      },
      // Variants: [{name: "Size", options: ["S", "M"]}, {name: "Color", options: ["Red"]}]
      variants: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: JSON.stringify([]),
      },
      // Relations for AI Strategy: { upsell: [id1], downsell: [id2], related: [id3] }
      relations: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: JSON.stringify({}),
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      tags: {
        type: Sequelize.TEXT, // API efficient searching
        allowNull: true,
        defaultValue: JSON.stringify([]),
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    // Add indexes for performance
    await queryInterface.addIndex("Products", ["deviceId"]);
    await queryInterface.addIndex("Products", ["name"]); // For AI text search
    await queryInterface.addIndex("Products", ["sku"]);
    await queryInterface.addIndex("Products", ["isActive"]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("Products");
  },
};
