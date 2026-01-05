// Cleanup script for failed migration
const { sequelize } = require("./src/models");

async function cleanupFailedMigration() {
  console.log("🧹 Starting cleanup of failed migration...");
  console.log("📡 Using existing application database connection...");

  try {
    // Test connection using the existing sequelize instance
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully.");

    // Get the query interface
    const queryInterface = sequelize.getQueryInterface();

    console.log("🔍 Checking for temporary columns...");

    const tables = ["Devices", "Messages", "contact_data", "UserAISettings"];

    for (const table of tables) {
      try {
        console.log(`🔍 Checking ${table}...`);
        const columns = await queryInterface.describeTable(table);

        if (columns.userId_temp) {
          console.log(`🧹 Found userId_temp in ${table}, removing...`);
          await queryInterface.removeColumn(table, "userId_temp");
          console.log(`✅ Removed userId_temp from ${table}`);
        } else {
          console.log(`✅ No userId_temp found in ${table}`);
        }

        // Show current column info
        const currentColumns = await queryInterface.describeTable(table);
        if (currentColumns.userId) {
          console.log(`📊 ${table}.userId type: ${currentColumns.userId.type}`);
        }
      } catch (error) {
        console.log(`❌ Error checking ${table}:`, error.message);
      }
    }

    console.log("🎉 Cleanup completed!");
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
    process.exit(1);
  } finally {
    console.log("🔄 Cleanup process completed.");
    process.exit(0);
  }
}

// Run the cleanup
cleanupFailedMigration();
