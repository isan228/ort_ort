import { Router } from 'express';
import {
  listPendingCertificates,
  moderateCertificate,
  listPendingCorrectionRequests,
  moderateCorrectionRequest,
} from '../services/scoreService.js';
import { adminAdjustWallet } from '../services/walletService.js';
import { listReferralEventsForAdmin } from '../services/referralService.js';
import {
  listAllTutorLinks,
  createTutorLink,
  updateTutorLink,
  deleteTutorLink,
} from '../services/tutorService.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { ROLES } from '../constants/index.js';
import { setResultsPublished } from '../services/phaseService.js';
import { listTicketsForAdmin } from '../services/supportService.js';
import {
  listCatalogAdmin,
  createUniversity,
  updateUniversity,
  createFaculty,
  updateFaculty,
  createSpecialty,
  updateSpecialty,
  createProgramRule,
  updateProgramRule,
  createPassingScoreSnapshot,
  updatePassingScoreSnapshot,
} from '../services/adminCatalogService.js';
import { listToursAdmin, createTour, updateTour } from '../services/adminTourService.js';
import { listNewsAdmin, createNewsArticle, updateNewsArticle } from '../services/adminContentService.js';
import { listUsers, updateUser, listRoles } from '../services/adminUserService.js';
import { listLegalDocumentsAdmin, updateLegalDocument } from '../services/legalService.js';
import {
  listFaqAdmin,
  createFaqItem,
  updateFaqItem,
  deleteFaqItem,
} from '../services/faqService.js';
import {
  listPaymentsAdmin,
  adminConfirmPayment,
  adminCancelPayment,
  adminMarkPaymentFailed,
} from '../services/adminPaymentService.js';

const router = Router();
const adminOnly = requireRoles(ROLES.ADMIN, ROLES.SUPERADMIN);

router.use(authenticate);
router.use(requireRoles(ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPERADMIN));

router.get('/certificates/pending', async (_req, res, next) => {
  try {
    const certificates = await listPendingCertificates();
    res.json({ certificates });
  } catch (err) {
    next(err);
  }
});

router.post('/certificates/:id/verify', async (req, res, next) => {
  try {
    const certificate = await moderateCertificate(req.userId, req.params.id, { approve: true });
    res.json({ certificate });
  } catch (err) {
    next(err);
  }
});

router.post('/certificates/:id/reject', async (req, res, next) => {
  try {
    const certificate = await moderateCertificate(req.userId, req.params.id, {
      approve: false,
      rejection_reason: req.body.rejection_reason,
    });
    res.json({ certificate });
  } catch (err) {
    next(err);
  }
});

router.get('/corrections/pending', async (_req, res, next) => {
  try {
    const requests = await listPendingCorrectionRequests();
    res.json({ requests });
  } catch (err) {
    next(err);
  }
});

router.get('/support/tickets', async (req, res, next) => {
  try {
    const tickets = await listTicketsForAdmin({
      status: req.query.status,
      limit: Number(req.query.limit) || 50,
    });
    res.json({ tickets });
  } catch (err) {
    next(err);
  }
});

router.post('/corrections/:id/approve', async (req, res, next) => {
  try {
    const request = await moderateCorrectionRequest(req.userId, req.params.id, {
      approve: true,
      admin_comment: req.body.admin_comment,
      main_score: req.body.main_score,
      subject_scores_json: req.body.subject_scores_json || {},
    });
    res.json({ request });
  } catch (err) {
    next(err);
  }
});

router.post('/corrections/:id/reject', async (req, res, next) => {
  try {
    const request = await moderateCorrectionRequest(req.userId, req.params.id, {
      approve: false,
      admin_comment: req.body.admin_comment || req.body.rejection_reason,
    });
    res.json({ request });
  } catch (err) {
    next(err);
  }
});

