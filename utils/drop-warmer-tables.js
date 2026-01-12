#!/usr/bin/env node
/**
 * Drop Warmer Tables Script
 * 
 * This script drops all warmer-related tables from the database.
 * Run this after removing the warmer feature from the codebase.
 */

import { sequelize } from '../src/models/index.js';

async function dropWarmerTables() {
  console.log('\n' + '='.repeat(60));
  console.log('  DROPPING WARMER TABLES');
  console.log('='.repeat(60) + '\n');

  try {
    // Test connection
    console.log('📡 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Disable foreign key checks temporarily
    console.log('🔓 Disabling foreign key checks...');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

    // Drop warmer tables (try both naming conventions)
    const tables = [
      'WarmerConversationLogs',
      'warmer_conversation_logs',
      'WarmerConversationTemplates',
      'warmer_conversation_templates',
      'WarmerCampaigns',
      'warmer_campaigns'
    ];

    console.log('🗑️  Dropping warmer tables...\n');

    for (const table of tables) {
      try {
        await sequelize.query(`DROP TABLE IF EXISTS \`${table}\``);
        console.log(`   ✓ Dropped table: ${table}`);
      } catch (error) {
        console.log(`   ⚠ Could not drop ${table}: ${error.message}`);
      }
    }

    // Re-enable foreign key checks
    console.log('\n🔒 Re-enabling foreign key checks...');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

    // Verify tables are dropped
    console.log('\n📋 Verifying remaining tables...');
    const [results] = await sequelize.query(`
      SHOW TABLES LIKE '%armer%'
    `);

    if (results.length === 0) {
      console.log('✅ All warmer tables have been successfully removed!\n');
    } else {
      console.log('⚠️  Some warmer tables still exist:');
      results.forEach(row => {
        console.log(`   - ${Object.values(row)[0]}`);
      });
    }

    console.log('='.repeat(60));
    console.log('  CLEANUP COMPLETE');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Error dropping warmer tables:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the script
dropWarmerTables();
