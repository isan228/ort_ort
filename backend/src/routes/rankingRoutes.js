import { Router } from 'express';
import { getKyrgyzstanRanking } from '../services/rankingService.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/rankings/kyrgyzstan', optionalAuth, async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const ranking = await getKyrgyzstanRanking({
      limit,
      offset,
      userId: req.userId || null,
    });
    res.json(ranking);
  } catch (err) {
    next(err);
  }
});

export default router;
