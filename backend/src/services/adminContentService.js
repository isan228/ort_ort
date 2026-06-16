import { NewsArticle } from '../models/index.js';
import { NEWS_STATUS } from '../constants/index.js';
import { createHttpError } from '../utils/errors.js';
import { writeAuditLog } from './auditService.js';

export async function listNewsAdmin() {
  return NewsArticle.findAll({
    order: [['updated_at', 'DESC']],
  });
}

export async function createNewsArticle(actorId, data) {
  if (!data.slug || !data.title || !data.body) {
    throw createHttpError(400, 'VALIDATION_ERROR', 'slug, title и body обязательны');
  }

  const existing = await NewsArticle.findOne({ where: { slug: data.slug } });
  if (existing) throw createHttpError(409, 'CONFLICT', 'Статья с таким slug уже существует');

  const status = data.status || NEWS_STATUS.DRAFT;
  const article = await NewsArticle.create({
    slug: data.slug,
    title: data.title,
    body: data.body,
    excerpt: data.excerpt || null,
    category: data.category || null,
    status,
    published_at: status === NEWS_STATUS.PUBLISHED ? data.published_at || new Date() : null,
  });

  await writeAuditLog({
    actorId,
    actionCode: 'news.create',
    entityType: 'news_article',
    entityId: article.id,
    after: article.toJSON(),
  });

  return article;
}

export async function updateNewsArticle(actorId, id, data) {
  const article = await NewsArticle.findByPk(id);
  if (!article) throw createHttpError(404, 'NOT_FOUND', 'Новость не найдена');

  const before = article.toJSON();
  const patch = {};

  if (data.title !== undefined) patch.title = data.title;
  if (data.body !== undefined) patch.body = data.body;
  if (data.excerpt !== undefined) patch.excerpt = data.excerpt;
  if (data.category !== undefined) patch.category = data.category;

  if (data.slug !== undefined && data.slug !== article.slug) {
    const existing = await NewsArticle.findOne({ where: { slug: data.slug } });
    if (existing) throw createHttpError(409, 'CONFLICT', 'Статья с таким slug уже существует');
    patch.slug = data.slug;
  }

  if (data.status !== undefined) {
    patch.status = data.status;
    if (data.status === NEWS_STATUS.PUBLISHED && !article.published_at) {
      patch.published_at = data.published_at || new Date();
    }
    if (data.status === NEWS_STATUS.DRAFT) {
      patch.published_at = null;
    }
  }

  await article.update(patch);

  await writeAuditLog({
    actorId,
    actionCode: 'news.update',
    entityType: 'news_article',
    entityId: article.id,
    before,
    after: article.toJSON(),
  });

  return article;
}
