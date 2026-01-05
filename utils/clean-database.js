/**
 * Clean Database Script
 * Removes all WhatsApp session data, auth data, messages, contacts, and files
 * Use this to start with a completely clean slate
 */

import { sequelize } from "../src/models/index.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function cleanDatabase() {
  try {
    console.log("🧹 Starting database cleanup...");

    // Disable foreign key checks temporarily
    await sequelize.query("SET FOREIGN_KEY_CHECKS = 0");

    // Clear WhatsApp session data (most important for clean start)
    console.log("🗑️  Clearing device sessions...");
    await sequelize.query("DELETE FROM Devices");

    console.log("🗑️  Clearing authentication data...");
    await sequelize.query("DELETE FROM AuthDatas");

    // Clear messaging data
    console.log("🗑️  Clearing messages...");
    await sequelize.query("DELETE FROM Messages");

    console.log("🗑️  Clearing contacts...");
    await sequelize.query("DELETE FROM ContactDatas");
    await sequelize.query("DELETE FROM Contacts");

    console.log("🗑️  Clearing chats and chat settings...");
    await sequelize.query("DELETE FROM ChatSettings");
    await sequelize.query("DELETE FROM Chats");

    // Clear file storage
    console.log("🗑️  Clearing stored files...");
    await sequelize.query("DELETE FROM StoredFiles");

    // Clear AI conversation memory
    console.log("🗑️  Clearing AI conversation memory...");
    await sequelize.query("DELETE FROM AIConversationMemories");

    console.log("🗑️  Clearing AI usage logs...");
    await sequelize.query("DELETE FROM AIUsageLogs");

    // Re-enable foreign key checks
    await sequelize.query("SET FOREIGN_KEY_CHECKS = 1");

    console.log("✅ Database cleanup completed successfully!");

    // Optional: Clean up uploaded files from filesystem
    await cleanUploadedFiles();

  } catch (error) {
    console.error("❌ Error during database cleanup:", error);
    process.exit(1);
  }
}

async function cleanUploadedFiles() {
  try {
    console.log("🗂️  Cleaning uploaded files from filesystem...");

    const uploadsDir = path.join(__dirname, "../uploads");

    // Clean users directory
    const usersDir = path.join(uploadsDir, "users");
    try {
      await fs.rm(usersDir, { recursive: true, force: true });
      await fs.mkdir(usersDir, { recursive: true });
      console.log("✅ Users uploads directory cleaned");
    } catch (error) {
      console.log("⚠️  Could not clean users directory:", error.message);
    }

    // Clean temp directory
    const tempDir = path.join(uploadsDir, "temp");
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
      await fs.mkdir(tempDir, { recursive: true });
      console.log("✅ Temp uploads directory cleaned");
    } catch (error) {
      console.log("⚠️  Could not clean temp directory:", error.message);
    }

  } catch (error) {
    console.log("⚠️  Error cleaning uploaded files:", error.message);
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("🚨 WARNING: This will permanently delete ALL WhatsApp session data!");
  console.log("🚨 This includes: sessions, messages, contacts, files, and AI data");
  console.log("🚨 Make sure you have backups if you need to restore any data");
  console.log("");

  // Simple confirmation (in production, you might want a more robust confirmation)
  process.stdout.write("Type 'YES' to confirm deletion: ");

  process.stdin.once('data', async (input) => {
    const confirmation = input.toString().trim();

    if (confirmation === 'YES') {
      await cleanDatabase();
      console.log("\n🎉 Database is now clean! Ready for fresh WhatsApp sessions.");
      process.exit(0);
    } else {
      console.log("❌ Operation cancelled.");
      process.exit(0);
    }
  });
}

export { cleanDatabase, cleanUploadedFiles };

