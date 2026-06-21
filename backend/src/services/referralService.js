import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { sequelize } from '../config/database.js';
import { ReferralCode, ReferralEvent, User, DeviceSession } from '../models/index.js';
import { REFERRAL_REWARD_STATUS } from '../constants/index.js';
import { config } from '../config/index.js';
import { getRedemptionRules } from './bonusService.js';
import { creditWallet } from './walletService.js';
import { writeAuditLog } from './auditService.js';
import { createNotification } from './notificationService.js';
import { NOTIFICATION_TYPE } from '../constants/index.js';
import { createHttpError } from '../utils/errors.js';

export async function getOrCreateReferralCode(userId) {
  let code = await ReferralCode.findOne({ where: { user_id: userId } });
  if (!code) {
    code = await ReferralCode.create({
      user_id: userId,
      code: uuidv4().slice(0, 8).toUpperCase(),
    });
  }
  return {
    code: code.code,
    link: `${config.clientUrl}/register?ref=${code.code}`,
    is_active: code.is_active,
  };
}

export async function getReferralStats(userId) {
  const code = await getOrCreateReferralCode(userId);
  const events = await ReferralEvent.findAll({
    where: { referrer_user_id: userId },
    order: [['created_at', 'DESC']],
  });

  const rules = await getRedemptionRules();

  return {
    ...code,
    referred_count: events.length,
    awarded_count: events.filter((e) => e.reward_status === REFERRAL_REWARD_STATUS.AWARDED).length,
    reward_per_referral: rules.referral_reward_bonus,
    events,
    redemption_rules: rules,
  };
}

async function detectReferralFraud({ referrerUserId, referredUserId, inviteeIp, referredUser }) {
  if (referrerUserId === referredUserId) {
    return { fraud: true, reason: 'self_referral' };
  }

  const referrer = await User.findByPk(referrerUserId);
  if (!referrer) return { fraud: true, reason: 'invalid_referrer' };

  if (
    referredUser.email &&
    referrer.email &&
    referredUser.email.toLowerCase() === referrer.email.toLowerCase()
  ) {
    return { fraud: true, reason: 'same_email' };
  }

  if (referredUser.phone && referrer.phone && referredUser.phone === referrer.phone) {
    return { fraud: true, reason: 'same_phone' };
  }

  if (inviteeIp) {
    const referrerSession = await DeviceSession.findOne({
      where: { user_id: referrerUserId, ip: inviteeIp },
    });
    if (referrerSession) {
      return { fraud: true, reason: 'same_ip_as_referrer' };
    }

    const sameIpReferrals = await ReferralEvent.count({
      where: {
        referrer_user_id: referrerUserId,
        [Op.and]: [
          sequelize.where(
            sequelize.literal("metadata->>'invitee_ip'"),
            inviteeIp
          ),
        ],
        reward_status: { [Op.ne]: REFERRAL_REWARD_STATUS.REJECTED },
      },
    });
    if (sameIpReferrals >= 3) {
      return { fraud: true, reason: 'ip_velocity_limit' };
    }
  }

  return { fraud: false };
}

export async function attributeReferral(referrerCode, referredUserId, { ip = null } = {}) {
  const code = await ReferralCode.findOne({ where: { code: referrerCode, is_active: true } });
  if (!code) return null;

  const referredUser = await User.findByPk(referredUserId);
  if (!referredUser) return null;

  const fraudCheck = await detectReferralFraud({
    referrerUserId: code.user_id,
    referredUserId,
    inviteeIp: ip,
    referredUser,
  });

  if (fraudCheck.fraud && fraudCheck.reason === 'self_referral') {
    return null;
  }

  const existing = await ReferralEvent.findOne({ where: { referred_user_id: referredUserId } });
  if (existing) return existing;

  const event = await ReferralEvent.create({
    referrer_user_id: code.user_id,
    referred_user_id: referredUserId,
    event_type: 'registration',
    reward_status: fraudCheck.fraud ? REFERRAL_REWARD_STATUS.FRAUD : REFERRAL_REWARD_STATUS.PENDING,
    metadata: {
      invitee_ip: ip,
      fraud_reason: fraudCheck.fraud ? fraudCheck.reason : null,
    },
  });

  if (!fraudCheck.fraud) {
    await processReferralReward(event.id);
  } else {
    await writeAuditLog({
      actorId: referredUserId,
      actionCode: 'referral.fraud_blocked',
      entityType: 'referral_event',
      entityId: event.id,
      after: { reason: fraudCheck.reason },
      ip,
    });
  }

  return event;
}

export async function processReferralReward(eventId) {
  const event = await ReferralEvent.findByPk(eventId);
  if (!event || event.reward_status !== REFERRAL_REWARD_STATUS.PENDING) {
    return event;
  }

  const rules = await getRedemptionRules();
  const rewardAmount = rules.referral_reward_bonus || 50;
  const referredBonus = rules.referred_user_bonus || 50;

  await creditWallet(event.referrer_user_id, {
    amount: rewardAmount,
    reason: 'referral_reward',
    metadata: { referral_event_id: event.id, referred_user_id: event.referred_user_id },
  });

  await creditWallet(event.referred_user_id, {
    amount: referredBonus,
    reason: 'referral_signup_bonus',
    metadata: { referral_event_id: event.id, referrer_user_id: event.referrer_user_id },
  });

  await event.update({
    reward_status: REFERRAL_REWARD_STATUS.AWARDED,
    reward_amount: rewardAmount,
  });

  await createNotification({
    userId: event.referrer_user_id,
    type: NOTIFICATION_TYPE.BONUS,
    title: 'Начислены бонусы',
    body: `+${rewardAmount} бонусов за приглашённого пользователя`,
    actionUrl: '/account/wallet',
  });

  await createNotification({
    userId: event.referred_user_id,
    type: NOTIFICATION_TYPE.BONUS,
    title: 'Добро пожаловать!',
    body: `+${referredBonus} бонусов за регистрацию по реферальной ссылке`,
    actionUrl: '/account/wallet',
  });

  await writeAuditLog({
    actorId: event.referrer_user_id,
    actionCode: 'referral.reward_awarded',
    entityType: 'referral_event',
    entityId: event.id,
    after: { reward_amount: rewardAmount },
  });

  return event;
}

export async function listReferralEventsForAdmin({ status, limit = 50, offset = 0 } = {}) {
  const where = {};
  if (status) where.reward_status = status;

  const { rows, count } = await ReferralEvent.findAndCountAll({
    where,
    include: [
      { model: User, as: 'referrer', attributes: ['id', 'email', 'phone'] },
      { model: User, as: 'referred', attributes: ['id', 'email', 'phone'] },
    ],
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  return { events: rows, total: count };
}
