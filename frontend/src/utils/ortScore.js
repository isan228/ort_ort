export const ORT_MAIN_SCORE_MIN = 110;
export const ORT_MAIN_SCORE_MAX = 250;

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

export function getOrtScoreErrorMessage(errorKey, t) {
  if (typeof t === 'function') {
    if (errorKey === 'min') return t('score.error.min');
    if (errorKey === 'max') return t('score.error.max');
    return t('score.error.invalid');
  }

  if (errorKey === 'min') {
    return 'Порог вступления в вуз — от 110 баллов. Укажите балл не ниже 110.';
  }
  if (errorKey === 'max') {
    return 'Максимальный балл ОРТ — 250.';
  }
  return 'Укажите корректный балл ОРТ (от 110 до 250).';
}
