import { Router } from 'express';
import { getKyrgyzstanRanking } from '../services/rankingService.js';
import { authenticate } from '../middleware/auth.js';
import { getUserFeatureAccess } from '../services/featureAccessService.js';
import { createHttpError } from '../utils/errors.js';

const router = Router();

router.get('/rankings/kyrgyzstan', authenticate, async (req, res, next) => {
  try {
    const access = await getUserFeatureAccess(req.userId);
    if (!access.can_view_rankings) {
      throw createHttpError(
        402,
        'ANL-002',
        access.blocked_reason === 'scores'
          ? 'Укажите баллы в личном кабинете'
          : 'Рейтинг доступен по подписке Premium'
      );
    }

    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const ranking = await getKyrgyzstanRanking({
      limit,
      offset,
      userId: req.userId,
    });
    res.json({ ...ranking, access });
  } catch (err) {
    next(err);
  }
});

export default router;
