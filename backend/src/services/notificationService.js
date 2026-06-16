import { Notification } from '../models/index.js';

export async function createNotification({ userId, type, title, body, actionUrl = null }) {
  return Notification.create({
    user_id: userId,
    type,
    title,
    body,
    action_url: actionUrl,
  });
}

export async function listNotifications(userId, { limit = 20, offset = 0 } = {}) {
  const { rows, count } = await Notification.findAndCountAll({
    where: { user_id: userId },
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  const unreadCount = await Notification.count({
    where: { user_id: userId, is_read: false },
  });

  return { notifications: rows, total: count, unread_count: unreadCount };
}

export async function markNotificationRead(userId, notificationId) {
  const notification = await Notification.findOne({
    where: { id: notificationId, user_id: userId },
  });
  if (!notification) return null;
  await notification.update({ is_read: true });
  return notification;
}
