
import { sequelize } from '../src/models/index.js';

async function fixDatabase() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('Starting database schema fix...');

    // 1. Fix Devices Table
    console.log('Fixing Devices table...');
    try {
      await sequelize.query('ALTER TABLE Devices DROP FOREIGN KEY IF EXISTS devices_ibfk_1'); // Guessing name
      await sequelize.query('ALTER TABLE Devices DROP FOREIGN KEY IF EXISTS Devices_userId_foreign_idx'); 
    } catch (e) { /* ignore */ }

    try {
      await sequelize.query('DROP INDEX devices_user_id ON Devices');
    } catch (e) { console.log('Index devices_user_id not found or already dropped'); }
    
    try {
      await sequelize.query('DROP INDEX unique_user_device_alias ON Devices');
    } catch (e) { console.log('Index unique_user_device_alias not found or already dropped'); }

    // Modify column
    await sequelize.query('ALTER TABLE Devices MODIFY COLUMN userId INT(11) NOT NULL');
    console.log('Devices.userId converted to INT');

    // Add FK
    try {
      await sequelize.query(`
        ALTER TABLE Devices 
        ADD CONSTRAINT devices_userId_fk 
        FOREIGN KEY (userId) REFERENCES Users(id) 
        ON DELETE CASCADE ON UPDATE CASCADE
      `);
      console.log('Devices FK added');
    } catch (e) {
      console.error('Failed to add timestamp FK to Devices:', e.message);
    }

    // Re-add indexes
    try {
       await sequelize.query('CREATE INDEX devices_user_id ON Devices(userId)');
    } catch (e) {}
    
    // CLEANUP DUPLICATE KEYS IN DEVICES
    console.log('Cleaning up duplicate keys in Devices...');
    const [indexes] = await sequelize.query("SHOW INDEX FROM Devices");
    const duplicateIndexes = indexes
      .map(i => i.Key_name)
      .filter(name => name.startsWith('sessionId_') || name.startsWith('apiKey_'));
    
    const uniqueDuplicates = [...new Set(duplicateIndexes)]; // Dedupe names
    
    for (const indexName of uniqueDuplicates) {
       try {
         await sequelize.query(`DROP INDEX \`${indexName}\` ON Devices`);
         console.log(`Dropped duplicate index: ${indexName}`);
       } catch (e) {
         console.log(`Failed to drop ${indexName}: ${e.message}`);
       }
    }

    try {
      await sequelize.query('CREATE UNIQUE INDEX unique_user_device_alias ON Devices(userId, alias)');
      console.log('Devices unique index restored');
    } catch (e) { console.log('Could not restore unique_user_device_alias:', e.message); }


    // 2. Fix ChatSettings
    console.log('Fixing ChatSettings table...');
    try {
      await sequelize.query('DROP INDEX chat_settings_user_id ON ChatSettings');
    } catch (e) {}
    await sequelize.query('ALTER TABLE ChatSettings MODIFY COLUMN userId INT(11) NOT NULL');
    await sequelize.query('CREATE INDEX chat_settings_user_id ON ChatSettings(userId)');


    // 3. Fix Chats
    console.log('Fixing Chats table...');
    try {
      await sequelize.query('DROP INDEX chats_user_id ON Chats');
    } catch (e) {}
    // CLEANUP BAD DATA
    await sequelize.query("DELETE FROM Chats WHERE userId NOT REGEXP '^[0-9]+$'");
    await sequelize.query('ALTER TABLE Chats MODIFY COLUMN userId INT(11) NOT NULL');


    // 4. Fix Contacts
    console.log('Fixing Contacts table...');
    await sequelize.query("DELETE FROM Contacts WHERE userId NOT REGEXP '^[0-9]+$'");
    await sequelize.query('ALTER TABLE Contacts MODIFY COLUMN userId INT(11) NOT NULL');


    // 5. Fix contact_data
    console.log('Fixing contact_data table...');
    await sequelize.query("DELETE FROM contact_data WHERE userId NOT REGEXP '^[0-9]+$'");
    await sequelize.query('ALTER TABLE contact_data MODIFY COLUMN userId INT(11) NOT NULL');


    // 6. Fix stored_files
    console.log('Fixing stored_files table...');
    await sequelize.query("DELETE FROM stored_files WHERE userId NOT REGEXP '^[0-9]+$'");
    await sequelize.query('ALTER TABLE stored_files MODIFY COLUMN userId INT(11) NOT NULL');


    // 7. Fix warmer_campaigns - REMOVED (warmer feature has been removed)
    // console.log('Fixing warmer_campaigns table...');
    // await sequelize.query("DELETE FROM warmer_campaigns WHERE userId NOT REGEXP '^[0-9]+$'");
    // await sequelize.query('ALTER TABLE warmer_campaigns MODIFY COLUMN userId INT(11) NOT NULL');


    // 8. Fix UserAISettings
    console.log('Fixing UserAISettings table...');
    try {
      await sequelize.query('DROP INDEX user_ai_settings_user_id ON UserAISettings');
    } catch (e) {}
    try {
      await sequelize.query('DROP INDEX users_ai_settings_userId ON UserAISettings');
    } catch (e) {} 
    
    await sequelize.query("DELETE FROM UserAISettings WHERE userId NOT REGEXP '^[0-9]+$'");
    await sequelize.query('ALTER TABLE UserAISettings MODIFY COLUMN userId INT(11) NOT NULL');
    
    try {
        await sequelize.query('CREATE UNIQUE INDEX user_ai_settings_user_id ON UserAISettings(userId)');
    } catch(e) {}

    console.log('Database schema fix completed successfully.');

  } catch (error) {
    console.error('Fatal error during DB fix:', error);
  } finally {
    await sequelize.close();
  }
}

fixDatabase();
