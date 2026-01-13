/**
 * Standalone Migration: Add Device Archive Support
 * 
 * Run this directly with: node src/migrations/run_archive_migration.js
 * 
 * This script adds the necessary columns and modifies the status enum
 * for the chat history archive feature.
 */

import { sequelize } from '../models/index.js';

async function runMigration() {
  console.log('[MIGRATION] Starting device archive support migration...');
  
  const transaction = await sequelize.transaction();
  
  try {
    const queryInterface = sequelize.getQueryInterface();
    
    // Check if columns already exist
    const [deviceCols] = await sequelize.query("SHOW COLUMNS FROM Devices", { transaction });
    const existingCols = deviceCols.map(c => c.Field);
    
    // 1. Add realPhoneNumber column to Devices
    if (!existingCols.includes('realPhoneNumber')) {
      console.log('[MIGRATION] Adding realPhoneNumber column...');
      await sequelize.query(`
        ALTER TABLE Devices ADD COLUMN realPhoneNumber VARCHAR(255) NULL 
        COMMENT 'Actual WhatsApp phone number captured on connection'
      `, { transaction });
      console.log('[MIGRATION] ✓ realPhoneNumber column added');
    } else {
      console.log('[MIGRATION] realPhoneNumber column already exists, skipping...');
    }

    // 2. Add archivedAt column to Devices
    if (!existingCols.includes('archivedAt')) {
      console.log('[MIGRATION] Adding archivedAt column...');
      await sequelize.query(`
        ALTER TABLE Devices ADD COLUMN archivedAt DATETIME NULL 
        COMMENT 'When device was archived'
      `, { transaction });
      console.log('[MIGRATION] ✓ archivedAt column added');
    } else {
      console.log('[MIGRATION] archivedAt column already exists, skipping...');
    }

    // 3. Add archiveReason column to Devices
    if (!existingCols.includes('archiveReason')) {
      console.log('[MIGRATION] Adding archiveReason column...');
      await sequelize.query(`
        ALTER TABLE Devices ADD COLUMN archiveReason 
        ENUM('blocked', 'switched_number', 'inactive', 'manual') NULL 
        COMMENT 'Reason for archiving'
      `, { transaction });
      console.log('[MIGRATION] ✓ archiveReason column added');
    } else {
      console.log('[MIGRATION] archiveReason column already exists, skipping...');
    }

    // 4. Modify status enum to include 'archived'
    console.log('[MIGRATION] Checking status enum for archived value...');
    const [statusDef] = await sequelize.query(
      "SHOW COLUMNS FROM Devices WHERE Field = 'status'", 
      { transaction }
    );
    
    if (statusDef[0] && !statusDef[0].Type.includes('archived')) {
      console.log('[MIGRATION] Adding archived to status enum...');
      await sequelize.query(`
        ALTER TABLE Devices 
        MODIFY COLUMN status ENUM(
          'pending', 'connecting', 'synchronizing', 'connected', 
          'disconnected', 'disconnecting', 'error', 'auth_failed', 
          'logged_out', 'reconnecting', 'conflict', 'deleted', 'archived'
        ) DEFAULT 'pending'
      `, { transaction });
      console.log('[MIGRATION] ✓ Status enum updated');
    } else {
      console.log('[MIGRATION] Status enum already includes archived, skipping...');
    }

    // 5. Check ChatHistories columns
    const [chatHistoryCols] = await sequelize.query("SHOW COLUMNS FROM ChatHistories", { transaction });
    const chatHistoryColNames = chatHistoryCols.map(c => c.Field);
    
    if (!chatHistoryColNames.includes('restoredFromDeviceId')) {
      console.log('[MIGRATION] Adding restoredFromDeviceId to ChatHistories...');
      await sequelize.query(`
        ALTER TABLE ChatHistories ADD COLUMN restoredFromDeviceId BIGINT NULL 
        COMMENT 'Original device ID if this was restored from archive'
      `, { transaction });
      console.log('[MIGRATION] ✓ restoredFromDeviceId added to ChatHistories');
    } else {
      console.log('[MIGRATION] restoredFromDeviceId already exists in ChatHistories, skipping...');
    }

    // 6. Check ChatSettings columns
    const [chatSettingsCols] = await sequelize.query("SHOW COLUMNS FROM ChatSettings", { transaction });
    const chatSettingsColNames = chatSettingsCols.map(c => c.Field);
    
    if (!chatSettingsColNames.includes('restoredFromDeviceId')) {
      console.log('[MIGRATION] Adding restoredFromDeviceId to ChatSettings...');
      await sequelize.query(`
        ALTER TABLE ChatSettings ADD COLUMN restoredFromDeviceId BIGINT NULL 
        COMMENT 'Original device ID if restored from archive'
      `, { transaction });
      console.log('[MIGRATION] ✓ restoredFromDeviceId added to ChatSettings');
    } else {
      console.log('[MIGRATION] restoredFromDeviceId already exists in ChatSettings, skipping...');
    }

    // 7. Add index on realPhoneNumber (optional, for faster phone matching)
    try {
      const [indexes] = await sequelize.query("SHOW INDEX FROM Devices WHERE Key_name = 'idx_devices_real_phone'", { transaction });
      if (indexes.length === 0) {
        console.log('[MIGRATION] Adding index on realPhoneNumber...');
        await sequelize.query(`
          CREATE INDEX idx_devices_real_phone ON Devices(realPhoneNumber)
        `, { transaction });
        console.log('[MIGRATION] ✓ Index added on realPhoneNumber');
      }
    } catch (e) {
      console.log('[MIGRATION] Index creation skipped:', e.message);
    }

    await transaction.commit();
    console.log('\n[MIGRATION] ✅ Device archive support migration completed successfully!\n');
    
    // Print summary
    console.log('Changes applied:');
    console.log('  - Devices.realPhoneNumber: VARCHAR(255) - Captured from WhatsApp on connect');
    console.log('  - Devices.archivedAt: DATETIME - Archive timestamp');
    console.log('  - Devices.archiveReason: ENUM - Reason for archiving');
    console.log('  - Devices.status: Added "archived" to enum values');
    console.log('  - ChatHistories.restoredFromDeviceId: BIGINT - Source device tracking');
    console.log('  - ChatSettings.restoredFromDeviceId: BIGINT - Source device tracking');
    
    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    console.error('\n[MIGRATION] ❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
