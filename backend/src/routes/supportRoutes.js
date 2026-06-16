import { Router } from 'express';
import { listTickets, createTicket, addTicketMessage, getTicketDetail } from '../services/supportService.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/support/tickets', async (req, res, next) => {
  try {
    const tickets = await listTickets(req.userId);
    res.json({ tickets });
  } catch (err) {
    next(err);
  }
});

router.get('/support/tickets/:id', async (req, res, next) => {
  try {
    const ticket = await getTicketDetail(req.userId, req.userRole, req.params.id);
    res.json({ ticket });
  } catch (err) {
    next(err);
  }
});

router.post('/support/tickets', async (req, res, next) => {
  try {
    const ticket = await createTicket(req.userId, req.body);
    res.status(201).json({ ticket });
  } catch (err) {
    next(err);
  }
});

router.post('/support/tickets/:id/messages', async (req, res, next) => {
  try {
    const message = await addTicketMessage(
      req.userId,
      req.userRole,
      req.params.id,
      req.body.message
    );
    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
});

export default router;
