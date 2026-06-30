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
import { SCORE_MODE, REDEMPTION_FEATURE, CATALOG_STATUS, USER_PHASE } from '../constants/index.js';
import { getSetting } from './settingsService.js';
import { validateMainScore } from '../utils/validateScore.js';
import { userHasActiveSubscription } from './subscriptionService.js';
import { userCanRunPremiumAnalysis, consumeUnlock } from './accessService.js';
import { syncUserPhaseIfNeeded } from './phaseService.js';
import {
  evaluateProgramV2,
  pickLatestSnapshot,
  compareProgramResults,
  DEFAULT_WEIGHTS,
} from './analysisEngine.js';
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

function evaluateSpecialtyProgram(specialty, mainScore, subjectScores, weights) {
  const rule = specialty.programRules?.[0];
  if (!rule) {
    return {
      ...buildProgramMeta(specialty),
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
    ...buildProgramMeta(specialty),
    ...evaluation,
  };
}

async function findAlternatives({ mainScore, subjectScores, excludeIds = [], weights, limit = 3 }) {
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

  const evaluated = candidates
    .map((specialty) => evaluateSpecialtyProgram(specialty, mainScore, subjectScores, weights))
    .filter((item) => !item.error && item.chance_percent >= 45)
    .sort(compareProgramResults)
    .slice(0, limit);

  return evaluated;
}

export async function getAnalysisContext(userId) {
  const user = await User.findByPk(userId);
  if (!user) throw createHttpError(404, 'NOT_FOUND', 'Пользователь не найден');

  await syncUserPhaseIfNeeded(userId);

  const subscribed = await userHasActiveSubscription(userId);
  const unlockAvailable = await userCanRunPremiumAnalysis(userId);
  const premium = subscribed || unlockAvailable;
  const scoreProfile = await resolveScoreProfile(user);
  const hasScores = scoreProfile?.main_score != null;
  const canAnalyze = premium && hasScores;

  return {
    phase: USER_PHASE.AFTER_RESULTS,
    premium,
    can_analyze: canAnalyze,
    analysis_blocked_reason: !premium ? 'subscription' : !hasScores ? 'scores' : null,
    is_trial: false,
    trial: {
      used: 0,
      limit: 0,
      remaining: 0,
    },
    scores: scoreProfile
      ? {
          main_score: scoreProfile.main_score,
          subject_scores_json: scoreProfile.subject_scores_json || {},
          mode: scoreProfile.mode,
          is_locked: scoreProfile.is_locked,
        }
      : null,
    algorithm_version: await getSetting('algorithm_version', 'v2-6factor'),
  };
}

export async function runAnalysis(userId, { program_ids = [], main_score }) {
  const user = await User.findByPk(userId);
  if (!user) throw createHttpError(404, 'NOT_FOUND', 'Пользователь не найден');

  await syncUserPhaseIfNeeded(userId);

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
  const subjectScores = scoreProfile?.subject_scores_json || {};

  if (effectiveMainScore == null) {
    throw createHttpError(400, 'SCORE-001', 'Сначала введите баллы');
  }

  const validatedMainScore = validateMainScore(effectiveMainScore, 'main_score');

  const specialties = await loadProgramsByIds(program_ids);

  if (specialties.length !== program_ids.length) {
    throw createHttpError(404, 'NOT_FOUND', 'Одна или несколько программ не найдены');
  }

  const algorithmVersion = await getSetting('algorithm_version', 'v2-6factor');
  const weightsSetting = await getSetting('analysis_weights', null);
  const weights = weightsSetting ? { ...DEFAULT_WEIGHTS, ...weightsSetting } : DEFAULT_WEIGHTS;

  const results = specialties.map((specialty) =>
    evaluateSpecialtyProgram(specialty, validatedMainScore, subjectScores, weights)
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
