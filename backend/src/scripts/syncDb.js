import { connectDatabase, syncDatabase } from '../config/database.js';
import { seedDefaults } from './seedDefaults.js';

async function main() {
  await connectDatabase();
  await syncDatabase();
  await seedDefaults();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
