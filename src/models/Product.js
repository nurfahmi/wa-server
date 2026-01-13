import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Product = sequelize.define(
    "Product",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      deviceId: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      sku: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      category: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      inventoryType: {
        type: DataTypes.ENUM("manage_stock", "always_in_stock", "unavailable"),
        defaultValue: "always_in_stock",
      },
      stockCount: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      // Pricing Structure:
      // {
      //   raw: 100000,
      //   currency: "IDR",
      //   formatted: "Rp 100.000",
      //   promo: { price: 90000, end_date: "..." },
      //   tiers: [{ min_qty: 10, price: 85000 }]
      // }
      pricing: {
        type: DataTypes.TEXT,
        get() {
          const raw = this.getDataValue("pricing");
          try {
            return raw ? JSON.parse(raw) : {};
          } catch (e) {
            return {};
          }
        },
        set(value) {
          this.setDataValue("pricing", JSON.stringify(value));
        },
      },
      // Images Structure:
      // [
      //   {
      //     id: "img_123",
      //     url: "...",
      //     caption: "Front View - Blue Variant",
      //     type: "main" | "variant" | "detail"
      //   }
      // ]
      images: {
        type: DataTypes.TEXT,
        get() {
          const raw = this.getDataValue("images");
          try {
            return raw ? JSON.parse(raw) : [];
          } catch (e) {
            return [];
          }
        },
        set(value) {
          this.setDataValue("images", JSON.stringify(value));
        },
      },
      // Variants Structure:
      // [
      //   { name: "Color", options: ["Red", "Blue"] },
      //   { name: "Size", options: ["S", "M", "L"] }
      // ]
      variants: {
        type: DataTypes.TEXT,
        get() {
          const raw = this.getDataValue("variants");
          try {
            return raw ? JSON.parse(raw) : [];
          } catch (e) {
            return [];
          }
        },
        set(value) {
          this.setDataValue("variants", JSON.stringify(value));
        },
      },
      // AI Strategy Relations:
      // {
      //   upsell: [1, 5, 8], // IDs of upsell products
      //   downsell: [2],
      //   cross_sell: [10, 11]
      // }
      relations: {
        type: DataTypes.TEXT,
        get() {
          const raw = this.getDataValue("relations");
          try {
            return raw ? JSON.parse(raw) : { upsell: [], downsell: [], cross_sell: [] };
          } catch (e) {
            return { upsell: [], downsell: [], cross_sell: [] };
          }
        },
        set(value) {
          this.setDataValue("relations", JSON.stringify(value));
        },
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      tags: {
        type: DataTypes.TEXT,
        get() {
          const raw = this.getDataValue("tags");
          try {
            return raw ? JSON.parse(raw) : [];
          } catch (e) {
            return [];
          }
        },
        set(value) {
          this.setDataValue("tags", JSON.stringify(value));
        },
      },
    },
    {
      tableName: "Products",
      timestamps: true,
    }
  );

  return Product;
};
