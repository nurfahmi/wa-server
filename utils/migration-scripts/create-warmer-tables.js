const { sequelize } = require("./src/models");

async function createWarmerTables() {
  try {
    console.log("Creating warmer tables...");

    // Sync only the warmer models
    await sequelize.sync({
      force: false,
      alter: false,
    });

    console.log("✅ Warmer tables created successfully!");
    console.log("Tables created:");
    console.log("- warmer_campaigns");
    console.log("- warmer_conversation_templates");
    console.log("- warmer_conversation_logs");
  } catch (error) {
    console.error("❌ Error creating warmer tables:", error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the migration
if (require.main === module) {
  createWarmerTables()
    .then(() => {
      console.log("🎉 Migration completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Migration failed:", error);
      process.exit(1);
    });
}

module.exports = createWarmerTables;
