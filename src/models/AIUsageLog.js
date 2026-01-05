import { DataTypes } from "sequelize";

export default (sequelize) => {
  const AIUsageLog = sequelize.define(
    "AIUsageLog",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      deviceId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: "Devices",
          key: "id",
        },
      },
      sessionId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "WhatsApp session ID",
      },
      chatId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Chat ID where AI was used",
      },
      provider: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: "AI provider used (openai, deepseek, etc.)",
      },
      model: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: "Specific model used",
      },
      promptTokens: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Input tokens used",
      },
      completionTokens: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Output tokens generated",
      },
      totalTokens: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Total tokens (prompt + completion)",
      },
      costUSD: {
        type: DataTypes.DECIMAL(12, 8),
        allowNull: false,
        defaultValue: 0.0,
        comment: "Cost in USD for this request",
        get() {
          const value = this.getDataValue("costUSD");
          return value ? parseFloat(value) : 0;
        },
      },
      responseTime: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Response time in milliseconds",
      },
      success: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: "Whether the request was successful",
      },
      errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Error message if request failed",
      },
      messagePreview: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: "Preview of the AI response (first 200 chars)",
      },
    },
    {
      tableName: "AIUsageLogs",
      timestamps: true,
      indexes: [
        {
          fields: ["deviceId"],
        },
        {
          fields: ["sessionId"],
        },
        {
          fields: ["chatId"],
        },
        {
          fields: ["provider"],
        },
        {
          fields: ["createdAt"],
        },
        {
          fields: ["deviceId", "createdAt"],
        },
      ],
    }
  );

  // Static methods for analytics
  AIUsageLog.getTotalCostByDevice = async function (
    deviceId,
    startDate = null,
    endDate = null
  ) {
    const whereClause = { deviceId, success: true };

    if (startDate && endDate) {
      whereClause.createdAt = {
        [sequelize.Sequelize.Op.between]: [startDate, endDate],
      };
    }

    const result = await this.findOne({
      where: whereClause,
      attributes: [
        [sequelize.fn("SUM", sequelize.col("costUSD")), "totalCost"],
        [sequelize.fn("SUM", sequelize.col("totalTokens")), "totalTokens"],
        [sequelize.fn("COUNT", sequelize.col("id")), "totalRequests"],
      ],
      raw: true,
    });

    return {
      totalCost: parseFloat(result.totalCost || 0),
      totalTokens: parseInt(result.totalTokens || 0),
      totalRequests: parseInt(result.totalRequests || 0),
    };
  };

  AIUsageLog.getCostByProvider = async function (
    deviceId,
    startDate = null,
    endDate = null
  ) {
    const whereClause = { deviceId, success: true };

    if (startDate && endDate) {
      whereClause.createdAt = {
        [sequelize.Sequelize.Op.between]: [startDate, endDate],
      };
    }

    const results = await this.findAll({
      where: whereClause,
      attributes: [
        "provider",
        "model",
        [sequelize.fn("SUM", sequelize.col("costUSD")), "totalCost"],
        [sequelize.fn("SUM", sequelize.col("totalTokens")), "totalTokens"],
        [sequelize.fn("COUNT", sequelize.col("id")), "requests"],
        [sequelize.fn("AVG", sequelize.col("responseTime")), "avgResponseTime"],
      ],
      group: ["provider", "model"],
      raw: true,
    });

    return results.map((result) => ({
      provider: result.provider,
      model: result.model,
      totalCost: parseFloat(result.totalCost || 0),
      totalTokens: parseInt(result.totalTokens || 0),
      requests: parseInt(result.requests || 0),
      avgResponseTime: parseInt(result.avgResponseTime || 0),
    }));
  };

  AIUsageLog.getDailyCosts = async function (deviceId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const results = await this.findAll({
      where: {
        deviceId,
        success: true,
        createdAt: {
          [sequelize.Sequelize.Op.gte]: startDate,
        },
      },
      attributes: [
        [sequelize.fn("DATE", sequelize.col("createdAt")), "date"],
        [sequelize.fn("SUM", sequelize.col("costUSD")), "dailyCost"],
        [sequelize.fn("COUNT", sequelize.col("id")), "requests"],
      ],
      group: [sequelize.fn("DATE", sequelize.col("createdAt"))],
      order: [[sequelize.fn("DATE", sequelize.col("createdAt")), "ASC"]],
      raw: true,
    });

    return results.map((result) => ({
      date: result.date,
      cost: parseFloat(result.dailyCost || 0),
      requests: parseInt(result.requests || 0),
    }));
  };

  return AIUsageLog;
};
