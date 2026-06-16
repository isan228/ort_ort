import { Router } from 'express';
import {
  listToursPublic,
  getTourDetail,
  joinTour,
  withdrawFromTour,
} from '../services/tourService.js';
import { optionalAuth, authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/tours', async (_req, res, next) => {
  try {
    const tours = await listToursPublic();
    res.json({ tours });
  } catch (err) {
    next(err);
  }
});

router.get('/tours/:id', optionalAuth, async (req, res, next) => {
  try {
    const tour = await getTourDetail(req.params.id, req.userId || null);
    res.json({ tour });
  } catch (err) {
    next(err);
  }
});

router.post('/tours/:id/join', authenticate, async (req, res, next) => {
  try {
    const result = await joinTour(req.userId, req.params.id, req.body.slot_type);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/tours/:id/withdraw', authenticate, async (req, res, next) => {
  try {
    const participation = await withdrawFromTour(req.userId, req.params.id);
    res.json({ participation });
  } catch (err) {
    next(err);
  }
});

export default router;
