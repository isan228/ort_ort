import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import { User, PasswordResetToken } from '../models/index.js';
import { getAuthLoginMode } from './settingsService.js';
import { createHttpError } from '../utils/errors.js';
import { writeAuditLog } from './auditService.js';

const RESET_EXPIRY_MS = 60 * 60 * 1000;
const rateLimitMap = new Map();

function checkRateLimit(identifier) {
  const key = `reset:${identifier}`;
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (entry && now - entry < 60_000) {
    throw createHttpError(429, 'AUTH-203', 'Слишком много попыток, попробуйте позже');
  }
  rateLimitMap.set(key, now);
}

export async function requestPasswordReset(identifier) {
  checkRateLimit(identifier);
  const authMode = await getAuthLoginMode();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const where = emailRegex.test(identifier)
    ? { email: identifier.toLowerCase() }
    : { phone: identifier };

  const user = await User.findOne({ where });

  // Generic response — не раскрываем существование аккаунта
  if (!user) {
    return { accepted: true };
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = await bcrypt.hash(rawToken, 10);

  await PasswordResetToken.update(
    { used_at: new Date() },
    { where: { user_id: user.id, used_at: null } }
  );

  await PasswordResetToken.create({
    user_id: user.id,
    token_hash: tokenHash,
    expires_at: new Date(Date.now() + RESET_EXPIRY_MS),
  });

  await writeAuditLog({
    actorId: user.id,
    actionCode: 'auth.password_forgot',
    entityType: 'user',
    entityId: user.id,
  });

  return {
    accepted: true,
    // Dev-only: пока нет email/SMS провайдера (INT-006)
    dev_token: process.env.NODE_ENV === 'development' ? rawToken : undefined,
  };
}

export async function resetPassword({ token, new_password }) {
  if (!new_password || new_password.length < 8) {
    throw createHttpError(400, 'AUTH-102', 'Пароль должен быть не короче 8 символов');
  }

  const tokens = await PasswordResetToken.findAll({
    where: {
      used_at: null,
      expires_at: { [Op.gt]: new Date() },
    },
    order: [['created_at', 'DESC']],
    limit: 50,
  });

  let matched = null;
  for (const row of tokens) {
    const ok = await bcrypt.compare(token, row.token_hash);
    if (ok) {
      matched = row;
      break;
    }
  }

  if (!matched) {
    throw createHttpError(400, 'AUTH-202', 'Недействительный или просроченный код');
  }

  const user = await User.findByPk(matched.user_id);
  if (!user) throw createHttpError(404, 'AUTH-201', 'Пользователь не найден');

  const passwordHash = await bcrypt.hash(new_password, 12);
  await user.update({ password_hash: passwordHash });
  await matched.update({ used_at: new Date() });

  await writeAuditLog({
    actorId: user.id,
    actionCode: 'auth.password_reset',
    entityType: 'user',
    entityId: user.id,
  });

  return { success: true };
}
