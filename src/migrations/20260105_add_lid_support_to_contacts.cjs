/**
 * Migration: Add LID (Local Identifier) support to Contacts table
 * Baileys v7.0.0 introduces LID as the new preferred identifier format
 */

export async function up(queryInterface, Sequelize) {
  const transaction = await queryInterface.sequelize.transaction();
  
  try {
    // Check if columns already exist to make migration idempotent
    const tableInfo = await queryInterface.describeTable('Contacts');
    
    // Add lid column
    if (!tableInfo.lid) {
      await queryInterface.addColumn('Contacts', 'lid', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'WhatsApp LID (Local Identifier) - new in Baileys v7.0.0',
      }, { transaction });
      console.log('Added lid column to Contacts table');
    }
    
    // Add pn column
    if (!tableInfo.pn) {
      await queryInterface.addColumn('Contacts', 'pn', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Phone Number JID (@s.whatsapp.net format) - for LID mapping',
      }, { transaction });
      console.log('Added pn column to Contacts table');
    }
    
    // Add addressingMode column
    if (!tableInfo.addressingMode) {
      await queryInterface.addColumn('Contacts', 'addressingMode', {
        type: Sequelize.ENUM('pn', 'lid', 'unknown'),
        defaultValue: 'pn',
        comment: 'Preferred addressing mode for this contact (PN or LID)',
      }, { transaction });
      console.log('Added addressingMode column to Contacts table');
    }
    
    // Modify source column to allow more values (change from ENUM to STRING)
    if (tableInfo.source && tableInfo.source.type === 'ENUM') {
      await queryInterface.changeColumn('Contacts', 'source', {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Source of contact data (which Baileys event or sync method)',
      }, { transaction });
      console.log('Changed source column from ENUM to STRING');
    }
    
    // Add indexes for new columns
    try {
      await queryInterface.addIndex('Contacts', ['lid'], {
        name: 'idx_contact_lid',
        transaction,
      });
      console.log('Added index idx_contact_lid');
    } catch (e) {
      if (!e.message.includes('Duplicate')) {
        console.log('Index idx_contact_lid may already exist');
      }
    }
    
    try {
      await queryInterface.addIndex('Contacts', ['pn'], {
        name: 'idx_contact_pn',
        transaction,
      });
      console.log('Added index idx_contact_pn');
    } catch (e) {
      if (!e.message.includes('Duplicate')) {
        console.log('Index idx_contact_pn may already exist');
      }
    }
    
    await transaction.commit();
    console.log('Migration completed: LID support added to Contacts table');
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function down(queryInterface, Sequelize) {
  const transaction = await queryInterface.sequelize.transaction();
  
  try {
    // Remove indexes first
    try {
      await queryInterface.removeIndex('Contacts', 'idx_contact_lid', { transaction });
    } catch (e) {
      console.log('Index idx_contact_lid may not exist');
    }
    
    try {
      await queryInterface.removeIndex('Contacts', 'idx_contact_pn', { transaction });
    } catch (e) {
      console.log('Index idx_contact_pn may not exist');
    }
    
    // Remove columns
    await queryInterface.removeColumn('Contacts', 'lid', { transaction });
    await queryInterface.removeColumn('Contacts', 'pn', { transaction });
    await queryInterface.removeColumn('Contacts', 'addressingMode', { transaction });
    
    // Revert source column back to ENUM
    await queryInterface.changeColumn('Contacts', 'source', {
      type: Sequelize.ENUM('contacts_upsert', 'contacts_set', 'contacts_update'),
      allowNull: false,
      comment: 'Source of contact data (which Baileys event)',
    }, { transaction });
    
    await transaction.commit();
    console.log('Rollback completed: LID support removed from Contacts table');
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

