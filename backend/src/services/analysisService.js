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
import { SCORE_MODE, USER_PHASE, REDEMPTION_FEATURE, CATALOG_STATUS } from '../constants/index.js';
import { getSetting } from './settingsService.js';
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
  const phase = await syncUserPhaseIfNeeded(user.id);

  if (phase === USER_PHASE.BEFORE_RESULTS) {
    return ScoreProfile.findOne({
      where: { user_id: user.id, mode: SCORE_MODE.DRAFT },
      order: [['updated_at', 'DESC']],
    });
  }

  return ScoreProfile.findOne({
    where: { user_id: user.id, mode: SCORE_MODE.FINAL, is_locked: true },
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

  return {
    phase: user.phase,
    premium,
    is_trial: !premium,
    trial: {
      used: user.trial_analyses_used,
      limit: user.trial_analyses_limit,
      remaining: Math.max(0, user.trial_analyses_limit - user.trial_analyses_used),
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
  const isTrial = !premium;

  if (isTrial) {
    if (user.trial_analyses_used >= user.trial_analyses_limit) {
      throw createHttpError(402, 'ANL-001', 'Бесплатные попытки закончились');
    }
    if (program_ids.length > 1) {
      throw createHttpError(402, 'ANL-002', 'Функция доступна по подписке');
    }
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

  const specialties = await loadProgramsByIds(program_ids);

  if (specialties.length !== program_ids.length) {
    throw createHttpError(404, 'NOT_FOUND', 'Одна или несколько программ не найдены');
  }

  const algorithmVersion = await getSetting('algorithm_version', 'v2-6factor');
  const weightsSetting = await getSetting('analysis_weights', null);
  const weights = weightsSetting ? { ...DEFAULT_WEIGHTS, ...weightsSetting } : DEFAULT_WEIGHTS;

  const results = specialties.map((specialty) =>
    evaluateSpecialtyProgram(specialty, Number(effectiveMainScore), subjectScores, weights)
  );

  const validResults = results.filter((r) => !r.error);
  const lowestChance = validResults.length
    ? Math.min(...validResults.map((r) => r.chance_percent))
    : 100;

  let alternatives = [];
  if (lowestChance < 45) {
    alternatives = await findAlternatives({
      mainScore: Number(effectiveMainScore),
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
          main_score: effectiveMainScore,
          subject_scores_json: subjectScores,
        },
        result_json: { programs: results, alternatives },
        algorithm_version: algorithmVersion,
        is_trial: isTrial,
      },
      { transaction }
    );

    if (isTrial) {
      await user.increment('trial_analyses_used', { transaction });
    }

    return created;
  });

  if (!subscribed && unlockAvailable) {
    await consumeUnlock(userId, REDEMPTION_FEATURE.EXTRA_ANALYSIS);
  }

  return {
    analysis,
    results,
    alternatives,
    is_trial: isTrial,
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
