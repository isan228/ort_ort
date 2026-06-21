import { Op } from 'sequelize';
import { PromoCode, PromoCodeUse } from '../models/PromoCode.js';
import { PROMO_DISCOUNT_TYPE } from '../constants/index.js';
import { createHttpError } from '../utils/errors.js';
import { writeAuditLog } from './auditService.js';

function normalizeCode(code) {
  return String(code || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

export async function listPromoCodesAdmin() {
  return PromoCode.findAll({ order: [['created_at', 'DESC']] });
}

export async function createPromoCode(adminId, data) {
  const code = normalizeCode(data.code);
  if (!code || code.length < 3) {
    throw createHttpError(400, 'VALIDATION_ERROR', 'Код промокода должен быть не короче 3 символов');
  }

  const discountType = data.discount_type || PROMO_DISCOUNT_TYPE.PERCENT;
  const discountValue = Number(data.discount_value);
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    throw createHttpError(400, 'VALIDATION_ERROR', 'Укажите корректную скидку');
  }

  if (discountType === PROMO_DISCOUNT_TYPE.PERCENT && discountValue > 100) {
    throw createHttpError(400, 'VALIDATION_ERROR', 'Процент скидки не может превышать 100');
  }

  const existing = await PromoCode.findOne({ where: { code } });
  if (existing) {
    throw createHttpError(409, 'VALIDATION_ERROR', 'Промокод с таким кодом уже существует');
  }

  const promo = await PromoCode.create({
    code,
    description: data.description?.trim() || null,
    discount_type: discountType,
    discount_value: discountValue,
    max_uses: data.max_uses != null ? Number(data.max_uses) : null,
    expires_at: data.expires_at ? new Date(data.expires_at) : null,
    is_active: data.is_active !== false,
    created_by: adminId,
  });

  await writeAuditLog({
    actorId: adminId,
    actionCode: 'promo.create',
    entityType: 'promo_code',
    entityId: promo.id,
    after: promo.toJSON(),
  });

  return promo;
}

export async function updatePromoCode(adminId, promoId, data) {
  const promo = await PromoCode.findByPk(promoId);
  if (!promo) throw createHttpError(404, 'NOT_FOUND', 'Промокод не найден');

  const before = promo.toJSON();
  const patch = {};

  if (data.description !== undefined) patch.description = data.description?.trim() || null;
  if (data.discount_type !== undefined) patch.discount_type = data.discount_type;
  if (data.discount_value !== undefined) patch.discount_value = Number(data.discount_value);
  if (data.max_uses !== undefined) patch.max_uses = data.max_uses != null ? Number(data.max_uses) : null;
  if (data.expires_at !== undefined) patch.expires_at = data.expires_at ? new Date(data.expires_at) : null;
  if (data.is_active !== undefined) patch.is_active = Boolean(data.is_active);

  await promo.update(patch);

  await writeAuditLog({
    actorId: adminId,
    actionCode: 'promo.update',
    entityType: 'promo_code',
    entityId: promo.id,
    before,
    after: promo.toJSON(),
  });

  return promo;
}

export async function validatePromoCodeForUser(code, userId) {
  const normalized = normalizeCode(code);
  if (!normalized) {
    throw createHttpError(400, 'PROMO-001', 'Укажите промокод');
  }

  const promo = await PromoCode.findOne({ where: { code: normalized, is_active: true } });
  if (!promo) {
    throw createHttpError(404, 'PROMO-001', 'Промокод не найден или неактивен');
  }

  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    throw createHttpError(400, 'PROMO-002', 'Срок действия промокода истёк');
  }

  if (promo.max_uses != null && promo.used_count >= promo.max_uses) {
    throw createHttpError(400, 'PROMO-003', 'Промокод исчерпан');
  }

  const alreadyUsed = await PromoCodeUse.findOne({
    where: { promo_code_id: promo.id, user_id: userId },
  });
  if (alreadyUsed) {
    throw createHttpError(400, 'PROMO-004', 'Вы уже использовали этот промокод');
  }

  return promo;
}

export function calculatePromoDiscount(amountKgs, promo) {
  const base = Number(amountKgs);
  const value = Number(promo.discount_value);

  if (promo.discount_type === PROMO_DISCOUNT_TYPE.FIXED) {
    const discount = Math.min(base, value);
    return { discount_applied: discount, final_price: Math.max(0, base - discount) };
  }

  const discount = Math.min(base, (base * value) / 100);
  return { discount_applied: Math.round(discount * 100) / 100, final_price: Math.max(0, base - discount) };
}

export async function previewPromoCode(code, userId, planPriceKgs) {
  const promo = await validatePromoCodeForUser(code, userId);
  const { discount_applied, final_price } = calculatePromoDiscount(planPriceKgs, promo);

  return {
    promo: {
      id: promo.id,
      code: promo.code,
      discount_type: promo.discount_type,
      discount_value: Number(promo.discount_value),
    },
    original_price: Number(planPriceKgs),
    discount_applied,
    final_price,
  };
}

export async function recordPromoUse({ promoId, userId, paymentId, discountAppliedKgs }, transaction) {
  const promo = await PromoCode.findByPk(promoId, { transaction, lock: transaction.LOCK.UPDATE });
  if (!promo) return null;

  await PromoCodeUse.create(
    {
      promo_code_id: promoId,
      user_id: userId,
      payment_id: paymentId,
      discount_applied_kgs: discountAppliedKgs,
    },
    { transaction }
  );

  await promo.update({ used_count: promo.used_count + 1 }, { transaction });
  return promo;
}
