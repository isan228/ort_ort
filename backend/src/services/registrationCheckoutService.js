import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { config } from '../config/index.js';
import {
  ROLES,
  USER_STATUS,
  USER_PHASE,
  LEGAL_DOCUMENT_TYPE,
  PAYMENT_STATUS,
  PENDING_REGISTRATION_STATUS,
} from '../constants/index.js';
import {
  User,
  Profile,
  Role,
  Wallet,
  LegalAcceptance,
  Payment,
  SubscriptionPlan,
  PendingRegistration,
} from '../models/index.js';
import {
  validatePassword,
  validateConsents,
  validateIdentifier,
  deriveDefaultNickname,
  createSessionForUser,
} from './authService.js';
import { getAuthLoginMode } from './settingsService.js';
import { setupRegistrationScores } from './scoreService.js';
import { paymentProvider, StubPaymentProvider } from './paymentProvider.js';
import { attributeReferral } from './referralService.js';
import { notifyRegistration } from './notificationEvents.js';
import { writeAuditLog } from './auditService.js';
import { createHttpError } from '../utils/errors.js';

const SALT_ROUNDS = 12;
const LEGAL_VERSION = '1.0';
const PENDING_TTL_HOURS = 24;

function parseConsents(raw) {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw;
}

function parseSubjectScores(raw) {
  if (raw == null || raw === '') return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    throw createHttpError(400, 'SCORE-001', 'Некорректный формат предметных баллов');
  }
}

async function resolveCredentials(payload) {
  const authMode = await getAuthLoginMode();
  const { identifier, email, phone } = payload;

  let credentials;
  if (identifier) {
    credentials = validateIdentifier(identifier, authMode);
  } else {
    credentials = validateIdentifier(email || phone, authMode);
    if (email && authMode !== 'phone') credentials.email = email.toLowerCase();
    if (phone && authMode !== 'email') credentials.phone = phone;
  }

  if (!credentials.email && !credentials.phone) {
    throw createHttpError(400, 'AUTH-102', 'Укажите email или телефон');
  }

  return credentials;
}

async function assertNoDuplicateAccount(credentials) {
  const duplicateWhere = [];
  if (credentials.email) duplicateWhere.push({ email: credentials.email });
  if (credentials.phone) duplicateWhere.push({ phone: credentials.phone });

  const existing = await User.findOne({ where: { [Op.or]: duplicateWhere } });
  if (existing) {
    throw createHttpError(409, 'AUTH-101', 'Пользователь с таким email или телефоном уже существует');
  }

  const pendingWhere = [{ status: PENDING_REGISTRATION_STATUS.PENDING, expires_at: { [Op.gt]: new Date() } }];
  const identifierWhere = [];
  if (credentials.email) identifierWhere.push({ email: credentials.email });
  if (credentials.phone) identifierWhere.push({ phone: credentials.phone });

  if (identifierWhere.length) {
    const pending = await PendingRegistration.findOne({
      where: { [Op.and]: [...pendingWhere, { [Op.or]: identifierWhere }] },
    });
    if (pending) {
      throw createHttpError(
        409,
        'AUTH-104',
        'Регистрация с этим email или телефоном уже начата. Завершите оплату или повторите позже.'
      );
    }
  }
}

