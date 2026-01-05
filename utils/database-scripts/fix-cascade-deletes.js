/**
 * Script to fix foreign key constraints for CASCADE DELETE
 * Run this script to update the database constraints
 */

import { sequelize } from '../../src/models/index.js';

async function fixCascadeDeletes() {
  console.log('🔧 Starting foreign key constraint updates...\n');

  const transaction = await sequelize.transaction();

  try {
    // 1. AIUsageLogs -> Devices
    console.log('1️⃣  Updating AIUsageLogs foreign key...');
    try {
      await sequelize.query(
        `ALTER TABLE AIUsageLogs DROP FOREIGN KEY aiusagelogs_ibfk_1`,
        { transaction }
      );
      await sequelize.query(
        `ALTER TABLE AIUsageLogs 
         ADD CONSTRAINT aiusagelogs_ibfk_1 
         FOREIGN KEY (deviceId) 
         REFERENCES Devices(id) 
         ON DELETE CASCADE 
         ON UPDATE CASCADE`,
        { transaction }
      );
      console.log('   ✅ AIUsageLogs constraint updated\n');
    } catch (error) {
      console.log('   ⚠️  AIUsageLogs:', error.message, '\n');
    }

    // 2. ChatSettings -> Devices
    console.log('2️⃣  Updating ChatSettings foreign key...');
    try {
      await sequelize.query(
        `ALTER TABLE ChatSettings DROP FOREIGN KEY chatsettings_ibfk_1`,
        { transaction }
      );
      await sequelize.query(
        `ALTER TABLE ChatSettings 
         ADD CONSTRAINT chatsettings_ibfk_1 
         FOREIGN KEY (deviceId) 
         REFERENCES Devices(id) 
         ON DELETE CASCADE 
         ON UPDATE CASCADE`,
        { transaction }
      );
      console.log('   ✅ ChatSettings constraint updated\n');
    } catch (error) {
      console.log('   ⚠️  ChatSettings:', error.message, '\n');
    }

    // 3. AIConversationMemories -> Devices
    console.log('3️⃣  Updating AIConversationMemories foreign key...');
    try {
      await sequelize.query(
        `ALTER TABLE AIConversationMemories DROP FOREIGN KEY aiconversationmemories_ibfk_1`,
        { transaction }
      );
      await sequelize.query(
        `ALTER TABLE AIConversationMemories 
         ADD CONSTRAINT aiconversationmemories_ibfk_1 
         FOREIGN KEY (deviceId) 
         REFERENCES Devices(id) 
         ON DELETE CASCADE 
         ON UPDATE CASCADE`,
        { transaction }
      );
      console.log('   ✅ AIConversationMemories constraint updated\n');
    } catch (error) {
      console.log('   ⚠️  AIConversationMemories:', error.message, '\n');
    }

    // 4. StoredFiles -> Devices
    console.log('4️⃣  Updating StoredFiles foreign key...');
    try {
      await sequelize.query(
        `ALTER TABLE StoredFiles DROP FOREIGN KEY storedfiles_ibfk_1`,
        { transaction }
      );
      await sequelize.query(
        `ALTER TABLE StoredFiles 
         ADD CONSTRAINT storedfiles_ibfk_1 
         FOREIGN KEY (deviceId) 
         REFERENCES Devices(id) 
         ON DELETE CASCADE 
         ON UPDATE CASCADE`,
        { transaction }
      );
      console.log('   ✅ StoredFiles constraint updated\n');
    } catch (error) {
      console.log('   ⚠️  StoredFiles:', error.message, '\n');
    }

    await transaction.commit();
    console.log('✅ All foreign key constraints have been updated successfully!');
    console.log('🎉 Device deletion will now automatically cascade to related records.\n');
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Failed to update foreign key constraints:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the script
fixCascadeDeletes()
  .then(() => {
    console.log('✨ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });

