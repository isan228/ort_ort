import { Op } from 'sequelize';
import { AdmissionStatistic } from '../models/AdmissionStatistic.js';
import { getSetting } from './settingsService.js';
import { KGMA_UNIVERSITY_SLUG, ADMISSION_FUNDING_TYPE } from '../constants/index.js';

export async function getActiveAdmissionStatsYear() {
  return Number(await getSetting('admission_stats_year', 2024));
}

export async function findAdmissionCutoffs({
  universitySlug,
  academicYear,
  specialtySlug,
  fundingType,
  regionCategory = null,
  tour = null,
}) {
  const where = {
    university_slug: universitySlug,
    academic_year: academicYear,
    specialty_slug: specialtySlug,
    funding_type: fundingType,
  };

  if (fundingType === ADMISSION_FUNDING_TYPE.GRANT && regionCategory) {
    where.region_category = regionCategory;
  }

  if (tour != null) {
    where.tour = tour;
  }

  return AdmissionStatistic.findAll({
    where,
    order: [['tour', 'ASC']],
  });
}

export async function findAdmissionCutoffForTour({
  universitySlug,
  academicYear,
  specialtySlug,
  fundingType,
  regionCategory,
  tour,
}) {
  const where = {
    university_slug: universitySlug,
    academic_year: academicYear,
    specialty_slug: specialtySlug,
    funding_type: fundingType,
    tour,
  };

  if (fundingType === ADMISSION_FUNDING_TYPE.GRANT) {
    where.region_category = regionCategory;
  } else {
    where.region_category = { [Op.is]: null };
  }

  return AdmissionStatistic.findOne({ where });
}

export async function listAdmissionStatsForUniversity(universitySlug, academicYear) {
  return AdmissionStatistic.findAll({
    where: { university_slug: universitySlug, academic_year: academicYear },
    order: [
      ['specialty_slug', 'ASC'],
      ['funding_type', 'ASC'],
      ['tour', 'ASC'],
    ],
  });
}

export async function upsertAdmissionStatistic(record) {
  const where = {
    university_slug: record.university_slug,
    academic_year: record.academic_year,
    specialty_slug: record.specialty_slug,
    funding_type: record.funding_type,
    tour: record.tour,
    region_category: record.region_category ?? null,
  };

  const existing = await AdmissionStatistic.findOne({ where });
  if (existing) {
    await existing.update(record);
    return existing;
  }

  return AdmissionStatistic.create(record);
}

export function isKgmaUniversity(universitySlug) {
  return universitySlug === KGMA_UNIVERSITY_SLUG;
}
