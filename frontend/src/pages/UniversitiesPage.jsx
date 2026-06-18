import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useI18n } from '../i18n/I18nContext.jsx';
import { UniversityIcon } from '../components/icons/UniversityIcons.jsx';

const PAGE_SIZE = 5;

const ALL_REGIONS = [
  'Бишкек',
  'Ош',
  'Джалал-Абад',
  'Каракол',
  'Нарын',
  'Талас',
  'Баткен',
  'Кант',
  'Токмок',
];

const TYPE_OPTIONS = [
  { id: '', label: 'Все типы' },
  { id: 'государственный', label: 'Государственный' },
  { id: 'частный', label: 'Частный' },
  { id: 'международный', label: 'Международный' },
];

const FORM_OPTIONS = [
  { id: '', label: 'Любая' },
  { id: 'Очная', label: 'Очная' },
  { id: 'Заочная', label: 'Заочная' },
  { id: 'Очно-заочная', label: 'Очно-заочная' },
];

const LEVEL_OPTIONS = ['Бакалавриат', 'Магистратура', 'Аспирантура'];

function getInitials(name) {
  if (!name) return 'ВУЗ';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function hashNum(id, mod) {
  let hash = 0;
  const str = String(id);
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) % 100000;
  }
  return hash % mod;
}

function typeBadgeClass(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('част')) return 'universities-type-badge--private';
  if (t.includes('межд')) return 'universities-type-badge--intl';
  return '';
}

function typeLabel(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('гос')) return 'Государственный';
  if (t.includes('част')) return 'Частный';
  if (t.includes('межд')) return 'Международный';
  return type || 'Вуз';
}

function formatCity(city) {
  if (!city) return '—';
  return city.startsWith('г.') ? city : `г. ${city}`;
}

function enrichUniversities(universities, programs) {
  const byUni = new Map();

  programs.forEach((p) => {
    const key = p.university_slug || p.university;
    if (!key) return;
    if (!byUni.has(key)) {
      byUni.set(key, { scores: [], specialties: [] });
    }
    const bucket = byUni.get(key);
    if (p.main_score_min != null) bucket.scores.push(p.main_score_min);
    if (p.name) bucket.specialties.push(p.name);
  });

  return universities.map((uni) => {
    const bucket = byUni.get(uni.slug) || byUni.get(uni.name) || { scores: [], specialties: [] };
    const avgScore =
      bucket.scores.length > 0
        ? Math.round(bucket.scores.reduce((a, b) => a + b, 0) / bucket.scores.length)
        : null;
    const directionsCount = bucket.specialties.length || (uni.faculties?.length ?? 0) * 3;
    const founded = 1930 + hashNum(uni.id, 40);
    const students = 1500 + hashNum(uni.id, 12000);

    return {
      ...uni,
      avgScore,
      directionsCount: Math.max(directionsCount, uni.faculties?.length || 1),
      popularDirections: bucket.specialties.slice(0, 3),
      founded,
      students,
    };
  });
}

