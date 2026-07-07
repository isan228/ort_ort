import {
  ADMISSION_FUNDING_TYPE,
  ADMISSION_REGION_CATEGORY,
} from '../constants/index.js';
import { findAdmissionCutoffs } from './admissionStatsService.js';

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function normalizeGapScore(diff, strong = 50, neutral = 10, weak = -20) {
  if (diff >= strong) return 1;
  if (diff >= neutral) return 0.6 + (diff / strong) * 0.35;
  if (diff >= weak) return 0.25 + ((diff - weak) / (neutral - weak)) * 0.3;
  return clamp(0.08 + (diff - weak) / 80);
}

function resolveChanceCategory(percent) {
  if (percent >= 70) return 'high';
  if (percent >= 45) return 'medium';
  if (percent >= 25) return 'low';
  return 'unlikely';
}

const SPECIALTY_SLUG_BY_NAME = [
  ['sestrinskoe-delo-bak', /сестринск.*бакалавр/i],
  ['lechebnoe-delo', /^лечебное дело/i],
  ['pediatriya', /^педиатрия/i],
  ['stomatologiya', /стоматолог/i],
  ['farmaciya', /фармац/i],
  ['meditsinskaya-inzheneriya', /медицинск.*инженер/i],
  ['mpd', /^мпд/i],
  ['sestrinskoe-delo', /сестринск/i],
];

export function resolveKgmaSpecialtySlug(specialtyName, catalogSlug = '') {
  const slug = String(catalogSlug || '').toLowerCase();
  if (slug && !slug.includes('cp')) return slug;

  const name = String(specialtyName || '').trim();
  for (const [key, pattern] of SPECIALTY_SLUG_BY_NAME) {
    if (pattern.test(name)) return key;
  }

  return slug || null;
}

/** Конкурсный балл КГМА = химия + биология + основной тест */
export function calculateKgmaCompetitiveScore(subjectScores = {}, mainScore) {
  const chemistry = subjectScores.chemistry;
  const biology = subjectScores.biology;
  const main = mainScore;

  if (chemistry == null || biology == null || main == null) {
    return {
      competitive_score: null,
      chemistry: chemistry ?? null,
      biology: biology ?? null,
      main_score: main ?? null,
      complete: false,
    };
  }

  const competitive = Number(chemistry) + Number(biology) + Number(main);
  return {
    competitive_score: Math.round(competitive * 10) / 10,
    chemistry: Number(chemistry),
    biology: Number(biology),
    main_score: Number(main),
    complete: true,
  };
}

function effectiveCutoffMin(stat) {
  if (!stat) return null;
  const min = stat.score_min != null ? Number(stat.score_min) : null;
  const max = stat.score_max != null ? Number(stat.score_max) : null;
  const single = stat.score != null ? Number(stat.score) : null;
  return min ?? single ?? max;
}

function effectiveCutoffMax(stat) {
  if (!stat) return null;
  const max = stat.score_max != null ? Number(stat.score_max) : null;
  const min = stat.score_min != null ? Number(stat.score_min) : null;
  const single = stat.score != null ? Number(stat.score) : null;
  return max ?? min ?? single;
}

function evaluateAgainstCutoff(competitiveScore, cutoffMin, cutoffMax) {
  if (competitiveScore == null || cutoffMin == null) {
    return { score: 0.35, percent: 25, category: 'low', diff: null };
  }

  const diff = competitiveScore - cutoffMin;
  const weighted = normalizeGapScore(diff);
  const percent = Math.round(clamp(weighted, 0.05, 0.95) * 100);
  const category = resolveChanceCategory(percent);

  if (cutoffMax != null && competitiveScore >= cutoffMax) {
    return { score: 0.95, percent: Math.max(percent, 85), category: 'high', diff };
  }

  return { score: weighted, percent, category, diff };
}

function findQualifyingTour(competitiveScore, cutoffs) {
  let best = null;
  for (const row of cutoffs) {
    const min = effectiveCutoffMin(row);
    if (min == null) continue;
    if (competitiveScore >= min) {
      if (!best || row.tour > best.tour) best = row;
    }
  }
  return best;
}

