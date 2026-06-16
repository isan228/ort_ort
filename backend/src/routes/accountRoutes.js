import { Router } from 'express';
import {
  getAccountSummary,
  updateProfile,
  listDeviceSessions,
  revokeDeviceSession,
} from '../services/accountService.js';
import {
  getScoreState,
  saveDraftScores,
  finalizeScores,
  uploadCertificate,
  createCorrectionRequest,
} from '../services/scoreService.js';
import { authenticate } from '../middleware/auth.js';
import { certificateUpload } from '../middleware/upload.js';
import { createHttpError } from '../utils/errors.js';
import { notifyCertificateUploaded } from '../services/notificationEvents.js';

const router = Router();

router.use(authenticate);

router.get('/account/me', async (req, res, next) => {
  try {
    const summary = await getAccountSummary(req.userId);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

router.patch('/account/profile', async (req, res, next) => {
  try {
    const profile = await updateProfile(req.userId, req.body);
    res.json({ profile });
  } catch (err) {
    next(err);
  }
});

router.get('/account/sessions', async (req, res, next) => {
  try {
    const sessions = await listDeviceSessions(req.userId);
    res.json({ sessions });
  } catch (err) {
    next(err);
  }
});

router.delete('/account/sessions/:id', async (req, res, next) => {
  try {
    const session = await revokeDeviceSession(req.userId, req.params.id);
    res.json({ session, revoked: true });
  } catch (err) {
    next(err);
  }
});

router.get('/account/scores', async (req, res, next) => {
  try {
    const state = await getScoreState(req.userId);
    res.json(state);
  } catch (err) {
    next(err);
  }
});

router.put('/account/scores/draft', async (req, res, next) => {
  try {
    const profile = await saveDraftScores(req.userId, req.body);
    res.json({ profile });
  } catch (err) {
    next(err);
  }
});

router.put('/account/scores/final', async (req, res, next) => {
  try {
    const result = await finalizeScores(req.userId, {
      ...req.body,
      lock_acknowledged: req.body.lock_acknowledged ?? req.body.lockAcknowledged,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/account/certificate', certificateUpload.single('certificate'), async (req, res, next) => {
  try {
    if (!req.file) throw createHttpError(400, 'CERT-001', 'Файл не загружен');
    const result = await uploadCertificate(req.userId, {
      storageKey: `certificates/${req.file.filename}`,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });
    await notifyCertificateUploaded(req.userId);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/account/scores/correction-request', async (req, res, next) => {
  try {
    const request = await createCorrectionRequest(req.userId, {
      message: req.body.reason || req.body.message,
    });
    res.status(201).json({ ticket_id: request.id, request });
  } catch (err) {
    next(err);
  }
});

export default router;
