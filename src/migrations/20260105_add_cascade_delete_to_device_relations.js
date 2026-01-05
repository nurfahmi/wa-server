/**
 * Migration: Add CASCADE DELETE to Device foreign key constraints
 * 
 * This migration updates existing foreign key constraints to include
 * ON DELETE CASCADE for proper cleanup when devices are deleted.
 */

export const up = async (queryInterface, Sequelize) => {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    // Get database name from config
    const dbName = queryInterface.sequelize.config.database;

    // Drop and recreate foreign key constraints with CASCADE

    // 1. AIUsageLogs -> Devices
    console.log('Updating AIUsageLogs foreign key...');
    await queryInterface.sequelize.query(
      `ALTER TABLE AIUsageLogs DROP FOREIGN KEY aiusagelogs_ibfk_1`,
      { transaction }
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE AIUsageLogs 
       ADD CONSTRAINT aiusagelogs_ibfk_1 
       FOREIGN KEY (deviceId) 
       REFERENCES Devices(id) 
       ON DELETE CASCADE 
       ON UPDATE CASCADE`,
      { transaction }
    );

    // 2. ChatSettings -> Devices
    console.log('Updating ChatSettings foreign key...');
    await queryInterface.sequelize.query(
      `ALTER TABLE ChatSettings DROP FOREIGN KEY chatsettings_ibfk_1`,
      { transaction }
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE ChatSettings 
       ADD CONSTRAINT chatsettings_ibfk_1 
       FOREIGN KEY (deviceId) 
       REFERENCES Devices(id) 
       ON DELETE CASCADE 
       ON UPDATE CASCADE`,
      { transaction }
    );

    // 3. AIConversationMemories -> Devices
    console.log('Updating AIConversationMemories foreign key...');
    await queryInterface.sequelize.query(
      `ALTER TABLE AIConversationMemories DROP FOREIGN KEY aiconversationmemories_ibfk_1`,
      { transaction }
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE AIConversationMemories 
       ADD CONSTRAINT aiconversationmemories_ibfk_1 
       FOREIGN KEY (deviceId) 
       REFERENCES Devices(id) 
       ON DELETE CASCADE 
       ON UPDATE CASCADE`,
      { transaction }
    );

    // 4. StoredFiles -> Devices (if exists)
    console.log('Updating StoredFiles foreign key...');
    try {
      await queryInterface.sequelize.query(
        `ALTER TABLE StoredFiles DROP FOREIGN KEY storedfiles_ibfk_1`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE StoredFiles 
         ADD CONSTRAINT storedfiles_ibfk_1 
         FOREIGN KEY (deviceId) 
         REFERENCES Devices(id) 
         ON DELETE CASCADE 
         ON UPDATE CASCADE`,
        { transaction }
      );
    } catch (error) {
      console.log('StoredFiles constraint update skipped (table may not exist):', error.message);
    }

    await transaction.commit();
    console.log('✅ All foreign key constraints updated successfully');
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

export const down = async (queryInterface, Sequelize) => {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    // Revert back to original foreign keys without CASCADE

    // 1. AIUsageLogs
    await queryInterface.sequelize.query(
      `ALTER TABLE AIUsageLogs DROP FOREIGN KEY aiusagelogs_ibfk_1`,
      { transaction }
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE AIUsageLogs 
       ADD CONSTRAINT aiusagelogs_ibfk_1 
       FOREIGN KEY (deviceId) 
       REFERENCES Devices(id)`,
      { transaction }
    );

    // 2. ChatSettings
    await queryInterface.sequelize.query(
      `ALTER TABLE ChatSettings DROP FOREIGN KEY chatsettings_ibfk_1`,
      { transaction }
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE ChatSettings 
       ADD CONSTRAINT chatsettings_ibfk_1 
       FOREIGN KEY (deviceId) 
       REFERENCES Devices(id)`,
      { transaction }
    );

    // 3. AIConversationMemories
    await queryInterface.sequelize.query(
      `ALTER TABLE AIConversationMemories DROP FOREIGN KEY aiconversationmemories_ibfk_1`,
      { transaction }
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE AIConversationMemories 
       ADD CONSTRAINT aiconversationmemories_ibfk_1 
       FOREIGN KEY (deviceId) 
       REFERENCES Devices(id)`,
      { transaction }
    );

    // 4. StoredFiles
    try {
      await queryInterface.sequelize.query(
        `ALTER TABLE StoredFiles DROP FOREIGN KEY storedfiles_ibfk_1`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE StoredFiles 
         ADD CONSTRAINT storedfiles_ibfk_1 
         FOREIGN KEY (deviceId) 
         REFERENCES Devices(id)`,
        { transaction }
      );
    } catch (error) {
      console.log('StoredFiles constraint rollback skipped:', error.message);
    }

    await transaction.commit();
    console.log('✅ Foreign key constraints reverted successfully');
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Rollback failed:', error);
    throw error;
  }
};

