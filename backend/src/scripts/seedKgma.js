import {
  University,
  Faculty,
  Specialty,
  ProgramRule,
  AdmissionStatistic,
} from '../models/index.js';
import { TRUST_LEVEL } from '../constants/index.js';
import { getKgma2024AdmissionRecords, SPECIALTY_NAMES } from '../data/kgmaAdmissionData2024.js';
import { upsertAdmissionStatistic } from '../services/admissionStatsService.js';

const KGMA_SPECIALTIES = Object.entries(SPECIALTY_NAMES).map(([slug, name]) => ({
  slug,
  name,
}));

export async function seedKgmaCatalog() {
  const [uni] = await University.findOrCreate({
    where: { slug: 'kgma' },
    defaults: {
      name: 'КГМА',
      type: 'Государственный',
      city: 'Бишкек',
      description:
        'Кыргызская государственная медицинская академия. Конкурсный балл = химия + биология + основной тест ОРТ.',
      official_site: 'https://kgma.kg',
      is_featured: true,
      sort_order: 2,
    },
  });

  const [faculty] = await Faculty.findOrCreate({
    where: { university_id: uni.id, slug: 'medicine' },
    defaults: {
      name: 'Медицинский факультет',
      description: 'Медицинские специальности КГМА',
    },
  });

  const seasonYear = new Date().getFullYear();

  for (const spec of KGMA_SPECIALTIES) {
    const [specialty] = await Specialty.findOrCreate({
      where: { faculty_id: faculty.id, slug: spec.slug },
      defaults: {
        name: spec.name,
        profession_description: `${spec.name} (КГМА)`,
        status: 'active',
      },
    });

    await ProgramRule.findOrCreate({
      where: { specialty_id: specialty.id, season_year: seasonYear },
      defaults: {
        ort_required: true,
        main_score_min: 100,
        subject_requirements_json: { chemistry: 60, biology: 60 },
        extra_exam_required: false,
        trust_level: TRUST_LEVEL.HIGH,
        source_url: 'https://kgma.kg',
        is_active: true,
      },
    });
  }

  return uni;
}

export async function seedKgmaAdmissionStatistics() {
  await AdmissionStatistic.sync();
  const records = getKgma2024AdmissionRecords();
  let count = 0;

  for (const record of records) {
    await upsertAdmissionStatistic(record);
    count += 1;
  }

  console.log(`KGMA admission statistics seeded: ${count} records`);
}

export async function seedKgma() {
  await seedKgmaCatalog();
  await seedKgmaAdmissionStatistics();
}
