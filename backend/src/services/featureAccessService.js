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

export async function getUserFeatureAccess(userId) {
  const premium = await userHasPremiumAccess(userId);
  const scoreProfile = await resolveScoreProfile(userId);
  const hasScores = scoreProfile?.main_score != null;

  let blockedReason = null;
  if (!premium) blockedReason = 'subscription';
  else if (!hasScores) blockedReason = 'scores';

  return {
    premium,
    has_scores: hasScores,
    can_analyze: premium && hasScores,
    can_use_tours: premium && hasScores,
    can_view_rankings: premium,
    blocked_reason: blockedReason,
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
