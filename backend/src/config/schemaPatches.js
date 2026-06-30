import { sequelize } from './database.js';
import { USER_PHASE } from '../constants/index.js';

/**
 * Idempotent SQL patches for production (DB_SYNC_ALTER=false).
 * Safe to run on every startup and via npm run db:sync.
 */
export async function applySchemaPatches() {
  const { PendingRegistration, User, Setting } = await import('../models/index.js');

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

  await PendingRegistration.sync();

  const [phaseUpdated] = await User.update(
    { phase: USER_PHASE.AFTER_RESULTS },
    { where: { phase: USER_PHASE.BEFORE_RESULTS } }
  );
  if (phaseUpdated > 0) {
    console.log(`Schema patch: ${phaseUpdated} user(s) moved to after_results`);
  }

  const ortSetting = await Setting.findOne({ where: { key: 'ort_results_published' } });
  if (ortSetting && ortSetting.value !== true) {
    await ortSetting.update({ value: true });
    console.log('Schema patch: ort_results_published set to true');
  }
}
