import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useI18n } from '../i18n/I18nContext.jsx';

const CHANCE_CLASS = {
  high: 'chance-high',
  medium: 'chance-medium',
  low: 'chance-low',
  unlikely: 'chance-unlikely',
};

function FactorBar({ factor }) {
  const percent = Math.round((factor.score ?? 0) * 100);
  return (
    <div className="factor-row">
      <div className="factor-head">
        <span>{factor.label}</span>
        <span className="muted">{percent}%</span>
      </div>
      <div className="factor-track">
        <div className="factor-fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="muted factor-detail">{factor.detail}</p>
    </div>
  );
}

function ProgramResultCard({ result, t }) {
  if (result.error) {
    return (
      <div className="card">
        <h3>{result.specialty_name}</h3>
        <p className="error">{result.error}</p>
      </div>
    );
  }

  return (
    <div className="card analysis-result">
      <div className="analysis-result-head">
        <div>
          <h3>{result.specialty_name}</h3>
          <p className="muted">
            {result.university} · {result.faculty}
          </p>
        </div>
        <div className={`chance-badge ${CHANCE_CLASS[result.chance_category] || ''}`}>
          <strong>{result.chance_percent}%</strong>
          <span>{t(`analysis.chance.${result.chance_category}`, result.chance_category)}</span>
        </div>
      </div>

      <p>
        Порог: {result.main_score_min ?? '—'} · Ваш балл: <strong>{result.user_main_score}</strong>
      </p>

      {result.passing_snapshot && (
        <p className="muted">
          Проходные {result.passing_snapshot.year}: бюджет {result.passing_snapshot.budget_cutoff ?? '—'},
          контракт {result.passing_snapshot.contract_cutoff ?? '—'}
        </p>
      )}

      <div className="factor-list">
        {(result.factors || []).map((factor) => (
          <FactorBar key={factor.key} factor={factor} />
        ))}
      </div>

      {result.risks?.length > 0 && (
        <div className="risk-list">
          <h4>Риски</h4>
          <ul>
            {result.risks.map((risk) => (
              <li key={risk.code} className={`risk-${risk.severity}`}>
                {risk.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.recommendations?.length > 0 && (
        <div className="recommend-list">
          <h4>Рекомендации</h4>
          <ul>
            {result.recommendations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {result.specialty_slug && (
        <Link to={`/programs/${result.specialty_slug}`} className="btn btn-secondary">
          Карточка программы
        </Link>
      )}
    </div>
  );
}

export default function AnalysisPage() {
  const { t } = useI18n();
  const [context, setContext] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [mainScore, setMainScore] = useState('');
  const [results, setResults] = useState(null);
  const [alternatives, setAlternatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  const maxPrograms = context?.is_trial ? 1 : 5;

  const filteredPrograms = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return programs;
    return programs.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.university?.toLowerCase().includes(q) ||
        p.faculty?.toLowerCase().includes(q)
    );
  }, [programs, search]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [ctx, programsData, historyData] = await Promise.all([
        api.getAnalysisContext(),
        api.listPrograms(),
        api.getAnalysisHistory({ limit: 5 }),
      ]);
      setContext(ctx);
      setPrograms(programsData.programs || []);
      setHistory(historyData.analyses || []);
      if (ctx.scores?.main_score != null) {
        setMainScore(String(ctx.scores.main_score));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function toggleProgram(id) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= maxPrograms) return prev;
      return [...prev, id];
    });
  }

  async function runAnalysis() {
    if (!selectedIds.length) {
      setError('Выберите хотя бы одну программу');
      return;
    }

    setRunning(true);
    setError('');
    setResults(null);
    setAlternatives([]);

    try {
      const payload = {
        program_ids: selectedIds,
        main_score: mainScore ? Number(mainScore) : undefined,
      };
      const data = await api.runAnalysis(payload);
      setResults(data.results || []);
      setAlternatives(data.alternatives || []);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  }

  if (loading) return <p>{t('common.loading')}</p>;

  return (
    <>
      <h1>{t('analysis.title')}</h1>
      <p className="muted">{t('analysis.subtitle')}</p>

      {context?.is_trial && (
        <div className="dev-panel">
          Бесплатный режим: осталось {context.trial.remaining} из {context.trial.limit} анализов.
          {context.trial.remaining === 0 && (
            <>
              {' '}
              <Link to="/subscription">Оформить Premium</Link> или{' '}
              <Link to="/account/wallet">потратить бонусы</Link>.
            </>
          )}
        </div>
      )}

      {error && <div className="error">{error}</div>}

      <div className="card">
        <h2>1. Баллы</h2>
        <p className="muted">
          {context?.scores
            ? `Источник: ${context.scores.is_locked ? 'зафиксированные' : 'черновые'} баллы`
            : 'Сначала введите баллы в профиле'}
        </p>
        <label>
          Основной балл ОРТ
          <input
            type="number"
            value={mainScore}
            onChange={(e) => setMainScore(e.target.value)}
            style={{ display: 'block', marginTop: 4, padding: 8, width: 140 }}
          />
        </label>
        {!context?.scores && (
          <p style={{ marginTop: 8 }}>
            <Link to="/account/scores">Перейти к баллам</Link>
          </p>
        )}
      </div>

      <div className="card">
        <h2>2. {t('analysis.selectPrograms')} ({selectedIds.length}/{maxPrograms})</h2>
        <input
          type="search"
          placeholder="Поиск по вузу или программе"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', padding: 8, marginBottom: 12 }}
        />
        <div className="program-picker">
          {filteredPrograms.map((program) => {
            const checked = selectedIds.includes(program.id);
            const disabled = !checked && selectedIds.length >= maxPrograms;
            return (
              <label key={program.id} className={`program-option${checked ? ' selected' : ''}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggleProgram(program.id)}
                />
                <span>
                  <strong>{program.name}</strong>
                  <span className="muted block">
                    {program.university} · порог {program.main_score_min ?? '—'}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        <button type="button" className="btn" disabled={running} onClick={runAnalysis} style={{ marginTop: 12 }}>
          {running ? t('analysis.running') : t('analysis.run')}
        </button>
      </div>

      {results && (
        <section>
          <h2>Результаты</h2>
          {results.map((result) => (
            <ProgramResultCard key={result.specialty_id || result.specialty_name} result={result} t={t} />
          ))}
        </section>
      )}

      {alternatives.length > 0 && (
        <section>
          <h2>Альтернативы при низком шансе</h2>
          <p className="muted">Программы с более комфортным прогнозом по вашим баллам.</p>
          {alternatives.map((alt) => (
            <ProgramResultCard key={alt.specialty_id} result={alt} t={t} />
          ))}
        </section>
      )}

      {history.length > 0 && (
        <section>
          <h2>История</h2>
          <ul className="history-list">
            {history.map((item) => (
              <li key={item.id} className="card">
                <strong>{new Date(item.created_at).toLocaleString('ru-RU')}</strong>
                <span className="muted"> · {item.algorithm_version}</span>
                <p className="muted">
                  Программ: {(item.result_json?.programs || []).length}
                  {item.is_trial ? ' · trial' : ''}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
