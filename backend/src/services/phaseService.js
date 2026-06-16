import { getSetting, clearSettingsCache } from './settingsService.js';
import { USER_PHASE } from '../constants/index.js';
import { User } from '../models/index.js';

export async function isResultsPublished() {
  return Boolean(await getSetting('ort_results_published', false));
}

export async function getEffectiveUserPhase(user) {
  if (!user) return USER_PHASE.BEFORE_RESULTS;
  if (user.phase === USER_PHASE.ARCHIVED) return USER_PHASE.ARCHIVED;

  const published = await isResultsPublished();
  if (published && user.phase === USER_PHASE.BEFORE_RESULTS) {
    return USER_PHASE.AFTER_RESULTS;
  }

  return user.phase;
}

export async function syncUserPhaseIfNeeded(userId) {
  const user = await User.findByPk(userId);
  if (!user) return null;

  const published = await isResultsPublished();
  if (published && user.phase === USER_PHASE.BEFORE_RESULTS) {
    await user.update({ phase: USER_PHASE.AFTER_RESULTS });
    return USER_PHASE.AFTER_RESULTS;
  }

  return user.phase;
}

export async function setResultsPublished(published, adminId = null) {
  const { Setting } = await import('../models/index.js');
  const { writeAuditLog } = await import('./auditService.js');

  const [row] = await Setting.findOrCreate({
    where: { key: 'ort_results_published' },
    defaults: { value: published, description: 'Официальные результаты ОРТ опубликованы' },
  });

  if (row.value !== published) {
    await row.update({ value: published });
  }

  if (published) {
    await User.update(
      { phase: USER_PHASE.AFTER_RESULTS },
      { where: { phase: USER_PHASE.BEFORE_RESULTS } }
    );
  }

  clearSettingsCache();

  await writeAuditLog({
    actorId: adminId,
    actionCode: 'settings.ort_results_published',
    entityType: 'setting',
    entityId: row.id,
    after: { ort_results_published: published },
  });

  return published;
}
