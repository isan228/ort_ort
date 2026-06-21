import { getSetting } from './settingsService.js';
import { REDEMPTION_FEATURE, BALANCE_TYPE } from '../constants/index.js';
import { debitWallet } from './walletService.js';
import { grantFeatureUnlock } from './accessService.js';
import { createHttpError } from '../utils/errors.js';

const DEFAULT_REDEMPTION_RULES = {
  referral_reward_bonus: 50,
  referred_user_bonus: 50,
  subscription_discount_max_percent: 50,
  costs: {
    [REDEMPTION_FEATURE.EXTRA_ANALYSIS]: 50,
    [REDEMPTION_FEATURE.COMPARE_UNLOCK]: 30,
    [REDEMPTION_FEATURE.TOUR_UNLOCK]: 100,
  },
};

export async function getRedemptionRules() {
  const rules = await getSetting('redemption_rules', DEFAULT_REDEMPTION_RULES);
  return { ...DEFAULT_REDEMPTION_RULES, ...rules };
}

export async function redeemFeature(userId, feature) {
  const rules = await getRedemptionRules();
  const cost = rules.costs?.[feature];

  if (!cost) {
    throw createHttpError(400, 'VALIDATION_ERROR', 'Неизвестная функция для списания бонусов');
  }

  const result = await debitWallet(userId, {
    balanceType: BALANCE_TYPE.BONUS,
    amount: cost,
    reason: `redeem:${feature}`,
    metadata: { feature },
  });

  const unlock = await grantFeatureUnlock(userId, {
    feature,
    uses: 1,
    source: 'bonus_redeem',
    metadata: { cost },
  });

  return {
    feature,
    cost,
    unlock,
    balance: {
      bonus_balance: Number(result.wallet.bonus_balance),
      coin_balance: Number(result.wallet.coin_balance),
    },
  };
}

export async function getFeatureCost(feature) {
  const rules = await getRedemptionRules();
  return rules.costs?.[feature] ?? null;
}
