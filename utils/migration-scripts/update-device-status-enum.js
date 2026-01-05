/**
 * Migration: Update Device Status Enum
 * Adds 'synchronizing' status to the existing enum
 */

import { sequelize } from "../../src/models/index.js";

async function updateDeviceStatusEnum() {
  try {
    console.log("🔄 Updating Device status enum to include 'synchronizing'...");

    // First, check current enum values
    const currentSchema = await sequelize.query('DESCRIBE Devices');
    const statusCol = currentSchema[0].find(col => col.Field === 'status');
    console.log("📋 Current status enum:", statusCol.Type);

    // Update the enum to include 'synchronizing'
    console.log("🔧 Executing ALTER TABLE...");
    await sequelize.query(`
      ALTER TABLE Devices
      MODIFY COLUMN status ENUM(
        'pending',
        'connecting',
        'synchronizing',
        'connected',
        'disconnected',
        'disconnecting',
        'error',
        'auth_failed',
        'logged_out',
        'reconnecting',
        'conflict',
        'deleted'
      ) DEFAULT 'pending'
    `);

    console.log("✅ Device status enum updated successfully!");
    console.log("📋 New status values available: pending, connecting, synchronizing, connected, disconnected, disconnecting, error, auth_failed, logged_out, reconnecting, conflict, deleted");

    // Verify the change
    const updatedSchema = await sequelize.query('DESCRIBE Devices');
    const updatedStatusCol = updatedSchema[0].find(col => col.Field === 'status');
    console.log("📋 Updated status enum:", updatedStatusCol.Type);

  } catch (error) {
    console.error("❌ Error updating device status enum:", error);
    console.error("Error details:", error.message);
    if (error.parent) {
      console.error("SQL Error:", error.parent.message);
    }
    process.exit(1);
  }
}

// Run migration if called directly
if (process.argv[1] && process.argv[1].includes('update-device-status-enum.js')) {
  updateDeviceStatusEnum().then(() => {
    console.log("🎉 Migration completed successfully!");
    process.exit(0);
  }).catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
}

export { updateDeviceStatusEnum };
