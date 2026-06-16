import { Router } from 'express';
import { listActiveTutorLinks } from '../services/tutorService.js';

const router = Router();

router.get('/tutors/links', async (_req, res, next) => {
  try {
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
