import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import {
  Analysis,
  User,
  Specialty,
  ProgramRule,
  PassingScoreSnapshot,
  ScoreProfile,
  Faculty,
  University,
} from '../models/index.js';
import { SCORE_MODE, REDEMPTION_FEATURE, CATALOG_STATUS } from '../constants/index.js';
import { getSetting } from './settingsService.js';
import { validateMainScore } from '../utils/validateScore.js';
import { userHasActiveSubscription } from './subscriptionService.js';
import { userCanRunPremiumAnalysis, consumeUnlock } from './accessService.js';
import { getUserFeatureAccess } from './featureAccessService.js';
import {
  evaluateProgramV2,
  pickLatestSnapshot,
  compareProgramResults,
  DEFAULT_WEIGHTS,
} from './analysisEngine.js';
import {
  calculateKgmaCompetitiveScore,
  evaluateKgmaProgram,
} from './kgmaAnalysisEngine.js';
import {
  getActiveAdmissionStatsYear,
  isKgmaUniversity,
} from './admissionStatsService.js';
import { ADMISSION_FUNDING_TYPE, ADMISSION_REGION_CATEGORY } from '../constants/index.js';
import { createHttpError } from '../utils/errors.js';

async function resolveScoreProfile(user) {
  const finalProfile = await ScoreProfile.findOne({
    where: { user_id: user.id, mode: SCORE_MODE.FINAL, is_locked: true },
    order: [['updated_at', 'DESC']],
  });
  if (finalProfile) return finalProfile;

  return ScoreProfile.findOne({
    where: { user_id: user.id },
    order: [['updated_at', 'DESC']],
  });
}

async function loadProgramsByIds(programIds) {
  return Specialty.findAll({
    where: { id: { [Op.in]: programIds }, status: CATALOG_STATUS.ACTIVE },
    include: [
      {
        model: ProgramRule,
        as: 'programRules',
        where: { is_active: true },
        required: false,
        include: [{ model: PassingScoreSnapshot, as: 'passingScores' }],
      },
      {
        model: Faculty,
        as: 'faculty',
        include: [{ model: University, as: 'university' }],
      },
    ],
  });
}

function buildProgramMeta(specialty) {
  const rule = specialty.programRules?.[0];
  return {
    specialty_id: specialty.id,
    specialty_name: specialty.name,
    specialty_slug: specialty.slug,
    faculty: specialty.faculty?.name,
    faculty_slug: specialty.faculty?.slug,
    university: specialty.faculty?.university?.name,
    university_slug: specialty.faculty?.university?.slug,
    city: specialty.faculty?.university?.city,
    contract_cost: specialty.contract_cost != null ? Number(specialty.contract_cost) : null,
  };
}

async function evaluateSpecialtyProgram(
  specialty,
  mainScore,
  subjectScores,
  weights,
  admissionOptions = {}
) {
  const universitySlug = specialty.faculty?.university?.slug;
  const meta = buildProgramMeta(specialty);

  if (isKgmaUniversity(universitySlug)) {
    return evaluateKgmaSpecialtyProgram(
      specialty,
      mainScore,
      subjectScores,
      admissionOptions,
      meta
    );
  }

  const rule = specialty.programRules?.[0];
  if (!rule) {
    return {
      ...meta,
      error: 'Правила поступления не настроены',
    };
  }

  const snapshot = pickLatestSnapshot(rule.passingScores || []);
  const evaluation = evaluateProgramV2({
    mainScore,
    subjectScores,
    rule,
    snapshot,
    weights,
  });

  return {
    ...meta,
    ...evaluation,
  };
}

async function evaluateKgmaSpecialtyProgram(
  specialty,
  mainScore,
  subjectScores,
  admissionOptions,
  meta
) {
  const competitiveScore = calculateKgmaCompetitiveScore(subjectScores, mainScore);
  const academicYear =
    admissionOptions.admission_stats_year ?? (await getActiveAdmissionStatsYear());

  const evaluation = await evaluateKgmaProgram({
    specialtyName: specialty.name,
    specialtySlug: specialty.slug,
    competitiveScore,
    academicYear,
    fundingType: admissionOptions.funding_type || ADMISSION_FUNDING_TYPE.GRANT,
    regionCategory:
      admissionOptions.region_category || ADMISSION_REGION_CATEGORY.BISHKEK,
    referenceTour: admissionOptions.admission_tour ?? 1,
  });

  return {
    ...meta,
    ...evaluation,
  };
}

async function findAlternatives({
  mainScore,
  subjectScores,
  excludeIds = [],
  weights,
  admissionOptions = {},
  limit = 3,
}) {
  const candidates = await Specialty.findAll({
    where: {
      status: CATALOG_STATUS.ACTIVE,
      id: { [Op.notIn]: excludeIds.length ? excludeIds : ['00000000-0000-0000-0000-000000000000'] },
    },
    include: [
      {
        model: ProgramRule,
        as: 'programRules',
        where: { is_active: true },
        required: true,
        include: [{ model: PassingScoreSnapshot, as: 'passingScores' }],
      },
      {
        model: Faculty,
        as: 'faculty',
        include: [{ model: University, as: 'university' }],
      },
    ],
    limit: 40,
  });

  const evaluated = [];
  for (const specialty of candidates) {
    const item = await evaluateSpecialtyProgram(
      specialty,
      mainScore,
      subjectScores,
      weights,
      admissionOptions
    );
    if (!item.error && item.chance_percent >= 45) {
      evaluated.push(item);
    }
  }

  return evaluated.sort(compareProgramResults).slice(0, limit);
}

