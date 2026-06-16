import { Router } from 'express';
import { listNotifications, markNotificationRead } from '../services/notificationService.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/notifications', async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const offset = Number(req.query.offset) || 0;
    const data = await listNotifications(req.userId, { limit, offset });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.patch('/notifications/:id/read', async (req, res, next) => {
  try {
    const notification = await markNotificationRead(req.userId, req.params.id);
    if (!notification) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Уведомление не найдено' } });
    }
    res.json({ notification });
  } catch (err) {
    next(err);
  }
});

export default router;
