// Fix Contact source ENUM to include 'contacts_update'
// This script modifies the MySQL ENUM column to allow the new value

// Load environment variables
require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });

// Import sequelize from models
const { sequelize } = require("../../src/models");

async function fixContactSourceEnum() {
  try {
    console.log("🔧 Fixing Contact source ENUM to include 'contacts_update'...");

    // Connect to database
    await sequelize.authenticate();
    console.log("✅ Database connection established");

    // For MySQL, we need to modify the ENUM column
    // Try to find the Contacts table (could be Contacts or contacts)
    let tableName = null;
    try {
      const [results] = await sequelize.query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND (TABLE_NAME = 'Contacts' OR TABLE_NAME = 'contacts')
        AND TABLE_TYPE = 'BASE TABLE'
        LIMIT 1
      `);
      tableName = results[0]?.TABLE_NAME;
    } catch (error) {
      console.log("Could not query table name, trying default...");
    }

    // Default to Contacts (Sequelize default)
    if (!tableName) {
      tableName = "Contacts";
    }
    
    console.log(`📋 Using table: ${tableName}`);

    // Modify the ENUM column to include the new value
    // Use backticks to handle case sensitivity
    await sequelize.query(`
      ALTER TABLE \`${tableName}\` 
      MODIFY COLUMN \`source\` ENUM('contacts_upsert', 'contacts_set', 'contacts_update') NOT NULL
    `);

    console.log("✅ Successfully added 'contacts_update' to source ENUM");
    console.log("✅ Migration completed successfully!");
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error fixing Contact source ENUM:", error);
    
    // If the error is that the value already exists or column doesn't exist, that's okay
    if (error.message.includes("Duplicate") || error.message.includes("doesn't exist")) {
      console.log("ℹ️  ENUM value might already exist or column structure is different");
      console.log("ℹ️  This is okay - the model has been updated");
    }
    
    try {
      await sequelize.close();
    } catch (closeError) {
      // Ignore close errors
    }
    process.exit(1);
  }
}

fixContactSourceEnum();

