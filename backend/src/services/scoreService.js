import { Op } from 'sequelize';
import path from 'path';
import fs from 'fs/promises';
import { sequelize } from '../config/database.js';
import {
  SCORE_MODE,
  CERTIFICATE_STATUS,
  CORRECTION_STATUS,
} from '../constants/index.js';
import { Certificate, FileAsset, User, Profile, ScoreProfile, ScoreCorrectionRequest } from '../models/index.js';
import { writeAuditLog } from './auditService.js';
import { createHttpError } from '../utils/errors.js';
import { rebuildGlobalRanking } from './rankingService.js';
import { validateMainScore, validateSubjectScore } from '../utils/validateScore.js';

export async function setupRegistrationScores(userId, { main_score, subject_scores_json = {} }, fileMeta, transaction) {
  if (!fileMeta?.storageKey) {
    throw createHttpError(400, 'CERT-001', 'Загрузите фото сертификата или скриншот результатов');
  }

  const mainScore = validateMainScore(main_score, 'main_score');
  const subjectScores = {};
  for (const [key, value] of Object.entries(subject_scores_json || {})) {
    if (value === '' || value == null) continue;
    subjectScores[key] = validateSubjectScore(value, key);
  }

  const certificate = await Certificate.create(
    {
      user_id: userId,
      status: CERTIFICATE_STATUS.PENDING,
    },
    { transaction }
  );

  const fileAsset = await FileAsset.create(
    {
      storage_key: fileMeta.storageKey,
      mime_type: fileMeta.mimeType,
      size: fileMeta.size,
      owner_type: 'certificate',
      owner_id: certificate.id,
      visibility: 'private',
    },
    { transaction }
  );

  await certificate.update({ file_id: fileAsset.id }, { transaction });

  const profile = await ScoreProfile.create(
    {
      user_id: userId,
      mode: SCORE_MODE.FINAL,
      main_score: mainScore,
      subject_scores_json: subjectScores,
      is_locked: true,
      locked_at: new Date(),
      lock_acknowledged_at: new Date(),
    },
    { transaction }
  );

  return { profile, certificate, fileAsset };
}

export async function getScoreState(userId) {
  const finalProfile = await ScoreProfile.findOne({
    where: { user_id: userId, mode: SCORE_MODE.FINAL },
    order: [['updated_at', 'DESC']],
  });
  const certificate = await Certificate.findOne({
    where: { user_id: userId },
    order: [['updated_at', 'DESC']],
    include: [{ model: FileAsset, as: 'file' }],
  });
  const correctionRequest = await ScoreCorrectionRequest.findOne({
    where: { user_id: userId },
    order: [['created_at', 'DESC']],
  });

  return {
    final: finalProfile,
    certificate,
    correction_request: correctionRequest,
    is_locked: Boolean(finalProfile?.is_locked),
  };
}

export async function saveDraftScores(userId, { main_score, subject_scores_json = {} }) {
  const user = await User.findByPk(userId);
  if (!user) throw createHttpError(404, 'NOT_FOUND', 'Пользователь не найден');

  const existingFinal = await ScoreProfile.findOne({
    where: { user_id: userId, mode: SCORE_MODE.FINAL, is_locked: true },
  });
  if (existingFinal) {
    throw createHttpError(400, 'SCORE-002', 'Баллы уже зафиксированы. Используйте запрос на исправление.');
  }

  const mainScore = validateMainScore(main_score, 'main_score');
  const subjectScores = {};
  for (const [key, value] of Object.entries(subject_scores_json)) {
    subjectScores[key] = validateSubjectScore(value, key);
  }

  let draft = await ScoreProfile.findOne({
    where: { user_id: userId, mode: SCORE_MODE.DRAFT, is_locked: false },
  });

  const before = draft?.toJSON() || null;

  if (draft) {
    await draft.update({ main_score: mainScore, subject_scores_json: subjectScores });
  } else {
    draft = await ScoreProfile.create({
      user_id: userId,
      mode: SCORE_MODE.DRAFT,
      main_score: mainScore,
      subject_scores_json: subjectScores,
    });
  }

  await writeAuditLog({
    actorId: userId,
    actionCode: 'score.draft_update',
    entityType: 'score_profile',
    entityId: draft.id,
    before,
    after: draft.toJSON(),
  });

  return draft;
}

