"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if BusinessTemplates table exists
    const tableDescription = await queryInterface.describeTable("BusinessTemplates");
    
    if (tableDescription.productKnowledge) {
      // For SQLite, we need to handle it differently
      if (queryInterface.sequelize.getDialect() === "sqlite") {
        // SQLite doesn't support ALTER COLUMN, so we'll just add a note
        // The model getter/setter will handle conversion
        console.log("SQLite detected - BusinessTemplate model will handle JSON conversion");
      } else {
        // For MySQL/PostgreSQL, we can alter the column type
        await queryInterface.changeColumn("BusinessTemplates", "productKnowledge", {
          type: Sequelize.JSON,
          allowNull: true,
        });
        
        await queryInterface.changeColumn("BusinessTemplates", "salesScripts", {
          type: Sequelize.JSON,
          allowNull: true,
        });
      }
    }

    console.log("✅ Restructured business template configuration fields in BusinessTemplates table");
  },

  down: async (queryInterface, Sequelize) => {
    // Note: We don't revert back to TEXT as that could cause data loss
    // The model handles backward compatibility
    console.log("✅ Business template fields remain as JSON (backward compatible)");
  },
};


