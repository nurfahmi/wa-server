const { sequelize } = require("./src/models");

async function updateContactSchema() {
  try {
    console.log("Updating ContactData schema...");

    // Add the lastUpdated column
    try {
      await sequelize.query(`
        ALTER TABLE contact_data 
        ADD COLUMN IF NOT EXISTS "lastUpdated" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      `);
      console.log("✓ Added lastUpdated column");
    } catch (error) {
      console.log("lastUpdated column might already exist:", error.message);
    }

    // Update the enum to include new values
    try {
      // First, add new enum values to the existing enum type
      await sequelize.query(`
        ALTER TYPE enum_contact_data_source 
        ADD VALUE IF NOT EXISTS 'messaging_history'
      `);
      console.log("✓ Added messaging_history to enum");

      await sequelize.query(`
        ALTER TYPE enum_contact_data_source 
        ADD VALUE IF NOT EXISTS 'messaging_history_chats'
      `);
      console.log("✓ Added messaging_history_chats to enum");

      await sequelize.query(`
        ALTER TYPE enum_contact_data_source 
        ADD VALUE IF NOT EXISTS 'recent_chats_fallback'
      `);
      console.log("✓ Added recent_chats_fallback to enum");
    } catch (error) {
      console.log("Enum values might already exist:", error.message);
    }

    console.log("Schema update completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error updating schema:", error);
    process.exit(1);
  }
}

updateContactSchema();
