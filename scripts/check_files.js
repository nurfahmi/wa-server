
import { sequelize, StoredFile } from '../src/models/index.js';

async function check() {
  try {
    const files = await StoredFile.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']]
    });
    console.log('Latest files:', JSON.stringify(files, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
