
import { Sequelize, DataTypes } from "sequelize";
import config from "../../src/config/config.js";

const sequelize = new Sequelize({
  ...config.database,
  logging: console.log,
});

const runMigration = async () => {
  try {
    const queryInterface = sequelize.getQueryInterface();

    console.log("Adding WABA columns to Devices table...");

    // 1. Add provider column
    try {
      await queryInterface.addColumn('Devices', 'provider', {
        type: DataTypes.ENUM('baileys', 'waba'),
        defaultValue: 'baileys',
      });
      console.log('Added provider column');
    } catch (e) {
      console.log('Provider column might already exist:', e.message);
    }

    // 2. Add wabaPhoneNumberId
    try {
      await queryInterface.addColumn('Devices', 'wabaPhoneNumberId', {
        type: DataTypes.STRING,
        allowNull: true,
      });
      console.log('Added wabaPhoneNumberId column');
    } catch (e) {
      console.log('wabaPhoneNumberId column might already exist:', e.message);
    }

    // 3. Add wabaBusinessAccountId
    try {
      await queryInterface.addColumn('Devices', 'wabaBusinessAccountId', {
        type: DataTypes.STRING,
        allowNull: true,
      });
      console.log('Added wabaBusinessAccountId column');
    } catch (e) {
      console.log('wabaBusinessAccountId column might already exist:', e.message);
    }

    // 4. Add wabaAccessToken
    try {
      await queryInterface.addColumn('Devices', 'wabaAccessToken', {
        type: DataTypes.TEXT,
        allowNull: true,
      });
      console.log('Added wabaAccessToken column');
    } catch (e) {
      console.log('wabaAccessToken column might already exist:', e.message);
    }

    console.log("Migration completed!");
    process.exit(0);

  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

runMigration();
