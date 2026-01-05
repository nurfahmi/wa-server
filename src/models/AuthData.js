import { DataTypes } from "sequelize";

/**
 * AuthData model - mysql-baileys package creates this table automatically
 * This model is kept for reference but the table is managed by mysql-baileys
 */
export default (sequelize) => {
  const AuthData = sequelize.define(
    "AuthData",
    {
      session: {
        type: DataTypes.STRING(50),
        allowNull: false,
        primaryKey: true,
      },
      id: {
        type: DataTypes.STRING(100),
        allowNull: false,
        primaryKey: true,
      },
      value: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      tableName: "auth_data",
      timestamps: false,
      indexes: [
        {
          unique: true,
          fields: ["session", "id"],
        },
      ],
    }
  );

  return AuthData;
};