router.post('/wallet/adjust', requireRoles(ROLES.ADMIN, ROLES.SUPERADMIN), async (req, res, next) => {
  try {
    const { user_id, balance_type, amount, reason } = req.body;
    const result = await adminAdjustWallet(req.userId, {
      userId: user_id,
      balanceType: balance_type || 'bonus',
      amount,
      reason,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/referrals', async (req, res, next) => {
  try {
    const data = await listReferralEventsForAdmin({
      status: req.query.status,
      limit: Number(req.query.limit) || 50,
      offset: Number(req.query.offset) || 0,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/tutor-links', async (_req, res, next) => {
  try {
    const links = await listAllTutorLinks();
    res.json({ links });
  } catch (err) {
    next(err);
  }
});

router.post('/tutor-links', requireRoles(ROLES.ADMIN, ROLES.SUPERADMIN), async (req, res, next) => {
  try {
    const link = await createTutorLink(req.body);
    res.status(201).json({ link });
  } catch (err) {
    next(err);
  }
});

router.patch('/tutor-links/:id', requireRoles(ROLES.ADMIN, ROLES.SUPERADMIN), async (req, res, next) => {
  try {
    const link = await updateTutorLink(req.params.id, req.body);
    res.json({ link });
  } catch (err) {
    next(err);
  }
});

router.delete('/tutor-links/:id', requireRoles(ROLES.ADMIN, ROLES.SUPERADMIN), async (req, res, next) => {
  try {
    const link = await deleteTutorLink(req.params.id);
    res.json({ link });
  } catch (err) {
    next(err);
  }
});

router.post('/settings/ort-results-published', requireRoles(ROLES.ADMIN, ROLES.SUPERADMIN), async (req, res, next) => {
  try {
    const published = Boolean(req.body.published);
    await setResultsPublished(published, req.userId);
    res.json({ ort_results_published: published });
  } catch (err) {
    next(err);
  }
});

router.get('/catalog', async (_req, res, next) => {
  try {
    const universities = await listCatalogAdmin();
    res.json({ universities });
  } catch (err) {
    next(err);
  }
});

router.post('/catalog/universities', adminOnly, async (req, res, next) => {
  try {
    const university = await createUniversity(req.userId, req.body);
    res.status(201).json({ university });
  } catch (err) {
    next(err);
  }
});

router.patch('/catalog/universities/:id', adminOnly, async (req, res, next) => {
  try {
    const university = await updateUniversity(req.userId, req.params.id, req.body);
    res.json({ university });
  } catch (err) {
    next(err);
  }
});

router.post('/catalog/faculties', adminOnly, async (req, res, next) => {
  try {
    const faculty = await createFaculty(req.userId, req.body);
    res.status(201).json({ faculty });
  } catch (err) {
    next(err);
  }
});

router.patch('/catalog/faculties/:id', adminOnly, async (req, res, next) => {
  try {
    const faculty = await updateFaculty(req.userId, req.params.id, req.body);
    res.json({ faculty });
  } catch (err) {
    next(err);
  }
});

router.post('/catalog/specialties', adminOnly, async (req, res, next) => {
  try {
    const specialty = await createSpecialty(req.userId, req.body);
    res.status(201).json({ specialty });
  } catch (err) {
    next(err);
  }
});

router.patch('/catalog/specialties/:id', adminOnly, async (req, res, next) => {
  try {
    const specialty = await updateSpecialty(req.userId, req.params.id, req.body);
    res.json({ specialty });
  } catch (err) {
    next(err);
  }
});

router.post('/catalog/program-rules', adminOnly, async (req, res, next) => {
  try {
    const rule = await createProgramRule(req.userId, req.body);
    res.status(201).json({ rule });
  } catch (err) {
    next(err);
  }
});

router.patch('/catalog/program-rules/:id', adminOnly, async (req, res, next) => {
  try {
    const rule = await updateProgramRule(req.userId, req.params.id, req.body);
    res.json({ rule });
  } catch (err) {
    next(err);
  }
});

router.post('/catalog/passing-scores', adminOnly, async (req, res, next) => {
  try {
    const snapshot = await createPassingScoreSnapshot(req.userId, req.body);
    res.status(201).json({ snapshot });
  } catch (err) {
    next(err);
  }
});

router.patch('/catalog/passing-scores/:id', adminOnly, async (req, res, next) => {
  try {
    const snapshot = await updatePassingScoreSnapshot(req.userId, req.params.id, req.body);
    res.json({ snapshot });
  } catch (err) {
    next(err);
  }
});

router.get('/tours', async (_req, res, next) => {
  try {
    const tours = await listToursAdmin();
    res.json({ tours });
  } catch (err) {
    next(err);
  }
});

router.post('/tours', adminOnly, async (req, res, next) => {
  try {
    const tour = await createTour(req.userId, req.body);
    res.status(201).json({ tour });
  } catch (err) {
    next(err);
  }
});

router.patch('/tours/:id', adminOnly, async (req, res, next) => {
  try {
    const tour = await updateTour(req.userId, req.params.id, req.body);
    res.json({ tour });
  } catch (err) {
    next(err);
  }
});

router.get('/news', async (_req, res, next) => {
  try {
    const articles = await listNewsAdmin();
    res.json({ articles });
  } catch (err) {
    next(err);
  }
});

router.post('/news', adminOnly, async (req, res, next) => {
  try {
    const article = await createNewsArticle(req.userId, req.body);
    res.status(201).json({ article });
  } catch (err) {
    next(err);
  }
});

router.patch('/news/:id', adminOnly, async (req, res, next) => {
  try {
    const article = await updateNewsArticle(req.userId, req.params.id, req.body);
    res.json({ article });
  } catch (err) {
    next(err);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const data = await listUsers({
      search: req.query.search,
      status: req.query.status,
      limit: Number(req.query.limit) || 50,
      offset: Number(req.query.offset) || 0,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.patch('/users/:id', adminOnly, async (req, res, next) => {
  try {
    const user = await updateUser(req.userId, req.userRole, req.params.id, req.body);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

router.get('/roles', async (_req, res, next) => {
  try {
    const roles = await listRoles();
    res.json({ roles });
  } catch (err) {
    next(err);
  }
});

router.get('/legal', async (_req, res, next) => {
  try {
    const documents = await listLegalDocumentsAdmin();
    res.json({ documents });
  } catch (err) {
    next(err);
  }
});

router.put('/legal/:type/:locale', adminOnly, async (req, res, next) => {
  try {
    const document = await updateLegalDocument(req.userId, req.params.type, req.params.locale, req.body);
    res.json({ document });
  } catch (err) {
    next(err);
  }
});

router.get('/faq', async (_req, res, next) => {
  try {
    const items = await listFaqAdmin();
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.post('/faq', adminOnly, async (req, res, next) => {
  try {
    const item = await createFaqItem(req.userId, req.body);
    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
});

router.patch('/faq/:id', adminOnly, async (req, res, next) => {
  try {
    const item = await updateFaqItem(req.userId, req.params.id, req.body);
    res.json({ item });
  } catch (err) {
    next(err);
  }
});

router.delete('/faq/:id', adminOnly, async (req, res, next) => {
  try {
    const item = await deleteFaqItem(req.userId, req.params.id);
    res.json({ item });
  } catch (err) {
    next(err);
  }
});

router.get('/payments', requireRoles(ROLES.ADMIN, ROLES.SUPERADMIN), async (req, res, next) => {
  try {
    const data = await listPaymentsAdmin({
      status: req.query.status,
      limit: Number(req.query.limit) || 50,
      offset: Number(req.query.offset) || 0,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post('/payments/:id/confirm', requireRoles(ROLES.ADMIN, ROLES.SUPERADMIN), async (req, res, next) => {
  try {
    const result = await adminConfirmPayment(req.userId, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/payments/:id/cancel', requireRoles(ROLES.ADMIN, ROLES.SUPERADMIN), async (req, res, next) => {
  try {
    const payment = await adminCancelPayment(req.userId, req.params.id, req.body.reason);
    res.json({ payment });
  } catch (err) {
    next(err);
  }
});

router.post('/payments/:id/fail', requireRoles(ROLES.ADMIN, ROLES.SUPERADMIN), async (req, res, next) => {
  try {
    const payment = await adminMarkPaymentFailed(req.userId, req.params.id, req.body.reason);
    res.json({ payment });
  } catch (err) {
    next(err);
  }
});

export default router;
