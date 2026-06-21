export const ORT_MAIN_SCORE_MIN = 100;
export const ORT_MAIN_SCORE_MAX = 250;
export const ORT_SUBJECT_SCORE_MIN = 60;
export const ORT_SUBJECT_SCORE_MAX = 300;

export const ORT_SUBJECT_OPTIONS = [
  { key: 'math', label: 'Математика' },
  { key: 'kyrgyz', label: 'Кыргыз тили' },
  { key: 'russian', label: 'Русский язык' },
  { key: 'english', label: 'Английский' },
  { key: 'history', label: 'История' },
  { key: 'physics', label: 'Физика' },
  { key: 'chemistry', label: 'Химия' },
  { key: 'biology', label: 'Биология' },
];

export function validateOrtMainScore(value) {
  const num = Number(value);
  if (value === '' || value == null || !Number.isFinite(num)) {
    return { valid: false, error: 'invalid' };
  }

  const rounded = Math.round(num);

  if (rounded < ORT_MAIN_SCORE_MIN) {
    return { valid: false, error: 'min' };
  }

  if (rounded > ORT_MAIN_SCORE_MAX) {
    return { valid: false, error: 'max' };
  }

  return { valid: true, value: rounded };
}

export function validateOrtSubjectScore(value) {
  const num = Number(value);
  if (value === '' || value == null || !Number.isFinite(num)) {
    return { valid: false, error: 'invalid' };
  }

  const rounded = Math.round(num);

  if (rounded < ORT_SUBJECT_SCORE_MIN) {
    return { valid: false, error: 'subject_min' };
  }

  if (rounded > ORT_SUBJECT_SCORE_MAX) {
    return { valid: false, error: 'subject_max' };
  }

  return { valid: true, value: rounded };
}

export function getOrtScoreErrorMessage(errorKey, t) {
  if (typeof t === 'function') {
    if (errorKey === 'min') return t('score.error.min');
    if (errorKey === 'max') return t('score.error.max');
    if (errorKey === 'subject_min') return t('score.error.subjectMin');
    if (errorKey === 'subject_max') return t('score.error.subjectMax');
    return t('score.error.invalid');
  }

  if (errorKey === 'min') {
    return `Минимальный балл основного теста — ${ORT_MAIN_SCORE_MIN}. Укажите балл не ниже ${ORT_MAIN_SCORE_MIN}.`;
  }
  if (errorKey === 'max') {
    return 'Максимальный балл ОРТ — 250.';
  }
  if (errorKey === 'subject_min') {
    return `Минимальный балл по предмету — ${ORT_SUBJECT_SCORE_MIN}.`;
  }
  return 'Укажите корректный балл ОРТ (от 100 до 250).';
}
