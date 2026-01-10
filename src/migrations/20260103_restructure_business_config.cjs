"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if productKnowledge column exists and is TEXT, convert to JSON
    const tableDescription = await queryInterface.describeTable("Devices");
    
    if (tableDescription.productKnowledge) {
      // For SQLite, we need to handle it differently
      if (queryInterface.sequelize.getDialect() === "sqlite") {
        // SQLite doesn't support ALTER COLUMN, so we'll need to recreate the table
        // For now, we'll just add the new columns and let the model handle conversion
        await queryInterface.addColumn("Devices", "upsellStrategies", {
          type: Sequelize.TEXT,
          allowNull: true,
        });
        
        await queryInterface.addColumn("Devices", "objectionHandling", {
          type: Sequelize.TEXT,
          allowNull: true,
        });
      } else {
        // For MySQL/PostgreSQL, we can alter the column type
        await queryInterface.changeColumn("Devices", "productKnowledge", {
          type: Sequelize.JSON,
          allowNull: true,
        });
        
        await queryInterface.changeColumn("Devices", "salesScripts", {
          type: Sequelize.JSON,
          allowNull: true,
        });
        
        await queryInterface.addColumn("Devices", "upsellStrategies", {
          type: Sequelize.TEXT,
          allowNull: true,
        });
        
        await queryInterface.addColumn("Devices", "objectionHandling", {
          type: Sequelize.TEXT,
          allowNull: true,
        });
      }
    } else {
      // Columns don't exist, add them
      await queryInterface.addColumn("Devices", "productKnowledge", {
        type: Sequelize.JSON,
        allowNull: true,
      });
      
      await queryInterface.addColumn("Devices", "salesScripts", {
        type: Sequelize.JSON,
        allowNull: true,
      });
      
      await queryInterface.addColumn("Devices", "upsellStrategies", {
        type: Sequelize.TEXT,
        allowNull: true,
      });
      
      await queryInterface.addColumn("Devices", "objectionHandling", {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    console.log("✅ Restructured business configuration fields in Devices table");
  },

  down: async (queryInterface, Sequelize) => {
    // Revert changes
    const tableDescription = await queryInterface.describeTable("Devices");
    
    if (tableDescription.upsellStrategies) {
      await queryInterface.removeColumn("Devices", "upsellStrategies");
    }
    
    if (tableDescription.objectionHandling) {
      await queryInterface.removeColumn("Devices", "objectionHandling");
    }
    
    // Note: We don't revert productKnowledge and salesScripts back to TEXT
    // as that could cause data loss. The model handles backward compatibility.

    console.log("✅ Reverted business configuration fields in Devices table");
  },
};

