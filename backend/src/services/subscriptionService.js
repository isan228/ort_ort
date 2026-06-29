import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Payment, Subscription, SubscriptionPlan } from '../models/index.js';
import { PAYMENT_STATUS, SUBSCRIPTION_STATUS } from '../constants/index.js';
import { paymentProvider, StubPaymentProvider } from './paymentProvider.js';
import { finikProvider } from './finikProvider.js';
import { config } from '../config/index.js';
import { notifyPaymentSuccess } from './notificationEvents.js';
import { getWalletSummary, calculateBonusDiscount, debitWallet } from './walletService.js';
import { getRedemptionRules } from './bonusService.js';
import { BALANCE_TYPE } from '../constants/index.js';
import {
  validatePromoCodeForUser,
  calculatePromoDiscount,
  recordPromoUse,
} from './promoService.js';
import { finalizeRegistrationFromPayment, afterRegistrationPaymentCompleted, markRegistrationCheckoutFailed } from './registrationCheckoutService.js';
import { createHttpError } from '../utils/errors.js';

export async function getActivePlans() {
  return SubscriptionPlan.findAll({
    where: { is_active: true },
    order: [['sort_order', 'ASC'], ['price_kgs', 'ASC']],
  });
}

export async function getUserActiveSubscription(userId) {
  const now = new Date();
  return Subscription.findOne({
    where: {
      user_id: userId,
      status: SUBSCRIPTION_STATUS.ACTIVE,
      ends_at: { [Op.gt]: now },
    },
    include: [{ model: SubscriptionPlan, as: 'plan' }],
    order: [['ends_at', 'DESC']],
  });
}

export async function userHasActiveSubscription(userId) {
  const subscription = await getUserActiveSubscription(userId);
  return Boolean(subscription);
}

export async function completePayment(paymentId, { finikTransactionId = null, webhookPayload = null } = {}) {
  const result = await sequelize.transaction(async (transaction) => {
    const payment = await Payment.findByPk(paymentId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!payment) {
      const error = new Error('Платёж не найден');
      error.status = 404;
      throw error;
    }

    if (payment.status === PAYMENT_STATUS.COMPLETED) {
      return {
        payment,
        subscription: payment.user_id ? await getUserActiveSubscription(payment.user_id) : null,
        alreadyCompleted: true,
      };
    }

    if (payment.status === PAYMENT_STATUS.FAILED || payment.status === PAYMENT_STATUS.CANCELLED) {
      const error = new Error('Платёж уже отклонён');
      error.status = 400;
      throw error;
    }

    if (!payment.user_id) {
      if (payment.metadata?.checkout_type !== 'registration') {
        const error = new Error('Платёж не привязан к пользователю');
        error.status = 400;
        throw error;
      }
      await finalizeRegistrationFromPayment(paymentId, transaction);
      await payment.reload({ transaction });
    }

    const plan = await SubscriptionPlan.findByPk(payment.plan_id, { transaction });

    const metadataPatch = { ...(payment.metadata || {}) };
    if (finikTransactionId) metadataPatch.finik_transaction_id = finikTransactionId;
    if (webhookPayload) metadataPatch.finik_webhook = webhookPayload;

    await payment.update(
      {
        status: PAYMENT_STATUS.COMPLETED,
        completed_at: new Date(),
        metadata: metadataPatch,
      },
      { transaction }
    );

    const startsAt = new Date();
    const endsAt = new Date(startsAt);
    endsAt.setDate(endsAt.getDate() + plan.duration_days);

    const subscription = await Subscription.create(
      {
        user_id: payment.user_id,
        plan_id: plan.id,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        starts_at: startsAt,
        ends_at: endsAt,
      },
      { transaction }
    );

    if (payment.metadata?.promo_code_id) {
      await recordPromoUse(
        {
          promoId: payment.metadata.promo_code_id,
          userId: payment.user_id,
          paymentId: payment.id,
          discountAppliedKgs: Number(payment.metadata.promo_discount || 0),
        },
        transaction
      );
    }

    return { payment, subscription, plan, alreadyCompleted: false };
  });

  if (result.subscription && !result.alreadyCompleted) {
    const bonusApplied = Number(result.payment.metadata?.bonus_applied || 0);
    if (bonusApplied > 0 && result.payment.user_id) {
      await debitWallet(result.payment.user_id, {
        balanceType: BALANCE_TYPE.BONUS,
        amount: bonusApplied,
        reason: 'subscription_payment',
        metadata: { payment_id: result.payment.id },
      });
    }
    if (result.payment.user_id) {
      await notifyPaymentSuccess(result.payment.user_id);
    }
    await afterRegistrationPaymentCompleted(result.payment);
  }

  return result;
}

