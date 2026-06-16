import { Router } from 'express';
import {
  listUniversities,
  getUniversityBySlug,
  getProgramBySlug,
  listPrograms,
} from '../services/catalogService.js';
import { optionalAuth } from '../middleware/auth.js';
import { userHasPremiumAccess } from '../services/accessService.js';

const router = Router();

async function isPremium(req) {
  if (!req.userId) return false;
  return userHasPremiumAccess(req.userId);
}

router.get('/catalog/universities', optionalAuth, async (req, res, next) => {
  try {
    const premium = await isPremium(req);
    const universities = await listUniversities({
      search: req.query.search,
      city: req.query.city,
      isPremium: premium,
    });
    if (req.query.search && !universities.length) {
      return res.status(404).json({
        error: { code: 'CAT-001', message: 'По вашему фильтру ничего не найдено' },
      });
    }
    res.json({ universities, is_premium: premium });
  } catch (err) {
    next(err);
  }
});

router.get('/catalog/universities/:slug', optionalAuth, async (req, res, next) => {
  try {
    const premium = await isPremium(req);
    const university = await getUniversityBySlug(req.params.slug, premium);
    if (!university) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Вуз не найден' } });
    }
    res.json({ university, is_premium: premium });
  } catch (err) {
    next(err);
  }
});

router.get('/catalog/program/:slug', optionalAuth, async (req, res, next) => {
  try {
    const premium = await isPremium(req);
    const program = await getProgramBySlug(req.params.slug, premium);
    if (!program) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Программа не найдена' } });
    }
    res.json({ program, is_premium: premium });
  } catch (err) {
    next(err);
  }
});

router.get('/catalog/programs', optionalAuth, async (req, res, next) => {
  try {
    const programs = await listPrograms({
      search: req.query.search,
      city: req.query.city,
    });
    res.json({ programs });
  } catch (err) {
    next(err);
  }
});

export default router;
