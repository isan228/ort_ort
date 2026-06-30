import { sequelize } from './database.js';

/**
 * Idempotent SQL patches for production (DB_SYNC_ALTER=false).
 * Safe to run on every startup and via npm run db:sync.
 */
export async function applySchemaPatches() {
  await import('../models/index.js');

  const [[column]] = await sequelize.query(`
    SELECT is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payments'
      AND column_name = 'user_id'
  `);

  if (column?.is_nullable === 'NO') {
    await sequelize.query('ALTER TABLE payments ALTER COLUMN user_id DROP NOT NULL;');
    console.log('Schema patch: payments.user_id is now nullable');
  }

  const { PendingRegistration } = await import('../models/PendingRegistration.js');
  await PendingRegistration.sync();
}
