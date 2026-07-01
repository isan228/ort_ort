import { Favorite, ComparisonSet, University, Faculty, Specialty } from '../models/index.js';
import { FAVORITE_ENTITY_TYPE } from '../constants/index.js';
import { userHasActiveSubscription } from './subscriptionService.js';
import { userHasPremiumAccess, consumeUnlock } from './accessService.js';
import { REDEMPTION_FEATURE } from '../constants/index.js';
import { createHttpError } from '../utils/errors.js';

async function enrichFavorite(favorite) {
  const json = favorite.toJSON ? favorite.toJSON() : { ...favorite };
  let entity = null;
  let link = null;

  switch (json.entity_type) {
    case FAVORITE_ENTITY_TYPE.UNIVERSITY: {
      const row = await University.findByPk(json.entity_id, {
        attributes: ['id', 'slug', 'name', 'city'],
      });
      if (row) {
        entity = row.toJSON();
        link = `/universities/${row.slug}`;
      }
      break;
    }
    case FAVORITE_ENTITY_TYPE.FACULTY: {
      const row = await Faculty.findByPk(json.entity_id, {
        attributes: ['id', 'slug', 'name'],
        include: [{ model: University, as: 'university', attributes: ['slug', 'name'] }],
      });
      if (row) {
        entity = row.toJSON();
        link = row.university ? `/universities/${row.university.slug}` : null;
      }
      break;
    }
    case FAVORITE_ENTITY_TYPE.SPECIALTY: {
      const row = await Specialty.findByPk(json.entity_id, {
        attributes: ['id', 'slug', 'name'],
        include: [
          {
            model: Faculty,
            as: 'faculty',
            attributes: ['name'],
            include: [{ model: University, as: 'university', attributes: ['name', 'slug'] }],
          },
        ],
      });
      if (row) {
        entity = row.toJSON();
        link = `/programs/${row.slug}`;
      }
      break;
    }
    default:
      break;
  }

  return { ...json, entity, link };
}

export async function addFavorite(userId, { entity_type, entity_id }) {
  if (!Object.values(FAVORITE_ENTITY_TYPE).includes(entity_type)) {
    throw createHttpError(400, 'VALIDATION_ERROR', 'Некорректный тип сущности');
  }

  const [favorite] = await Favorite.findOrCreate({
    where: { user_id: userId, entity_type, entity_id },
  });

  return enrichFavorite(favorite);
}

export async function removeFavorite(userId, favoriteId) {
  const favorite = await Favorite.findOne({
    where: { id: favoriteId, user_id: userId },
  });

  if (!favorite) {
    throw createHttpError(404, 'NOT_FOUND', 'Избранное не найдено');
  }

  await favorite.destroy();
  return { removed: true, id: favoriteId };
}

export async function listFavorites(userId) {
  const favorites = await Favorite.findAll({
    where: { user_id: userId },
    order: [['created_at', 'DESC']],
  });

  return Promise.all(favorites.map(enrichFavorite));
}

export async function createComparisonSet(userId, { name, items }) {
  const canCompare = await userHasPremiumAccess(userId);
  if (!canCompare) {
    throw createHttpError(402, 'ANL-002', 'Функция доступна по подписке Premium');
  }

  if (!Array.isArray(items) || items.length < 2) {
    throw createHttpError(400, 'VALIDATION_ERROR', 'Для сравнения нужно минимум 2 элемента');
  }

  const comparison = await ComparisonSet.create({
    user_id: userId,
    name: name || 'Сравнение',
    items_json: items,
  });

  const subscribed = await userHasActiveSubscription(userId);
  if (!subscribed) {
    await consumeUnlock(userId, REDEMPTION_FEATURE.COMPARE_UNLOCK);
  }

  return comparison;
}

export async function listComparisonSets(userId) {
  return ComparisonSet.findAll({
    where: { user_id: userId },
    order: [['created_at', 'DESC']],
  });
}
