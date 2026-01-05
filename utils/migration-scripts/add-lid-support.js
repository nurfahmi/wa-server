#!/usr/bin/env node
/**
 * Migration Script: Add LID support to Contacts table
 * Run with: node utils/migration-scripts/add-lid-support.js
 */

import { Sequelize } from 'sequelize';
import config from '../../src/config/config.js';

async function runMigration() {
  console.log('🚀 Starting LID support migration...\n');

  const sequelize = new Sequelize({
    ...config.database,
    timezone: '+07:00',
    logging: console.log,
  });

  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    // Check if Contacts table exists
    const [tables] = await sequelize.query(`SHOW TABLES LIKE 'Contacts'`);
    if (tables.length === 0) {
      console.log('⚠️ Contacts table does not exist. It will be created when the server starts.');
      await sequelize.close();
      return;
    }

    // Get current table structure
    const [columns] = await sequelize.query(`DESCRIBE Contacts`);
    const columnNames = columns.map(c => c.Field);
    console.log('📋 Current columns:', columnNames.join(', '), '\n');

    // Add lid column if not exists
    if (!columnNames.includes('lid')) {
      console.log('➕ Adding lid column...');
      await sequelize.query(`
        ALTER TABLE Contacts 
        ADD COLUMN lid VARCHAR(255) NULL 
        COMMENT 'WhatsApp LID (Local Identifier) - new in Baileys v7.0.0'
      `);
      console.log('✅ lid column added\n');
    } else {
      console.log('✓ lid column already exists\n');
    }

    // Add pn column if not exists
    if (!columnNames.includes('pn')) {
      console.log('➕ Adding pn column...');
      await sequelize.query(`
        ALTER TABLE Contacts 
        ADD COLUMN pn VARCHAR(255) NULL 
        COMMENT 'Phone Number JID (@s.whatsapp.net format) - for LID mapping'
      `);
      console.log('✅ pn column added\n');
    } else {
      console.log('✓ pn column already exists\n');
    }

    // Add addressingMode column if not exists
    if (!columnNames.includes('addressingMode')) {
      console.log('➕ Adding addressingMode column...');
      await sequelize.query(`
        ALTER TABLE Contacts 
        ADD COLUMN addressingMode ENUM('pn', 'lid', 'unknown') DEFAULT 'pn' 
        COMMENT 'Preferred addressing mode for this contact (PN or LID)'
      `);
      console.log('✅ addressingMode column added\n');
    } else {
      console.log('✓ addressingMode column already exists\n');
    }

    // Modify source column from ENUM to VARCHAR if needed
    const sourceCol = columns.find(c => c.Field === 'source');
    if (sourceCol && sourceCol.Type.includes('enum')) {
      console.log('🔄 Changing source column from ENUM to VARCHAR...');
      await sequelize.query(`
        ALTER TABLE Contacts 
        MODIFY COLUMN source VARCHAR(50) NOT NULL 
        COMMENT 'Source of contact data (which Baileys event or sync method)'
      `);
      console.log('✅ source column modified\n');
    } else {
      console.log('✓ source column is already VARCHAR or does not need change\n');
    }

    // Add indexes if not exist
    console.log('📊 Adding indexes...');
    
    try {
      await sequelize.query(`CREATE INDEX idx_contact_lid ON Contacts (lid)`);
      console.log('✅ idx_contact_lid index added');
    } catch (e) {
      if (e.message.includes('Duplicate')) {
        console.log('✓ idx_contact_lid index already exists');
      } else {
        console.log('⚠️ Could not add idx_contact_lid:', e.message);
      }
    }

    try {
      await sequelize.query(`CREATE INDEX idx_contact_pn ON Contacts (pn)`);
      console.log('✅ idx_contact_pn index added');
    } catch (e) {
      if (e.message.includes('Duplicate')) {
        console.log('✓ idx_contact_pn index already exists');
      } else {
        console.log('⚠️ Could not add idx_contact_pn:', e.message);
      }
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('\nYou can now start the server with: npm run dev\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

runMigration();