export async function failPayment(paymentId, reason, webhookPayload = null) {
  const payment = await Payment.findByPk(paymentId);
  if (!payment) return null;
  if (payment.status === PAYMENT_STATUS.COMPLETED) return payment;

  await payment.update({
    status: PAYMENT_STATUS.FAILED,
    metadata: {
      ...(payment.metadata || {}),
      failure_reason: reason,
      finik_webhook: webhookPayload || payment.metadata?.finik_webhook,
    },
  });

  await markRegistrationCheckoutFailed(paymentId);

  return payment;
}

export async function createPaymentIntent({ userId, planId, applyBalance = false, promoCode = null }) {
  const plan = await SubscriptionPlan.findByPk(planId);
  if (!plan || !plan.is_active) {
    const error = new Error('План подписки не найден');
    error.status = 404;
    throw error;
  }

  let amountKgs = Number(plan.price_kgs);
  let bonusApplied = 0;
  let promoDiscount = 0;
  let promoMeta = null;

  if (promoCode) {
    const promo = await validatePromoCodeForUser(promoCode, userId);
    const promoCalc = calculatePromoDiscount(amountKgs, promo);
    promoDiscount = promoCalc.discount_applied;
    amountKgs = promoCalc.final_price;
    promoMeta = { id: promo.id, code: promo.code };
  }

  if (applyBalance) {
    const wallet = await getWalletSummary(userId);
    const rules = await getRedemptionRules();
    const discount = calculateBonusDiscount(
      amountKgs,
      wallet.bonus_balance,
      rules.subscription_discount_max_percent || 50
    );
    bonusApplied = discount.bonus_applied;
    amountKgs = discount.final_price;
  }

  const paymentId = uuidv4();

  const providerResult = await paymentProvider.createPayment({
    amountKgs,
    userId,
    planId: plan.id,
    paymentId,
    metadata: {
      planCode: plan.code,
      planTitle: plan.title,
      bonus_applied: bonusApplied,
    },
  });

  const payment = await Payment.create({
    id: paymentId,
    user_id: userId,
    plan_id: plan.id,
    amount_kgs: amountKgs,
    status: providerResult.status,
    provider: providerResult.provider,
    provider_payment_id: providerResult.providerPaymentId,
    metadata: {
      ...providerResult.metadata,
      bonus_applied: bonusApplied,
      original_price: plan.price_kgs,
      promo_discount: promoDiscount,
      promo_code_id: promoMeta?.id || null,
      promo_code: promoMeta?.code || null,
      payment_url: providerResult.paymentUrl || null,
    },
  });

  if (providerResult.metadata?.free_checkout || Number(amountKgs) <= 0) {
    const completed = await completePayment(payment.id);
    return {
      payment: completed.payment,
      plan,
      providerResult,
      bonus_applied: bonusApplied,
      promo_discount: promoDiscount,
      subscription: completed.subscription,
      free_checkout: true,
    };
  }

  return {
    payment,
    plan,
    providerResult,
    bonus_applied: bonusApplied,
    promo_discount: promoDiscount,
    payment_url: providerResult.paymentUrl,
    requires_redirect: Boolean(providerResult.requiresRedirect && providerResult.paymentUrl),
  };
}

