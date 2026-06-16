import { TRUST_LEVEL } from '../constants/index.js';

const DEFAULT_WEIGHTS = {
  threshold_gap: 0.25,
  subject_compliance: 0.2,
  budget_cutoff_gap: 0.2,
  contract_cutoff_gap: 0.15,
  competition: 0.1,
  data_trust: 0.1,
};

const TRUST_SCORES = {
  [TRUST_LEVEL.HIGH]: 1,
  [TRUST_LEVEL.MEDIUM]: 0.75,
  [TRUST_LEVEL.LOW]: 0.45,
};

const SUBJECT_LABELS = {
  math: 'Математика',
  kyrgyz: 'Кырgyz тili',
  russian: 'Русский язык',
  english: 'Английский',
  history: 'История',
  physics: 'Физика',
  chemistry: 'Химия',
  biology: 'Биология',
};

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function normalizeGapScore(diff, strong = 20, neutral = 0, weak = -15) {
  if (diff >= strong) return 1;
  if (diff >= neutral) return 0.55 + (diff / strong) * 0.35;
  if (diff >= weak) return 0.25 + ((diff - weak) / (neutral - weak)) * 0.25;
  return clamp(0.1 + (diff - weak) / 40);
}

function evaluateThresholdGap(mainScore, min) {
  if (min == null) {
    return {
      key: 'threshold_gap',
      label: 'Порог программы',
      score: 0.5,
      weight: DEFAULT_WEIGHTS.threshold_gap,
      detail: 'Минимальный балл не указан в правилах',
      status: 'unknown',
    };
  }

  const diff = mainScore - min;
  return {
    key: 'threshold_gap',
    label: 'Порог программы',
    score: normalizeGapScore(diff),
    weight: DEFAULT_WEIGHTS.threshold_gap,
    detail: `Ваш балл ${mainScore}, минимум ${min} (${diff >= 0 ? '+' : ''}${diff})`,
    status: diff >= 0 ? 'pass' : 'fail',
    diff,
  };
}

function evaluateSubjectCompliance(subjectScores = {}, requirements = {}) {
  const entries = Object.entries(requirements || {});
  if (!entries.length) {
    return {
      key: 'subject_compliance',
      label: 'Предметные требования',
      score: 0.7,
      weight: DEFAULT_WEIGHTS.subject_compliance,
      detail: 'Предметные пороги не заданы',
      status: 'unknown',
      subjects: [],
    };
  }

  const subjects = entries.map(([key, required]) => {
    const userScore = subjectScores[key];
    const label = SUBJECT_LABELS[key] || key;
    if (userScore == null) {
      return { key, label, required, user_score: null, status: 'missing', gap: null };
    }
    const gap = userScore - required;
    return {
      key,
      label,
      required,
      user_score: userScore,
      gap,
      status: gap >= 0 ? 'pass' : 'fail',
    };
  });

  const known = subjects.filter((s) => s.user_score != null);
  const passed = known.filter((s) => s.status === 'pass').length;
  const score = known.length ? passed / known.length : 0.35;
  const failed = subjects.filter((s) => s.status === 'fail');
  const missing = subjects.filter((s) => s.status === 'missing');

  let detail = 'Все предметные пороги выполнены';
  if (failed.length) {
    detail = `Не выполнены: ${failed.map((s) => s.label).join(', ')}`;
  } else if (missing.length) {
    detail = `Не указаны баллы: ${missing.map((s) => s.label).join(', ')}`;
  }

  return {
    key: 'subject_compliance',
    label: 'Предметные требования',
    score,
    weight: DEFAULT_WEIGHTS.subject_compliance,
    detail,
    status: failed.length ? 'fail' : missing.length ? 'warning' : 'pass',
    subjects,
  };
}

