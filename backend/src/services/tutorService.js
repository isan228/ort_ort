import { TutorLink } from '../models/index.js';
import { TUTOR_LINK_STATUS } from '../constants/index.js';
import { createHttpError } from '../utils/errors.js';

export async function listActiveTutorLinks() {
  return TutorLink.findAll({
    where: { status: TUTOR_LINK_STATUS.ACTIVE },
    order: [['sort_order', 'ASC'], ['title', 'ASC']],
  });
}

export async function listAllTutorLinks() {
  return TutorLink.findAll({ order: [['sort_order', 'ASC'], ['title', 'ASC']] });
}

export async function createTutorLink(data) {
  return TutorLink.create(data);
}

export async function updateTutorLink(id, data) {
  const link = await TutorLink.findByPk(id);
  if (!link) throw createHttpError(404, 'NOT_FOUND', 'Ссылка не найдена');
  await link.update(data);
  return link;
}

export async function deleteTutorLink(id) {
  const link = await TutorLink.findByPk(id);
  if (!link) throw createHttpError(404, 'NOT_FOUND', 'Ссылка не найдена');
  await link.update({ status: TUTOR_LINK_STATUS.INACTIVE });
  return link;
}
