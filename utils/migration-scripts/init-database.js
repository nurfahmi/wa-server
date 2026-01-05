#!/usr/bin/env node
/**
 * Database Initialization Script
 * 
 * This script will create all required tables in your Supabase PostgreSQL database.
 * Run this ONCE when setting up a new/empty database.
 * 
 * Usage: node utils/migration-scripts/init-database.js
 */

require("dotenv").config();
const { Sequelize } = require("sequelize");

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.dim}  →${colors.reset} ${msg}`),
};

async function initDatabase() {
  console.log("\n" + "=".repeat(60));
  console.log("  BAILEYS DATABASE INITIALIZATION");
  console.log("=".repeat(60) + "\n");

  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    log.error("DATABASE_URL is not set in .env file!");
    log.info("Please set DATABASE_URL to your Supabase connection string:");
    console.log("\n  DATABASE_URL=postgresql://postgres:your-password@db.your-project.supabase.co:5432/postgres\n");
    process.exit(1);
  }

  log.info(`Database URL: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);

  // Create Sequelize instance
  const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    logging: false,
  });

  try {
    // Step 1: Test connection
    log.info("Testing database connection...");
    await sequelize.authenticate();
    log.success("Database connection established successfully!");

    // Step 2: Import all models
    log.info("Loading models...");
    
    const Device = require("../../src/models/Device")(sequelize);
    const Message = require("../../src/models/Message")(sequelize);
    const ContactData = require("../../src/models/ContactData")(sequelize);
    const Contact = require("../../src/models/Contact")(sequelize);
    const Chat = require("../../src/models/Chat")(sequelize);
    const ChatSettings = require("../../src/models/ChatSettings")(sequelize);
    const AIConversationMemory = require("../../src/models/AIConversationMemory")(sequelize);
    const AIUsageLog = require("../../src/models/AIUsageLog")(sequelize);
    const AICostAlert = require("../../src/models/AICostAlert")(sequelize);
    const UserAISettings = require("../../src/models/UserAISettings")(sequelize);
    const BusinessTemplate = require("../../src/models/BusinessTemplate")(sequelize);
    const AIProvider = require("../../src/models/AIProvider")(sequelize);
    const AIModel = require("../../src/models/AIModel")(sequelize);
    const StoredFile = require("../../src/models/StoredFile")(sequelize);
    const AuthData = require("../../src/models/AuthData")(sequelize);
    const WarmerCampaign = require("../../src/models/WarmerCampaign")(sequelize);
    const WarmerConversationTemplate = require("../../src/models/WarmerConversationTemplate")(sequelize);
    const WarmerConversationLog = require("../../src/models/WarmerConversationLog")(sequelize);

    log.success("18 models loaded successfully!");

    // Step 3: Define associations
    log.info("Setting up model associations...");
    
    // Device associations
    Device.hasMany(Message, { foreignKey: "sessionId", sourceKey: "sessionId" });
    Message.belongsTo(Device, { foreignKey: "sessionId", targetKey: "sessionId" });
    Device.hasMany(ChatSettings, { foreignKey: "deviceId" });
    ChatSettings.belongsTo(Device, { foreignKey: "deviceId" });
    Device.hasMany(StoredFile, { foreignKey: "deviceId", as: "storedFiles" });
    StoredFile.belongsTo(Device, { foreignKey: "deviceId", as: "device" });

    // AI Provider associations
    AIProvider.hasMany(AIModel, { foreignKey: "providerId", as: "models" });
    AIModel.belongsTo(AIProvider, { foreignKey: "providerId", as: "provider" });

    // Warmer associations
    WarmerCampaign.hasMany(WarmerConversationTemplate, { foreignKey: "campaignId", as: "conversationTemplates", onDelete: "CASCADE" });
    WarmerConversationTemplate.belongsTo(WarmerCampaign, { foreignKey: "campaignId", as: "campaign" });
    WarmerCampaign.hasMany(WarmerConversationLog, { foreignKey: "campaignId", as: "conversationLogs", onDelete: "CASCADE" });
    WarmerConversationLog.belongsTo(WarmerCampaign, { foreignKey: "campaignId", as: "campaign" });
    WarmerConversationLog.belongsTo(WarmerConversationTemplate, { foreignKey: "templateId", as: "template" });

    log.success("Model associations configured!");

    // Step 4: Sync database (create tables)
    log.info("Creating database tables...");
    console.log("");
    
    // Create tables in order (to handle foreign key dependencies)
    const models = [
      { name: "Devices", model: Device },
      { name: "Messages", model: Message },
      { name: "Contacts", model: Contact },
      { name: "ContactData", model: ContactData },
      { name: "Chats", model: Chat },
      { name: "ChatSettings", model: ChatSettings },
      { name: "AIConversationMemories", model: AIConversationMemory },
      { name: "AIUsageLogs", model: AIUsageLog },
      { name: "AICostAlerts", model: AICostAlert },
      { name: "UserAISettings", model: UserAISettings },
      { name: "BusinessTemplates", model: BusinessTemplate },
      { name: "AIProviders", model: AIProvider },
      { name: "AIModels", model: AIModel },
      { name: "StoredFiles", model: StoredFile },
      { name: "AuthData", model: AuthData },
      { name: "WarmerCampaigns", model: WarmerCampaign },
      { name: "WarmerConversationTemplates", model: WarmerConversationTemplate },
      { name: "WarmerConversationLogs", model: WarmerConversationLog },
    ];

    // Use sync with alter:true to create tables if they don't exist
    await sequelize.sync({ alter: true });
    
    for (const { name } of models) {
      log.step(`Table "${name}" ready`);
    }

    console.log("");
    log.success("All 18 tables created successfully!");

    // Step 5: Ensure postgres-baileys auth_data table has correct schema
    log.info("Ensuring postgres-baileys auth_data table has correct schema...");
    
    // Check if auth_data table has wrong schema and fix it
    const [authDataCols] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'auth_data' AND column_name = 'session_key';
    `);
    
    if (authDataCols.length === 0) {
      // Table doesn't have correct schema, recreate it
      log.step("Recreating auth_data table with correct schema...");
      await sequelize.query(`DROP TABLE IF EXISTS auth_data CASCADE;`);
      await sequelize.query(`
        CREATE TABLE auth_data (
          session_key VARCHAR(255) PRIMARY KEY,
          data TEXT NOT NULL
        );
      `);
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_auth_data_session_key ON auth_data (session_key);
      `);
    }
    log.success("postgres-baileys auth_data table ready!");

    // Step 6: Verify tables exist
    log.info("Verifying tables...");
    const [results] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log("");
    log.success(`Found ${results.length} tables in database:`);
    results.forEach((row, index) => {
      log.step(`${index + 1}. ${row.table_name}`);
    });

    console.log("\n" + "=".repeat(60));
    console.log("  DATABASE INITIALIZATION COMPLETE!");
    console.log("=".repeat(60));
    console.log(`\n${colors.green}Your Supabase database is now ready to use.${colors.reset}`);
    console.log(`\nNext steps:`);
    console.log(`  1. Run ${colors.cyan}npm run seed:ai${colors.reset} to seed AI providers`);
    console.log(`  2. Run ${colors.cyan}npm run seed:business${colors.reset} to seed business templates`);
    console.log(`  3. Run ${colors.cyan}npm start${colors.reset} to start the server\n`);

  } catch (error) {
    console.log("");
    log.error("Database initialization failed!");
    console.error("\nError details:", error.message);
    
    if (error.message.includes("SSL")) {
      log.warn("SSL connection issue. Make sure your Supabase project allows SSL connections.");
    }
    
    if (error.message.includes("authentication")) {
      log.warn("Authentication failed. Check your DATABASE_URL password.");
    }
    
    if (error.message.includes("ENOTFOUND") || error.message.includes("ECONNREFUSED")) {
      log.warn("Cannot reach database server. Check your DATABASE_URL host.");
    }

    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the initialization
initDatabase();

