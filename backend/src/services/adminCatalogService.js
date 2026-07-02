import {
  University,
  Faculty,
  Specialty,
  ProgramRule,
  PassingScoreSnapshot,
} from '../models/index.js';
import { FileAsset } from '../models/FileAsset.js';
import { CATALOG_STATUS, TRUST_LEVEL } from '../constants/index.js';
import { createHttpError } from '../utils/errors.js';
import { writeAuditLog } from './auditService.js';
import { attachUniversityLogo } from '../utils/catalogMedia.js';

const logoInclude = {
  model: FileAsset,
  as: 'logo',
  required: false,
  attributes: ['id', 'storage_key', 'mime_type', 'size'],
};

const universityTreeInclude = [
  logoInclude,
  {
    model: Faculty,
    as: 'faculties',
    required: false,
    include: [
      {
        model: Specialty,
        as: 'specialties',
        required: false,
        include: [
          {
            model: ProgramRule,
            as: 'programRules',
            required: false,
            include: [{ model: PassingScoreSnapshot, as: 'passingScores', required: false }],
          },
        ],
      },
    ],
  },
];

export async function listCatalogAdmin() {
  const rows = await University.findAll({
    order: [
      ['sort_order', 'ASC'],
      ['name', 'ASC'],
      [{ model: Faculty, as: 'faculties' }, 'name', 'ASC'],
      [{ model: Faculty, as: 'faculties' }, { model: Specialty, as: 'specialties' }, 'name', 'ASC'],
    ],
    include: universityTreeInclude,
  });

  return rows.map((row) => attachUniversityLogo(row));
}

export async function createUniversity(actorId, data) {
  if (!data.slug || !data.name) {
    throw createHttpError(400, 'VALIDATION_ERROR', 'slug и name обязательны');
  }

  const existing = await University.findOne({ where: { slug: data.slug } });
  if (existing) {
    throw createHttpError(409, 'CONFLICT', 'Вуз с таким slug уже существует');
  }

  const university = await University.create({
    slug: data.slug,
    name: data.name,
    type: data.type || null,
    city: data.city || null,
    description: data.description || null,
    official_site: data.official_site || null,
    status: data.status || CATALOG_STATUS.ACTIVE,
    is_featured: Boolean(data.is_featured),
    sort_order: Number(data.sort_order) || 0,
  });

  await writeAuditLog({
    actorId,
    actionCode: 'catalog.university.create',
    entityType: 'university',
    entityId: university.id,
    after: university.toJSON(),
  });

  return attachUniversityLogo(university);
}

export async function updateUniversity(actorId, id, data) {
  const university = await University.findByPk(id);
  if (!university) throw createHttpError(404, 'NOT_FOUND', 'Вуз не найден');

  const before = university.toJSON();
  const allowed = [
    'name',
    'type',
    'city',
    'description',
    'official_site',
    'status',
    'is_featured',
    'sort_order',
  ];

  const patch = {};
  for (const key of allowed) {
    if (data[key] !== undefined) patch[key] = data[key];
  }

  if (data.slug && data.slug !== university.slug) {
    const existing = await University.findOne({ where: { slug: data.slug } });
    if (existing) throw createHttpError(409, 'CONFLICT', 'Вуз с таким slug уже существует');
    patch.slug = data.slug;
  }

  await university.update(patch);

  await writeAuditLog({
    actorId,
    actionCode: 'catalog.university.update',
    entityType: 'university',
    entityId: university.id,
    before,
    after: university.toJSON(),
  });

  const refreshed = await University.findByPk(university.id, {
    include: [{ model: FileAsset, as: 'logo' }],
  });

  return attachUniversityLogo(refreshed);
}

export async function createFaculty(actorId, data) {
  if (!data.university_id || !data.slug || !data.name) {
    throw createHttpError(400, 'VALIDATION_ERROR', 'university_id, slug и name обязательны');
  }

  const university = await University.findByPk(data.university_id);
  if (!university) throw createHttpError(404, 'NOT_FOUND', 'Вуз не найден');

  const faculty = await Faculty.create({
    university_id: data.university_id,
    slug: data.slug,
    name: data.name,
    description: data.description || null,
    status: data.status || CATALOG_STATUS.ACTIVE,
  });

  await writeAuditLog({
    actorId,
    actionCode: 'catalog.faculty.create',
    entityType: 'faculty',
    entityId: faculty.id,
    after: faculty.toJSON(),
  });

  return faculty;
}

export async function updateFaculty(actorId, id, data) {
  const faculty = await Faculty.findByPk(id);
  if (!faculty) throw createHttpError(404, 'NOT_FOUND', 'Факультет не найден');

  const before = faculty.toJSON();
  const patch = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.description !== undefined) patch.description = data.description;
  if (data.status !== undefined) patch.status = data.status;
  if (data.slug !== undefined) patch.slug = data.slug;

  await faculty.update(patch);

  await writeAuditLog({
    actorId,
    actionCode: 'catalog.faculty.update',
    entityType: 'faculty',
    entityId: faculty.id,
    before,
    after: faculty.toJSON(),
  });

  return faculty;
}

