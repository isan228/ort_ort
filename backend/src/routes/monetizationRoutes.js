import { Router } from 'express';
import {
  getActivePlans,
  createPaymentIntent,
  confirmStubPayment,
  getUserActiveSubscription,
  handlePaymentCallback,
  handleFinikWebhook,
  getPaymentForUser,
} from '../services/subscriptionService.js';
import { getWalletSummary } from '../services/walletService.js';
import { getReferralStats } from '../services/referralService.js';
import { getRedemptionRules, redeemFeature } from '../services/bonusService.js';
import { previewPromoCode } from '../services/promoService.js';
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
      promoCode: req.body.promo_code || req.body.promoCode,
    });

    res.status(201).json({
      payment: result.payment,
      plan: result.plan,
      provider: result.providerResult,
      payment_url: result.payment_url || result.providerResult?.paymentUrl || null,
      requires_redirect: result.requires_redirect ?? false,
      subscription: result.subscription || null,
      free_checkout: result.free_checkout ?? false,
      stub_confirm_url:
        result.providerResult?.provider === 'stub'
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

router.get('/payments/:id', authenticate, async (req, res, next) => {
  try {
    const payment = await getPaymentForUser(req.params.id, req.userId);
    res.json({ payment });
  } catch (err) {
    next(err);
  }
});

router.post('/payments/finik/webhook', async (req, res, next) => {
  try {
    const result = await handleFinikWebhook(req);
    res.json({ ok: true, ...result });
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

router.post('/promo/preview', authenticate, async (req, res, next) => {
  try {
    const planId = req.body.plan_id || req.body.planId;
    const code = req.body.promo_code || req.body.promoCode;
    if (!planId || !code) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'plan_id и promo_code обязательны' },
      });
    }

    const { SubscriptionPlan } = await import('../models/index.js');
    const plan = await SubscriptionPlan.findByPk(planId);
    if (!plan) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'План не найден' } });
    }

    const preview = await previewPromoCode(code, req.userId, plan.price_kgs);
    res.json(preview);
  } catch (err) {
    next(err);
  }
});

export default router;
