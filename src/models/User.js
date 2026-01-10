import { DataTypes } from "sequelize";

export default (sequelize) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        // ID comes from external OAuth, so no autoIncrement
        comment: "User ID from IndosoftHouse Membership System",
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: true, // Nullable for OAuth users
      },
      role: {
        type: DataTypes.ENUM("user", "superadmin", "agent"),
        defaultValue: "user",
      },
      managerId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "ID of the main account if this is an agent",
      },
      planName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      deviceLimit: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        comment: "Max number of devices this user can create",
      },
      lastLogin: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["email"],
          name: "unique_user_email", // Explicitly named to prevent suffixing
        },
      ],
    }
  );

  return User;
};
