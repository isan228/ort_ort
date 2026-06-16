import jwt from 'jsonwebtoken';
import { User, Role, Profile, DeviceSession } from '../models/index.js';
import { config } from '../config/index.js';
import { USER_STATUS } from '../constants/index.js';
import { createHttpError } from '../utils/errors.js';

export async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw createHttpError(401, 'AUTH_REQUIRED', 'Требуется авторизация');
    }

    const token = header.slice(7);
    const payload = jwt.verify(token, config.jwt.secret);

    const user = await User.findByPk(payload.sub, {
      include: [{ model: Role, as: 'role' }, { model: Profile, as: 'profile' }],
    });

    if (!user) {
      throw createHttpError(401, 'AUTH_REQUIRED', 'Пользователь не найден');
    }

    if (user.status === USER_STATUS.BLOCKED) {
      throw createHttpError(403, 'AUTH-002', 'Аккаунт заблокирован');
    }

    if (payload.sid) {
      const session = await DeviceSession.findOne({
        where: { id: payload.sid, user_id: user.id, is_active: true },
      });
      if (!session) {
        throw createHttpError(401, 'AUTH_REQUIRED', 'Сессия завершена, войдите снова');
      }
      await session.update({ last_seen_at: new Date() });
      req.sessionId = session.id;
    }

    req.user = user;
    req.userId = user.id;
    req.userRole = user.role?.code;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(createHttpError(401, 'AUTH_REQUIRED', 'Недействительный токен'));
    }
    next(err);
  }
}

export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next();
  }
  authenticate(req, res, (err) => {
    if (err) return next();
    next();
  });
}

export function requireRoles(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.userRole || !allowedRoles.includes(req.userRole)) {
      return next(createHttpError(403, 'FORBIDDEN', 'Недостаточно прав'));
    }
    next();
  };
}
