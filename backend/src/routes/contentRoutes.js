import { Router } from 'express';
import { listNews, getNewsBySlug } from '../services/contentService.js';

const router = Router();

router.get('/news', async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const offset = Number(req.query.offset) || 0;
    const data = await listNews({ limit, offset, category: req.query.category });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/news/:slug', async (req, res, next) => {
  try {
    const article = await getNewsBySlug(req.params.slug);
    res.json({ article });
  } catch (err) {
    next(err);
  }
});

export default router;
