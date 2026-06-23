import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { config } from '../config/index.js';
import {
  ROLES,
  USER_STATUS,
  USER_PHASE,
  LEGAL_DOCUMENT_TYPE,
  DEVICE_TYPE,
} from '../constants/index.js';
import {
  User,
  Profile,
  Role,
  Wallet,
  LegalAcceptance,
  DeviceSession,
} from '../models/index.js';
import { setupRegistrationScores } from './scoreService.js';
import { getAuthLoginMode } from './settingsService.js';
import { writeAuditLog } from './auditService.js';
import { detectDeviceType, parseUserAgent } from '../utils/device.js';
import { createHttpError } from '../utils/errors.js';

const SALT_ROUNDS = 12;
const LEGAL_VERSION = '1.0';

function signAccessToken(user, sessionId) {
  return jwt.sign(
    { sub: user.id, role: user.role?.code, sid: sessionId },
    config.jwt.secret,
    { expiresIn: config.jwt.accessExpires }
  );
}

function signRefreshToken(user, sessionId) {
  return jwt.sign(
    { sub: user.id, sid: sessionId, type: 'refresh' },
    config.jwt.secret,
    { expiresIn: config.jwt.refreshExpires }
  );
}

function validateIdentifier(identifier, mode) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\+?[0-9]{10,15}$/;

  if (mode === 'phone') {
    if (!phoneRegex.test(identifier)) {
      throw createHttpError(400, 'AUTH-102', 'Некорректный номер телефона');
    }
    return { phone: identifier, email: null };
  }

  if (mode === 'email') {
    if (!emailRegex.test(identifier)) {
      throw createHttpError(400, 'AUTH-102', 'Некорректный email');
    }
    return { phone: null, email: identifier.toLowerCase() };
  }

  if (emailRegex.test(identifier)) {
    return { phone: null, email: identifier.toLowerCase() };
  }
  if (phoneRegex.test(identifier)) {
    return { phone: identifier, email: null };
  }

  throw createHttpError(400, 'AUTH-102', 'Некорректный идентификатор');
}

function validatePassword(password) {
  if (!password || password.length < 8) {
    throw createHttpError(400, 'AUTH-102', 'Пароль должен быть не короче 8 символов');
  }
}

function validateConsents(consents) {
  if (!consents?.privacy || !consents?.offer) {
    throw createHttpError(400, 'AUTH-103', 'Необходимо принять юридические соглашения');
  }
}

function sanitizeUser(user) {
  const json = user.toJSON();
  delete json.password_hash;
  return json;
}

function deriveDefaultNickname(credentials) {
  if (credentials.email) {
    let base = credentials.email
      .split('@')[0]
      .replace(/[^a-zA-Z0-9_]/g, '')
      .toLowerCase()
      .slice(0, 24);
    if (base.length < 3) {
      base = `user${Date.now().toString().slice(-6)}`;
    }
    return base.slice(0, 30);
  }

  if (credentials.phone) {
    const digits = credentials.phone.replace(/\D/g, '').slice(-8);
    return `u${digits}`.slice(0, 30);
  }

  return `user${Math.random().toString(36).slice(2, 10)}`;
}

