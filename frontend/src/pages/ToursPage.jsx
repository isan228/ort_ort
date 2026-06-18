import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getStoredUser } from '../api/client.js';
import { TourIcon } from '../components/icons/TourIcons.jsx';

const MAX_APPLICATIONS = 10;
const STORAGE_KEY = 'ort_tour_applications';

const STAGE_LABELS = {
  open: 'Текущий',
  upcoming: 'Запланирован',
  closed: 'Завершён',
};

function getInitials(name) {
  if (!name) return 'ВУЗ';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function formatShortDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function daysUntil(date) {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

function pseudoStats(id) {
  let hash = 0;
  const str = String(id);
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) % 100000;
  }
  const total = 80 + (hash % 120);
  const budget = Math.floor(total * 0.4);
  const contract = total - budget;
  const applicants = 200 + (hash % 800);
  return { total, budget, contract, applicants };
}

function calcChance(userScore, threshold) {
  if (!userScore || threshold == null) return null;
  const diff = userScore - threshold;
  let pct;
  let level;
  if (diff >= 15) {
    pct = Math.min(95, 78 + diff * 0.5);
    level = 'high';
  } else if (diff >= 0) {
    pct = 52 + diff * 1.5;
    level = 'medium';
  } else {
    pct = Math.max(8, 38 + diff * 1.8);
    level = 'low';
  }
  return { pct: Math.round(pct), level };
}

function chanceLabel(level) {
  if (level === 'high') return 'Высокий';
  if (level === 'medium') return 'Средний';
  return 'Низкий';
}

function loadApplications(tourId) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return all[tourId] || [];
  } catch {
    return [];
  }
}

function saveApplications(tourId, items) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    all[tourId] = items;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

function buildStages(tours) {
  const sorted = [...tours].sort((a, b) => new Date(a.starts_at || 0) - new Date(b.starts_at || 0));

  if (sorted.length >= 4) {
    return sorted.slice(0, 4).map((tour, idx) => ({
      id: tour.id,
      num: idx + 1,
      status: tour.status,
      startsAt: tour.starts_at,
      endsAt: tour.ends_at,
      name: tour.name,
    }));
  }

  const stages = sorted.map((tour, idx) => ({
    id: tour.id,
    num: idx + 1,
    status: tour.status,
    startsAt: tour.starts_at,
    endsAt: tour.ends_at,
    name: tour.name,
  }));

  const baseDate = sorted[0]?.ends_at ? new Date(sorted[0].ends_at) : new Date();
  while (stages.length < 4) {
    const num = stages.length + 1;
    const start = new Date(baseDate);
    start.setDate(start.getDate() + (num - 1) * 45 + 15);
    const end = new Date(start);
    end.setDate(end.getDate() + 10);
    const results = new Date(end);
    results.setDate(results.getDate() + 5);
    stages.push({
      id: `planned-${num}`,
      num,
      status: 'upcoming',
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      resultsAt: results.toISOString(),
      name: `${num} тур`,
    });
  }

  return stages;
}

