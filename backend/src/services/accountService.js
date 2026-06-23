import { User, Profile, DeviceSession, Wallet, Role } from '../models/index.js';
import { getUserActiveSubscription } from './subscriptionService.js';
import { userHasPremiumAccess, listUserUnlocks } from './accessService.js';
import { syncUserPhaseIfNeeded } from './phaseService.js';
import { createHttpError } from '../utils/errors.js';
import { writeAuditLog } from './auditService.js';
import { PUBLIC_DISPLAY_MODE } from '../constants/index.js';

export async function getAccountSummary(userId) {
  const phase = await syncUserPhaseIfNeeded(userId);
  const user = await User.findByPk(userId, {
    include: [
      { model: Role, as: 'role' },
      { model: Profile, as: 'profile' },
      { model: Wallet, as: 'wallet' },
    ],
  });

  if (!user) throw createHttpError(404, 'NOT_FOUND', 'Пользователь не найден');

  const subscription = await getUserActiveSubscription(userId);
  const premium = await userHasPremiumAccess(userId);
  const featureUnlocks = await listUserUnlocks(userId);

  const json = user.toJSON();
  delete json.password_hash;
  if (phase) json.phase = phase;

  return {
    user: json,
    role: user.role?.code,
    profile: user.profile,
    premium: {
      active: premium,
      subscription: subscription || null,
      feature_unlocks: featureUnlocks,
    },
    trial: {
      used: 0,
      limit: 0,
      remaining: 0,
    },
    wallet: user.wallet,
  };
}

export async function updateProfile(userId, fields) {
  const profile = await Profile.findOne({ where: { user_id: userId } });
  if (!profile) throw createHttpError(404, 'NOT_FOUND', 'Профиль не найден');

  const allowed = ['nickname', 'public_display_mode', 'certificate_number'];
  const updates = {};
  for (const key of allowed) {
    if (fields[key] !== undefined) updates[key] = fields[key];
  }

  if (updates.public_display_mode && !Object.values(PUBLIC_DISPLAY_MODE).includes(updates.public_display_mode)) {
    throw createHttpError(400, 'VALIDATION_ERROR', 'Некорректный режим отображения');
  }

  const before = profile.toJSON();
  await profile.update(updates);

  await writeAuditLog({
    actorId: userId,
    actionCode: 'profile.update',
    entityType: 'profile',
    entityId: profile.id,
    before,
    after: profile.toJSON(),
  });

  return profile;
}

export async function listDeviceSessions(userId) {
  return DeviceSession.findAll({
    where: { user_id: userId },
    order: [['last_seen_at', 'DESC']],
    attributes: { exclude: ['refresh_token_hash'] },
  });
}

export async function revokeDeviceSession(userId, sessionId) {
  const session = await DeviceSession.findOne({
    where: { id: sessionId, user_id: userId },
  });

  if (!session) throw createHttpError(404, 'NOT_FOUND', 'Сессия не найдена');

  await session.update({ is_active: false });

  await writeAuditLog({
    actorId: userId,
    actionCode: 'session.revoke',
    entityType: 'device_session',
    entityId: session.id,
  });

  return session;
}
