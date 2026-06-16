import { Router } from 'express';
import { registerUser, loginUser, refreshAccessToken, logoutUser } from '../services/authService.js';
import { requestPasswordReset, resetPassword } from '../services/passwordResetService.js';
import { getAuthLoginMode } from '../services/settingsService.js';
import { attributeReferral } from '../services/referralService.js';
import { notifyRegistration } from '../services/notificationEvents.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { authenticate } from '../middleware/auth.js';

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

router.post('/auth/register', registerRateLimit, async (req, res, next) => {
  try {
    const user = await registerUser(req.body, { ip: req.ip });
    if (req.body.referral_code) {
      await attributeReferral(req.body.referral_code, user.id, { ip: req.ip });
    }
    await notifyRegistration(user.id);
    res.status(201).json({
      user_id: user.id,
      state: user.phase,
      user,
    });
  } catch (err) {
    next(err);
  }
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
