import { NewsArticle } from '../models/index.js';
import { NEWS_STATUS } from '../constants/index.js';
import { createHttpError } from '../utils/errors.js';

export async function listNews({ limit = 20, offset = 0, category } = {}) {
  const where = { status: NEWS_STATUS.PUBLISHED };
  if (category) where.category = category;

  const { rows, count } = await NewsArticle.findAndCountAll({
    where,
    order: [['published_at', 'DESC']],
    limit,
    offset,
    attributes: ['id', 'slug', 'title', 'excerpt', 'category', 'published_at'],
  });

  return { articles: rows, total: count };
}

export async function getNewsBySlug(slug) {
  const article = await NewsArticle.findOne({
    where: { slug, status: NEWS_STATUS.PUBLISHED },
  });
  if (!article) throw createHttpError(404, 'NOT_FOUND', 'Новость не найдена');
  return article;
}
