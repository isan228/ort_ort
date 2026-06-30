import { Router } from 'express';
import {
  addFavorite,
  listFavorites,
  removeFavorite,
  createComparisonSet,
  listComparisonSets,
} from '../services/collectionService.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use('/favorites', authenticate);
router.use('/comparisons', authenticate);

router.post('/favorites', async (req, res, next) => {
  try {
    const favorite = await addFavorite(req.userId, req.body);
    res.status(201).json({ favorite });
  } catch (err) {
    next(err);
  }
});

router.get('/favorites', async (req, res, next) => {
  try {
    const favorites = await listFavorites(req.userId);
    res.json({ favorites });
  } catch (err) {
    next(err);
  }
});

router.delete('/favorites/:id', async (req, res, next) => {
  try {
    const result = await removeFavorite(req.userId, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/comparisons', async (req, res, next) => {
  try {
    const comparison = await createComparisonSet(req.userId, {
      name: req.body.name,
      items: req.body.items,
    });
    res.status(201).json({ comparison });
  } catch (err) {
    next(err);
  }
});

router.get('/comparisons', async (req, res, next) => {
  try {
    const comparisons = await listComparisonSets(req.userId);
    res.json({ comparisons });
  } catch (err) {
    next(err);
  }
});

export default router;
