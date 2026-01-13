'use strict';

/**
 * Migration: Add Device Archive Support
 * 
 * This migration adds support for archiving devices instead of deleting them,
 * and captures real WhatsApp phone numbers on connection.
 * 
 * Changes:
 * - Add realPhoneNumber to Devices (captured from WhatsApp on connection)
 * - Add archivedAt to Devices (timestamp when archived)
 * - Add archiveReason to Devices (enum: blocked, switched_number, inactive, manual)
 * - Modify status enum to include 'archived'
 * - Add restoredFromDeviceId to ChatHistories (track restoration source)
 * - Add restoredFromDeviceId to ChatSettings (track restoration source)
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('[MIGRATION] Starting device archive support migration...');

      // 1. Add realPhoneNumber column to Devices
      console.log('[MIGRATION] Adding realPhoneNumber column...');
      try {
        await queryInterface.addColumn('Devices', 'realPhoneNumber', {
          type: Sequelize.STRING,
          allowNull: true,
          comment: 'Actual WhatsApp phone number captured on connection'
        }, { transaction });
      } catch (e) {
        if (!e.message.includes('Duplicate column')) throw e;
        console.log('[MIGRATION] realPhoneNumber column already exists, skipping...');
      }

      // 2. Add archivedAt column to Devices
      console.log('[MIGRATION] Adding archivedAt column...');
      try {
        await queryInterface.addColumn('Devices', 'archivedAt', {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'When device was archived'
        }, { transaction });
      } catch (e) {
        if (!e.message.includes('Duplicate column')) throw e;
        console.log('[MIGRATION] archivedAt column already exists, skipping...');
      }

      // 3. Add archiveReason column to Devices
      console.log('[MIGRATION] Adding archiveReason column...');
      try {
        await queryInterface.addColumn('Devices', 'archiveReason', {
          type: Sequelize.ENUM('blocked', 'switched_number', 'inactive', 'manual'),
          allowNull: true,
          comment: 'Reason for archiving'
        }, { transaction });
      } catch (e) {
        if (!e.message.includes('Duplicate column')) throw e;
        console.log('[MIGRATION] archiveReason column already exists, skipping...');
      }

      // 4. Modify status enum to add 'archived'
      console.log('[MIGRATION] Updating status enum to include archived...');
      try {
        await queryInterface.sequelize.query(`
          ALTER TABLE Devices 
          MODIFY COLUMN status ENUM(
            'pending', 'connecting', 'synchronizing', 'connected', 
            'disconnected', 'disconnecting', 'error', 'auth_failed', 
            'logged_out', 'reconnecting', 'conflict', 'deleted', 'archived'
          ) DEFAULT 'pending'
        `, { transaction });
      } catch (e) {
        console.log('[MIGRATION] Status enum update warning:', e.message);
      }

      // 5. Add restoredFromDeviceId to ChatHistories
      console.log('[MIGRATION] Adding restoredFromDeviceId to ChatHistories...');
      try {
        await queryInterface.addColumn('ChatHistories', 'restoredFromDeviceId', {
          type: Sequelize.BIGINT,
          allowNull: true,
          comment: 'Original device ID if this was restored from archive'
        }, { transaction });
      } catch (e) {
        if (!e.message.includes('Duplicate column')) throw e;
        console.log('[MIGRATION] restoredFromDeviceId already exists in ChatHistories, skipping...');
      }

      // 6. Add restoredFromDeviceId to ChatSettings
      console.log('[MIGRATION] Adding restoredFromDeviceId to ChatSettings...');
      try {
        await queryInterface.addColumn('ChatSettings', 'restoredFromDeviceId', {
          type: Sequelize.BIGINT,
          allowNull: true,
          comment: 'Original device ID if restored from archive'
        }, { transaction });
      } catch (e) {
        if (!e.message.includes('Duplicate column')) throw e;
        console.log('[MIGRATION] restoredFromDeviceId already exists in ChatSettings, skipping...');
      }

      // 7. Add index on realPhoneNumber for faster phone matching
      console.log('[MIGRATION] Adding index on realPhoneNumber...');
      try {
        await queryInterface.addIndex('Devices', ['realPhoneNumber'], {
          name: 'idx_devices_real_phone',
          transaction
        });
      } catch (e) {
        if (!e.message.includes('Duplicate')) {
          console.log('[MIGRATION] Index warning:', e.message);
        }
      }

      // 8. Add index on archivedAt for filtering archived devices
      console.log('[MIGRATION] Adding index on archivedAt...');
      try {
        await queryInterface.addIndex('Devices', ['archivedAt'], {
          name: 'idx_devices_archived_at',
          transaction
        });
      } catch (e) {
        if (!e.message.includes('Duplicate')) {
          console.log('[MIGRATION] Index warning:', e.message);
        }
      }

      await transaction.commit();
      console.log('[MIGRATION] Device archive support migration completed successfully!');
    } catch (error) {
      await transaction.rollback();
      console.error('[MIGRATION] Error in migration:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('[MIGRATION] Rolling back device archive support migration...');

      // Remove indexes
      try {
        await queryInterface.removeIndex('Devices', 'idx_devices_real_phone', { transaction });
      } catch (e) { /* ignore */ }
      
      try {
        await queryInterface.removeIndex('Devices', 'idx_devices_archived_at', { transaction });
      } catch (e) { /* ignore */ }

      // Remove columns
      await queryInterface.removeColumn('ChatSettings', 'restoredFromDeviceId', { transaction });
      await queryInterface.removeColumn('ChatHistories', 'restoredFromDeviceId', { transaction });
      await queryInterface.removeColumn('Devices', 'archiveReason', { transaction });
      await queryInterface.removeColumn('Devices', 'archivedAt', { transaction });
      await queryInterface.removeColumn('Devices', 'realPhoneNumber', { transaction });

      // Revert status enum (remove 'archived')
      await queryInterface.sequelize.query(`
        ALTER TABLE Devices 
        MODIFY COLUMN status ENUM(
          'pending', 'connecting', 'synchronizing', 'connected', 
          'disconnected', 'disconnecting', 'error', 'auth_failed', 
          'logged_out', 'reconnecting', 'conflict', 'deleted'
        ) DEFAULT 'pending'
      `, { transaction });

      await transaction.commit();
      console.log('[MIGRATION] Rollback completed successfully!');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