export async function evaluateKgmaProgram({
  specialtyName,
  specialtySlug,
  competitiveScore,
  academicYear,
  fundingType = ADMISSION_FUNDING_TYPE.GRANT,
  regionCategory = ADMISSION_REGION_CATEGORY.BISHKEK,
  referenceTour = 1,
}) {
  const statsKey = resolveKgmaSpecialtySlug(specialtyName, specialtySlug);

  if (!statsKey) {
    return {
      error: 'Специальность не сопоставлена со статистикой КГМА',
      scoring_model: 'kgma',
    };
  }

  if (!competitiveScore?.complete) {
    return {
      error: 'Для КГМА укажите баллы по химии, биологии и основному тесту',
      scoring_model: 'kgma',
      specialty_stats_key: statsKey,
    };
  }

  const score = competitiveScore.competitive_score;

  const allCutoffs = await findAdmissionCutoffs({
    universitySlug: 'kgma',
    academicYear,
    specialtySlug: statsKey,
    fundingType,
    regionCategory:
      fundingType === ADMISSION_FUNDING_TYPE.GRANT ? regionCategory : null,
  });

  if (!allCutoffs.length) {
    return {
      error: 'Нет статистики проходных КГМА за выбранный год',
      scoring_model: 'kgma',
      specialty_stats_key: statsKey,
      admission_stats_year: academicYear,
    };
  }

  const referenceCutoff =
    allCutoffs.find((c) => c.tour === referenceTour) || allCutoffs[0];
  const refMin = effectiveCutoffMin(referenceCutoff);
  const refMax = effectiveCutoffMax(referenceCutoff);
  const primary = evaluateAgainstCutoff(score, refMin, refMax);

  const qualifyingTour = findQualifyingTour(score, allCutoffs);

  const tourEvaluations = allCutoffs.map((row) => {
    const min = effectiveCutoffMin(row);
    const max = effectiveCutoffMax(row);
    const ev = evaluateAgainstCutoff(score, min, max);
    return {
      tour: row.tour,
      cutoff_min: min,
      cutoff_max: max,
      chance_percent: ev.percent,
      chance_category: ev.category,
      qualifies: min != null && score >= min,
    };
  });

  const risks = [];
  if (primary.diff != null && primary.diff < 0) {
    risks.push({
      code: 'below_cutoff',
      severity: primary.diff < -30 ? 'high' : 'medium',
      message: `Конкурсный балл ${score} ниже проходного (${refMin}) на ${Math.abs(Math.round(primary.diff))} п.`,
    });
  }

  if (!qualifyingTour && referenceTour === 1) {
    risks.push({
      code: 'below_first_tour',
      severity: 'high',
      message: 'Балл ниже проходного даже в поздних турах — рассмотрите контракт или другую специальность',
    });
  }

  const recommendations = [];
  if (primary.percent < 45 && fundingType === ADMISSION_FUNDING_TYPE.GRANT) {
    recommendations.push('Проверьте шанс на контрактную форму обучения');
    if (qualifyingTour && qualifyingTour.tour > 1) {
      recommendations.push(
        `По статистике ${academicYear} года балл может хватить на ${qualifyingTour.tour}-й тур зачисления`
      );
    }
  }

  if (!recommendations.length) {
    recommendations.push('Следите за турами зачисления и приоритетами в заявлении');
  }

  return {
    scoring_model: 'kgma',
    specialty_stats_key: statsKey,
    admission_stats_year: academicYear,
    funding_type: fundingType,
    region_category:
      fundingType === ADMISSION_FUNDING_TYPE.GRANT ? regionCategory : null,
    competitive_score: score,
    score_breakdown: {
      chemistry: competitiveScore.chemistry,
      biology: competitiveScore.biology,
      main: competitiveScore.main_score,
    },
    reference_tour: referenceCutoff.tour,
    cutoff_min: refMin,
    cutoff_max: refMax,
    qualifying_tour: qualifyingTour?.tour ?? null,
    chance_percent: primary.percent,
    chance_category: primary.category,
    eligibility: primary.percent < 25 ? 'below_threshold' : 'eligible',
    tour_evaluations: tourEvaluations,
    factors: [
      {
        key: 'kgma_competitive_score',
        label: 'Конкурсный балл КГМА',
        score: primary.score,
        weight: 0.5,
        detail: `Химия ${competitiveScore.chemistry} + Биология ${competitiveScore.biology} + Основной ${competitiveScore.main_score} = ${score}`,
        status: primary.diff != null && primary.diff >= 0 ? 'pass' : 'fail',
      },
      {
        key: 'kgma_cutoff_gap',
        label:
          fundingType === ADMISSION_FUNDING_TYPE.GRANT
            ? `Проходной грант, ${referenceTour}-й тур`
            : `Проходной контракт, ${referenceTour}-й тур`,
        score: primary.score,
        weight: 0.5,
        detail:
          refMin != null
            ? `Ваш ${score}, проходной от ${refMin}${refMax != null && refMax !== refMin ? ` до ${refMax}` : ''}`
            : 'Проходной не указан',
        status: primary.diff != null && primary.diff >= 0 ? 'pass' : 'warning',
        diff: primary.diff,
      },
    ],
    risks,
    recommendations,
    show_low_chance_flow: primary.percent < 45,
  };
}
