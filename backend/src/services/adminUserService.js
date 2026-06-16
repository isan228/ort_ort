import { Op } from 'sequelize';
import { User, Profile, Role } from '../models/index.js';
import { USER_STATUS, ROLES } from '../constants/index.js';
import { createHttpError } from '../utils/errors.js';
import { writeAuditLog } from './auditService.js';

export async function listRoles() {
  return Role.findAll({ order: [['code', 'ASC']] });
}

export async function listUsers({ search, status, limit = 50, offset = 0 } = {}) {
  const where = {};

  if (status && Object.values(USER_STATUS).includes(status)) {
    where.status = status;
  }

  if (search) {
    const q = `%${search.trim()}%`;
    where[Op.or] = [
      { email: { [Op.iLike]: q } },
      { phone: { [Op.iLike]: q } },
      { '$profile.nickname$': { [Op.iLike]: q } },
      { '$profile.full_name$': { [Op.iLike]: q } },
    ];
  }

  const { rows, count } = await User.findAndCountAll({
    where,
    attributes: { exclude: ['password_hash'] },
    include: [
      { model: Role, as: 'role', attributes: ['id', 'code', 'name'] },
      { model: Profile, as: 'profile', attributes: ['nickname', 'full_name', 'certificate_number'] },
    ],
    order: [['created_at', 'DESC']],
    limit: Math.min(Number(limit) || 50, 100),
    offset: Number(offset) || 0,
    subQuery: false,
  });

  return { users: rows, total: count };
}

export async function updateUser(actorId, actorRole, targetUserId, data) {
  const user = await User.findByPk(targetUserId, {
    include: [{ model: Role, as: 'role' }, { model: Profile, as: 'profile' }],
  });

  if (!user) throw createHttpError(404, 'NOT_FOUND', 'Пользователь не найден');

  if (targetUserId === actorId && data.status === USER_STATUS.BLOCKED) {
    throw createHttpError(400, 'VALIDATION_ERROR', 'Нельзя заблокировать свой аккаунт');
  }

  const before = user.toJSON();
  const patch = {};

  if (data.status !== undefined) {
    if (!Object.values(USER_STATUS).includes(data.status)) {
      throw createHttpError(400, 'VALIDATION_ERROR', 'Некорректный статус');
    }
    patch.status = data.status;
  }

  if (data.phase !== undefined) {
    patch.phase = data.phase;
  }

  if (data.role_code !== undefined || data.role_id !== undefined) {
    let role = null;
    if (data.role_id) {
      role = await Role.findByPk(data.role_id);
    } else if (data.role_code) {
      role = await Role.findOne({ where: { code: data.role_code } });
    }

    if (!role) throw createHttpError(400, 'VALIDATION_ERROR', 'Роль не найдена');

    if (user.role?.code === ROLES.SUPERADMIN && actorRole !== ROLES.SUPERADMIN) {
      throw createHttpError(403, 'FORBIDDEN', 'Недостаточно прав для изменения суперадмина');
    }

    if (role.code === ROLES.SUPERADMIN && actorRole !== ROLES.SUPERADMIN) {
      throw createHttpError(403, 'FORBIDDEN', 'Только superadmin может назначать superadmin');
    }

    patch.role_id = role.id;
  }

  await user.update(patch);
  await user.reload({ include: [{ model: Role, as: 'role' }, { model: Profile, as: 'profile' }] });

  await writeAuditLog({
    actorId,
    actorRole,
    actionCode: 'user.admin_update',
    entityType: 'user',
    entityId: user.id,
    before,
    after: user.toJSON(),
  });

  return user;
}