export async function createRegistrationCheckout(payload, certificateFile, meta = {}) {
  const { password, full_name, main_score, plan_id, referral_code } = payload;
  const consents = parseConsents(payload.consents);
  const subject_scores_json = parseSubjectScores(payload.subject_scores_json);

  validatePassword(password);
  validateConsents(consents);

  if (main_score == null || main_score === '') {
    throw createHttpError(400, 'SCORE-001', 'Укажите основной балл ОРТ');
  }

  if (!certificateFile?.storageKey) {
    throw createHttpError(400, 'CERT-001', 'Загрузите фото сертификата или скриншот результатов');
  }

  if (!plan_id) {
    throw createHttpError(400, 'VALIDATION_ERROR', 'Выберите тариф подписки');
  }

  const plan = await SubscriptionPlan.findByPk(plan_id);
  if (!plan || !plan.is_active) {
    throw createHttpError(404, 'NOT_FOUND', 'План подписки не найден');
  }

  const credentials = await resolveCredentials(payload);
  await assertNoDuplicateAccount(credentials);

  const paymentId = uuidv4();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + PENDING_TTL_HOURS);

  const redirectUrl = `${config.clientUrl}/register`;
  const amountKgs = Number(plan.price_kgs);

  const providerResult = await paymentProvider.createPayment({
    amountKgs,
    paymentId,
    metadata: {
      planCode: plan.code,
      planTitle: plan.title,
      redirectUrl,
    },
  });

  await sequelize.transaction(async (transaction) => {
    await Payment.create(
      {
        id: paymentId,
        user_id: null,
        plan_id: plan.id,
        amount_kgs: amountKgs,
        status: providerResult.status,
        provider: providerResult.provider,
        provider_payment_id: providerResult.providerPaymentId,
        metadata: {
          ...providerResult.metadata,
          checkout_type: 'registration',
          original_price: plan.price_kgs,
          payment_url: providerResult.paymentUrl || null,
          redirect_url: redirectUrl,
        },
      },
      { transaction }
    );

    await PendingRegistration.create(
      {
        payment_id: paymentId,
        email: credentials.email,
        phone: credentials.phone,
        password_hash: passwordHash,
        full_name,
        main_score: Number(main_score),
        subject_scores_json: subject_scores_json || {},
        consents,
        referral_code: referral_code?.trim() || null,
        certificate_storage_key: certificateFile.storageKey,
        certificate_mime: certificateFile.mimeType,
        certificate_size: certificateFile.size,
        status: PENDING_REGISTRATION_STATUS.PENDING,
        expires_at: expiresAt,
      },
      { transaction }
    );
  });

  return {
    payment_id: paymentId,
    plan,
    payment_url: providerResult.paymentUrl || null,
    requires_redirect: Boolean(providerResult.requiresRedirect && providerResult.paymentUrl),
    provider: providerResult.provider,
    stub_confirm_url:
      providerResult.provider === StubPaymentProvider.providerName
        ? `/api/v1/auth/register/checkout/${paymentId}/confirm-stub`
        : null,
  };
}

