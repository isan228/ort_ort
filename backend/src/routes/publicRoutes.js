import { Router } from 'express';
import { getActivePlans } from '../services/subscriptionService.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'ort-kg-api',
    timestamp: new Date().toISOString(),
  });
});

router.get('/plans', async (_req, res, next) => {
  try {
    const plans = await getActivePlans();
    res.json({ plans });
  } catch (err) {
    next(err);
  }
});

export default router;