export async function finalizeScores(userId, { main_score, subject_scores_json = {}, lock_acknowledged }) {
  const user = await User.findByPk(userId);
  if (!user) throw createHttpError(404, 'NOT_FOUND', 'Пользователь не найден');

  const existingFinal = await ScoreProfile.findOne({
    where: { user_id: userId, mode: SCORE_MODE.FINAL, is_locked: true },
  });
  if (existingFinal) {
    throw createHttpError(400, 'SCORE-002', 'Баллы уже зафиксированы');
  }

  if (!lock_acknowledged) {
    throw createHttpError(400, 'SCORE-003', 'Необходимо подтвердить предупреждение о блокировке баллов');
  }

  const mainScore = validateMainScore(main_score, 'main_score');
  const subjectScores = {};
  for (const [key, value] of Object.entries(subject_scores_json)) {
    subjectScores[key] = validateSubjectScore(value, key);
  }

  const profile = await sequelize.transaction(async (transaction) => {
    const created = await ScoreProfile.create(
      {
        user_id: userId,
        mode: SCORE_MODE.FINAL,
        main_score: mainScore,
        subject_scores_json: subjectScores,
        is_locked: true,
        locked_at: new Date(),
        lock_acknowledged_at: new Date(),
      },
      { transaction }
    );

    let certificate = await Certificate.findOne({ where: { user_id: userId }, transaction });
    if (!certificate) {
      certificate = await Certificate.create(
        { user_id: userId, status: CERTIFICATE_STATUS.NOT_UPLOADED },
        { transaction }
      );
    }

    return { profile: created, certificate };
  });

  await writeAuditLog({
    actorId: userId,
    actionCode: 'score.finalize',
    entityType: 'score_profile',
    entityId: profile.profile.id,
    after: profile.profile.toJSON(),
  });

  await rebuildGlobalRanking();

  return profile;
}

export async function uploadCertificate(userId, fileMeta) {
  const certificate = await Certificate.findOne({ where: { user_id: userId } });
  if (!certificate) {
    throw createHttpError(400, 'CERT-001', 'Сертификат не найден');
  }

  if (certificate.status === CERTIFICATE_STATUS.VERIFIED) {
    throw createHttpError(400, 'CERT-002', 'Сертификат уже подтверждён');
  }

  if (certificate.status === CERTIFICATE_STATUS.PENDING) {
    throw createHttpError(400, 'CERT-002', 'Сертификат уже на проверке');
  }

  if (certificate.status !== CERTIFICATE_STATUS.REJECTED && certificate.status !== CERTIFICATE_STATUS.NOT_UPLOADED) {
    throw createHttpError(400, 'CERT-002', 'Повторная загрузка доступна только после отклонения документа');
  }

  const fileAsset = await FileAsset.create({
    storage_key: fileMeta.storageKey,
    mime_type: fileMeta.mimeType,
    size: fileMeta.size,
    owner_type: 'certificate',
    owner_id: certificate.id,
    visibility: 'private',
  });

  const before = certificate.toJSON();
  await certificate.update({
    file_id: fileAsset.id,
    status: CERTIFICATE_STATUS.PENDING,
    rejection_reason: null,
    verified_by: null,
    verified_at: null,
  });

  await writeAuditLog({
    actorId: userId,
    actionCode: 'certificate.upload',
    entityType: 'certificate',
    entityId: certificate.id,
    before,
    after: certificate.toJSON(),
  });

  return { certificate, fileAsset };
}

export async function createCorrectionRequest(userId, { message }) {
  if (!message?.trim()) {
    throw createHttpError(400, 'VALIDATION_ERROR', 'Укажите текст запроса');
  }

  const finalProfile = await ScoreProfile.findOne({
    where: { user_id: userId, mode: SCORE_MODE.FINAL, is_locked: true },
  });

  if (!finalProfile) {
    throw createHttpError(400, 'SCORE-002', 'Запрос доступен только после фиксации баллов');
  }

  const pending = await ScoreCorrectionRequest.findOne({
    where: { user_id: userId, status: CORRECTION_STATUS.PENDING },
  });
  if (pending) {
    throw createHttpError(400, 'VALIDATION_ERROR', 'У вас уже есть открытый запрос на исправление');
  }

  const request = await ScoreCorrectionRequest.create({
    user_id: userId,
    score_profile_id: finalProfile.id,
    message: message.trim(),
    status: CORRECTION_STATUS.PENDING,
  });

  await writeAuditLog({
    actorId: userId,
    actionCode: 'score.correction_request',
    entityType: 'score_correction_request',
    entityId: request.id,
    after: request.toJSON(),
  });

  return request;
}