export async function finalizeRegistrationFromPayment(paymentId, transaction) {
  const payment = await Payment.findByPk(paymentId, { transaction, lock: transaction.LOCK.UPDATE });
  if (!payment) {
    throw createHttpError(404, 'NOT_FOUND', 'Платёж не найден');
  }

  if (payment.user_id) {
    return payment.user_id;
  }

  if (payment.metadata?.checkout_type !== 'registration') {
    throw createHttpError(400, 'VALIDATION_ERROR', 'Платёж не связан с регистрацией');
  }

  const pending = await PendingRegistration.findOne({
    where: { payment_id: paymentId },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!pending) {
    throw createHttpError(404, 'NOT_FOUND', 'Данные регистрации не найдены');
  }

  if (pending.status === PENDING_REGISTRATION_STATUS.COMPLETED && payment.user_id) {
    return payment.user_id;
  }

  if (pending.status === PENDING_REGISTRATION_STATUS.FAILED) {
    throw createHttpError(400, 'AUTH-105', 'Регистрация отменена из-за неудачной оплаты');
  }

  if (pending.expires_at < new Date()) {
    await pending.update({ status: PENDING_REGISTRATION_STATUS.EXPIRED }, { transaction });
    throw createHttpError(400, 'AUTH-106', 'Срок регистрации истёк. Начните заново.');
  }

  const duplicateWhere = [];
  if (pending.email) duplicateWhere.push({ email: pending.email });
  if (pending.phone) duplicateWhere.push({ phone: pending.phone });

  const existing = await User.findOne({ where: { [Op.or]: duplicateWhere }, transaction });
  if (existing) {
    await pending.update({ status: PENDING_REGISTRATION_STATUS.FAILED }, { transaction });
    throw createHttpError(409, 'AUTH-101', 'Пользователь с таким email или телефоном уже существует');
  }

  const userRole = await Role.findOne({ where: { code: ROLES.USER }, transaction });
  if (!userRole) {
    throw createHttpError(500, 'INTERNAL_ERROR', 'Роль user не найдена');
  }

  const credentials = { email: pending.email, phone: pending.phone };

  const user = await User.create(
    {
      email: pending.email,
      phone: pending.phone,
      password_hash: pending.password_hash,
      role_id: userRole.id,
      phase: USER_PHASE.AFTER_RESULTS,
      status: USER_STATUS.ACTIVE,
    },
    { transaction }
  );

  await Profile.create(
    {
      user_id: user.id,
      full_name: pending.full_name,
      nickname: deriveDefaultNickname(credentials),
      public_display_mode: 'certificate_number',
    },
    { transaction }
  );

  await Wallet.create({ user_id: user.id }, { transaction });

  const legalTypes = [
    LEGAL_DOCUMENT_TYPE.PRIVACY,
    LEGAL_DOCUMENT_TYPE.OFFER,
    LEGAL_DOCUMENT_TYPE.TERMS,
  ];

  for (const documentType of legalTypes) {
    await LegalAcceptance.create(
      {
        user_id: user.id,
        document_type: documentType,
        document_version: LEGAL_VERSION,
      },
      { transaction }
    );
  }

  await setupRegistrationScores(
    user.id,
    {
      main_score: pending.main_score,
      subject_scores_json: pending.subject_scores_json || {},
    },
    {
      storageKey: pending.certificate_storage_key,
      mimeType: pending.certificate_mime,
      size: pending.certificate_size,
    },
    transaction
  );

  await payment.update({ user_id: user.id }, { transaction });
  await pending.update({ status: PENDING_REGISTRATION_STATUS.COMPLETED }, { transaction });

  await writeAuditLog({
    actorId: user.id,
    actorRole: ROLES.USER,
    actionCode: 'auth.register',
    entityType: 'user',
    entityId: user.id,
    after: { email: user.email, phone: user.phone, via: 'payment' },
  });

  return user.id;
}

export async function afterRegistrationPaymentCompleted(payment, meta = {}) {
  if (payment.metadata?.checkout_type !== 'registration') return;

  const pending = await PendingRegistration.findOne({ where: { payment_id: payment.id } });
  if (!pending) return;

  await notifyRegistration(payment.user_id);

  if (pending.referral_code) {
    await attributeReferral(pending.referral_code, payment.user_id, { ip: meta.ip });
  }

  const { rebuildGlobalRanking } = await import('./rankingService.js');
  await rebuildGlobalRanking();
}

export async function markRegistrationCheckoutFailed(paymentId) {
  const pending = await PendingRegistration.findOne({ where: { payment_id: paymentId } });
  if (pending && pending.status === PENDING_REGISTRATION_STATUS.PENDING) {
    await pending.update({ status: PENDING_REGISTRATION_STATUS.FAILED });
  }
}

async function buildRegistrationCompletedPayload(payment, pending, session = null) {
  const { getUserActiveSubscription } = await import('./subscriptionService.js');
  const subscription = payment.user_id ? await getUserActiveSubscription(payment.user_id) : null;
  const premium = Boolean(subscription);
  const hasScores = pending?.main_score != null;

  const payload = {
    status: 'completed',
    payment_id: payment.id,
    user_id: payment.user_id,
    premium,
    has_scores: hasScores,
    has_full_access: premium,
    can_analyze: premium,
    can_use_tours: premium,
    can_view_rankings: premium,
    can_use_community: premium,
    can_use_catalog: premium,
    subscription: subscription
      ? {
          id: subscription.id,
          plan_id: subscription.plan_id,
          status: subscription.status,
          starts_at: subscription.starts_at,
          ends_at: subscription.ends_at,
          plan: subscription.plan || null,
        }
      : null,
  };

  if (session) {
    payload.access_token = session.accessToken;
    payload.refresh_token = session.refreshToken;
    payload.user = session.user;
    payload.user_state = session.user.phase;
    payload.session = session.session;
  } else {
    payload.session_already_issued = true;
  }

  return payload;
}

export async function getRegistrationCheckoutStatus(paymentId, meta = {}) {
  const payment = await Payment.findByPk(paymentId);
  if (!payment || payment.metadata?.checkout_type !== 'registration') {
    throw createHttpError(404, 'NOT_FOUND', 'Регистрация не найдена');
  }

  const pending = await PendingRegistration.findOne({ where: { payment_id: paymentId } });

  if (payment.status === PAYMENT_STATUS.FAILED || payment.status === PAYMENT_STATUS.CANCELLED) {
    return { status: 'failed', payment_id: paymentId };
  }

  if (payment.status !== PAYMENT_STATUS.COMPLETED) {
    return { status: 'pending', payment_id: paymentId };
  }

  if (!payment.user_id) {
    return { status: 'pending', payment_id: paymentId };
  }

  if (pending?.session_issued_at) {
    return buildRegistrationCompletedPayload(payment, pending);
  }

  const session = await createSessionForUser(payment.user_id, meta);
  if (pending) {
    await pending.update({ session_issued_at: new Date() });
  }

  return buildRegistrationCompletedPayload(payment, pending, session);
}

export async function confirmRegistrationStubPayment(paymentId) {
  const payment = await Payment.findByPk(paymentId);
  if (!payment) {
    throw createHttpError(404, 'NOT_FOUND', 'Платёж не найден');
  }

  if (payment.metadata?.checkout_type !== 'registration') {
    throw createHttpError(400, 'VALIDATION_ERROR', 'Это не платёж регистрации');
  }

  if (payment.provider !== StubPaymentProvider.providerName) {
    throw createHttpError(400, 'VALIDATION_ERROR', 'Подтверждение доступно только для stub-провайдера');
  }

  const { completePayment } = await import('./subscriptionService.js');
  return completePayment(paymentId);
}