export async function getAnalysisContext(userId) {
  const user = await User.findByPk(userId);
  if (!user) throw createHttpError(404, 'NOT_FOUND', 'Пользователь не найден');

  const access = await getUserFeatureAccess(userId);
  const admissionStatsYear = await getActiveAdmissionStatsYear();
  const subjectScores = access.scores?.subject_scores_json || {};
  const mainScore = access.scores?.main_score;
  const kgmaScore = calculateKgmaCompetitiveScore(subjectScores, mainScore);

  return {
    premium: access.premium,
    has_scores: access.has_scores,
    can_analyze: access.can_analyze,
    can_use_tours: access.can_use_tours,
    can_view_rankings: access.can_view_rankings,
    can_use_community: access.can_use_community,
    can_use_catalog: access.can_use_catalog,
    has_full_access: access.has_full_access,
    analysis_blocked_reason: access.blocked_reason,
    is_trial: false,
    trial: {
      used: 0,
      limit: 0,
      remaining: 0,
    },
    scores: access.scores,
    algorithm_version: await getSetting('algorithm_version', 'v2-6factor'),
    admission_stats_year: admissionStatsYear,
    kgma_competitive_score: kgmaScore,
  };
}

export async function runAnalysis(
  userId,
  {
    program_ids = [],
    main_score,
    subject_scores_json,
    funding_type,
    region_category,
    admission_tour,
  } = {}
) {
  const user = await User.findByPk(userId);
  if (!user) throw createHttpError(404, 'NOT_FOUND', 'Пользователь не найден');

  const subscribed = await userHasActiveSubscription(userId);
  const unlockAvailable = await userCanRunPremiumAnalysis(userId);
  const premium = subscribed || unlockAvailable;

  if (!premium) {
    throw createHttpError(402, 'ANL-001', 'Анализ доступен по подписке Premium');
  }

  if (!program_ids.length) {
    throw createHttpError(400, 'VALIDATION_ERROR', 'Выберите хотя бы одну программу');
  }

  const scoreProfile = await resolveScoreProfile(user);
  const effectiveMainScore = main_score ?? scoreProfile?.main_score;
  const subjectScores = {
    ...(scoreProfile?.subject_scores_json || {}),
    ...(subject_scores_json || {}),
  };

  if (effectiveMainScore == null) {
    throw createHttpError(400, 'SCORE-001', 'Сначала введите баллы');
  }

  const validatedMainScore = validateMainScore(effectiveMainScore, 'main_score');

  const specialties = await loadProgramsByIds(program_ids);

  if (specialties.length !== program_ids.length) {
    throw createHttpError(404, 'NOT_FOUND', 'Одна или несколько программ не найдены');
  }

  const hasKgma = specialties.some((s) => isKgmaUniversity(s.faculty?.university?.slug));
  if (hasKgma) {
    const kgmaScore = calculateKgmaCompetitiveScore(subjectScores, validatedMainScore);
    if (!kgmaScore.complete) {
      throw createHttpError(
        400,
        'SCORE-002',
        'Для анализа КГМА укажите баллы по химии, биологии и основному тесту'
      );
    }
  }

  const admissionStatsYear = await getActiveAdmissionStatsYear();
  const admissionOptions = {
    admission_stats_year: admissionStatsYear,
    funding_type: funding_type || ADMISSION_FUNDING_TYPE.GRANT,
    region_category: region_category || ADMISSION_REGION_CATEGORY.BISHKEK,
    admission_tour: admission_tour != null ? Number(admission_tour) : 1,
  };

  const algorithmVersion = await getSetting('algorithm_version', 'v2-6factor');
  const weightsSetting = await getSetting('analysis_weights', null);
  const weights = weightsSetting ? { ...DEFAULT_WEIGHTS, ...weightsSetting } : DEFAULT_WEIGHTS;

  const results = await Promise.all(
    specialties.map((specialty) =>
      evaluateSpecialtyProgram(
        specialty,
        validatedMainScore,
        subjectScores,
        weights,
        admissionOptions
      )
    )
  );

  const validResults = results.filter((r) => !r.error);
  const lowestChance = validResults.length
    ? Math.min(...validResults.map((r) => r.chance_percent))
    : 100;

  let alternatives = [];
  if (lowestChance < 45) {
    alternatives = await findAlternatives({
      mainScore: validatedMainScore,
      subjectScores,
      excludeIds: program_ids,
      weights,
      admissionOptions,
      limit: 3,
    });
  }

  const analysis = await sequelize.transaction(async (transaction) => {
    const created = await Analysis.create(
      {
        user_id: userId,
        score_profile_id: scoreProfile?.id || null,
        input_json: {
          program_ids,
          main_score: validatedMainScore,
          subject_scores_json: subjectScores,
          ...admissionOptions,
        },
        result_json: { programs: results, alternatives },
        algorithm_version: algorithmVersion,
        is_trial: false,
      },
      { transaction }
    );

    return created;
  });

  if (!subscribed && unlockAvailable) {
    await consumeUnlock(userId, REDEMPTION_FEATURE.EXTRA_ANALYSIS);
  }

  return {
    analysis,
    results,
    alternatives,
    is_trial: false,
    algorithm_version: algorithmVersion,
    show_low_chance_flow: lowestChance < 45,
    admission_stats_year: admissionStatsYear,
    kgma_competitive_score: hasKgma
      ? calculateKgmaCompetitiveScore(subjectScores, validatedMainScore)
      : null,
  };
}

export async function getAnalysisHistory(userId, { limit = 20, offset = 0 } = {}) {
  const { rows, count } = await Analysis.findAndCountAll({
    where: { user_id: userId },
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });
  return { analyses: rows, total: count };
}

export async function getAnalysisById(userId, analysisId) {
  const analysis = await Analysis.findOne({
    where: { id: analysisId, user_id: userId },
  });
  if (!analysis) throw createHttpError(404, 'NOT_FOUND', 'Анализ не найден');
  return analysis;
}