function evaluateCutoffGap(mainScore, cutoff, key, label) {
  if (cutoff == null) {
    return {
      key,
      label,
      score: 0.5,
      weight: DEFAULT_WEIGHTS[key],
      detail: 'Исторические проходные не загружены',
      status: 'unknown',
    };
  }

  const numericCutoff = Number(cutoff);
  const diff = mainScore - numericCutoff;
  return {
    key,
    label,
    score: normalizeGapScore(diff, 15, 0, -12),
    weight: DEFAULT_WEIGHTS[key],
    detail: `Ваш балл ${mainScore}, проходной ${numericCutoff} (${diff >= 0 ? '+' : ''}${diff.toFixed(1)})`,
    status: diff >= 0 ? 'pass' : diff >= -10 ? 'warning' : 'fail',
    diff,
  };
}

function evaluateCompetition(snapshot) {
  const budgetSeats = snapshot?.seats_budget ?? 0;
  const contractSeats = snapshot?.seats_contract ?? 0;
  const total = budgetSeats + contractSeats;

  if (!total) {
    return {
      key: 'competition',
      label: 'Конкурс / места',
      score: 0.55,
      weight: DEFAULT_WEIGHTS.competition,
      detail: 'Количество мест не указано',
      status: 'unknown',
    };
  }

  let score = 0.85;
  if (total < 15) score = 0.35;
  else if (total < 30) score = 0.5;
  else if (total < 50) score = 0.65;

  return {
    key: 'competition',
    label: 'Конкурс / места',
    score,
    weight: DEFAULT_WEIGHTS.competition,
    detail: `Бюджет: ${budgetSeats}, контракт: ${contractSeats} (всего ${total})`,
    status: total < 20 ? 'high_pressure' : 'moderate',
    seats: { budget: budgetSeats, contract: contractSeats, total },
  };
}

function evaluateDataTrust(rule, snapshot) {
  const ruleTrust = TRUST_SCORES[rule.trust_level] ?? 0.75;
  const snapshotTrust = snapshot ? (TRUST_SCORES[snapshot.trust_level] ?? 0.75) : 0.6;
  const score = snapshot ? ruleTrust * 0.4 + snapshotTrust * 0.6 : ruleTrust * 0.8;

  return {
    key: 'data_trust',
    label: 'Достоверность данных',
    score,
    weight: DEFAULT_WEIGHTS.data_trust,
    detail: snapshot
      ? `Правила: ${rule.trust_level}, проходные ${snapshot.year}: ${snapshot.trust_level}`
      : `Только правила программы (${rule.trust_level})`,
    status: score >= 0.75 ? 'good' : 'limited',
  };
}

function resolveChanceCategory(percent) {
  if (percent >= 70) return 'high';
  if (percent >= 45) return 'medium';
  if (percent >= 25) return 'low';
  return 'unlikely';
}

function buildRisks(factors, rule, subjectFactor) {
  const risks = [];

  if (rule.extra_exam_required) {
    risks.push({
      code: 'extra_exam',
      severity: 'medium',
      message: 'Требуется дополнительный вступительный экзамен',
    });
  }

  if (subjectFactor.status === 'fail') {
    risks.push({
      code: 'subject_fail',
      severity: 'high',
      message: subjectFactor.detail,
    });
  } else if (subjectFactor.status === 'warning') {
    risks.push({
      code: 'subject_missing',
      severity: 'medium',
      message: subjectFactor.detail,
    });
  }

  const threshold = factors.find((f) => f.key === 'threshold_gap');
  if (threshold?.status === 'fail') {
    risks.push({
      code: 'below_min',
      severity: 'high',
      message: 'Основной балл ниже минимального порога программы',
    });
  }

  const budget = factors.find((f) => f.key === 'budget_cutoff_gap');
  if (budget?.status === 'fail') {
    risks.push({
      code: 'below_budget_cutoff',
      severity: 'high',
      message: 'Балл ниже исторического бюджетного проходного',
    });
  }

  const competition = factors.find((f) => f.key === 'competition');
  if (competition?.status === 'high_pressure') {
    risks.push({
      code: 'high_competition',
      severity: 'medium',
      message: 'Мало мест — высокая конкуренция',
    });
  }

  const trust = factors.find((f) => f.key === 'data_trust');
  if (trust?.status === 'limited') {
    risks.push({
      code: 'limited_data',
      severity: 'low',
      message: 'Данные ограничены — уточняйте в приёмной комиссии',
    });
  }

  return risks;
}