export default function ToursPage() {
  const user = getStoredUser();
  const [tours, setTours] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [userScore, setUserScore] = useState(null);
  const [applications, setApplications] = useState([]);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [cityFilter, setCityFilter] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const currentTour = useMemo(
    () => tours.find((t) => t.status === 'open') || tours[0] || null,
    [tours]
  );

  const stages = useMemo(() => buildStages(tours), [tours]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [toursData, programsData] = await Promise.all([
          api.getTours(),
          api.listPrograms(),
        ]);
        setTours(toursData.tours || []);
        setPrograms(programsData.programs || []);

        if (user) {
          try {
            const scores = await api.getScores();
            const profile = scores.final || scores.draft;
            if (profile?.main_score != null) setUserScore(Number(profile.main_score));
          } catch {
            /* optional */
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  useEffect(() => {
    if (currentTour?.id) {
      setApplications(loadApplications(currentTour.id));
    }
  }, [currentTour?.id]);

  const cities = useMemo(() => {
    const set = new Set(programs.map((p) => p.city).filter(Boolean));
    return ['', ...Array.from(set).sort()];
  }, [programs]);

  const filteredPrograms = useMemo(() => {
    let list = [...programs];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.university?.toLowerCase().includes(q) ||
          p.faculty?.toLowerCase().includes(q)
      );
    }
    if (cityFilter) {
      list = list.filter((p) => p.city === cityFilter);
    }
    return list.slice(0, 25);
  }, [programs, search, cityFilter]);

  const daysLeft = daysUntil(currentTour?.ends_at);
  const appliedIds = new Set(applications.map((a) => a.programId));

  function handleSubmit(program) {
    if (!user) {
      setError('Войдите в аккаунт, чтобы подать заявление');
      return;
    }
    if (!currentTour) return;
    if (applications.length >= MAX_APPLICATIONS) {
      setError(`Максимум ${MAX_APPLICATIONS} заявлений в туре`);
      return;
    }
    if (appliedIds.has(program.id)) return;

    const item = {
      programId: program.id,
      university: program.university,
      program: program.name,
      form: 'Очная',
      priority: applications.length + 1,
      status: 'accepted',
      submittedAt: new Date().toISOString(),
    };

    const next = [...applications, item];
    setApplications(next);
    saveApplications(currentTour.id, next);
    setMessage(`Заявление в «${program.university}» принято (симуляция)`);
    setError('');
  }

  const popularPrograms = useMemo(() => {
    return [...programs]
      .map((p) => ({ program: p, chance: calcChance(userScore, p.main_score_min) }))
      .filter((x) => x.chance && x.chance.pct >= 50)
      .sort((a, b) => b.chance.pct - a.chance.pct)
      .slice(0, 3);
  }, [programs, userScore]);

  if (loading) {
    return (
      <div className="tours-page">
        <div className="tours-page-inner">
          <p className="tours-empty">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tours-page">
      <div className="tours-page-inner">
        <p className="tours-breadcrumbs">
          <Link to="/">Главная</Link> &gt; Туры
        </p>

        <header className="tours-page-head">
          <h1>Туры поступления</h1>
          <p>Отслеживайте все туры, подавайте документы и следите за своим статусом</p>
        </header>

        {currentTour?.simulation_only && (
          <div className="tours-disclaimer">
            Симуляция ORT.KG — не является официальной подачей заявления в вуз.
          </div>
        )}

        {error && <div className="error">{error}</div>}
        {message && <div className="success">{message}</div>}

        <div className="tours-stats-row">
          <div className="tours-stat-card">
            <div className="tours-stat-icon tours-stat-icon--blue">
              <TourIcon name="calendar" size={18} />
            </div>
            <div>
              <span>Текущий тур</span>
              <strong>{currentTour ? `${stages.find((s) => s.id === currentTour.id)?.num || 1} тур` : '—'}</strong>
              <em>{currentTour?.status === 'open' ? 'Подача документов' : 'Ожидание'}</em>
            </div>
          </div>

          <div className="tours-stat-card">
            <div className="tours-stat-icon tours-stat-icon--purple">
              <TourIcon name="university" size={18} />
            </div>
            <div>
              <span>Всего туров</span>
              <strong>{Math.max(tours.length, stages.length)}</strong>
              <em>Основной этап</em>
            </div>
          </div>

          <div className="tours-stat-card">
            <div className="tours-stat-icon tours-stat-icon--green">
              <TourIcon name="clipboard" size={18} />
            </div>
            <div>
              <span>Подано заявлений</span>
              <strong>
                {applications.length} <small style={{ fontWeight: 400, fontSize: '0.85rem' }}>из {MAX_APPLICATIONS} возможных</small>
              </strong>
            </div>
          </div>

          <div className="tours-stat-card">
            <div className="tours-stat-icon tours-stat-icon--amber">
              <TourIcon name="clock" size={18} />
            </div>
            <div>
              <span>До окончания тура</span>
              <strong>{daysLeft != null ? `${daysLeft} ${daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'}` : '—'}</strong>
              <em>{formatDateTime(currentTour?.ends_at)}</em>
            </div>
          </div>
        </div>

        <div className="tours-stages-layout">
          <section className="tours-card">
            <h2>Этапы и сроки туров</h2>
            <div className="tours-timeline">
              {stages.map((stage) => {
                const isCurrent = stage.status === 'open' || (currentTour && stage.id === currentTour.id);
                const resultsDate = stage.resultsAt
                  ? stage.resultsAt
                  : stage.endsAt
                    ? new Date(new Date(stage.endsAt).getTime() + 5 * 24 * 60 * 60 * 1000).toISOString()
                    : null;

                return (
                  <div key={stage.id} className={`tours-stage${isCurrent ? ' current' : ''}`}>
                    <span
                      className={`tours-stage-badge ${
                        isCurrent
                          ? 'tours-stage-badge--current'
                          : stage.status === 'closed'
                            ? 'tours-stage-badge--closed'
                            : 'tours-stage-badge--planned'
                      }`}
                    >
                      {isCurrent ? STAGE_LABELS.open : STAGE_LABELS[stage.status] || STAGE_LABELS.upcoming}
                    </span>
                    <div className="tours-stage-num">{stage.num} тур</div>
                    <div className="tours-stage-dates">
                      <strong>Подача документов</strong>
                      {formatShortDate(stage.startsAt)} — {formatShortDate(stage.endsAt)}
                      <strong style={{ marginTop: '0.35rem' }}>Объявление результатов</strong>
                      {formatShortDate(resultsDate)}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="tours-info-bar">
              <TourIcon name="info" size={16} className="tours-icon" />
              <span>
                Вы можете подать до {MAX_APPLICATIONS} заявлений на разные направления и вузы в каждом туре.
              </span>
              <Link to="/faq">Правила подачи →</Link>
            </div>
          </section>

          <aside className="tours-card">
            <div className="tours-card-head">
              <h2>Ваши заявления в текущем туре</h2>
              {applications.length > 0 && (
                <Link to={currentTour ? `/tours/${currentTour.id}` : '/tours'} className="tours-card-link">
                  Все заявления
                  <TourIcon name="chevronRight" size={14} />
                </Link>
              )}
            </div>

            <div className="tours-applications">
              {applications.length === 0 ? (
                <p className="tours-empty" style={{ padding: '1rem 0' }}>
                  Заявлений пока нет. Выберите направление в таблице ниже.
                </p>
              ) : (
                applications.map((app) => (
                  <div key={app.programId} className="tours-application">
                    <div className="tours-uni-logo">{getInitials(app.university)}</div>
                    <div className="tours-application-body">
                      <strong>{app.university}</strong>
                      <span>
                        {app.program}, {app.form}
                      </span>
                      <div className="tours-application-meta">
                        <span>Приоритет: {app.priority}</span>
                        <span className="tours-status-accepted">Принято</span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                        {formatShortDate(app.submittedAt)}
                      </span>
                    </div>
                  </div>
                ))
              )}

              <button
                type="button"
                className="tours-add-btn"
                onClick={() => document.getElementById('tours-programs-table')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <TourIcon name="plus" size={20} />
                Подать новое заявление
                <em>Осталось {MAX_APPLICATIONS - applications.length} заявлений</em>
              </button>
            </div>
          </aside>
        </div>

        <section className="tours-card" id="tours-programs-table">
          <h2>Вузы и направления в текущем туре</h2>

          <div className="tours-table-toolbar">
            <label className="tours-search">
              <TourIcon name="search" size={16} />
              <input
                type="search"
                placeholder="Поиск по вузу или направлению..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <button
              type="button"
              className={`tours-filter-btn${showFilters ? ' active' : ''}`}
              onClick={() => setShowFilters((v) => !v)}
            >
              <TourIcon name="filter" size={16} />
              Фильтры
            </button>
          </div>

          {showFilters && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Город{' '}
                <select
                  className="tours-filter-select"
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                >
                  <option value="">Все города</option>
                  {cities.filter(Boolean).map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <div className="tours-table-wrap">
            <table className="tours-table">
              <thead>
                <tr>
                  <th>Вуз</th>
                  <th>Направление</th>
                  <th>Форма обучения</th>
                  <th>Проходной балл 2023</th>
                  <th>Количество мест</th>
                  <th>Подано заявлений</th>
                  <th>Ваш шанс</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredPrograms.map((program) => {
                  const stats = pseudoStats(program.id);
                  const chance = calcChance(userScore, program.main_score_min);
                  const submitted = appliedIds.has(program.id);

                  return (
                    <tr key={program.id}>
                      <td>
                        <div className="tours-table-uni">
                          <div className="tours-uni-logo">{getInitials(program.university)}</div>
                          <span>{program.university}</span>
                        </div>
                      </td>
                      <td>{program.name}</td>
                      <td>Очная</td>
                      <td>
                        {program.main_score_min != null ? (
                          <>
                            <strong>{program.main_score_min}</strong>
                            <span style={{ color: '#94a3b8' }}> из 250</span>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <div className="tours-seats">
                          <span>
                            Всего: <strong>{stats.total}</strong>
                          </span>
                          <span>
                            Бюджет: <strong>{stats.budget}</strong>
                          </span>
                          <span>
                            Контракт: <strong>{stats.contract}</strong>
                          </span>
                        </div>
                      </td>
                      <td>{stats.applicants.toLocaleString('ru-RU')}</td>
                      <td>
                        {chance ? (
                          <div className="tours-chance">
                            <span className={`tours-chance-pct tours-chance-pct--${chance.level}`}>
                              {chance.pct}%
                            </span>
                            <span className={`tours-chance-label tours-chance-label--${chance.level}`}>
                              {chanceLabel(chance.level)}
                            </span>
                          </div>
                        ) : user ? (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Укажите баллы</span>
                        ) : (
                          <Link to="/login" style={{ fontSize: '0.75rem' }}>
                            Войти
                          </Link>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`tours-submit-btn${submitted ? ' submitted' : ''}`}
                          disabled={submitted || currentTour?.status !== 'open'}
                          onClick={() => handleSubmit(program)}
                        >
                          {submitted ? 'Подано' : 'Подать'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!filteredPrograms.length && (
            <p className="tours-empty">Направления не найдены. Попробуйте изменить фильтры.</p>
          )}
        </section>

        {userScore && (
          <div className="tours-recommendation">
            <div className="tours-recommendation-content">
              <div className="tours-recommendation-icon">
                <TourIcon name="gradCap" size={22} />
              </div>
              <p>
                <strong>Рекомендация:</strong> На основе вашего балла ({userScore}) мы рекомендуем подавать
                заявления в вузы с шансом выше 50% в первых турах.
                {popularPrograms.length > 0 && (
                  <>
                    {' '}
                    Например: {popularPrograms.map((x) => x.program.university).join(', ')}.
                  </>
                )}
              </p>
            </div>
            <Link to="/analysis" className="btn">
              Посмотреть рекомендации →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
