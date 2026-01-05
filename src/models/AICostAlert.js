import { DataTypes } from "sequelize";

export default (sequelize) => {
  const AICostAlert = sequelize.define(
    "AICostAlert",
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
        comment: "Device that triggered the alert",
      },
      alertType: {
        type: DataTypes.ENUM(
          "daily_threshold",
          "daily_limit",
          "monthly_threshold",
          "monthly_limit"
        ),
        allowNull: false,
        comment: "Type of cost alert triggered",
      },
      currentCost: {
        type: DataTypes.DECIMAL(12, 8),
        allowNull: false,
        comment: "Current cost when alert was triggered (in USD)",
      },
      limitAmount: {
        type: DataTypes.DECIMAL(12, 8),
        allowNull: false,
        comment: "The limit that was reached",
      },
      period: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment:
          "Period for the alert (YYYY-MM-DD for daily, YYYY-MM for monthly)",
      },
      resolved: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Whether this alert has been resolved/acknowledged",
      },
      resolvedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "When the alert was resolved",
      },
    },
    {
      tableName: "AICostAlerts",
      timestamps: true,
      indexes: [
        {
          fields: ["deviceId"],
        },
        {
          fields: ["alertType"],
        },
        {
          fields: ["resolved"],
        },
        {
          fields: ["createdAt"],
        },
        {
          fields: ["deviceId", "alertType", "resolved"],
        },
      ],
    }
  );

  // Instance methods
  AICostAlert.prototype.resolve = async function () {
    this.resolved = true;
    this.resolvedAt = new Date();
    return await this.save();
  };

  AICostAlert.prototype.getFormattedMessage = function () {
    const alertTypeLabels = {
      daily_threshold: "Daily Cost Threshold",
      daily_limit: "Daily Cost Limit",
      monthly_threshold: "Monthly Cost Threshold",
      monthly_limit: "Monthly Cost Limit",
    };

    return {
      type: alertTypeLabels[this.alertType] || this.alertType,
      currentCost: `$${parseFloat(this.currentCost).toFixed(6)}`,
      limitAmount: `$${parseFloat(this.limitAmount).toFixed(6)}`,
      period: this.period,
      timestamp: this.createdAt,
      resolved: this.resolved,
    };
  };

  // Class methods
  AICostAlert.getUnresolvedAlerts = async function (deviceId = null) {
    const whereClause = { resolved: false };
    if (deviceId) {
      whereClause.deviceId = deviceId;
    }

    return await this.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
    });
  };

  AICostAlert.getAlertHistory = async function (deviceId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await this.findAll({
      where: {
        deviceId,
        createdAt: {
          [sequelize.Sequelize.Op.gte]: startDate,
        },
      },
      order: [["createdAt", "DESC"]],
    });
  };

  AICostAlert.createAlert = async function (alertData) {
    const { deviceId, alertType, currentCost, limitAmount, period } = alertData;

    return await this.create({
      deviceId,
      alertType,
      currentCost,
      limitAmount,
      period,
    });
  };

  return AICostAlert;
};
