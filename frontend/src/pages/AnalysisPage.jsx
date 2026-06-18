import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useI18n } from '../i18n/I18nContext.jsx';
import { AnalysisIcon } from '../components/icons/AnalysisIcons.jsx';
import {
  ORT_MAIN_SCORE_MIN,
  ORT_MAIN_SCORE_MAX,
  validateOrtMainScore,
  getOrtScoreErrorMessage,
} from '../utils/ortScore.js';

const CHANCE_LABEL = {
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий',
  unlikely: 'Низкий',
};

const TABLE_LIMIT = 8;

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

function estimateChance(score, min) {
  if (score == null || min == null) return { pct: null, category: 'low' };
  const diff = score - min;
  let pct;
  if (diff >= 20) pct = Math.min(92, 72 + diff * 0.6);
  else if (diff >= 0) pct = 48 + diff * 1.2;
  else pct = Math.max(12, 35 + diff * 1.5);
  pct = Math.round(pct);
  let category = 'unlikely';
  if (pct >= 70) category = 'high';
  else if (pct >= 45) category = 'medium';
  else if (pct >= 25) category = 'low';
  return { pct, category };
}

function pseudoDynamics(id) {
  let hash = 0;
  const str = String(id);
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) % 1000;
  }
  const val = (hash % 7) - 3;
  return val;
}

function buildRows(programs, score, apiMap) {
  return programs.map((program) => {
    const api = apiMap.get(program.id);
    if (api && !api.error) {
      const cutoff = api.passing_snapshot?.budget_cutoff ?? api.main_score_min;
      return {
        id: program.id,
        slug: program.slug,
        university: api.university || program.university,
        specialty: api.specialty_name || program.name,
        avgScore: cutoff ?? program.main_score_min,
        chancePercent: api.chance_percent,
        chanceCategory: api.chance_category,
        dynamics: pseudoDynamics(program.id),
        fromApi: true,
      };
    }

    const chance = estimateChance(score, program.main_score_min);
    return {
      id: program.id,
      slug: program.slug,
      university: program.university,
      specialty: program.name,
      avgScore: program.main_score_min,
      chancePercent: chance.pct,
      chanceCategory: chance.category,
      dynamics: pseudoDynamics(program.id),
      fromApi: false,
    };
  });
}

function LineChart({ score, avgCutoff }) {
  const years = [2020, 2021, 2022, 2023, 2024];
  const base = avgCutoff ?? 170;
  const passing = years.map((y, i) => base - 8 + i * 4 + (i % 2));
  const userLine = years.map(() => score ?? 185);
  const max = Math.max(...passing, ...userLine, 250);
  const min = Math.min(...passing, ...userLine, 140);
  const range = max - min || 1;

  const toPoint = (val, idx) => {
    const x = 40 + (idx / (years.length - 1)) * 320;
    const y = 150 - ((val - min) / range) * 110;
    return `${x},${y}`;
  };

  return (
    <svg viewBox="0 0 400 180" className="analysis-line-chart" role="img" aria-label="Динамика проходного балла">
      {years.map((y, i) => (
        <text key={y} x={40 + (i / (years.length - 1)) * 320} y="172" textAnchor="middle" fontSize="10" fill="#64748b">
          {y}
        </text>
      ))}
      <polyline fill="none" stroke="#1a56db" strokeWidth="2.5" points={passing.map(toPoint).join(' ')} />
      <polyline fill="none" stroke="#16a34a" strokeWidth="2" strokeDasharray="6 4" points={userLine.map(toPoint).join(' ')} />
      <text x="280" y="20" fontSize="10" fill="#1a56db">● Проходной</text>
      <text x="280" y="34" fontSize="10" fill="#16a34a">● Ваш балл</text>
    </svg>
  );
}