export async function registerUser(payload, meta = {}, certificateFile = null) {
  const authMode = await getAuthLoginMode();
  const {
    identifier,
    email,
    phone,
    password,
    full_name,
    nickname,
    public_display_mode,
    certificate_number,
    consents,
    main_score,
    subject_scores_json,
  } = payload;

  validatePassword(password);
  validateConsents(consents);

  if (main_score == null || main_score === '') {
    throw createHttpError(400, 'SCORE-001', 'Укажите основной балл ОРТ');
  }

  if (!certificateFile) {
    throw createHttpError(400, 'CERT-001', 'Загрузите фото сертификата или скриншот результатов');
  }

  let parsedSubjects = subject_scores_json;
  if (typeof parsedSubjects === 'string') {
    try {
      parsedSubjects = JSON.parse(parsedSubjects);
    } catch {
      throw createHttpError(400, 'SCORE-001', 'Некорректный формат предметных баллов');
    }
  }

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

  const duplicateWhere = [];
  if (credentials.email) duplicateWhere.push({ email: credentials.email });
  if (credentials.phone) duplicateWhere.push({ phone: credentials.phone });

  const existing = await User.findOne({ where: { [Op.or]: duplicateWhere } });
  if (existing) {
    throw createHttpError(409, 'AUTH-101', 'Пользователь с таким email или телефоном уже существует');
  }

  const userRole = await Role.findOne({ where: { code: ROLES.USER } });
  if (!userRole) {
    throw createHttpError(500, 'INTERNAL_ERROR', 'Роль user не найдена');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await sequelize.transaction(async (transaction) => {
    const user = await User.create(
      {
        email: credentials.email,
        phone: credentials.phone,
        password_hash: passwordHash,
        role_id: userRole.id,
        phase: USER_PHASE.AFTER_RESULTS,
        status: USER_STATUS.ACTIVE,
      },
      { transaction }
    );

    await Profile.create(
      {
        user_id: user.id,
        full_name,
        nickname: nickname?.trim() || deriveDefaultNickname(credentials),
        certificate_number: certificate_number || null,
        public_display_mode: public_display_mode || 'certificate_number',
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
      { main_score, subject_scores_json: parsedSubjects || {} },
      certificateFile,
      transaction
    );

    return user;
  });

  const user = await User.findByPk(result.id, {
    include: [{ model: Role, as: 'role' }, { model: Profile, as: 'profile' }],
  });

  const { rebuildGlobalRanking } = await import('./rankingService.js');
  await rebuildGlobalRanking();

  await writeAuditLog({
    actorId: user.id,
    actorRole: user.role.code,
    actionCode: 'auth.register',
    entityType: 'user',
    entityId: user.id,
    after: { email: user.email, phone: user.phone },
    ip: meta.ip,
  });

  return sanitizeUser(user);
}

async function enforceDeviceLimit(userId, deviceType, transaction) {
  const activeSessions = await DeviceSession.findAll({
    where: { user_id: userId, device_type: deviceType, is_active: true },
    order: [['last_seen_at', 'ASC']],
    transaction,
  });

  if (activeSessions.length === 0) return;

  const [oldest, ...rest] = activeSessions;
  if (rest.length > 0) {
    await DeviceSession.update(
      { is_active: false },
      { where: { id: rest.map((s) => s.id) }, transaction }
    );
  }

  if (activeSessions.length >= 1) {
    await oldest.update({ is_active: false }, { transaction });
  }
}

export async function loginUser({ identifier, password }, meta = {}) {
  const authMode = await getAuthLoginMode();
  const credentials = validateIdentifier(identifier, authMode);

  const where = credentials.email
    ? { email: credentials.email }
    : { phone: credentials.phone };

  const user = await User.findOne({
    where,
    include: [{ model: Role, as: 'role' }, { model: Profile, as: 'profile' }],
  });

  if (!user) {
    throw createHttpError(401, 'AUTH-001', 'Неверный логин или пароль');
  }

  if (user.status === USER_STATUS.BLOCKED) {
    throw createHttpError(403, 'AUTH-002', 'Аккаунт заблокирован');
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw createHttpError(401, 'AUTH-001', 'Неверный логин или пароль');
  }

  const deviceType = detectDeviceType(meta.userAgent);
  const { browser, os } = parseUserAgent(meta.userAgent);

  const session = await sequelize.transaction(async (transaction) => {
    await enforceDeviceLimit(user.id, deviceType, transaction);

    const suspicious = await DeviceSession.findOne({
      where: {
        user_id: user.id,
        is_active: true,
        device_type: { [Op.ne]: deviceType },
        ip: { [Op.ne]: meta.ip || null },
      },
      transaction,
    });

    const deviceSession = await DeviceSession.create(
      {
        user_id: user.id,
        device_type: deviceType,
        user_agent: meta.userAgent,
        ip: meta.ip,
        os,
        browser,
        is_active: true,
        is_suspicious: Boolean(suspicious),
        last_seen_at: new Date(),
      },
      { transaction }
    );

    await user.update({ last_login_at: new Date() }, { transaction });

    return deviceSession;
  });

  const accessToken = signAccessToken(user, session.id);
  const refreshToken = signRefreshToken(user, session.id);

  const refreshHash = await bcrypt.hash(refreshToken, 10);
  await session.update({ refresh_token_hash: refreshHash });

  await writeAuditLog({
    actorId: user.id,
    actorRole: user.role.code,
    actionCode: session.is_suspicious ? 'auth.login_suspicious' : 'auth.login',
    entityType: 'device_session',
    entityId: session.id,
    after: { device_type: deviceType, ip: meta.ip },
    ip: meta.ip,
  });

  return {
    accessToken,
    refreshToken,
    user: sanitizeUser(user),
    session: {
      id: session.id,
      device_type: session.device_type,
      is_suspicious: session.is_suspicious,
    },
  };
}

export async function refreshAccessToken(refreshToken) {
  if (!refreshToken) {
    throw createHttpError(401, 'AUTH_REQUIRED', 'Refresh token обязателен');
  }

  let payload;
  try {
    payload = jwt.verify(refreshToken, config.jwt.secret);
  } catch {
    throw createHttpError(401, 'AUTH_REQUIRED', 'Недействительный refresh token');
  }

  if (payload.type !== 'refresh' || !payload.sid) {
    throw createHttpError(401, 'AUTH_REQUIRED', 'Недействительный refresh token');
  }

  const session = await DeviceSession.findOne({
    where: { id: payload.sid, user_id: payload.sub, is_active: true },
  });

  if (!session || !session.refresh_token_hash) {
    throw createHttpError(401, 'AUTH_REQUIRED', 'Сессия завершена');
  }

  const valid = await bcrypt.compare(refreshToken, session.refresh_token_hash);
  if (!valid) {
    throw createHttpError(401, 'AUTH_REQUIRED', 'Недействительный refresh token');
  }

  const user = await User.findByPk(payload.sub, {
    include: [{ model: Role, as: 'role' }, { model: Profile, as: 'profile' }],
  });

  if (!user) {
    throw createHttpError(401, 'AUTH_REQUIRED', 'Пользователь не найден');
  }

  if (user.status === USER_STATUS.BLOCKED) {
    throw createHttpError(403, 'AUTH-002', 'Аккаунт заблокирован');
  }

  const accessToken = signAccessToken(user, session.id);
  await session.update({ last_seen_at: new Date() });

  return {
    accessToken,
    user: sanitizeUser(user),
    session: { id: session.id },
  };
}

export async function logoutUser(userId, sessionId) {
  if (!sessionId) return { revoked: false };

  const session = await DeviceSession.findOne({
    where: { id: sessionId, user_id: userId },
  });

  if (!session) return { revoked: false };

  await session.update({ is_active: false });

  await writeAuditLog({
    actorId: userId,
    actionCode: 'auth.logout',
    entityType: 'device_session',
    entityId: session.id,
  });

  return { revoked: true };
}

export async function getUserById(userId) {
  const user = await User.findByPk(userId, {
    include: [{ model: Role, as: 'role' }, { model: Profile, as: 'profile' }],
  });
  return user ? sanitizeUser(user) : null;
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.secret);
}
