import { USER_PHASE } from '../constants/index.js';
import { User } from '../models/index.js';

/** Результаты ОРТ опубликованы — сайт всегда в режиме after_results */
export async function isResultsPublished() {
  return true;
}

export async function getEffectiveUserPhase(user) {
  if (!user) return USER_PHASE.AFTER_RESULTS;
  if (user.phase === USER_PHASE.ARCHIVED) return USER_PHASE.ARCHIVED;
  return USER_PHASE.AFTER_RESULTS;
}

export async function syncUserPhaseIfNeeded(userId) {
  const user = await User.findByPk(userId);
  if (!user) return null;

  if (user.phase === USER_PHASE.BEFORE_RESULTS) {
    await user.update({ phase: USER_PHASE.AFTER_RESULTS });
    return USER_PHASE.AFTER_RESULTS;
  }

  return user.phase === USER_PHASE.ARCHIVED ? USER_PHASE.ARCHIVED : USER_PHASE.AFTER_RESULTS;
}

/** @deprecated Результаты уже опубликованы; оставлено для совместимости админ-API */
export async function setResultsPublished(_published, adminId = null) {
  const { writeAuditLog } = await import('./auditService.js');

  await User.update(
    { phase: USER_PHASE.AFTER_RESULTS },
    { where: { phase: USER_PHASE.BEFORE_RESULTS } }
  );

  await writeAuditLog({
    actorId: adminId,
    actionCode: 'settings.ort_results_published',
    entityType: 'setting',
    entityId: null,
    after: { ort_results_published: true, note: 'deprecated_always_published' },
  });

  return true;
}
