import { Router } from 'express';
import { loginUser, refreshAccessToken, logoutUser } from '../services/authService.js';
import {
  createRegistrationCheckout,
  getRegistrationCheckoutStatus,
  confirmRegistrationStubPayment,
} from '../services/registrationCheckoutService.js';
import { requestPasswordReset, resetPassword } from '../services/passwordResetService.js';
import { getAuthLoginMode } from '../services/settingsService.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { authenticate } from '../middleware/auth.js';
import { certificateUpload } from '../middleware/upload.js';
import { createHttpError } from '../utils/errors.js';

const router = Router();

const authRateLimit = rateLimit({ windowMs: 15 * 60_000, max: 30, keyPrefix: 'auth' });
const registerRateLimit = rateLimit({ windowMs: 15 * 60_000, max: 5, keyPrefix: 'register' });
const forgotRateLimit = rateLimit({ windowMs: 60 * 60_000, max: 5, keyPrefix: 'forgot' });
const refreshRateLimit = rateLimit({ windowMs: 15 * 60_000, max: 60, keyPrefix: 'refresh' });

router.get('/auth/config', async (_req, res, next) => {
  try {
    res.json({ auth_login_mode: await getAuthLoginMode() });
  } catch (err) {
    next(err);
  }
});

router.post('/auth/register/checkout', registerRateLimit, certificateUpload.single('certificate'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw createHttpError(400, 'CERT-001', 'Загрузите фото сертификата или скриншот результатов');
    }

    let consents = req.body.consents;
    if (typeof consents === 'string') {
      try {
        consents = JSON.parse(consents);
      } catch {
        consents = { privacy: req.body['consents[privacy]'] === 'true', offer: req.body['consents[offer]'] === 'true' };
      }
    }

    const result = await createRegistrationCheckout(
      { ...req.body, consents },
      {
        storageKey: `certificates/${req.file.filename}`,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
      { ip: req.ip }
    );

    res.status(201).json({
      payment_id: result.payment_id,
      plan: result.plan,
      payment_url: result.payment_url,
      requires_redirect: result.requires_redirect,
      provider: result.provider,
      stub_confirm_url: result.stub_confirm_url,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/auth/register/status/:paymentId', async (req, res, next) => {
  try {
    const status = await getRegistrationCheckoutStatus(req.params.paymentId, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.json(status);
  } catch (err) {
    next(err);
  }
});

router.post('/auth/register/checkout/:paymentId/confirm-stub', registerRateLimit, async (req, res, next) => {
  try {
    await confirmRegistrationStubPayment(req.params.paymentId);
    const status = await getRegistrationCheckoutStatus(req.params.paymentId, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.json(status);
  } catch (err) {
    next(err);
  }
});

router.post('/auth/register', registerRateLimit, async (_req, res) => {
  res.status(410).json({
    error: {
      code: 'REGISTER_REQUIRES_PAYMENT',
      message: 'Регистрация доступна только после оплаты подписки. Используйте POST /auth/register/checkout',
    },
  });
});

router.post('/auth/login', authRateLimit, async (req, res, next) => {
  try {
    const result = await loginUser(
      { identifier: req.body.identifier, password: req.body.password },
      { ip: req.ip, userAgent: req.headers['user-agent'] }
    );
    if (result.session?.is_suspicious) {
      const { notifySuspiciousLogin } = await import('../services/notificationEvents.js');
      await notifySuspiciousLogin(result.user.id);
    }
    res.json({
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
      user: result.user,
      user_state: result.user.phase,
      session: result.session,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/auth/refresh', refreshRateLimit, async (req, res, next) => {
  try {
    const refreshToken = req.body.refresh_token || req.body.refreshToken;
    const result = await refreshAccessToken(refreshToken);
    res.json({
      access_token: result.accessToken,
      user: result.user,
      session: result.session,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/auth/logout', authenticate, async (req, res, next) => {
  try {
    const result = await logoutUser(req.userId, req.sessionId);
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});

router.post('/auth/password/forgot', forgotRateLimit, async (req, res, next) => {
  try {
    const result = await requestPasswordReset(req.body.identifier);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/auth/password/reset', async (req, res, next) => {
  try {
    const result = await resetPassword({
      token: req.body.token || req.body.code,
      new_password: req.body.new_password,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
