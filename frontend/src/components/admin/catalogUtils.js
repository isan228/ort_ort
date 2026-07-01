export const UNI_TYPES = ['Государственный', 'Частный', 'Международный'];

export const CATALOG_STATUSES = [
  { value: 'active', label: 'Активен' },
  { value: 'archived', label: 'В архиве' },
];

export const TRUST_LEVELS = [
  { value: 'high', label: 'Высокий' },
  { value: 'medium', label: 'Средний' },
  { value: 'low', label: 'Низкий' },
];

export function slugify(text = '') {
  const map = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
    к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
    х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
    Ң: 'n', ң: 'n', Ө: 'o', ө: 'o', Ү: 'u', ү: 'u',
  };
  return String(text)
    .toLowerCase()
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export function emptyUniversity() {
  return {
    slug: '',
    name: '',
    city: '',
    type: 'Государственный',
    description: '',
    official_site: '',
    status: 'active',
    is_featured: false,
    sort_order: 0,
  };
}

export function emptyFaculty(universityId = '') {
  return { university_id: universityId, slug: '', name: '', description: '', status: 'active' };
}

export function emptySpecialty(facultyId = '') {
  return {
    faculty_id: facultyId,
    slug: '',
    name: '',
    profession_description: '',
    contract_cost: '',
    status: 'active',
  };
}

export function emptyRule(specialtyId = '') {
  return {
    specialty_id: specialtyId,
    season_year: new Date().getFullYear(),
    ort_required: true,
    main_score_min: '',
    subject_requirements_json: '{}',
    extra_exam_required: false,
    source_url: '',
    trust_level: 'medium',
    is_active: true,
  };
}

export function emptyPassingScore(programRuleId = '') {
  return {
    program_rule_id: programRuleId,
    year: new Date().getFullYear() - 1,
    budget_cutoff: '',
    contract_cutoff: '',
    seats_budget: '',
    seats_contract: '',
    source_url: '',
    trust_level: 'medium',
  };
}

export function parseJson(text, label = 'JSON') {
  try {
    return JSON.parse(text || '{}');
  } catch {
    throw new Error(`Некорректный ${label}`);
  }
}

export function countPrograms(university) {
  return (university?.faculties || []).reduce(
    (sum, f) => sum + (f.specialties?.length || 0),
    0
  );
}
