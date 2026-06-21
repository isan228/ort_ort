import {
  ORT_MAIN_SCORE_MIN,
  ORT_MAIN_SCORE_MAX,
  ORT_SUBJECT_SCORE_MIN,
  ORT_SUBJECT_SCORE_MAX,
} from '../constants/index.js';
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
      `Минимальный балл основного теста — ${ORT_MAIN_SCORE_MIN}. Укажите балл не ниже ${ORT_MAIN_SCORE_MIN}.`
    );
  }

  if (rounded > ORT_MAIN_SCORE_MAX) {
    throw createHttpError(400, 'SCORE-001', 'Максимальный балл ОРТ — 250.');
  }

  return rounded;
}

export function validateSubjectScore(value, fieldName) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw createHttpError(400, 'SCORE-001', `Некорректное значение: ${fieldName}`);
  }

  const rounded = Math.round(num);

  if (rounded < ORT_SUBJECT_SCORE_MIN) {
    throw createHttpError(
      400,
      'SCORE-001',
      `Минимальный балл по предмету — ${ORT_SUBJECT_SCORE_MIN}. Укажите балл не ниже ${ORT_SUBJECT_SCORE_MIN}.`
    );
  }

  if (rounded > ORT_SUBJECT_SCORE_MAX) {
    throw createHttpError(400, 'SCORE-001', `Некорректное значение: ${fieldName}`);
  }

  return rounded;
}
