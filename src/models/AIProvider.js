import { DataTypes } from "sequelize";

export default (sequelize) => {
  const AIProvider = sequelize.define(
    "AIProvider",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      providerId: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: "Unique identifier for the provider (e.g., openai, deepseek)",
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: "Display name of the provider",
      },
      enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: "Whether this provider is enabled",
      },
      baseURL: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: "API base URL for the provider",
      },
      apiKey: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Actual API key for the provider (encrypted/secured)",
      },
      requestFormat: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "openai",
        comment: "Request format type (openai, anthropic, gemini, etc.)",
      },
      headers: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "Default headers for API requests",
      },
      priority: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 100,
        comment:
          "Priority order for provider selection (lower = higher priority)",
      },
    },
    {
      tableName: "AIProviders",
      timestamps: true,
      indexes: [
        { fields: ["providerId"] },
        { fields: ["enabled"] },
        { fields: ["priority"] },
      ],
    }
  );

  AIProvider.associate = (models) => {
    AIProvider.hasMany(models.AIModel, {
      foreignKey: "providerId",
      as: "models",
      onDelete: "CASCADE",
    });
  };

  // Instance methods
  AIProvider.prototype.getApiKey = function () {
    return this.apiKey;
  };

  AIProvider.prototype.isApiKeyConfigured = function () {
    return this.apiKey && this.apiKey.trim().length > 0;
  };

  AIProvider.prototype.getHeaders = function () {
    const apiKey = this.getApiKey();
    if (!apiKey) return this.headers || {};

    const headers = { ...(this.headers || {}) };

    // Set up headers based on request format
    switch (this.requestFormat) {
      case "openai":
        headers["Authorization"] = `Bearer ${apiKey}`;
        headers["Content-Type"] = "application/json";
        break;
      case "anthropic":
        headers["x-api-key"] = apiKey;
        headers["Content-Type"] = "application/json";
        headers["anthropic-version"] = "2023-06-01";
        break;
      case "gemini":
        headers["Content-Type"] = "application/json";
        // Gemini uses API key in URL params
        break;
      default:
        headers["Authorization"] = `Bearer ${apiKey}`;
        headers["Content-Type"] = "application/json";
    }

    return headers;
  };

  // Class methods
  AIProvider.getEnabledProviders = async function () {
    return await this.findAll({
      where: { enabled: true },
      include: [
        {
          model: sequelize.models.AIModel,
          as: "models",
          where: { enabled: true },
          required: false,
        },
      ],
      order: [["priority", "ASC"]],
    });
  };

  AIProvider.getProviderByIdWithModels = async function (providerId) {
    return await this.findOne({
      where: { providerId, enabled: true },
      include: [
        {
          model: sequelize.models.AIModel,
          as: "models",
          where: { enabled: true },
          required: false,
          order: [["priority", "ASC"]],
        },
      ],
    });
  };

  return AIProvider;
};
