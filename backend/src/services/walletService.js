import { sequelize } from '../config/database.js';
import { Wallet, WalletTransaction } from '../models/index.js';
import { BALANCE_TYPE, WALLET_TX_TYPE } from '../constants/index.js';
import { writeAuditLog } from './auditService.js';
import { createHttpError } from '../utils/errors.js';

export async function getOrCreateWallet(userId, transaction) {
  let wallet = await Wallet.findOne({ where: { user_id: userId }, transaction });
  if (!wallet) {
    wallet = await Wallet.create({ user_id: userId }, { transaction });
  }
  return wallet;
}

export async function getWalletSummary(userId) {
  const wallet = await getOrCreateWallet(userId);
  const transactions = await WalletTransaction.findAll({
    where: { wallet_id: wallet.id },
    order: [['created_at', 'DESC']],
    limit: 50,
  });

  return {
    bonus_balance: Number(wallet.bonus_balance),
    coin_balance: Number(wallet.coin_balance),
    transactions,
  };
}

export async function creditWallet(
  userId,
  { balanceType = BALANCE_TYPE.BONUS, amount, reason, actorId = null, metadata = {} }
) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw createHttpError(400, 'VALIDATION_ERROR', 'Сумма начисления должна быть положительной');
  }

  return sequelize.transaction(async (transaction) => {
    const wallet = await getOrCreateWallet(userId, transaction);
    const field = balanceType === BALANCE_TYPE.COIN ? 'coin_balance' : 'bonus_balance';
    const newBalance = Number(wallet[field]) + numericAmount;

    await wallet.update({ [field]: newBalance }, { transaction });

    const tx = await WalletTransaction.create(
      {
        wallet_id: wallet.id,
        type: WALLET_TX_TYPE.CREDIT,
        balance_type: balanceType,
        amount: numericAmount,
        reason,
        metadata: { ...metadata, actor_id: actorId },
      },
      { transaction }
    );

    await writeAuditLog({
      actorId: actorId || userId,
      actionCode: 'wallet.credit',
      entityType: 'wallet',
      entityId: wallet.id,
      after: { balance_type: balanceType, amount: numericAmount, reason },
    });

    return { wallet, transaction: tx };
  });
}

export async function debitWallet(
  userId,
  { balanceType = BALANCE_TYPE.BONUS, amount, reason, metadata = {} }
) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw createHttpError(400, 'VALIDATION_ERROR', 'Сумма списания должна быть положительной');
  }

  return sequelize.transaction(async (transaction) => {
    const wallet = await getOrCreateWallet(userId, transaction);
    const field = balanceType === BALANCE_TYPE.COIN ? 'coin_balance' : 'bonus_balance';
    const current = Number(wallet[field]);

    if (current < numericAmount) {
      throw createHttpError(402, 'WAL-001', 'Недостаточно средств на балансе');
    }

    await wallet.update({ [field]: current - numericAmount }, { transaction });

    const tx = await WalletTransaction.create(
      {
        wallet_id: wallet.id,
        type: WALLET_TX_TYPE.DEBIT,
        balance_type: balanceType,
        amount: numericAmount,
        reason,
        metadata,
      },
      { transaction }
    );

    await writeAuditLog({
      actorId: userId,
      actionCode: 'wallet.debit',
      entityType: 'wallet',
      entityId: wallet.id,
      after: { balance_type: balanceType, amount: numericAmount, reason },
    });

    return { wallet, transaction: tx };
  });
}

export async function adminAdjustWallet(adminId, { userId, balanceType, amount, reason }) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount === 0) {
    throw createHttpError(400, 'VALIDATION_ERROR', 'Укажите ненулевую сумму');
  }

  if (numericAmount > 0) {
    return creditWallet(userId, {
      balanceType,
      amount: numericAmount,
      reason: reason || 'admin_adjustment',
      actorId: adminId,
      metadata: { source: 'admin' },
    });
  }

  return debitWallet(userId, {
    balanceType,
    amount: Math.abs(numericAmount),
    reason: reason || 'admin_adjustment',
    metadata: { source: 'admin', actor_id: adminId },
  });
}

export function calculateBonusDiscount(priceKgs, bonusBalance, maxPercent = 50) {
  const price = Number(priceKgs);
  const balance = Number(bonusBalance);
  const maxDiscount = (price * maxPercent) / 100;
  const applied = Math.min(balance, maxDiscount);
  return {
    original_price: price,
    bonus_applied: applied,
    final_price: Math.max(0, price - applied),
  };
}