export async function listPendingCorrectionRequests() {
  return ScoreCorrectionRequest.findAll({
    where: { status: CORRECTION_STATUS.PENDING },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'phone'],
        include: [{ model: Profile, as: 'profile' }],
      },
      { model: ScoreProfile, as: 'scoreProfile' },
    ],
    order: [['created_at', 'ASC']],
  });
}

export async function moderateCorrectionRequest(
  adminId,
  requestId,
  { approve, admin_comment, main_score, subject_scores_json = {} }
) {
  const request = await ScoreCorrectionRequest.findByPk(requestId, {
    include: [{ model: ScoreProfile, as: 'scoreProfile' }],
  });

  if (!request) {
    throw createHttpError(404, 'NOT_FOUND', 'Запрос не найден');
  }

  if (request.status !== CORRECTION_STATUS.PENDING) {
    throw createHttpError(400, 'VALIDATION_ERROR', 'Запрос уже обработан');
  }

  const before = request.toJSON();

  if (approve) {
    if (main_score == null) {
      throw createHttpError(400, 'VALIDATION_ERROR', 'Укажите main_score для одобрения');
    }

    const mainScore = validateMainScore(main_score, 'main_score');
    const subjectScores = {};
    for (const [key, value] of Object.entries(subject_scores_json)) {
      subjectScores[key] = validateSubjectScore(value, key);
    }

    await sequelize.transaction(async (transaction) => {
      await request.scoreProfile.update(
        { main_score: mainScore, subject_scores_json: subjectScores },
        { transaction }
      );

      await request.update(
        {
          status: CORRECTION_STATUS.APPROVED,
          admin_comment: admin_comment?.trim() || null,
          resolved_by: adminId,
          resolved_at: new Date(),
        },
        { transaction }
      );
    });

    await rebuildGlobalRanking();
  } else {
    await request.update({
      status: CORRECTION_STATUS.REJECTED,
      admin_comment: admin_comment?.trim() || 'Запрос отклонён',
      resolved_by: adminId,
      resolved_at: new Date(),
    });
  }

  await writeAuditLog({
    actorId: adminId,
    actionCode: approve ? 'score.correction_approve' : 'score.correction_reject',
    entityType: 'score_correction_request',
    entityId: request.id,
    before,
    after: request.toJSON(),
  });

  const { notifyCorrectionResolved } = await import('./notificationEvents.js');
  await notifyCorrectionResolved(request.user_id, approve);

  return ScoreCorrectionRequest.findByPk(requestId, {
    include: [{ model: ScoreProfile, as: 'scoreProfile' }, { model: User, as: 'user' }],
  });
}

export async function moderateCertificate(adminId, certificateId, { approve, rejection_reason }) {
  const certificate = await Certificate.findByPk(certificateId, {
    include: [{ model: FileAsset, as: 'file' }],
  });

  if (!certificate) {
    throw createHttpError(404, 'NOT_FOUND', 'Сертификат не найден');
  }

  const before = certificate.toJSON();

  if (approve) {
    await certificate.update({
      status: CERTIFICATE_STATUS.VERIFIED,
      rejection_reason: null,
      verified_by: adminId,
      verified_at: new Date(),
    });
  } else {
    await certificate.update({
      status: CERTIFICATE_STATUS.REJECTED,
      rejection_reason: rejection_reason || 'Документ не прошёл проверку',
      verified_by: adminId,
      verified_at: new Date(),
    });
  }

  await writeAuditLog({
    actorId: adminId,
    actionCode: approve ? 'certificate.verify' : 'certificate.reject',
    entityType: 'certificate',
    entityId: certificate.id,
    before,
    after: certificate.toJSON(),
  });

  const { notifyCertificateVerified, notifyCertificateRejected } = await import(
    './notificationEvents.js'
  );
  if (approve) {
    await notifyCertificateVerified(certificate.user_id);
  } else {
    await notifyCertificateRejected(certificate.user_id, certificate.rejection_reason);
  }

  return certificate;
}

export async function listPendingCertificates() {
  return Certificate.findAll({
    where: { status: CERTIFICATE_STATUS.PENDING },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'phone'],
        include: [{ model: Profile, as: 'profile' }],
      },
      { model: FileAsset, as: 'file' },
    ],
    order: [['updated_at', 'ASC']],
  });
}

export function getCertificateFilePath(storageKey) {
  return path.join(process.cwd(), 'uploads', storageKey);
}

export async function removeCertificateFile(storageKey) {
  try {
    await fs.unlink(getCertificateFilePath(storageKey));
  } catch {
    // file may already be removed
  }
}
