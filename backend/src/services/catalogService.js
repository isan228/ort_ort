import {
  University,
  Faculty,
  Specialty,
  ProgramRule,
  PassingScoreSnapshot,
} from '../models/index.js';
import { FileAsset } from '../models/FileAsset.js';
import { CATALOG_STATUS } from '../constants/index.js';
import { attachUniversityLogo } from '../utils/catalogMedia.js';

const logoInclude = {
  model: FileAsset,
  as: 'logo',
  required: false,
  attributes: ['storage_key'],
};

const universityInclude = [
  {
    model: Faculty,
    as: 'faculties',
    where: { status: CATALOG_STATUS.ACTIVE },
    required: false,
    include: [
      {
        model: Specialty,
        as: 'specialties',
        where: { status: CATALOG_STATUS.ACTIVE },
        required: false,
      },
    ],
  },
];

function maskPremiumFields(entity, isPremium) {
  const json = entity.toJSON ? entity.toJSON() : { ...entity };

  if (isPremium) return json;

  if (json.programRules) {
    json.programRules = json.programRules.map((rule) => ({
      id: rule.id,
      season_year: rule.season_year,
      ort_required: rule.ort_required,
      premium_locked: true,
    }));
  }

  if (json.passingScores) {
    delete json.passingScores;
  }

  json.premium_locked = true;
  return json;
}

export async function listUniversities({ search, city, isPremium = false }) {
  const where = { status: CATALOG_STATUS.ACTIVE };
  if (city) where.city = city;

  const universities = await University.findAll({
    where,
    order: [['sort_order', 'ASC'], ['name', 'ASC']],
    include: [
      logoInclude,
      ...(isPremium
        ? universityInclude
        : [
            {
              model: Faculty,
              as: 'faculties',
              attributes: ['id', 'slug', 'name'],
              where: { status: CATALOG_STATUS.ACTIVE },
              required: false,
            },
          ]),
    ],
  });

  let result = universities.map((u) => attachUniversityLogo(u));

  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.city?.toLowerCase().includes(q)
    );
  }

  return result;
}

export async function getUniversityBySlug(slug, isPremium = false) {
  const include = [
    {
      model: Faculty,
      as: 'faculties',
      where: { status: CATALOG_STATUS.ACTIVE },
      required: false,
      include: [
        {
          model: Specialty,
          as: 'specialties',
          where: { status: CATALOG_STATUS.ACTIVE },
          required: false,
          attributes: isPremium ? undefined : ['id', 'slug', 'name', 'contract_cost'],
          ...(isPremium
            ? {}
            : {
                include: [],
              }),
        },
      ],
    },
  ];

  const university = await University.findOne({
    where: { slug, status: CATALOG_STATUS.ACTIVE },
    include: [logoInclude, ...include],
  });

  if (!university) return null;

  const withLogo = attachUniversityLogo(university);

  if (isPremium) {
    return maskPremiumFields(withLogo, isPremium);
  }

  return withLogo;
}

export async function getSpecialtyBySlug(slug, isPremium = false) {
  const specialty = await Specialty.findOne({
    where: { slug, status: CATALOG_STATUS.ACTIVE },
    include: [
      {
        model: Faculty,
        as: 'faculty',
        include: [{ model: University, as: 'university' }],
      },
      {
        model: ProgramRule,
        as: 'programRules',
        where: { is_active: true },
        required: false,
        include: isPremium
          ? [{ model: PassingScoreSnapshot, as: 'passingScores' }]
          : [],
      },
    ],
  });

  if (!specialty) return null;
  return maskPremiumFields(specialty, isPremium);
}

export async function listPrograms({ search, city } = {}) {
  const specialties = await Specialty.findAll({
    where: { status: CATALOG_STATUS.ACTIVE },
    include: [
      {
        model: ProgramRule,
        as: 'programRules',
        where: { is_active: true },
        required: false,
        attributes: ['id', 'main_score_min', 'season_year', 'ort_required'],
      },
      {
        model: Faculty,
        as: 'faculty',
        attributes: ['id', 'slug', 'name'],
        include: [
          {
            model: University,
            as: 'university',
            attributes: ['id', 'slug', 'name', 'city'],
            where: city ? { city } : undefined,
            required: Boolean(city),
          },
        ],
      },
    ],
    order: [['name', 'ASC']],
  });

  let items = specialties.map((specialty) => {
    const rule = specialty.programRules?.[0];
    return {
      id: specialty.id,
      slug: specialty.slug,
      name: specialty.name,
      faculty: specialty.faculty?.name,
      faculty_slug: specialty.faculty?.slug,
      university: specialty.faculty?.university?.name,
      university_slug: specialty.faculty?.university?.slug,
      city: specialty.faculty?.university?.city,
      main_score_min: rule?.main_score_min ?? null,
      season_year: rule?.season_year ?? null,
      ort_required: rule?.ort_required ?? true,
    };
  });

  if (search) {
    const q = search.toLowerCase();
    items = items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.university?.toLowerCase().includes(q) ||
        item.faculty?.toLowerCase().includes(q)
    );
  }

  return items;
}

export const getProgramBySlug = getSpecialtyBySlug;
