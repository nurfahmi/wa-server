import { DataTypes } from "sequelize";

export default (sequelize) => {
  const AIModel = sequelize.define(
    "AIModel",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      providerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "AIProviders",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      modelId: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: "Model identifier used in API calls",
      },
      name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: "Display name of the model",
      },
      enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: "Whether this model is enabled",
      },
      maxTokens: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 4096,
        comment: "Maximum tokens this model can generate",
      },
      contextWindow: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 4096,
        comment: "Maximum context window size",
      },
      inputPricing: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: false,
        comment: "Cost per 1K input tokens in USD",
      },
      outputPricing: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: false,
        comment: "Cost per 1K output tokens in USD",
      },
      capabilities: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "Array of capabilities (chat, completion, vision, etc.)",
      },
      recommended: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: "Recommendation category (budget, balanced, premium, etc.)",
      },
      isDefault: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Whether this is the default model for the provider",
      },
      priority: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 100,
        comment: "Priority order for model selection",
      },
    },
    {
      tableName: "AIModels",
      timestamps: true,
      indexes: [
        { fields: ["providerId"] },
        { fields: ["modelId"] },
        { fields: ["enabled"] },
        { fields: ["isDefault"] },
        { fields: ["priority"] },
      ],
    }
  );

  AIModel.associate = (models) => {
    AIModel.belongsTo(models.AIProvider, {
      foreignKey: "providerId",
      as: "provider",
    });
  };

  // Instance methods
  AIModel.prototype.calculateCost = function (inputTokens, outputTokens) {
    const inputCost = (inputTokens / 1000) * parseFloat(this.inputPricing);
    const outputCost = (outputTokens / 1000) * parseFloat(this.outputPricing);
    const totalCost = inputCost + outputCost;

    return {
      inputCost: parseFloat(inputCost.toFixed(8)),
      outputCost: parseFloat(outputCost.toFixed(8)),
      totalCost: parseFloat(totalCost.toFixed(8)),
      formatted: `$${totalCost.toFixed(6)}`,
    };
  };

  AIModel.prototype.getPricingDisplay = function () {
    return {
      input: `$${parseFloat(this.inputPricing).toFixed(6)}/1K tokens`,
      output: `$${parseFloat(this.outputPricing).toFixed(6)}/1K tokens`,
    };
  };

  // Class methods
  AIModel.getEnabledModels = async function () {
    return await this.findAll({
      where: { enabled: true },
      include: [
        {
          model: sequelize.models.AIProvider,
          as: "provider",
          where: { enabled: true },
          attributes: ["providerId", "name", "requestFormat"],
        },
      ],
      order: [["priority", "ASC"]],
    });
  };

  AIModel.getDefaultModel = async function (providerId) {
    return await this.findOne({
      where: {
        enabled: true,
        isDefault: true,
      },
      include: [
        {
          model: sequelize.models.AIProvider,
          as: "provider",
          where: {
            providerId: providerId,
            enabled: true,
          },
        },
      ],
    });
  };

  AIModel.getModelsByProvider = async function (providerId) {
    return await this.findAll({
      where: { enabled: true },
      include: [
        {
          model: sequelize.models.AIProvider,
          as: "provider",
          where: {
            providerId: providerId,
            enabled: true,
          },
        },
      ],
      order: [["priority", "ASC"]],
    });
  };

  AIModel.getModelByProviderAndModel = async function (providerId, modelId) {
    return await this.findOne({
      where: {
        modelId: modelId,
        enabled: true,
      },
      include: [
        {
          model: sequelize.models.AIProvider,
          as: "provider",
          where: {
            providerId: providerId,
            enabled: true,
          },
        },
      ],
    });
  };

  return AIModel;
};
