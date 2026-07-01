import { ScoreProfile } from '../models/index.js';
import { SCORE_MODE } from '../constants/index.js';
import { userHasPremiumAccess } from './accessService.js';

async function resolveScoreProfile(userId) {
  const finalLocked = await ScoreProfile.findOne({
    where: { user_id: userId, mode: SCORE_MODE.FINAL, is_locked: true },
    order: [['updated_at', 'DESC']],
  });
  if (finalLocked) return finalLocked;

  const finalProfile = await ScoreProfile.findOne({
    where: { user_id: userId, mode: SCORE_MODE.FINAL },
    order: [['updated_at', 'DESC']],
  });
  if (finalProfile) return finalProfile;

  return ScoreProfile.findOne({
    where: { user_id: userId },
    order: [['updated_at', 'DESC']],
  });
}

/** Доступ к платным функциям — только по подписке. Фаза «до/после результатов» не используется. */
export async function getUserFeatureAccess(userId) {
  const premium = await userHasPremiumAccess(userId);
  const scoreProfile = await resolveScoreProfile(userId);
  const hasScores = scoreProfile?.main_score != null;

  return {
    premium,
    has_full_access: premium,
    has_scores: hasScores,
    can_analyze: premium,
    can_use_tours: premium,
    can_view_rankings: premium,
    can_use_community: premium,
    can_use_catalog: premium,
    blocked_reason: premium ? null : 'subscription',
    scores: scoreProfile
      ? {
          main_score: scoreProfile.main_score,
          subject_scores_json: scoreProfile.subject_scores_json || {},
          mode: scoreProfile.mode,
          is_locked: scoreProfile.is_locked,
        }
      : null,
  };
}
