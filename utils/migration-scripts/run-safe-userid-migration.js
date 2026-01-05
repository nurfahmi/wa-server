// Safe migration approach that handles existing data conversion
const { sequelize } = require("./src/models");

async function runSafeUserIdMigration() {
  console.log("🚀 Starting SAFE userId migration to UUID format...");
  console.log("📡 Using existing application database connection...");

  try {
    // Test connection using the existing sequelize instance
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully.");

    // Get the query interface
    const queryInterface = sequelize.getQueryInterface();
    const { Sequelize } = require("sequelize");

    console.log("📋 Running SAFE migration steps...");
    console.log(
      "⚠️  This migration will convert existing numeric userIds to strings"
    );

    // Step 1: Add temporary columns
    console.log("🔄 Step 1: Adding temporary columns...");

    await queryInterface.addColumn("Devices", "userId_temp", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("Messages", "userId_temp", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("contact_data", "userId_temp", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("UserAISettings", "userId_temp", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    // Step 2: Copy and convert data
    console.log("🔄 Step 2: Converting existing data...");

    // Convert Devices
    await sequelize.query(`
      UPDATE "Devices" 
      SET "userId_temp" = CAST("userId" AS VARCHAR)
      WHERE "userId_temp" IS NULL
    `);

    // Convert Messages
    await sequelize.query(`
      UPDATE "Messages" 
      SET "userId_temp" = CAST("userId" AS VARCHAR)
      WHERE "userId_temp" IS NULL
    `);

    // Convert ContactData
    await sequelize.query(`
      UPDATE "contact_data" 
      SET "userId_temp" = CAST("userId" AS VARCHAR)
      WHERE "userId_temp" IS NULL
    `);

    // Convert UserAISettings
    await sequelize.query(`
      UPDATE "UserAISettings" 
      SET "userId_temp" = CAST("userId" AS VARCHAR)
      WHERE "userId_temp" IS NULL
    `);

    // Step 3: Drop old columns
    console.log("🔄 Step 3: Removing old columns...");

    await queryInterface.removeColumn("Devices", "userId");
    await queryInterface.removeColumn("Messages", "userId");
    await queryInterface.removeColumn("contact_data", "userId");
    await queryInterface.removeColumn("UserAISettings", "userId");

    // Step 4: Rename temp columns to original names
    console.log("🔄 Step 4: Renaming columns...");

    await queryInterface.renameColumn("Devices", "userId_temp", "userId");
    await queryInterface.renameColumn("Messages", "userId_temp", "userId");
    await queryInterface.renameColumn("contact_data", "userId_temp", "userId");
    await queryInterface.renameColumn(
      "UserAISettings",
      "userId_temp",
      "userId"
    );

    // Step 5: Add constraints back
    console.log("🔄 Step 5: Adding constraints...");

    await queryInterface.changeColumn("Devices", "userId", {
      type: Sequelize.STRING,
      allowNull: false,
      comment: "User ID (UUID format) who owns this device",
    });

    await queryInterface.changeColumn("Messages", "userId", {
      type: Sequelize.STRING,
      allowNull: false,
      comment: "User ID (UUID format) who sent this message",
    });

    await queryInterface.changeColumn("contact_data", "userId", {
      type: Sequelize.STRING,
      allowNull: false,
      comment: "User ID (UUID format) who owns this contact",
    });

    await queryInterface.changeColumn("UserAISettings", "userId", {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
      comment: "User ID (UUID format) for AI settings",
    });

    console.log("🎉 SAFE Migration completed successfully!");
    console.log("");
    console.log("📝 Summary of changes:");
    console.log(
      "  • Devices.userId: BIGINT → STRING (existing data converted)"
    );
    console.log(
      "  • Messages.userId: BIGINT → STRING (existing data converted)"
    );
    console.log(
      "  • ContactData.userId: BIGINT → STRING (existing data converted)"
    );
    console.log(
      "  • UserAISettings.userId: BIGINT → STRING (existing data converted)"
    );
    console.log("");
    console.log("✨ Your frontend can now use UUID strings for userId!");
    console.log("   Existing numeric userIds have been converted to strings");
    console.log(
      "   Example: '123' → '123', new UUIDs: 'user-550e8400-e29b-41d4-a716-446655440000'"
    );
  } catch (error) {
    console.error("❌ SAFE Migration failed:", error);
    console.log("");
    console.log("🔧 If migration failed partway through:");
    console.log("   1. Check which step failed");
    console.log("   2. You may need to manually clean up temporary columns");
    console.log("   3. Contact support if data recovery is needed");

    process.exit(1);
  } finally {
    console.log("🔄 Migration process completed.");
    process.exit(0);
  }
}

// Run the safe migration
runSafeUserIdMigration();
