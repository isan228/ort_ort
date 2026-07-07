import fs from 'node:fs/promises';
import path from 'node:path';
import { connectDatabase, syncDatabase } from '../config/database.js';
import { seedKgmaCatalog } from './seedKgma.js';
import { upsertAdmissionStatistic } from '../services/admissionStatsService.js';
import { resolveKgmaSpecialtySlug } from '../services/kgmaAnalysisEngine.js';
import { KGMA_UNIVERSITY_SLUG, ADMISSION_FUNDING_TYPE } from '../constants/index.js';

function parseArgs(argv) {
  const args = {
    file: null,
    year: 2024,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === '--file') args.file = argv[i + 1];
    if (value === '--year') args.year = Number(argv[i + 1]) || 2024;
    if (value === '--dry-run') args.dryRun = true;
  }

  return args;
}

function decodeHtml(text = '') {
  return String(text)
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripTags(text = '') {
  return decodeHtml(text)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractCells(rowHtml) {
  return Array.from(rowHtml.matchAll(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi)).map((m) =>
    stripTags(m[2])
  );
}

function normalizeFunding(value = '') {
  const text = value.toLowerCase();
  if (text.includes('контракт')) return ADMISSION_FUNDING_TYPE.CONTRACT;
  if (text.includes('грант') || text.includes('бюдж')) return ADMISSION_FUNDING_TYPE.GRANT;
  return null;
}

function normalizeRegion(value = '') {
  const text = value.toLowerCase();
  if (text.includes('бишк')) return 'bishkek';
  if (text.includes('мал')) return 'small_city';
  if (text.includes('село')) return 'village';
  if (text.includes('высок')) return 'highland';
  return null;
}

function toNumber(value = '') {
  const cleaned = String(value).replace(',', '.').trim();
  if (!cleaned || cleaned === '-') return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function shouldSkipSection(title = '') {
  const text = title.toLowerCase();
  return text.includes('льгот') || text.includes('целевой');
}

function buildGroups(rows, academicYear, sourceName) {
  const groups = new Map();

  for (const row of rows) {
    if (!row.specialtySlug || row.totalScore == null || !row.fundingType || !row.tour) continue;

    const regionCategory =
      row.fundingType === ADMISSION_FUNDING_TYPE.GRANT ? row.regionCategory : null;
    const key = [
      KGMA_UNIVERSITY_SLUG,
      academicYear,
      row.specialtySlug,
      row.fundingType,
      row.tour,
      regionCategory || 'none',
    ].join('|');

    if (!groups.has(key)) {
      groups.set(key, {
        university_slug: KGMA_UNIVERSITY_SLUG,
        academic_year: academicYear,
        specialty_slug: row.specialtySlug,
        specialty_name: row.specialtyName,
        funding_type: row.fundingType,
        tour: row.tour,
        region_category: regionCategory,
        source_note: `Импорт из ${sourceName}`,
        scores: [],
      });
    }

    groups.get(key).scores.push(row.totalScore);
  }

  return Array.from(groups.values()).map((group) => {
    const scores = [...group.scores].sort((a, b) => a - b);
    return {
      university_slug: group.university_slug,
      academic_year: group.academic_year,
      specialty_slug: group.specialty_slug,
      specialty_name: group.specialty_name,
      funding_type: group.funding_type,
      tour: group.tour,
      region_category: group.region_category,
      score_min: scores[0] ?? null,
      score_max: scores[scores.length - 1] ?? null,
      score: null,
      source_note: `${group.source_note}; записей: ${scores.length}`,
    };
  });
}

function parseAdmissionRows(html) {
  const rows = [];
  const trMatches = Array.from(html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi));
  let currentSpecialtyTitle = '';

  for (const match of trMatches) {
    const rowHtml = match[0];
    const cells = extractCells(rowHtml);
    if (!cells.length) continue;

    const isHeaderOnly = cells.length === 1 && /<th\b/i.test(rowHtml);
    if (isHeaderOnly) {
      const title = cells[0];
      if (!shouldSkipSection(title)) {
        currentSpecialtyTitle = title;
      } else {
        currentSpecialtyTitle = '';
      }
      continue;
    }

    if (cells[0] === '№' || !/^\d+$/.test(cells[0] || '')) continue;

    const specialtySlug = resolveKgmaSpecialtySlug(currentSpecialtyTitle);
    if (!specialtySlug) continue;

    const fundingType = normalizeFunding(cells[1]);
    const tour = Number(cells[2]) || null;
    const regionCategory = normalizeRegion(cells[7]);
    const mainBall = toNumber(cells[8]);
    const extraBall = toNumber(cells[9]);
    const totalScore =
      mainBall == null && extraBall == null ? null : (mainBall || 0) + (extraBall || 0);

    rows.push({
      specialtySlug,
      specialtyName: currentSpecialtyTitle,
      fundingType,
      tour,
      regionCategory,
      mainBall,
      extraBall,
      totalScore,
    });
  }

  return rows;
}

async function main() {
  const { file, year, dryRun } = parseArgs(process.argv.slice(2));
  if (!file) {
    throw new Error('Укажите путь к файлу: --file "C:\\path\\file.xls"');
  }

  const resolved = path.resolve(file);
  const html = await fs.readFile(resolved, 'utf8');
  const parsedRows = parseAdmissionRows(html);
  const records = buildGroups(parsedRows, year, path.basename(resolved));

  console.log(`Parsed admission rows: ${parsedRows.length}`);
  console.log(`Aggregated statistics: ${records.length}`);
  console.log(
    JSON.stringify(
      records.slice(0, 10).map((row) => ({
        specialty_slug: row.specialty_slug,
        funding_type: row.funding_type,
        tour: row.tour,
        region_category: row.region_category,
        score_min: row.score_min,
        score_max: row.score_max,
      })),
      null,
      2
    )
  );

  if (dryRun) return;

  await connectDatabase();
  await syncDatabase();
  await seedKgmaCatalog();

  for (const record of records) {
    await upsertAdmissionStatistic(record);
  }

  console.log(`Imported ${records.length} admission statistics into database`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