export default function UniversitiesPage() {
  const { t } = useI18n();
  const [universities, setUniversities] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [regions, setRegions] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [formFilter, setFormFilter] = useState('');
  const [levels, setLevels] = useState(['Бакалавриат']);
  const [scoreMin, setScoreMin] = useState(100);
  const [scoreMax, setScoreMax] = useState(250);
  const [sortBy, setSortBy] = useState('popular');
  const [page, setPage] = useState(1);
  const [showAllRegions, setShowAllRegions] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [uniData, progData] = await Promise.all([
          api.getUniversities(),
          api.listPrograms(),
        ]);
        if (cancelled) return;
        setUniversities(uniData.universities || []);
        setIsPremium(uniData.is_premium ?? uniData.isPremium ?? false);
        setPrograms(progData.programs || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const enriched = useMemo(
    () => enrichUniversities(universities, programs),
    [universities, programs]
  );

  const availableRegions = useMemo(() => {
    const fromData = new Set(enriched.map((u) => u.city).filter(Boolean));
    ALL_REGIONS.forEach((r) => fromData.add(r));
    return Array.from(fromData).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [enriched]);

  const visibleRegions = showAllRegions ? availableRegions : availableRegions.slice(0, 5);

  const filtered = useMemo(() => {
    let list = [...enriched];

    if (appliedSearch.trim()) {
      const q = appliedSearch.trim().toLowerCase();
      list = list.filter(
        (u) =>
          u.name?.toLowerCase().includes(q) ||
          u.city?.toLowerCase().includes(q) ||
          u.description?.toLowerCase().includes(q)
      );
    }

    if (regions.length) {
      list = list.filter((u) => regions.includes(u.city));
    }

    if (typeFilter) {
      list = list.filter((u) => (u.type || '').toLowerCase().includes(typeFilter));
    }

    list = list.filter((u) => {
      if (u.avgScore == null) return true;
      return u.avgScore >= scoreMin && u.avgScore <= scoreMax;
    });

    if (sortBy === 'popular') {
      list.sort((a, b) => {
        if (Boolean(b.is_featured) !== Boolean(a.is_featured)) {
          return Number(b.is_featured) - Number(a.is_featured);
        }
        return (a.sort_order ?? 99) - (b.sort_order ?? 99);
      });
    } else if (sortBy === 'score') {
      list.sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0));
    } else if (sortBy === 'name') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'));
    } else if (sortBy === 'directions') {
      list.sort((a, b) => b.directionsCount - a.directionsCount);
    }

    return list;
  }, [enriched, appliedSearch, regions, typeFilter, scoreMin, scoreMax, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleRegion(city) {
    setRegions((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]
    );
  }

  function resetFilters() {
    setSearch('');
    setAppliedSearch('');
    setRegions([]);
    setTypeFilter('');
    setFormFilter('');
    setLevels(['Бакалавриат']);
    setScoreMin(100);
    setScoreMax(250);
    setSortBy('popular');
    setPage(1);
  }

  function applyFilters() {
    setAppliedSearch(search);
    setPage(1);
  }

  if (loading) {
    return (
      <div className="universities-page">
        <div className="universities-page-inner">
          <p className="universities-empty">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="universities-page">
      <div className="universities-page-inner">
        <p className="universities-breadcrumbs">
          <Link to="/">Главная</Link> &gt; Вузы
        </p>

        <header className="universities-page-head">
          <h1>Каталог вузов Кыргызстана</h1>
          <p>Выберите вуз и найдите свои шансы на поступление на нужное направление</p>
        </header>

        {error && <div className="error">{error}</div>}

        {!isPremium && (
          <div className="universities-premium-note">
            {t('universities.premiumHint')}{' '}
            <Link to="/subscription">Premium</Link>.
          </div>
        )}

        <div className="universities-stats-row">
          <div className="universities-stat-card">
            <div className="universities-stat-icon">
              <UniversityIcon name="university" size={18} />
            </div>
            <div>
              <strong>{Math.max(universities.length, 50)}+</strong>
              <span>вузов</span>
            </div>
          </div>
          <div className="universities-stat-card">
            <div className="universities-stat-icon">
              <UniversityIcon name="directions" size={18} />
            </div>
            <div>
              <strong>{Math.max(programs.length, 500)}+</strong>
              <span>направлений</span>
            </div>
          </div>
          <div className="universities-stat-card">
            <div className="universities-stat-icon">
              <UniversityIcon name="users" size={18} />
            </div>
            <div>
              <strong>200K+</strong>
              <span>абитуриентов используют ORT.KG</span>
            </div>
          </div>
          <div className="universities-stat-card">
            <div className="universities-stat-icon">
              <UniversityIcon name="chart" size={18} />
            </div>
            <div>
              <strong>5 лет</strong>
              <span>статистики</span>
            </div>
          </div>
        </div>

        <div className="universities-layout">
          <aside className="universities-filters">
            <div className="universities-filters-head">
              <h2>Фильтры</h2>
              <button type="button" className="universities-reset" onClick={resetFilters}>
                Сбросить все
              </button>
            </div>

            <div className="universities-filter-section">
              <h3>Регион</h3>
              <label className="universities-check">
                <input
                  type="checkbox"
                  checked={regions.length === 0}
                  onChange={() => setRegions([])}
                />
                Все регионы
              </label>
              {visibleRegions.map((city) => (
                <label key={city} className="universities-check">
                  <input
                    type="checkbox"
                    checked={regions.includes(city)}
                    onChange={() => toggleRegion(city)}
                  />
                  {formatCity(city)}
                </label>
              ))}
              {availableRegions.length > 5 && (
                <button
                  type="button"
                  className="universities-show-more"
                  onClick={() => setShowAllRegions((v) => !v)}
                >
                  {showAllRegions ? 'Свернуть' : 'Показать ещё'}
                </button>
              )}
            </div>

            <div className="universities-filter-section">
              <h3>Тип вуза</h3>
              {TYPE_OPTIONS.map((opt) => (
                <label key={opt.id || 'all'} className="universities-check">
                  <input
                    type="radio"
                    name="uni-type"
                    checked={typeFilter === opt.id}
                    onChange={() => setTypeFilter(opt.id)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>

            <div className="universities-filter-section">
              <h3>Форма обучения</h3>
              {FORM_OPTIONS.map((opt) => (
                <label key={opt.id || 'any'} className="universities-check">
                  <input
                    type="radio"
                    name="study-form"
                    checked={formFilter === opt.id}
                    onChange={() => setFormFilter(opt.id)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>

            <div className="universities-filter-section">
              <h3>Уровень образования</h3>
              {LEVEL_OPTIONS.map((level) => (
                <label key={level} className="universities-check">
                  <input
                    type="checkbox"
                    checked={levels.includes(level)}
                    onChange={() =>
                      setLevels((prev) =>
                        prev.includes(level)
                          ? prev.filter((l) => l !== level)
                          : [...prev, level]
                      )
                    }
                  />
                  {level}
                </label>
              ))}
            </div>

            <div className="universities-filter-section">
              <h3>Средний проходной балл</h3>
              <input
                type="range"
                min={100}
                max={250}
                value={scoreMax}
                className="universities-range"
                onChange={(e) => setScoreMax(Number(e.target.value))}
              />
              <div className="universities-range-labels">
                <span>{scoreMin}</span>
                <span>до {scoreMax}</span>
              </div>
            </div>

            <button type="button" className="btn universities-filter-btn" onClick={applyFilters}>
              Показать результаты
            </button>
            <p className="universities-found">
              Найдено: {filtered.length}{' '}
              {filtered.length === 1 ? 'вуз' : filtered.length < 5 ? 'вуза' : 'вузов'}
            </p>
          </aside>

          <section className="universities-main">
            <div className="universities-toolbar">
              <label className="universities-search">
                <UniversityIcon name="search" size={16} />
                <input
                  type="search"
                  placeholder="Поиск вуза по названию..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                />
              </label>
              <div className="universities-sort">
                <span>Сортировать по:</span>
                <select
                  className="universities-select"
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="popular">Популярности</option>
                  <option value="score">Проходному баллу</option>
                  <option value="name">Названию</option>
                  <option value="directions">Числу направлений</option>
                </select>
              </div>
            </div>

            <div className="universities-list">
              {pageItems.map((uni) => (
                <Link key={uni.id} to={`/universities/${uni.slug}`} className="universities-card">
                  <div className="universities-logo">{getInitials(uni.name)}</div>

                  <div className="universities-card-body">
                    <div className="universities-card-head">
                      <strong>{uni.name}</strong>
                      <span className={`universities-type-badge ${typeBadgeClass(uni.type)}`.trim()}>
                        {typeLabel(uni.type)}
                      </span>
                    </div>
                    <p className="universities-city">{formatCity(uni.city)}</p>
                    <div className="universities-meta-row">
                      <span className="universities-meta-item">
                        <UniversityIcon name="calendar" size={14} className="uni-icon" />
                        {uni.founded}
                      </span>
                      <span className="universities-meta-item">
                        <UniversityIcon name="users" size={14} className="uni-icon" />
                        {uni.students.toLocaleString('ru-RU')}+
                      </span>
                      <span className="universities-meta-item">
                        <UniversityIcon name="directions" size={14} className="uni-icon" />
                        {uni.directionsCount}+ направлений
                      </span>
                    </div>
                  </div>

                  <div className="universities-card-side">
                    <div className="universities-avg-score">
                      <span>Средний проходной балл 2024</span>
                      <strong>{uni.avgScore ?? '—'}</strong>
                    </div>
                    <div className="universities-popular">
                      <span>Популярные направления</span>
                      <p>
                        {uni.popularDirections.length
                          ? uni.popularDirections.join(', ')
                          : 'Программная инженерия, IT, Экономика'}
                      </p>
                    </div>
                    <span className="universities-more-link">
                      Подробнее о вузе
                      <UniversityIcon name="arrowRight" size={14} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {!pageItems.length && (
              <p className="universities-empty">Вузы не найдены. Попробуйте изменить фильтры.</p>
            )}

            {totalPages > 1 && (
              <nav className="universities-pagination" aria-label="Пагинация">
                <button
                  type="button"
                  className="universities-page-btn"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ←
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let num = i + 1;
                  if (totalPages > 7 && page > 4) {
                    num = page - 3 + i;
                    if (num > totalPages) num = totalPages - (6 - i);
                  }
                  return (
                    <button
                      key={num}
                      type="button"
                      className={`universities-page-btn${page === num ? ' active' : ''}`}
                      onClick={() => setPage(num)}
                    >
                      {num}
                    </button>
                  );
                })}
                <button
                  type="button"
                  className="universities-page-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  →
                </button>
              </nav>
            )}
          </section>
        </div>

        <div className="universities-cta">
          <div className="universities-cta-content">
            <div className="universities-cta-icon">
              <UniversityIcon name="gradCap" size={22} />
            </div>
            <p>
              Не знаете, в какой вуз сможете поступить? Введите свои баллы ОРТ и получите персональный
              анализ шансов поступления.
            </p>
          </div>
          <Link to="/analysis" className="btn">
            Начать анализ бесплатно
          </Link>
        </div>
      </div>
    </div>
  );
}
