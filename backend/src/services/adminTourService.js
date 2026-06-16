import { Tour } from '../models/index.js';
import { TOUR_STATUS, TIMER_MODE } from '../constants/index.js';
import { createHttpError } from '../utils/errors.js';
import { writeAuditLog } from './auditService.js';

function normalizeSettings(input = {}) {
  const settings = { simulation_only: true, ...input };
  if (settings.budget_slots != null) settings.budget_slots = Number(settings.budget_slots);
  if (settings.contract_slots != null) settings.contract_slots = Number(settings.contract_slots);
  if (settings.hold_minutes != null) settings.hold_minutes = Number(settings.hold_minutes);
  return settings;
}

export async function listToursAdmin() {
  return Tour.findAll({ order: [['starts_at', 'DESC']] });
}

export async function createTour(actorId, data) {
  if (!data.name) {
    throw createHttpError(400, 'VALIDATION_ERROR', 'name обязателен');
  }

  const tour = await Tour.create({
    name: data.name,
    status: data.status || TOUR_STATUS.UPCOMING,
    timer_mode: data.timer_mode || TIMER_MODE.GLOBAL,
    starts_at: data.starts_at || null,
    ends_at: data.ends_at || null,
    target_scope: data.target_scope || {},
    settings_json: normalizeSettings(data.settings_json),
  });

  await writeAuditLog({
    actorId,
    actionCode: 'tour.create',
    entityType: 'tour',
    entityId: tour.id,
    after: tour.toJSON(),
  });

  return tour;
}

export async function updateTour(actorId, id, data) {
  const tour = await Tour.findByPk(id);
  if (!tour) throw createHttpError(404, 'NOT_FOUND', 'Тур не найден');

  const before = tour.toJSON();
  const patch = {};

  if (data.name !== undefined) patch.name = data.name;
  if (data.status !== undefined) patch.status = data.status;
  if (data.timer_mode !== undefined) patch.timer_mode = data.timer_mode;
  if (data.starts_at !== undefined) patch.starts_at = data.starts_at;
  if (data.ends_at !== undefined) patch.ends_at = data.ends_at;
  if (data.target_scope !== undefined) patch.target_scope = data.target_scope;
  if (data.settings_json !== undefined) {
    patch.settings_json = normalizeSettings({ ...tour.settings_json, ...data.settings_json });
  }

  await tour.update(patch);

  await writeAuditLog({
    actorId,
    actionCode: 'tour.update',
    entityType: 'tour',
    entityId: tour.id,
    before,
    after: tour.toJSON(),
  });

  return tour;
}
