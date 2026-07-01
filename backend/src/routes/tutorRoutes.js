import { Router } from 'express';
import { listActiveTutorLinks } from '../services/tutorService.js';
import { authenticate } from '../middleware/auth.js';
import { getUserFeatureAccess } from '../services/featureAccessService.js';
import { createHttpError } from '../utils/errors.js';

const router = Router();

router.get('/tutors/links', authenticate, async (req, res, next) => {
  try {
    const access = await getUserFeatureAccess(req.userId);
    if (!access.can_use_community) {
      throw createHttpError(402, 'ANL-002', 'Tutor Community доступен по подписке Premium');
    }

    const links = await listActiveTutorLinks();
    res.json({
      links,
      disclaimer:
        'Ссылки ведут на внешние сообщества. ORT.KG не несёт ответственности за контент сторонних платформ.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
