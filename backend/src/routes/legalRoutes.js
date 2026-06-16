import { Router } from 'express';
import { getLegalDocument } from '../services/legalService.js';

const router = Router();

router.get('/legal/:type', async (req, res, next) => {
  try {
    const locale = req.query.locale || req.query.lang || 'ru';
    const document = await getLegalDocument(req.params.type, locale);
    res.json({ document });
  } catch (err) {
    next(err);
  }
});

export default router;
