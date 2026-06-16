import { Op } from 'sequelize';
import { Payment, User, Profile, SubscriptionPlan } from '../models/index.js';
import { PAYMENT_STATUS } from '../constants/index.js';
import { createHttpError } from '../utils/errors.js';
import { confirmStubPayment } from './subscriptionService.js';
import { writeAuditLog } from './auditService.js';

export async function listPaymentsAdmin({ status, limit = 50, offset = 0 } = {}) {
  const where = {};
  if (status && Object.values(PAYMENT_STATUS).includes(status)) {
    where.status = status;
  }

  const { rows, count } = await Payment.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'phone'],
        include: [{ model: Profile, as: 'profile', attributes: ['nickname'] }],
      },
      { model: SubscriptionPlan, as: 'plan', attributes: ['id', 'code', 'title', 'price_kgs'] },
    ],
    order: [['created_at', 'DESC']],
    limit: Math.min(Number(limit) || 50, 100),
    offset: Number(offset) || 0,
  });

  return { payments: rows, total: count };
}

export async function adminConfirmPayment(actorId, paymentId) {
  const payment = await Payment.findByPk(paymentId);
  if (!payment) throw createHttpError(404, 'NOT_FOUND', 'Платёж не найден');

  const before = payment.toJSON();
  const result = await confirmStubPayment(paymentId);

  await writeAuditLog({
    actorId,
    actionCode: 'payment.admin_confirm',
    entityType: 'payment',
    entityId: payment.id,
    before,
    after: result.payment.toJSON(),
  });

  return result;
}

export async function adminCancelPayment(actorId, paymentId, reason) {
  const payment = await Payment.findByPk(paymentId);
  if (!payment) throw createHttpError(404, 'NOT_FOUND', 'Платёж не найден');

  if (payment.status === PAYMENT_STATUS.COMPLETED) {
    throw createHttpError(400, 'VALIDATION_ERROR', 'Нельзя отменить завершённый платёж');
  }

  const before = payment.toJSON();
  await payment.update({
    status: PAYMENT_STATUS.CANCELLED,
    metadata: { ...payment.metadata, admin_cancel_reason: reason || 'admin_cancel' },
  });

  await writeAuditLog({
    actorId,
    actionCode: 'payment.admin_cancel',
    entityType: 'payment',
    entityId: payment.id,
    before,
    after: payment.toJSON(),
  });

  return payment;
}

export async function adminMarkPaymentFailed(actorId, paymentId, reason) {
  const payment = await Payment.findByPk(paymentId);
  if (!payment) throw createHttpError(404, 'NOT_FOUND', 'Платёж не найден');

  if (payment.status === PAYMENT_STATUS.COMPLETED) {
    throw createHttpError(400, 'VALIDATION_ERROR', 'Нельзя пометить завершённый платёж как failed');
  }

  const before = payment.toJSON();
  await payment.update({
    status: PAYMENT_STATUS.FAILED,
    metadata: { ...payment.metadata, admin_fail_reason: reason || 'admin_failed' },
  });

  await writeAuditLog({
    actorId,
    actionCode: 'payment.admin_fail',
    entityType: 'payment',
    entityId: payment.id,
    before,
    after: payment.toJSON(),
  });

  return payment;
}
