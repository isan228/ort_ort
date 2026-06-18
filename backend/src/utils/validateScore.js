import { ORT_MAIN_SCORE_MIN, ORT_MAIN_SCORE_MAX } from '../constants/index.js';
import { createHttpError } from './errors.js';

export function validateMainScore(value, fieldName = 'main_score') {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw createHttpError(400, 'SCORE-001', `Некорректное значение: ${fieldName}`);
  }

  const rounded = Math.round(num);

  if (rounded < ORT_MAIN_SCORE_MIN) {
    throw createHttpError(
      400,
      'SCORE-001',
      'Порог вступления в вуз — от 110 баллов. Укажите балл не ниже 110.'
    );
  }

  if (rounded > ORT_MAIN_SCORE_MAX) {
    throw createHttpError(400, 'SCORE-001', 'Максимальный балл ОРТ — 250.');
  }

  return rounded;
}

const SUBJECT_SCORE_MIN = 0;
const SUBJECT_SCORE_MAX = 300;

export function validateSubjectScore(value, fieldName) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < SUBJECT_SCORE_MIN || num > SUBJECT_SCORE_MAX) {
    throw createHttpError(400, 'SCORE-001', `Некорректное значение: ${fieldName}`);
  }
  return Math.round(num);
}
