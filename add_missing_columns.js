import { sequelize } from "./src/models/index.js";

async function addColumns() {
  const queryInterface = sequelize.getQueryInterface();
  const tableDefinition = await queryInterface.describeTable('Devices');

  const columnsToAdd = [
    { name: 'aiBrandVoice', type: 'VARCHAR(255)', defaultValue: 'casual' },
    { name: 'aiBusinessFAQ', type: 'TEXT' },
    { name: 'aiProductCatalog', type: 'TEXT' },
    { name: 'aiPrimaryGoal', type: 'VARCHAR(255)', defaultValue: 'conversion' },
    { name: 'aiOperatingHours', type: 'TEXT' },
    { name: 'aiBoundariesEnabled', type: 'TINYINT(1)', defaultValue: 1 },
    { name: 'aiHandoverTriggers', type: 'TEXT' },
    { name: 'aiBusinessProfile', type: 'TEXT' },
    { name: 'aiBusinessAddress', type: 'TEXT' }
  ];

  for (const col of columnsToAdd) {
    if (!tableDefinition[col.name]) {
      console.log(`Adding column ${col.name}...`);
      try {
        await sequelize.query(`ALTER TABLE Devices ADD COLUMN ${col.name} ${col.type} ${col.defaultValue !== undefined ? `DEFAULT ${typeof col.defaultValue === 'string' ? `'${col.defaultValue}'` : col.defaultValue}` : ''}`);
        console.log(`Successfully added ${col.name}`);
      } catch (err) {
        console.error(`Failed to add ${col.name}:`, err.message);
      }
    } else {
      console.log(`Column ${col.name} already exists.`);
    }
  }

  process.exit(0);
}

addColumns();
