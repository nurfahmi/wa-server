
import { sequelize } from "../models/index.js";

async function checkIndexes() {
  try {
    await sequelize.authenticate();
    const [indexes] = await sequelize.query("SHOW INDEX FROM Users");
    console.log(`Current indexes on Users: ${indexes.length}`);
    const emailIndexes = indexes.filter(idx => idx.Column_name === 'email');
    console.log(`Indexes on email: ${emailIndexes.length}`);
    emailIndexes.forEach(idx => console.log(`- ${idx.Key_name}`));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

checkIndexes();
