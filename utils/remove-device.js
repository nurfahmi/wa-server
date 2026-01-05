/**
 * Remove Single Device Script
 * Removes a specific WhatsApp device session and all its related data
 * Usage: node utils/remove-device.js <sessionId>
 */

import { sequelize } from "../src/models/index.js";

async function removeDeviceWithRelatedData(sessionId) {
  if (!sessionId) {
    console.log("❌ Usage: node utils/remove-device.js <sessionId>");
    console.log("Example: node utils/remove-device.js user_workspace_3_device_account_17");
    process.exit(1);
  }

  try {
    console.log('🗑️  Removing device and related data:', sessionId);

    // Start transaction
    const transaction = await sequelize.transaction();

    try {
      // First, get the device ID
      const deviceQuery = await sequelize.query(
        'SELECT id FROM Devices WHERE sessionId = ?',
        { replacements: [sessionId], transaction }
      );

      if (deviceQuery[0].length === 0) {
        console.log('⚠️  Device not found:', sessionId);
        await transaction.rollback();
        return false;
      }

      const deviceId = deviceQuery[0][0].id;
      console.log('📍 Found device ID:', deviceId);

      // Delete related data in correct order (children first)

      // AI-related data (handle missing tables gracefully)
      try {
        await sequelize.query(
          'DELETE FROM AIUsageLogs WHERE deviceId = ?',
          { replacements: [deviceId], transaction }
        );
        console.log('✅ Deleted AI usage logs');
      } catch (error) {
        console.log('⚠️  AIUsageLogs table not found or error:', error.message);
      }

      try {
        await sequelize.query(
          'DELETE FROM AIConversationMemories WHERE sessionId = ?',
          { replacements: [sessionId], transaction }
        );
        console.log('✅ Deleted AI conversation memories');
      } catch (error) {
        console.log('⚠️  AIConversationMemories table not found or error:', error.message);
      }

      // Chat and message data
      try {
        await sequelize.query(
          'DELETE FROM ChatSettings WHERE deviceId = ?',
          { replacements: [deviceId], transaction }
        );
        console.log('✅ Deleted chat settings');
      } catch (error) {
        console.log('⚠️  ChatSettings table not found or error:', error.message);
      }

      try {
        await sequelize.query(
          'DELETE FROM storedfiles WHERE deviceId = ?',
          { replacements: [deviceId], transaction }
        );
        console.log('✅ Deleted stored files');
      } catch (error) {
        console.log('⚠️  storedfiles table not found or error:', error.message);
      }

      // Auth data
      try {
        await sequelize.query(
          'DELETE FROM AuthDatas WHERE session = ?',
          { replacements: [sessionId], transaction }
        );
        console.log('✅ Deleted auth data');
      } catch (error) {
        console.log('⚠️  AuthDatas table not found or error:', error.message);
      }

      // Finally delete the device
      await sequelize.query(
        'DELETE FROM Devices WHERE id = ?',
        { replacements: [deviceId], transaction }
      );
      console.log('✅ Deleted device');

      // Commit transaction
      await transaction.commit();
      console.log('🎉 Successfully removed device and all related data:', sessionId);
      return true;

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('❌ Error removing device:', error);
    return false;
  }
}

// Main execution
if (process.argv[1] && process.argv[1].endsWith('remove-device.js')) {
  const sessionId = process.argv[2];
  console.log('🎯 Remove Device Script');
  console.log('Session ID:', sessionId);
  console.log('=======================');

  if (!sessionId) {
    console.log('❌ Usage: node utils/remove-device.js <sessionId>');
    console.log('Example: node utils/remove-device.js user_workspace_3_device_account_17');
    process.exit(1);
  }

  removeDeviceWithRelatedData(sessionId).then((success) => {
    console.log('=======================');
    console.log(success ? '🎉 Script completed successfully' : '❌ Script failed');
    process.exit(success ? 0 : 1);
  });
}

export { removeDeviceWithRelatedData };