export async function confirmStubPayment(paymentId, userId = null) {
  const payment = await Payment.findByPk(paymentId);
  if (!payment) {
    const error = new Error('Платёж не найден');
    error.status = 404;
    throw error;
  }

  if (userId && payment.user_id && payment.user_id !== userId) {
    const error = new Error('Нет доступа к этому платежу');
    error.status = 403;
    throw error;
  }

  if (payment.provider !== StubPaymentProvider.providerName) {
    const error = new Error('Подтверждение доступно только для stub-провайдера');
    error.status = 400;
    throw error;
  }

  return completePayment(paymentId);
}

export async function getPaymentForUser(paymentId, userId) {
  const payment = await Payment.findByPk(paymentId);
  if (!payment) throw createHttpError(404, 'NOT_FOUND', 'Платёж не найден');
  if (payment.user_id !== userId) throw createHttpError(403, 'FORBIDDEN', 'Нет доступа');
  return payment;
}

export async function handleFinikWebhook(req) {
  if (config.payment.provider !== 'finik') {
    throw createHttpError(400, 'VALIDATION_ERROR', 'Finik webhook disabled');
  }

  const signature = req.headers.signature || req.headers.Signature;
  const path = req.originalUrl.split('?')[0];
  const host = req.get('x-forwarded-host') || req.get('host');

  const headers = {
    host: host?.split(',')[0]?.trim(),
    'x-api-key': req.get('x-api-key'),
    'x-api-timestamp': req.get('x-api-timestamp'),
  };

  const isValid = await finikProvider.verifyWebhook({
    method: req.method,
    path,
    headers,
    body: req.body,
    signature,
  });

  if (!isValid) {
    throw createHttpError(401, 'FINIK-001', 'Недействительная подпись Finik');
  }

  const payload = req.body || {};
  const paymentId =
    payload.PaymentId ||
    payload.paymentId ||
    payload.fields?.PaymentId ||
    payload.fields?.paymentId;

  let payment = null;
  if (paymentId) {
    payment = await Payment.findByPk(paymentId);
  }

  if (!payment) {
    throw createHttpError(404, 'NOT_FOUND', 'Платёж не найден');
  }

  const transactionId = payload.transactionId || payload.id;

  const status = String(payload.status || '').toUpperCase();

  if (status === 'SUCCEEDED') {
    const result = await completePayment(payment.id, {
      finikTransactionId: transactionId,
      webhookPayload: payload,
    });
    return { processed: true, payment: result.payment, subscription: result.subscription };
  }

  if (status === 'FAILED') {
    const failed = await failPayment(payment.id, 'Finik: FAILED', payload);
    return { processed: true, payment: failed, subscription: null };
  }

  return { processed: false, payment, status };
}

/** @deprecated legacy stub callback */
export async function handlePaymentCallback(payload, { callbackSecret } = {}) {
  const expectedSecret = process.env.PAYMENT_CALLBACK_SECRET;
  if (expectedSecret) {
    if (!callbackSecret || callbackSecret !== expectedSecret) {
      const error = new Error('Недействительная подпись callback');
      error.status = 401;
      throw error;
    }
  }

  const externalId = payload.external_id || payload.provider_payment_id;
  if (!externalId) {
    const error = new Error('external_id обязателен');
    error.status = 400;
    throw error;
  }

  const payment = await Payment.findOne({
    where: { provider_payment_id: externalId },
  });

  if (!payment) {
    const error = new Error('Платёж не найден');
    error.status = 404;
    throw error;
  }

  if (payload.status === 'paid' || payload.status === PAYMENT_STATUS.COMPLETED) {
    return completePayment(payment.id);
  }

  await failPayment(payment.id, 'legacy callback failed', payload);
  return { payment, processed: false };
}
