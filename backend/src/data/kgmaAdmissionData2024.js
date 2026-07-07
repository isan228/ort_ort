/**
 * Проходные баллы КГМА (химия + биология + основной тест).
 * academic_year 2024 — приёмная кампания 2024–2025.
 */

const SPECIALTY_NAMES = {
  'lechebnoe-delo': 'Лечебное дело',
  pediatriya: 'Педиатрия',
  mpd: 'МПД',
  'sestrinskoe-delo': 'Сестринское дело',
  'sestrinskoe-delo-bak': 'Сестринское дело бакалавр',
  stomatologiya: 'Стоматология',
  farmaciya: 'Фармация',
  'meditsinskaya-inzheneriya': 'Медицинская инженерия',
};

function num(v) {
  if (v == null || v === '' || v === '-') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function grant(specialty, tour, region, min, max) {
  const scoreMin = num(min);
  const scoreMax = num(max);
  if (scoreMin == null && scoreMax == null) return null;
  return {
    university_slug: 'kgma',
    academic_year: 2024,
    specialty_slug: specialty,
    specialty_name: SPECIALTY_NAMES[specialty] || specialty,
    funding_type: 'grant',
    tour,
    region_category: region,
    score_min: scoreMin,
    score_max: scoreMax ?? scoreMin,
    score: scoreMin == null ? scoreMax : null,
    source_note: 'КГМА грант 2024',
  };
}

function contract(specialty, tour, min, max) {
  const scoreMin = num(min);
  const scoreMax = num(max);
  if (scoreMin == null && scoreMax == null) return null;
  return {
    university_slug: 'kgma',
    academic_year: 2024,
    specialty_slug: specialty,
    specialty_name: SPECIALTY_NAMES[specialty] || specialty,
    funding_type: 'contract',
    tour,
    region_category: null,
    score_min: scoreMin,
    score_max: scoreMax ?? scoreMin,
    score: null,
    source_note: 'КГМА контракт 2024',
  };
}

/** @returns {import('../models/AdmissionStatistic.js').AdmissionStatistic[]} */
export function getKgma2024AdmissionRecords() {
  const rows = [
    // ——— Грант, 1-й тур ———
    grant('lechebnoe-delo', 1, 'bishkek', 403, 502),
    grant('lechebnoe-delo', 1, 'small_city', 408, 471),
    grant('lechebnoe-delo', 1, 'village', 386, 451),
    grant('lechebnoe-delo', 1, 'highland', 401, 443),
    grant('pediatriya', 1, 'bishkek', 353, 440),
    grant('pediatriya', 1, 'small_city', 351, 409),
    grant('pediatriya', 1, 'village', 349, 405),
    grant('pediatriya', 1, 'highland', 374, 387),
    grant('mpd', 1, 'bishkek', 308, 362),
    grant('mpd', 1, 'small_city', 309, 340),
    grant('mpd', 1, 'village', 298, 350),
    grant('mpd', 1, 'highland', 304, 337),
    grant('sestrinskoe-delo', 1, 'bishkek', 286, 376),
    grant('sestrinskoe-delo', 1, 'small_city', 275, 298),
    grant('sestrinskoe-delo', 1, 'village', 282, 320),
    grant('sestrinskoe-delo', 1, 'highland', 273, 320),
    grant('meditsinskaya-inzheneriya', 1, 'bishkek', 180, 213),
    grant('meditsinskaya-inzheneriya', 1, 'small_city', 179, 188),
    grant('meditsinskaya-inzheneriya', 1, 'village', 177, 194),
    grant('meditsinskaya-inzheneriya', 1, 'highland', 184, 192),

    // ——— Грант, 2-й тур ———
    grant('lechebnoe-delo', 2, 'bishkek', 390, 421),
    grant('lechebnoe-delo', 2, 'small_city', 390, 407),
    grant('lechebnoe-delo', 2, 'village', 379, 425),
    grant('pediatriya', 2, 'bishkek', 363, 389),
    grant('pediatriya', 2, 'small_city', 348, 400),
    grant('pediatriya', 2, 'village', 368, 385),
    grant('pediatriya', 2, 'highland', 355, 397),
    grant('mpd', 2, 'bishkek', 324, 352),
    grant('mpd', 2, 'small_city', 325, 340),
    grant('mpd', 2, 'village', 321, 343),
    grant('mpd', 2, 'highland', 324, 342),
    grant('sestrinskoe-delo', 2, 'small_city', 297, 305),
    grant('sestrinskoe-delo', 2, 'village', 294, 315),
    grant('sestrinskoe-delo', 2, 'highland', 294, 297),
    grant('meditsinskaya-inzheneriya', 2, 'bishkek', 182, 203),
    grant('meditsinskaya-inzheneriya', 2, 'village', 170, 184),

    // ——— Грант, 3-й тур ———
    grant('lechebnoe-delo', 3, 'bishkek', null, 379),
    grant('lechebnoe-delo', 3, 'small_city', null, 381),
    grant('lechebnoe-delo', 3, 'village', null, 444),
    grant('lechebnoe-delo', 3, 'highland', null, 335),
    grant('pediatriya', 3, 'bishkek', 359, 362),
    grant('pediatriya', 3, 'small_city', null, 343),
    grant('pediatriya', 3, 'village', 349, 368),
    grant('pediatriya', 3, 'highland', null, 333),
    grant('mpd', 3, 'bishkek', 328, 342),
    grant('mpd', 3, 'small_city', 320, 335),
    grant('mpd', 3, 'village', 319, 343),
    grant('sestrinskoe-delo', 3, 'bishkek', null, 305),
    grant('sestrinskoe-delo', 3, 'village', 306, 330),
    grant('meditsinskaya-inzheneriya', 3, 'bishkek', 177, 200),
    grant('meditsinskaya-inzheneriya', 3, 'small_city', 178, 196),
    grant('meditsinskaya-inzheneriya', 3, 'village', 180, 193),
    grant('meditsinskaya-inzheneriya', 3, 'highland', null, 183),

    // ——— Грант, 4-й тур ———
    grant('mpd', 4, 'small_city', 333, 338),
    grant('mpd', 4, 'village', 329, 334),
    grant('mpd', 4, 'highland', null, 331),
    grant('sestrinskoe-delo', 4, 'bishkek', null, 312),
    grant('sestrinskoe-delo', 4, 'village', 306, 321),
    grant('meditsinskaya-inzheneriya', 4, 'bishkek', null, 194),
    grant('meditsinskaya-inzheneriya', 4, 'small_city', null, 174),
    grant('meditsinskaya-inzheneriya', 4, 'village', null, 185),

    // ——— Грант, 5-й тур ———
    grant('lechebnoe-delo', 5, 'bishkek', 319, 370),
    grant('lechebnoe-delo', 5, 'village', 308, 327),
    grant('lechebnoe-delo', 5, 'highland', null, 354),
    grant('pediatriya', 5, 'bishkek', 332, 334),
    grant('pediatriya', 5, 'village', 319, 323),
    grant('mpd', 5, 'bishkek', 258, 304),
    grant('mpd', 5, 'small_city', 301, 319),
    grant('mpd', 5, 'village', 290, 301),
    grant('mpd', 5, 'highland', null, 296),
    grant('sestrinskoe-delo', 5, 'village', 269, 287),
    grant('meditsinskaya-inzheneriya', 5, 'bishkek', 160, 171),
    grant('meditsinskaya-inzheneriya', 5, 'village', null, 167),
    grant('meditsinskaya-inzheneriya', 5, 'highland', null, 201),

    // ——— Контракт, туры 1–5 ———
    contract('lechebnoe-delo', 1, 347, 425),
    contract('lechebnoe-delo', 2, 313, 406),
    contract('lechebnoe-delo', 3, 307, 383),
    contract('lechebnoe-delo', 4, 336, 378),
    contract('lechebnoe-delo', 5, 324, 336),
    contract('pediatriya', 1, 306, 502),
    contract('pediatriya', 2, 327, 348),
    contract('pediatriya', 3, 332, 343),
    contract('pediatriya', 4, 334, 392),
    contract('pediatriya', 5, 327, 329),
    contract('stomatologiya', 1, 298, 443),
    contract('stomatologiya', 2, 339, 422),
    contract('stomatologiya', 3, 337, 368),
    contract('stomatologiya', 4, 335, 336),
    contract('stomatologiya', 5, null, 314),
    contract('farmaciya', 1, 245, 425),
    contract('farmaciya', 2, 254, 425),
    contract('farmaciya', 3, 300, 326),
    contract('farmaciya', 4, 321, 327),
    contract('farmaciya', 5, 276, 317),
    contract('mpd', 1, 247, 321),
    contract('mpd', 2, 305, 352),
    contract('mpd', 3, 313, 321),
    contract('mpd', 4, null, 317),
    contract('sestrinskoe-delo-bak', 1, 235, 376),
    contract('sestrinskoe-delo-bak', 2, 285, 343),
    contract('sestrinskoe-delo-bak', 3, 280, 324),
    contract('sestrinskoe-delo-bak', 4, 288, 306),
    contract('sestrinskoe-delo-bak', 5, null, 258),
    contract('meditsinskaya-inzheneriya', 1, 162, 214),
    contract('meditsinskaya-inzheneriya', 2, 116, 171),
    contract('meditsinskaya-inzheneriya', 3, 116, 178),
    contract('meditsinskaya-inzheneriya', 4, 169, 185),
    contract('meditsinskaya-inzheneriya', 5, 166, 179),
  ];

  return rows.filter(Boolean);
}

export { SPECIALTY_NAMES };
