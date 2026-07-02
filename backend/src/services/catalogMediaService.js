import fs from 'fs/promises';
import path from 'path';
import { University, FileAsset } from '../models/index.js';
import { createHttpError } from '../utils/errors.js';
import { writeAuditLog } from './auditService.js';
import { attachUniversityLogo } from '../utils/catalogMedia.js';

export async function removeUniversityLogoFile(storageKey) {
  if (!storageKey) return;
  try {
    await fs.unlink(path.join(process.cwd(), 'uploads', 'universities', storageKey));
  } catch {
    // file may already be removed
  }
}

export async function uploadUniversityLogo(actorId, universityId, fileMeta) {
  if (!fileMeta?.storageKey) {
    throw createHttpError(400, 'VALIDATION_ERROR', 'Загрузите файл логотипа');
  }

  const university = await University.findByPk(universityId, {
    include: [{ model: FileAsset, as: 'logo' }],
  });
  if (!university) throw createHttpError(404, 'NOT_FOUND', 'Вуз не найден');

  const before = university.toJSON();
  const oldLogo = university.logo;

  const fileAsset = await FileAsset.create({
    storage_key: fileMeta.storageKey,
    mime_type: fileMeta.mimeType,
    size: fileMeta.size,
    owner_type: 'university_logo',
    owner_id: university.id,
    visibility: 'public',
  });

  await university.update({ logo_file_id: fileAsset.id });

  if (oldLogo) {
    await removeUniversityLogoFile(oldLogo.storage_key);
    await oldLogo.destroy();
  }

  await writeAuditLog({
    actorId,
    actionCode: 'catalog.university.logo_upload',
    entityType: 'university',
    entityId: university.id,
    before,
    after: { ...university.toJSON(), logo_file_id: fileAsset.id },
  });

  const refreshed = await University.findByPk(university.id, {
    include: [{ model: FileAsset, as: 'logo' }],
  });

  return attachUniversityLogo(refreshed);
}
