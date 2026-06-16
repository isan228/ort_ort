import { Op } from 'sequelize';
import { FeatureUnlock } from '../models/index.js';
import { REDEMPTION_FEATURE } from '../constants/index.js';
import { userHasActiveSubscription } from './subscriptionService.js';

const FEATURE_ALIASES = {
  premium_analysis: REDEMPTION_FEATURE.EXTRA_ANALYSIS,
  analysis: REDEMPTION_FEATURE.EXTRA_ANALYSIS,
  extra_analysis: REDEMPTION_FEATURE.EXTRA_ANALYSIS,
  compare: REDEMPTION_FEATURE.COMPARE_UNLOCK,
  compare_unlock: REDEMPTION_FEATURE.COMPARE_UNLOCK,
  tour: REDEMPTION_FEATURE.TOUR_UNLOCK,
  tour_unlock: REDEMPTION_FEATURE.TOUR_UNLOCK,
};

function normalizeFeature(feature) {
  return FEATURE_ALIASES[feature] || feature;
}

export async function hasActiveUnlock(userId, feature) {
  const normalized = normalizeFeature(feature);
  const now = new Date();

  const unlock = await FeatureUnlock.findOne({
    where: {
      user_id: userId,
      feature: normalized,
      uses_remaining: { [Op.gt]: 0 },
      [Op.or]: [{ expires_at: null }, { expires_at: { [Op.gt]: now } }],
    },
    order: [['created_at', 'DESC']],
  });

  return Boolean(unlock);
}

export async function consumeUnlock(userId, feature) {
  const normalized = normalizeFeature(feature);
  const now = new Date();

  const unlock = await FeatureUnlock.findOne({
    where: {
      user_id: userId,
      feature: normalized,
      uses_remaining: { [Op.gt]: 0 },
      [Op.or]: [{ expires_at: null }, { expires_at: { [Op.gt]: now } }],
    },
    order: [['created_at', 'ASC']],
  });

  if (!unlock) return false;

  await unlock.update({ uses_remaining: unlock.uses_remaining - 1 });
  return true;
}

export async function grantFeatureUnlock(userId, { feature, uses = 1, expiresAt = null, source = 'bonus_redeem', metadata = {} }) {
  const normalized = normalizeFeature(feature);
  return FeatureUnlock.create({
    user_id: userId,
    feature: normalized,
    uses_remaining: uses,
    expires_at: expiresAt,
    source,
    metadata,
  });
}

export async function userHasPremiumAccess(userId) {
  const subscribed = await userHasActiveSubscription(userId);
  if (subscribed) return true;

  const unlockFeatures = [
    REDEMPTION_FEATURE.EXTRA_ANALYSIS,
    REDEMPTION_FEATURE.COMPARE_UNLOCK,
    REDEMPTION_FEATURE.TOUR_UNLOCK,
  ];

  for (const feature of unlockFeatures) {
    if (await hasActiveUnlock(userId, feature)) return true;
  }

  return false;
}

export async function userCanRunPremiumAnalysis(userId) {
  if (await userHasActiveSubscription(userId)) return true;
  return hasActiveUnlock(userId, REDEMPTION_FEATURE.EXTRA_ANALYSIS);
}

export async function userCanCompare(userId) {
  if (await userHasActiveSubscription(userId)) return true;
  return hasActiveUnlock(userId, REDEMPTION_FEATURE.COMPARE_UNLOCK);
}

export async function userCanJoinTour(userId) {
  if (await userHasActiveSubscription(userId)) return true;
  return hasActiveUnlock(userId, REDEMPTION_FEATURE.TOUR_UNLOCK);
}

export async function listUserUnlocks(userId) {
  const now = new Date();
  return FeatureUnlock.findAll({
    where: {
      user_id: userId,
      uses_remaining: { [Op.gt]: 0 },
      [Op.or]: [{ expires_at: null }, { expires_at: { [Op.gt]: now } }],
    },
    order: [['created_at', 'DESC']],
  });
}