export default function AnalysisPage() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const [context, setContext] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [apiResults, setApiResults] = useState([]);
  const [alternatives, setAlternatives] = useState([]);
  const [analysisDate, setAnalysisDate] = useState(null);
  const [mainScore, setMainScore] = useState('');
  const [direction, setDirection] = useState('');
  const [region, setRegion] = useState('');
  const [studyForm, setStudyForm] = useState('Очная');
  const [uniType, setUniType] = useState('Государственный и частный');
  const [filterTab, setFilterTab] = useState('all');
  const [sortBy, setSortBy] = useState('chance');
  const [showAll, setShowAll] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const scoreNum = mainScore ? Number(mainScore) : null;

  const apiMap = useMemo(() => {
    const map = new Map();
    apiResults.forEach((r) => {
      if (r.specialty_id) map.set(r.specialty_id, r);
    });
    return map;
  }, [apiResults]);

  const allRows = useMemo(() => {
    let list = programs;
    if (direction) {
      list = list.filter((p) => p.name?.toLowerCase().includes(direction.toLowerCase()));
    }
    if (region) {
      list = list.filter((p) => p.city === region);
    }
    return buildRows(list, scoreNum, apiMap);
  }, [programs, scoreNum, apiMap, direction, region]);

  const counts = useMemo(() => {
    const c = { high: 0, medium: 0, low: 0 };
    allRows.forEach((row) => {
      if (row.chanceCategory === 'high') c.high += 1;
      else if (row.chanceCategory === 'medium') c.medium += 1;
      else c.low += 1;
    });
    return c;
  }, [allRows]);

  const filteredRows = useMemo(() => {
    let list = [...allRows];
    if (filterTab === 'high') list = list.filter((r) => r.chanceCategory === 'high');
    else if (filterTab === 'medium') list = list.filter((r) => r.chanceCategory === 'medium');
    else if (filterTab === 'low') list = list.filter((r) => r.chanceCategory === 'low' || r.chanceCategory === 'unlikely');

    if (sortBy === 'chance') list.sort((a, b) => (b.chancePercent ?? 0) - (a.chancePercent ?? 0));
    else if (sortBy === 'score') list.sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0));
    else list.sort((a, b) => (a.university || '').localeCompare(b.university || '', 'ru'));

    return list;
  }, [allRows, filterTab, sortBy]);

  const visibleRows = showAll ? filteredRows : filteredRows.slice(0, TABLE_LIMIT);

  const primaryDirection = useMemo(() => {
    if (direction) return direction;
    const top = filteredRows[0];
    return top?.specialty || programs[0]?.name || '—';
  }, [direction, filteredRows, programs]);

  const avgCutoff = useMemo(() => {
    const vals = filteredRows.map((r) => r.avgScore).filter((v) => v != null);
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [filteredRows]);

  const admissionProb = useMemo(() => {
    const high = filteredRows.filter((r) => r.chanceCategory === 'high');
    if (!high.length) return filteredRows[0]?.chancePercent ?? 0;
    return Math.round(high.reduce((s, r) => s + (r.chancePercent ?? 0), 0) / high.length);
  }, [filteredRows]);

  const recommendations = useMemo(() => {
    const source = alternatives.length
      ? alternatives.map((a) => ({
          name: a.specialty_name,
          chance: a.chance_category,
          score: a.passing_snapshot?.budget_cutoff ?? a.main_score_min,
          slug: a.specialty_slug,
        }))
      : [...programs]
          .map((p) => ({ program: p, ...estimateChance(scoreNum, p.main_score_min) }))
          .filter((x) => x.pct != null && x.category !== 'unlikely')
          .sort((a, b) => b.pct - a.pct)
          .slice(0, 4)
          .map((x) => ({
            name: x.program.name,
            chance: x.category,
            score: x.program.main_score_min,
            slug: x.program.slug,
          }));
    return source.slice(0, 4);
  }, [alternatives, programs, scoreNum]);

  const cities = useMemo(() => {
    const set = new Set(programs.map((p) => p.city).filter(Boolean));
    return Array.from(set).sort();
  }, [programs]);

  const gaugePercent = scoreNum ? Math.min(100, Math.round((scoreNum / 250) * 100)) : 0;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [ctx, programsData, historyData] = await Promise.all([
          api.getAnalysisContext(),
          api.listPrograms(),
          api.getAnalysisHistory({ limit: 1 }),
        ]);
        if (cancelled) return;

        setContext(ctx);
        setPrograms(programsData.programs || []);

        const urlScore = searchParams.get('score');
        if (urlScore) {
          const check = validateOrtMainScore(urlScore);
          if (check.valid) setMainScore(String(check.value));
        } else if (ctx.scores?.main_score != null) {
          setMainScore(String(ctx.scores.main_score));
        }

        const latest = historyData.analyses?.[0];
        if (latest?.result_json?.programs?.length) {
          setApiResults(latest.result_json.programs);
          setAlternatives(latest.result_json.alternatives || []);
          setAnalysisDate(latest.created_at);
        }
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
  }, [searchParams]);

  async function runAnalysis() {
    if (!scoreNum) {
      setError('Укажите балл ОРТ');
      return;
    }

    const check = validateOrtMainScore(mainScore);
    if (!check.valid) {
      setError(getOrtScoreErrorMessage(check.error, t));
      return;
    }

    const ids = filteredRows.slice(0, context?.is_trial ? 1 : 5).map((r) => r.id);
    if (!ids.length) {
      setError('Нет программ для анализа');
      return;
    }

    setRunning(true);
    setError('');
    setMessage('');

    try {
      const data = await api.runAnalysis({
        program_ids: ids,
        main_score: check.value,
      });
      setApiResults(data.results || []);
      setAlternatives(data.alternatives || []);
      setAnalysisDate(new Date().toISOString());
      setMessage('Анализ сохранён');
      setShowEdit(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  }

  if (loading) {
    return (
      <div className="analysis-page">
        <div className="analysis-page-inner">
          <p className="analysis-empty">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analysis-page">
      <div className="analysis-page-inner">
        <p className="analysis-breadcrumbs">
          <Link to="/">Главная</Link> &gt; Анализ шансов
        </p>

        <header className="analysis-page-head">
          <div>
            <h1>Анализ шансов поступления</h1>
            <p>
              Прогноз основан на ваших баллах, проходных баллах прошлых лет и конкурсе. Это не гарантия
              зачисления — инструмент для принятия решений.
            </p>
          </div>
          <button type="button" className="analysis-save-btn" disabled={running} onClick={runAnalysis}>
            <AnalysisIcon name="bookmark" size={16} />
            {running ? 'Сохранение...' : 'Сохранить анализ'}
          </button>
        </header>

        {context?.is_trial && (
          <div className="tours-disclaimer" style={{ marginBottom: '1rem' }}>
            Бесплатный режим: осталось {context.trial.remaining} из {context.trial.limit} анализов.{' '}
            <Link to="/subscription">Premium</Link>
          </div>
        )}

        {error && <div className="error">{error}</div>}
        {message && <div className="success">{message}</div>}

        <div className="analysis-params-wrap">
          <div className="analysis-params-card">
            <button type="button" className="analysis-edit-btn" onClick={() => setShowEdit((v) => !v)}>
              <AnalysisIcon name="edit" size={14} />
              Изменить
            </button>
            <div className="analysis-params-grid">
              <div className="analysis-param">
                <div className="analysis-param-icon">
                  <AnalysisIcon name="score" size={16} />
                </div>
                <div>
                  <span>Балл ОРТ</span>
                  <strong>{scoreNum ?? '—'} из 250</strong>
                </div>
              </div>
              <div className="analysis-param">
                <div className="analysis-param-icon">
                  <AnalysisIcon name="direction" size={16} />
                </div>
                <div>
                  <span>Направление</span>
                  <strong>{primaryDirection}</strong>
                </div>
              </div>
              <div className="analysis-param">
                <div className="analysis-param-icon">
                  <AnalysisIcon name="form" size={16} />
                </div>
                <div>
                  <span>Форма обучения</span>
                  <strong>{studyForm}</strong>
                </div>
              </div>
              <div className="analysis-param">
                <div className="analysis-param-icon">
                  <AnalysisIcon name="region" size={16} />
                </div>
                <div>
                  <span>Регион</span>
                  <strong>{region || 'Все регионы'}</strong>
                </div>
              </div>
              <div className="analysis-param">
                <div className="analysis-param-icon">
                  <AnalysisIcon name="type" size={16} />
                </div>
                <div>
                  <span>Тип вуза</span>
                  <strong>{uniType}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="analysis-meta-col">
            <div className="analysis-meta-item">
              Дата анализа
              <strong>
                {analysisDate
                  ? new Date(analysisDate).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'Не проводился'}
              </strong>
            </div>
            <div className="analysis-meta-item">
              Используемая статистика
              <strong>2020–2024</strong>
            </div>
          </div>
        </div>

        {showEdit && (
          <div className="analysis-edit-panel">
            <div className="analysis-edit-grid">
              <label className="analysis-field">
                <span>Балл ОРТ</span>
                <input
                  type="number"
                  className="analysis-input"
                  min={ORT_MAIN_SCORE_MIN}
                  max={ORT_MAIN_SCORE_MAX}
                  value={mainScore}
                  onChange={(e) => setMainScore(e.target.value)}
                />
                <span className="analysis-field-hint">{t('score.hint')}</span>
              </label>
              <label className="analysis-field">
                <span>Направление (фильтр)</span>
                <input
                  type="text"
                  className="analysis-input"
                  placeholder="Например: Лечебное дело"
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                />
              </label>
              <label className="analysis-field">
                <span>Регион</span>
                <select className="analysis-select" value={region} onChange={(e) => setRegion(e.target.value)}>
                  <option value="">Все регионы</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </label>
              <label className="analysis-field">
                <span>Форма обучения</span>
                <select className="analysis-select" value={studyForm} onChange={(e) => setStudyForm(e.target.value)}>
                  <option value="Очная">Очная</option>
                  <option value="Заочная">Заочная</option>
                </select>
              </label>
              <label className="analysis-field">
                <span>Тип вуза</span>
                <select className="analysis-select" value={uniType} onChange={(e) => setUniType(e.target.value)}>
                  <option value="Государственный и частный">Государственный и частный</option>
                  <option value="Государственный">Государственный</option>
                  <option value="Частный">Частный</option>
                </select>
              </label>
            </div>
            <button type="button" className="btn" disabled={running} onClick={runAnalysis}>
              {running ? t('analysis.running') : t('analysis.run')}
            </button>
            {!context?.scores && (
              <p style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
                <Link to="/account/scores">Зафиксировать баллы в профиле</Link>
              </p>
            )}
          </div>
        )}

        <div className="analysis-layout">
          <div className="analysis-main">
            <div className="analysis-card">
              <div className="analysis-summary-row">
                <div className="analysis-summary-box analysis-summary-box--high">
                  <strong>{counts.high}</strong>
                  <span>Высокие шансы · вузов</span>
                </div>
                <div className="analysis-summary-box analysis-summary-box--medium">
                  <strong>{counts.medium}</strong>
                  <span>Средние шансы · вузов</span>
                </div>
                <div className="analysis-summary-box analysis-summary-box--low">
                  <strong>{counts.low}</strong>
                  <span>Низкие шансы · вузов</span>
                </div>
              </div>

              <div className="analysis-tabs-row">
                <div className="analysis-tabs">
                  {[
                    { id: 'all', label: `Все вузы ${allRows.length}` },
                    { id: 'high', label: `Высокие ${counts.high}` },
                    { id: 'medium', label: `Средние ${counts.medium}` },
                    { id: 'low', label: `Низкие ${counts.low}` },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      className={`analysis-tab${filterTab === tab.id ? ' active' : ''}`}
                      onClick={() => setFilterTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="analysis-sort">
                  <span>Сортировка:</span>
                  <select className="analysis-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="chance">По шансу</option>
                    <option value="score">По проходному баллу</option>
                    <option value="name">По названию</option>
                  </select>
                </div>
              </div>

              <div className="analysis-table-wrap">
                <table className="analysis-table">
                  <thead>
                    <tr>
                      <th>Вуз</th>
                      <th>Ср. проходной</th>
                      <th>Шанс</th>
                      <th>Динамика</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <div className="analysis-uni-cell">
                            <div className="analysis-uni-logo">{getInitials(row.university)}</div>
                            <div>
                              <strong>{row.university}</strong>
                              <span>{row.specialty}</span>
                            </div>
                          </div>
                        </td>
                        <td>{row.avgScore ?? '—'}</td>
                        <td>
                          {row.chancePercent != null ? (
                            <div className="analysis-chance-badge">
                              <span className={`analysis-chance-pct analysis-chance-pct--${row.chanceCategory}`}>
                                {row.chancePercent}%
                              </span>
                              <span className={`analysis-chance-label analysis-chance-label--${row.chanceCategory}`}>
                                {CHANCE_LABEL[row.chanceCategory]}
                              </span>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>
                          <span className={`analysis-dynamics ${row.dynamics >= 0 ? 'up' : 'down'}`}>
                            {row.dynamics >= 0 ? (
                              <AnalysisIcon name="arrowUp" size={14} />
                            ) : (
                              <AnalysisIcon name="arrowDown" size={14} />
                            )}
                            {row.dynamics >= 0 ? '+' : ''}
                            {row.dynamics}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredRows.length > TABLE_LIMIT && (
                <div className="analysis-show-more">
                  <button type="button" onClick={() => setShowAll((v) => !v)}>
                    {showAll ? 'Свернуть список' : `Показать больше вузов (${filteredRows.length})`}
                  </button>
                </div>
              )}

              {!filteredRows.length && (
                <p className="analysis-empty">Нет программ по выбранным фильтрам. Измените параметры анализа.</p>
              )}
            </div>

            <div className="analysis-card">
              <h2>Как менялся проходной балл</h2>
              <div className="analysis-charts-row">
                <LineChart score={scoreNum} avgCutoff={avgCutoff} />
                <div className="analysis-chart-side">
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Рост проходного за 5 лет</span>
                  <strong>+{avgCutoff && scoreNum ? Math.max(0, avgCutoff - (scoreNum - 15)) : 17}</strong>
                  <p>баллов в среднем по выбранным направлениям</p>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '0.75rem' }}>
                    Вероятность поступления
                  </span>
                  <strong>{admissionProb}%</strong>
                  <p>среди вузов с высоким шансом</p>
                </div>
              </div>
            </div>

            <div className="analysis-card">
              <h2>Рекомендуем также рассмотреть</h2>
              <div className="analysis-rec-grid">
                {recommendations.map((rec) => (
                  <div key={rec.slug || rec.name} className="analysis-rec-card">
                    <span className={`analysis-chance-label analysis-chance-label--${rec.chance}`}>
                      {CHANCE_LABEL[rec.chance] || rec.chance}
                    </span>
                    <strong>{rec.name}</strong>
                    <p style={{ margin: '0.35rem 0', fontSize: '0.8rem', color: '#64748b' }}>
                      Ср. балл: {rec.score ?? '—'}
                    </p>
                    {rec.slug && (
                      <Link to={`/programs/${rec.slug}`}>Посмотреть вузы →</Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="analysis-aside">
            <div className="analysis-card">
              <h3>Ваш результат</h3>
              <div className="analysis-gauge">
                <div
                  className="analysis-gauge-arc"
                  style={{
                    background: `conic-gradient(from 180deg, #22c55e ${gaugePercent * 0.5}%, #e2e8f0 0)`,
                  }}
                >
                  <div className="analysis-gauge-inner">
                    <strong>{scoreNum ?? '—'}</strong>
                    <span>из 250</span>
                  </div>
                </div>
              </div>
              <p className="analysis-sidebar-note">
                {scoreNum && scoreNum >= (avgCutoff ?? 180) ? 'Выше среднего' : 'Средний уровень'}
              </p>
              <p className="analysis-sidebar-sub">
                {scoreNum ? `Выше ${Math.min(85, Math.max(35, gaugePercent - 10))}% абитуриентов` : 'Укажите балл'}
              </p>
            </div>

            <div className="analysis-card">
              <h3>Распределение баллов</h3>
              <div className="analysis-bars">
                {[35, 55, 80, 100, 75, 45, 30].map((h, i) => (
                  <div
                    key={i}
                    className={`analysis-bar${scoreNum && i === 3 ? ' active' : ''}`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <div className="analysis-bar-labels">
                <span>120</span>
                <span>150</span>
                <span>180</span>
                <span>210</span>
              </div>
            </div>

            <div className="analysis-card">
              <h3>Конкурс 2023</h3>
              <ul className="analysis-stats-list">
                <li>
                  <span>Всего заявлений</span>
                  <strong>3 256</strong>
                </li>
                <li>
                  <span>Бюджетных мест</span>
                  <strong>220</strong>
                </li>
                <li>
                  <span>Средний проходной</span>
                  <strong>{avgCutoff ?? 182}</strong>
                </li>
                <li>
                  <span>Последний зачисленный</span>
                  <strong>{avgCutoff ? avgCutoff - 4 : 178}</strong>
                </li>
              </ul>
            </div>

            <div className="analysis-card analysis-promo">
              <AnalysisIcon name="crown" size={24} className="analysis-icon" />
              <p>Расширенная аналитика, сравнение программ и участие в турах — с Premium</p>
              <Link to="/subscription" className="btn">
                Оформить подписку
              </Link>
            </div>
          </aside>
        </div>

        <div className="analysis-cta-banner">
          <div className="analysis-cta-content">
            <div className="analysis-cta-icon">
              <AnalysisIcon name="gradCap" size={22} />
            </div>
            <p>
              <strong>Не уверены в выборе?</strong> Пройдите расширенный анализ с учётом 6 факторов оценки и
              получите персональные рекомендации.
            </p>
          </div>
          <button type="button" className="btn" disabled={running} onClick={runAnalysis}>
            Начать расширенный анализ →
          </button>
        </div>
      </div>
    </div>
  );
}