function buildRecommendations(chancePercent, risks) {
  const items = [];

  if (chancePercent < 45) {
    items.push('Рассмотрите альтернативные программы с более низким порогом');
    items.push('Проверьте контрактные места, если бюджет маловероятен');
  }

  if (risks.some((r) => r.code === 'subject_fail' || r.code === 'subject_missing')) {
    items.push('Уточните предметные баллы в профиле — они влияют на оценку');
  }

  if (risks.some((r) => r.code === 'high_competition')) {
    items.push('Подготовьте запасной вариант — конкурс высокий');
  }

  if (!items.length) {
    items.push('Следите за турами зачисления и фиксируйте приоритеты в симуляторе');
  }

  return items;
}

export function pickLatestSnapshot(snapshots = []) {
  if (!snapshots.length) return null;
  return [...snapshots].sort((a, b) => b.year - a.year)[0];
}

export function evaluateProgramV2({
  mainScore,
  subjectScores = {},
  rule,
  snapshot = null,
  weights = DEFAULT_WEIGHTS,
}) {
  const factors = [
    evaluateThresholdGap(mainScore, rule.main_score_min),
    evaluateSubjectCompliance(subjectScores, rule.subject_requirements_json),
    evaluateCutoffGap(mainScore, snapshot?.budget_cutoff, 'budget_cutoff_gap', 'Бюджетный проходной'),
    evaluateCutoffGap(mainScore, snapshot?.contract_cutoff, 'contract_cutoff_gap', 'Контрактный проходной'),
    evaluateCompetition(snapshot),
    evaluateDataTrust(rule, snapshot),
  ].map((factor) => ({ ...factor, weight: weights[factor.key] ?? factor.weight }));

  const weightedScore = factors.reduce((sum, factor) => sum + factor.score * factor.weight, 0);
  const chancePercent = Math.round(clamp(weightedScore, 0.05, 0.95) * 100);
  const chanceCategory = resolveChanceCategory(chancePercent);

  const subjectFactor = factors.find((f) => f.key === 'subject_compliance');
  const thresholdFactor = factors.find((f) => f.key === 'threshold_gap');
  const blocked =
    subjectFactor.status === 'fail' ||
    thresholdFactor.status === 'fail' ||
    (rule.ort_required && mainScore == null);

  let eligibility = 'eligible';
  if (blocked) eligibility = 'blocked';
  else if (chancePercent < 25) eligibility = 'below_threshold';

  const risks = buildRisks(factors, rule, subjectFactor);
  const recommendations = buildRecommendations(chancePercent, risks);
  const showLowChanceFlow = chancePercent < 45;

  return {
    specialty_id: rule.specialty_id,
    program_rule_id: rule.id,
    main_score_min: rule.main_score_min,
    user_main_score: mainScore,
    user_subject_scores: subjectScores,
    eligibility,
    chance_category: chanceCategory,
    chance_percent: chancePercent,
    ort_required: rule.ort_required,
    extra_exam_required: rule.extra_exam_required,
    trust_level: rule.trust_level,
    passing_snapshot: snapshot
      ? {
          year: snapshot.year,
          budget_cutoff: snapshot.budget_cutoff != null ? Number(snapshot.budget_cutoff) : null,
          contract_cutoff: snapshot.contract_cutoff != null ? Number(snapshot.contract_cutoff) : null,
          seats_budget: snapshot.seats_budget,
          seats_contract: snapshot.seats_contract,
          trust_level: snapshot.trust_level,
        }
      : null,
    factors,
    risks,
    recommendations,
    show_low_chance_flow: showLowChanceFlow,
    subject_requirements: rule.subject_requirements_json,
  };
}

export function compareProgramResults(a, b) {
  return (b.chance_percent ?? 0) - (a.chance_percent ?? 0);
}

export { DEFAULT_WEIGHTS, SUBJECT_LABELS };
