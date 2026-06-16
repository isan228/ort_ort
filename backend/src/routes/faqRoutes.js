import { Router } from 'express';
import { listFaqPublic } from '../services/faqService.js';

const router = Router();

router.get('/faq', async (req, res, next) => {
  try {
    const items = await listFaqPublic({
      locale: req.query.locale || req.query.lang || 'ru',
      category: req.query.category,
    });
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

export default router;
