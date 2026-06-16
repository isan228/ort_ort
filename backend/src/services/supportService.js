import { SupportTicket, SupportMessage, User, Profile } from '../models/index.js';
import { TICKET_STATUS } from '../constants/index.js';
import { createHttpError } from '../utils/errors.js';

function isManagerRole(role) {
  return ['manager', 'admin', 'superadmin'].includes(role);
}

export async function listTickets(userId) {
  return SupportTicket.findAll({
    where: { user_id: userId },
    include: [{ model: SupportMessage, as: 'messages', limit: 1, order: [['created_at', 'DESC']] }],
    order: [['updated_at', 'DESC']],
  });
}

export async function listTicketsForAdmin({ status, limit = 50 } = {}) {
  const where = {};
  if (status) where.status = status;

  return SupportTicket.findAll({
    where,
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'phone'],
        include: [{ model: Profile, as: 'profile' }],
      },
      { model: SupportMessage, as: 'messages', limit: 1, order: [['created_at', 'DESC']] },
    ],
    order: [['updated_at', 'DESC']],
    limit,
  });
}

export async function getTicketDetail(userId, userRole, ticketId) {
  const ticket = await SupportTicket.findByPk(ticketId, {
    include: [
      {
        model: SupportMessage,
        as: 'messages',
        separate: true,
        order: [['created_at', 'ASC']],
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'phone'],
        include: [{ model: Profile, as: 'profile' }],
      },
    ],
  });

  if (!ticket) throw createHttpError(404, 'NOT_FOUND', 'Тикет не найден');

  if (!isManagerRole(userRole) && ticket.user_id !== userId) {
    throw createHttpError(403, 'AUTH-003', 'У вас нет доступа к разделу');
  }

  return ticket;
}

export async function createTicket(userId, { topic, message }) {
  if (!topic?.trim() || !message?.trim()) {
    throw createHttpError(400, 'SUP-001', 'Заполните тему и сообщение');
  }

  const ticket = await SupportTicket.create({
    user_id: userId,
    topic: topic.trim(),
    status: TICKET_STATUS.OPEN,
    last_reply_at: new Date(),
  });

  await SupportMessage.create({
    ticket_id: ticket.id,
    sender_role: 'user',
    sender_id: userId,
    message: message.trim(),
  });

  return ticket;
}

export async function addTicketMessage(userId, userRole, ticketId, message) {
  const ticket = await SupportTicket.findByPk(ticketId);
  if (!ticket) throw createHttpError(404, 'NOT_FOUND', 'Тикет не найден');

  const isManager = isManagerRole(userRole);
  if (!isManager && ticket.user_id !== userId) {
    throw createHttpError(403, 'AUTH-003', 'У вас нет доступа к разделу');
  }

  if (ticket.status === TICKET_STATUS.CLOSED) {
    throw createHttpError(400, 'SUP-002', 'Тикет закрыт');
  }

  if (!message?.trim()) {
    throw createHttpError(400, 'SUP-001', 'Сообщение не может быть пустым');
  }

  const posted = await SupportMessage.create({
    ticket_id: ticket.id,
    sender_role: isManager ? 'manager' : 'user',
    sender_id: userId,
    message: message.trim(),
  });

  await ticket.update({
    last_reply_at: new Date(),
    status: isManager ? TICKET_STATUS.IN_PROGRESS : ticket.status,
  });

  return posted;
}
