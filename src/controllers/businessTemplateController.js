import { BusinessTemplate } from "../models/index.js";

// Get all business templates
export const getAllTemplates = async (req, res) => {
  try {
    const { businessType, language } = req.query;

    const whereClause = { isActive: true };
    if (businessType) whereClause.businessType = businessType;
    if (language) whereClause.language = language;

    const templates = await BusinessTemplate.findAll({
      where: whereClause,
      order: [
        ["businessType", "ASC"],
        ["language", "ASC"],
      ],
    });

    res.json({
      success: true,
      templates,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get business template by type and language
export const getTemplate = async (req, res) => {
  try {
    const { businessType, language = "id" } = req.params;

    const template = await BusinessTemplate.findOne({
      where: {
        businessType,
        language,
        isActive: true,
      },
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: "Template not found",
      });
    }

    res.json({
      success: true,
      template,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Get business types list
export const getBusinessTypes = async (req, res) => {
  try {
    const businessTypes = await BusinessTemplate.findAll({
      attributes: ["businessType"],
      where: { isActive: true },
      group: ["businessType"],
      order: [["businessType", "ASC"]],
    });

    const types = businessTypes.map((item) => item.businessType);

    res.json({
      success: true,
      businessTypes: types,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Admin: Create or update template
export const createOrUpdateTemplate = async (req, res) => {
  try {
    const { businessType, language = "id" } = req.params;
    const templateData = req.body;

    const [template, created] = await BusinessTemplate.upsert({
      businessType,
      language,
      ...templateData,
    });

    res.json({
      success: true,
      template,
      created,
      message: created
        ? "Template created successfully"
        : "Template updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Admin: Delete template
export const deleteTemplate = async (req, res) => {
  try {
    const { businessType, language = "id" } = req.params;

    const result = await BusinessTemplate.update(
      { isActive: false },
      {
        where: { businessType, language },
      }
    );

    if (result[0] === 0) {
      return res.status(404).json({
        success: false,
        error: "Template not found",
      });
    }

    res.json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
