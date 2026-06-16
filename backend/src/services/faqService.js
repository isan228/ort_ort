import { FaqItem } from '../models/index.js';
import { createHttpError } from '../utils/errors.js';
import { writeAuditLog } from './auditService.js';

function normalizeLocale(locale) {
  return locale === 'ky' ? 'ky' : 'ru';
}

export async function listFaqPublic({ locale = 'ru', category } = {}) {
  const where = {
    is_published: true,
    locale: normalizeLocale(locale),
  };
  if (category) where.category = category;

  const items = await FaqItem.findAll({
    where,
    order: [
      ['sort_order', 'ASC'],
      ['question', 'ASC'],
    ],
    attributes: ['id', 'category', 'locale', 'question', 'answer', 'sort_order'],
  });

  return items;
}

export async function listFaqAdmin() {
  return FaqItem.findAll({
    order: [
      ['locale', 'ASC'],
      ['sort_order', 'ASC'],
      ['question', 'ASC'],
    ],
  });
}

export async function createFaqItem(actorId, data) {
  if (!data.question || !data.answer) {
    throw createHttpError(400, 'VALIDATION_ERROR', 'question и answer обязательны');
  }

  const item = await FaqItem.create({
    category: data.category || 'general',
    locale: normalizeLocale(data.locale),
    question: data.question,
    answer: data.answer,
    sort_order: Number(data.sort_order) || 0,
    is_published: data.is_published !== false,
  });

  await writeAuditLog({
    actorId,
    actionCode: 'faq.create',
    entityType: 'faq_item',
    entityId: item.id,
    after: item.toJSON(),
  });

  return item;
}

export async function updateFaqItem(actorId, id, data) {
  const item = await FaqItem.findByPk(id);
  if (!item) throw createHttpError(404, 'NOT_FOUND', 'FAQ не найден');

  const before = item.toJSON();
  const patch = {};

  if (data.category !== undefined) patch.category = data.category;
  if (data.locale !== undefined) patch.locale = normalizeLocale(data.locale);
  if (data.question !== undefined) patch.question = data.question;
  if (data.answer !== undefined) patch.answer = data.answer;
  if (data.sort_order !== undefined) patch.sort_order = Number(data.sort_order);
  if (data.is_published !== undefined) patch.is_published = Boolean(data.is_published);

  await item.update(patch);

  await writeAuditLog({
    actorId,
    actionCode: 'faq.update',
    entityType: 'faq_item',
    entityId: item.id,
    before,
    after: item.toJSON(),
  });

  return item;
}

export async function deleteFaqItem(actorId, id) {
  const item = await FaqItem.findByPk(id);
  if (!item) throw createHttpError(404, 'NOT_FOUND', 'FAQ не найден');

  const before = item.toJSON();
  await item.update({ is_published: false });

  await writeAuditLog({
    actorId,
    actionCode: 'faq.unpublish',
    entityType: 'faq_item',
    entityId: item.id,
    before,
    after: item.toJSON(),
  });

  return item;
}
