const { sequelize } = require("../models");
const migration = require("../migrations/add-business-type-to-devices");

async function runMigration() {
  try {
    console.log("🔄 Connecting to database...");
    await sequelize.authenticate();
    console.log("✅ Database connected");

    console.log("🔄 Running migration: add-business-type-to-devices");
    await migration.up(sequelize.getQueryInterface(), sequelize.constructor);
    console.log("✅ Migration completed successfully");

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
