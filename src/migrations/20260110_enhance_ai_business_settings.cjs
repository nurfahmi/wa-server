
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("Devices", "aiBrandVoice", {
      type: Sequelize.STRING,
      defaultValue: "casual",
      allowNull: false,
    });
    await queryInterface.addColumn("Devices", "aiBusinessFAQ", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn("Devices", "aiPrimaryGoal", {
      type: Sequelize.STRING,
      defaultValue: "conversion",
      allowNull: false,
    });
    await queryInterface.addColumn("Devices", "aiOperatingHours", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn("Devices", "aiBoundariesEnabled", {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    });
    await queryInterface.addColumn("Devices", "aiHandoverTriggers", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("Devices", "aiBrandVoice");
    await queryInterface.removeColumn("Devices", "aiBusinessFAQ");
    await queryInterface.removeColumn("Devices", "aiPrimaryGoal");
    await queryInterface.removeColumn("Devices", "aiOperatingHours");
    await queryInterface.removeColumn("Devices", "aiBoundariesEnabled");
    await queryInterface.removeColumn("Devices", "aiHandoverTriggers");
  },
};
