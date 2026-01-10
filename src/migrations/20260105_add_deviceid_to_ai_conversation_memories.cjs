export async function up(queryInterface, Sequelize) {
  // Add deviceId column to AIConversationMemories table
  await queryInterface.addColumn('AIConversationMemories', 'deviceId', {
    type: Sequelize.BIGINT,
    allowNull: true, // Allow null for existing records
    references: {
      model: 'Devices',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    comment: 'Foreign key to the device that owns this conversation'
  });

  // Add index for better query performance
  await queryInterface.addIndex('AIConversationMemories', ['deviceId'], {
    name: 'ai_conversation_memories_deviceId'
  });

  // Update existing records to set deviceId based on sessionId
  // This is a best-effort migration for existing data
  await queryInterface.sequelize.query(`
    UPDATE AIConversationMemories acm
    JOIN Devices d ON acm.sessionId = d.sessionId
    SET acm.deviceId = d.id
    WHERE acm.deviceId IS NULL
  `);

  console.log('✅ Added deviceId column to AIConversationMemories table');
}

export async function down(queryInterface, Sequelize) {
  // Remove index first
  await queryInterface.removeIndex('AIConversationMemories', 'ai_conversation_memories_deviceId');
  
  // Remove the column
  await queryInterface.removeColumn('AIConversationMemories', 'deviceId');
  
  console.log('✅ Removed deviceId column from AIConversationMemories table');
}