export async function createSpecialty(actorId, data) {
  if (!data.faculty_id || !data.slug || !data.name) {
    throw createHttpError(400, 'VALIDATION_ERROR', 'faculty_id, slug и name обязательны');
  }

  const faculty = await Faculty.findByPk(data.faculty_id);
  if (!faculty) throw createHttpError(404, 'NOT_FOUND', 'Факультет не найден');

  const specialty = await Specialty.create({
    faculty_id: data.faculty_id,
    slug: data.slug,
    name: data.name,
    profession_description: data.profession_description || null,
    contract_cost: data.contract_cost ?? null,
    status: data.status || CATALOG_STATUS.ACTIVE,
  });

  await writeAuditLog({
    actorId,
    actionCode: 'catalog.specialty.create',
    entityType: 'specialty',
    entityId: specialty.id,
    after: specialty.toJSON(),
  });

  return specialty;
}

export async function updateSpecialty(actorId, id, data) {
  const specialty = await Specialty.findByPk(id);
  if (!specialty) throw createHttpError(404, 'NOT_FOUND', 'Программа не найдена');

  const before = specialty.toJSON();
  const patch = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.slug !== undefined) patch.slug = data.slug;
  if (data.profession_description !== undefined) patch.profession_description = data.profession_description;
  if (data.contract_cost !== undefined) patch.contract_cost = data.contract_cost;
  if (data.status !== undefined) patch.status = data.status;

  await specialty.update(patch);

  await writeAuditLog({
    actorId,
    actionCode: 'catalog.specialty.update',
    entityType: 'specialty',
    entityId: specialty.id,
    before,
    after: specialty.toJSON(),
  });

  return specialty;
}

export async function createProgramRule(actorId, data) {
  if (!data.specialty_id || !data.season_year) {
    throw createHttpError(400, 'VALIDATION_ERROR', 'specialty_id и season_year обязательны');
  }

  const specialty = await Specialty.findByPk(data.specialty_id);
  if (!specialty) throw createHttpError(404, 'NOT_FOUND', 'Программа не найдена');

  const rule = await ProgramRule.create({
    specialty_id: data.specialty_id,
    season_year: Number(data.season_year),
    ort_required: data.ort_required !== false,
    main_score_min: data.main_score_min ?? null,
    subject_requirements_json: data.subject_requirements_json || {},
    extra_exam_required: Boolean(data.extra_exam_required),
    grant_category_scope_json: data.grant_category_scope_json || {},
    source_url: data.source_url || null,
    trust_level: data.trust_level || TRUST_LEVEL.MEDIUM,
    is_active: data.is_active !== false,
  });

  await writeAuditLog({
    actorId,
    actionCode: 'catalog.program_rule.create',
    entityType: 'program_rule',
    entityId: rule.id,
    after: rule.toJSON(),
  });

  return rule;
}

export async function updateProgramRule(actorId, id, data) {
  const rule = await ProgramRule.findByPk(id);
  if (!rule) throw createHttpError(404, 'NOT_FOUND', 'Правило программы не найдено');

  const before = rule.toJSON();
  const allowed = [
    'season_year',
    'ort_required',
    'main_score_min',
    'subject_requirements_json',
    'extra_exam_required',
    'grant_category_scope_json',
    'source_url',
    'trust_level',
    'is_active',
  ];

  const patch = {};
  for (const key of allowed) {
    if (data[key] !== undefined) patch[key] = data[key];
  }

  await rule.update(patch);

  await writeAuditLog({
    actorId,
    actionCode: 'catalog.program_rule.update',
    entityType: 'program_rule',
    entityId: rule.id,
    before,
    after: rule.toJSON(),
  });

  return rule;
}

export async function createPassingScoreSnapshot(actorId, data) {
  if (!data.program_rule_id || !data.year) {
    throw createHttpError(400, 'VALIDATION_ERROR', 'program_rule_id и year обязательны');
  }

  const rule = await ProgramRule.findByPk(data.program_rule_id);
  if (!rule) throw createHttpError(404, 'NOT_FOUND', 'Правило программы не найдено');

  const snapshot = await PassingScoreSnapshot.create({
    program_rule_id: data.program_rule_id,
    year: Number(data.year),
    budget_cutoff: data.budget_cutoff ?? null,
    contract_cutoff: data.contract_cutoff ?? null,
    seats_budget: data.seats_budget ?? null,
    seats_contract: data.seats_contract ?? null,
    source_url: data.source_url || null,
    trust_level: data.trust_level || TRUST_LEVEL.MEDIUM,
  });

  await writeAuditLog({
    actorId,
    actionCode: 'catalog.passing_score.create',
    entityType: 'passing_score_snapshot',
    entityId: snapshot.id,
    after: snapshot.toJSON(),
  });

  return snapshot;
}

export async function updatePassingScoreSnapshot(actorId, id, data) {
  const snapshot = await PassingScoreSnapshot.findByPk(id);
  if (!snapshot) throw createHttpError(404, 'NOT_FOUND', 'Снимок проходных не найден');

  const before = snapshot.toJSON();
  const allowed = [
    'year',
    'budget_cutoff',
    'contract_cutoff',
    'seats_budget',
    'seats_contract',
    'source_url',
    'trust_level',
  ];

  const patch = {};
  for (const key of allowed) {
    if (data[key] !== undefined) patch[key] = data[key];
  }

  await snapshot.update(patch);

  await writeAuditLog({
    actorId,
    actionCode: 'catalog.passing_score.update',
    entityType: 'passing_score_snapshot',
    entityId: snapshot.id,
    before,
    after: snapshot.toJSON(),
  });

  return snapshot;
}
