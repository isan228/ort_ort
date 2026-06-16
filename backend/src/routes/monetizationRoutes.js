import { Router } from 'express';
import {
  getActivePlans,
  createPaymentIntent,
  confirmStubPayment,
  getUserActiveSubscription,
  handlePaymentCallback,
} from '../services/subscriptionService.js';
import { getWalletSummary } from '../services/walletService.js';
import { getReferralStats } from '../services/referralService.js';
import { getRedemptionRules, redeemFeature } from '../services/bonusService.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/subscription/plans', authenticate, async (_req, res, next) => {
  try {
    const plans = await getActivePlans();
    res.json({ plans });
  } catch (err) {
    next(err);
  }
});

router.get('/subscription', authenticate, async (req, res, next) => {
  try {
    const subscription = await getUserActiveSubscription(req.userId);
    res.json({ subscription });
  } catch (err) {
    next(err);
  }
});

router.post('/payments', authenticate, async (req, res, next) => {
  try {
    const planId = req.body.plan_id || req.body.planId;
    if (!planId) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'plan_id обязателен' },
      });
    }

    const result = await createPaymentIntent({
      userId: req.userId,
      planId,
      applyBalance: req.body.apply_balance,
    });

    res.status(201).json({
      payment: result.payment,
      plan: result.plan,
      provider: result.providerResult,
      stub_confirm_url:
        result.providerResult.provider === 'stub'
          ? `/api/v1/payments/${result.payment.id}/confirm`
          : null,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/payments/:id/confirm', authenticate, async (req, res, next) => {
  try {
    const result = await confirmStubPayment(req.params.id, req.userId);
    res.json({
      payment: result.payment,
      subscription: result.subscription,
      plan: result.plan,
      message: 'Stub-оплата подтверждена, подписка активирована',
    });
  } catch (err) {
    next(err);
  }
});

router.post('/payments/callback', async (req, res, next) => {
  try {
    const callbackSecret = req.headers['x-payment-secret'];
    const result = await handlePaymentCallback(req.body, { callbackSecret });
    res.json({ ack: true, ...result });
  } catch (err) {
    next(err);
  }
});

router.get('/wallet', authenticate, async (req, res, next) => {
  try {
    const wallet = await getWalletSummary(req.userId);
    res.json(wallet);
  } catch (err) {
    next(err);
  }
});

router.get('/referral', authenticate, async (req, res, next) => {
  try {
    const referral = await getReferralStats(req.userId);
    res.json(referral);
  } catch (err) {
    next(err);
  }
});

router.get('/wallet/redemption-rules', authenticate, async (_req, res, next) => {
  try {
    const rules = await getRedemptionRules();
    res.json({ rules });
  } catch (err) {
    next(err);
  }
});

router.post('/wallet/redeem', authenticate, async (req, res, next) => {
  try {
    const result = await redeemFeature(req.userId, req.body.feature);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
