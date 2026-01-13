import { Product, Device } from "../models/index.js";
import { Op } from "sequelize";

// Get all products for a device
export const getProducts = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { deviceId };

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { sku: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Product.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      products: rows,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      totalItems: count
    });
  } catch (error) {
    console.error("Error getting products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
};

// Create a new product
export const createProduct = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { 
      name, 
      description, 
      sku, 
      category, 
      inventoryType, 
      stockCount, 
      pricing, 
      images, 
      variants, 
      relations, 
      tags 
    } = req.body;

    const device = await Device.findByPk(deviceId);
    if (!device) return res.status(404).json({ error: "Device not found" });

    const product = await Product.create({
      deviceId,
      name,
      description,
      sku,
      category,
      inventoryType,
      stockCount,
      pricing,
      images,
      variants,
      relations,
      tags
    });

    res.status(201).json(product);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: "Failed to create product" });
  }
};

// Update a product
export const updateProduct = async (req, res) => {
  try {
    const { deviceId, productId } = req.params;
    const product = await Product.findOne({
       where: { id: productId, deviceId }
    });

    if (!product) return res.status(404).json({ error: "Product not found" });

    await product.update(req.body);
    res.json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Failed to update product" });
  }
};

// Delete a product
export const deleteProduct = async (req, res) => {
  try {
     const { deviceId, productId } = req.params;
     const deleted = await Product.destroy({
        where: { id: productId, deviceId }
     });

     if (!deleted) return res.status(404).json({ error: "Product not found" });
     res.json({ message: "Product deleted successfully" });
  } catch (error) {
     console.error("Error deleting product:", error);
     res.status(500).json({ error: "Failed to delete product" });
  }
};
