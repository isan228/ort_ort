import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Payment, Subscription, SubscriptionPlan } from '../models/index.js';
import { PAYMENT_STATUS, SUBSCRIPTION_STATUS } from '../constants/index.js';
import { paymentProvider } from './paymentProvider.js';
import { notifyPaymentSuccess } from './notificationEvents.js';
import { getWalletSummary, calculateBonusDiscount, debitWallet } from './walletService.js';
import { getRedemptionRules } from './bonusService.js';
import { BALANCE_TYPE } from '../constants/index.js';
import {
  validatePromoCodeForUser,
  calculatePromoDiscount,
  recordPromoUse,
} from './promoService.js';

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

  const providerResult = await paymentProvider.createPayment({
    amountKgs,
    userId,
    planId: plan.id,
    metadata: { planCode: plan.code, bonus_applied: bonusApplied },
  });

  const payment = await Payment.create({
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
    },
  });

  return { payment, plan, providerResult, bonus_applied: bonusApplied, promo_discount: promoDiscount };
}

export async function confirmStubPayment(paymentId, userId = null) {
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

    if (userId && payment.user_id !== userId) {
      const error = new Error('Нет доступа к этому платежу');
      error.status = 403;
      throw error;
    }

    if (payment.status === PAYMENT_STATUS.COMPLETED) {
      return { payment, subscription: await getUserActiveSubscription(payment.user_id) };
    }

    if (payment.provider !== 'stub') {
      const error = new Error('Подтверждение доступно только для stub-провайдера');
      error.status = 400;
      throw error;
    }

    const providerResult = await paymentProvider.confirmPayment(payment.provider_payment_id);
    const plan = await SubscriptionPlan.findByPk(payment.plan_id, { transaction });

    await payment.update(
      {
        status: providerResult.status,
        completed_at: providerResult.completedAt,
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

    return { payment, subscription, plan };
  });

  if (result.subscription) {
    const bonusApplied = Number(result.payment.metadata?.bonus_applied || 0);
    if (bonusApplied > 0) {
      await debitWallet(result.payment.user_id, {
        balanceType: BALANCE_TYPE.BONUS,
        amount: bonusApplied,
        reason: 'subscription_payment',
        metadata: { payment_id: result.payment.id },
      });
    }
    await notifyPaymentSuccess(result.payment.user_id);
  }

  return result;
}

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
    return confirmStubPayment(payment.id);
  }

  await payment.update({
    status: PAYMENT_STATUS.FAILED,
    metadata: { ...payment.metadata, callback_payload: payload },
  });

  return { payment, processed: false };
}
