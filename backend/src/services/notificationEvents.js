import { createNotification } from './notificationService.js';
import { NOTIFICATION_TYPE } from '../constants/index.js';

export async function notifyRegistration(userId) {
  return createNotification({
    userId,
    type: NOTIFICATION_TYPE.SYSTEM,
    title: 'Аккаунт создан',
    body: 'Добро пожаловать в ORT.KG',
    actionUrl: '/account',
  });
}

export async function notifyPaymentSuccess(userId) {
  return createNotification({
    userId,
    type: NOTIFICATION_TYPE.PAYMENT,
    title: 'Оплата подтверждена',
    body: 'Подписка активирована',
    actionUrl: '/account',
  });
}

export async function notifyCertificateUploaded(userId) {
  return createNotification({
    userId,
    type: NOTIFICATION_TYPE.CERTIFICATE,
    title: 'Сертификат отправлен на проверку',
    body: 'Мы уведомим вас о результате модерации',
    actionUrl: '/account/scores',
  });
}

export async function notifyCertificateVerified(userId) {
  return createNotification({
    userId,
    type: NOTIFICATION_TYPE.CERTIFICATE,
    title: 'Сертификат подтверждён',
    body: 'Ваш сертификат успешно прошёл проверку',
    actionUrl: '/account/scores',
  });
}

export async function notifyCertificateRejected(userId, reason) {
  return createNotification({
    userId,
    type: NOTIFICATION_TYPE.CERTIFICATE,
    title: 'Сертификат отклонён',
    body: reason || 'Загрузите новый файл',
    actionUrl: '/account/scores',
  });
}

export async function notifySuspiciousLogin(userId) {
  return createNotification({
    userId,
    type: NOTIFICATION_TYPE.SECURITY,
    title: 'Подозрительный вход',
    body: 'Зафиксирован вход с нового устройства или IP',
    actionUrl: '/account/profile',
  });
}

export async function notifyCorrectionResolved(userId, approved) {
  return createNotification({
    userId,
    type: NOTIFICATION_TYPE.SUPPORT,
    title: 'Запрос на исправление обработан',
    body: approved ? 'Баллы обновлены администратором' : 'Запрос отклонён',
    actionUrl: '/account/scores',
  });
}
