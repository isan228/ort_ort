import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import FavoriteButton from '../components/FavoriteButton.jsx';
import PageLoader from '../components/ux/PageLoader.jsx';
import EmptyState from '../components/ux/EmptyState.jsx';
import ErrorState from '../components/ux/ErrorState.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';

export default function ProgramPage() {
  const { t } = useI18n();
  const { slug } = useParams();
  const [program, setProgram] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  function load() {
    setLoading(true);
    setError('');
    api
      .getProgram(slug)
      .then((data) => {
        setProgram(data.program);
        setIsPremium(data.is_premium ?? false);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  if (loading) {
    return (
      <div className="universities-page">
        <div className="universities-page-inner">
          <PageLoader />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="universities-page">
        <div className="universities-page-inner">
          <ErrorState message={error} onRetry={load} />
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="universities-page">
        <div className="universities-page-inner">
          <EmptyState
            icon="📖"
            title={t('ux.empty.notFound')}
            description="Такой программы нет в каталоге."
            actionLabel={t('ux.empty.toCatalog')}
            actionTo="/universities"
          />
        </div>
      </div>
    );
  }

  const rule = program.programRules?.[0];
  const snapshots = rule?.passingScores || [];
  const uni = program.faculty?.university;

  return (
    <div className="universities-page">
      <div className="universities-page-inner">
        <p className="universities-breadcrumbs">
          <Link to="/">Главная</Link> &gt; <Link to="/universities">Вузы</Link>
          {uni?.slug ? (
            <>
              {' '}
              &gt; <Link to={`/universities/${uni.slug}`}>{uni.name}</Link>
            </>
          ) : null}{' '}
          &gt; {program.name}
        </p>

        <div className="uni-detail-hero">
          <div className="uni-detail-head">
            <h1>{program.name}</h1>
            <div className="universities-meta-row">
              {uni?.name && <span className="universities-meta-item">{uni.name}</span>}
              {program.faculty?.name && (
                <span className="universities-meta-item">{program.faculty.name}</span>
              )}
            </div>
            {program.profession_description && (
              <p style={{ margin: '0.75rem 0 0', color: '#475569' }}>{program.profession_description}</p>
            )}
            <div className="uni-detail-actions">
              <FavoriteButton entityType="specialty" entityId={program.id} />
              <Link to="/analysis" className="btn">
                Анализировать шансы
              </Link>
            </div>
          </div>
        </div>

        {program.contract_cost != null && (
          <div className="page-stats-row">
            <div className="page-stat-card">
              <div className="page-stat-icon">₽</div>
              <div>
                <strong>{Number(program.contract_cost).toLocaleString('ru-RU')}</strong>
                <span>Стоимость контракта (сом)</span>
              </div>
            </div>
          </div>
        )}

        <div className="page-card">
          <h2>Правила поступления</h2>
          {!rule || rule.premium_locked ? (
            <div className="page-callout">
              Детальные пороги и предметные требования доступны в{' '}
              <Link to="/subscription">Premium</Link>.
            </div>
          ) : (
            <>
              <div className="uni-rules-grid">
                <div className="uni-rule-item">
                  <span>Сезон</span>
                  <strong>{rule.season_year}</strong>
                </div>
                <div className="uni-rule-item">
                  <span>Минимальный балл</span>
                  <strong>{rule.main_score_min ?? '—'}</strong>
                </div>
                <div className="uni-rule-item">
                  <span>ОРТ обязателен</span>
                  <strong>{rule.ort_required ? 'Да' : 'Нет'}</strong>
                </div>
                {rule.extra_exam_required && (
                  <div className="uni-rule-item">
                    <span>Доп. экзамен</span>
                    <strong>Требуется</strong>
                  </div>
                )}
              </div>
              {rule.subject_requirements_json &&
                Object.keys(rule.subject_requirements_json).length > 0 && (
                  <>
                    <h3 style={{ fontSize: '0.95rem', margin: '1rem 0 0.5rem' }}>Предметные пороги</h3>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem' }}>
                      {Object.entries(rule.subject_requirements_json).map(([key, value]) => (
                        <li key={key}>
                          {key}: {value}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
            </>
          )}
        </div>

        {isPremium && snapshots.length > 0 && (
          <div className="page-card">
            <h2>Исторические проходные</h2>
            <div className="page-table-wrap">
              <table className="page-table">
                <thead>
                  <tr>
                    <th>Год</th>
                    <th>Бюджет</th>
                    <th>Контракт</th>
                    <th>Места (б/к)</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map((snap) => (
                    <tr key={snap.id || snap.year}>
                      <td>{snap.year}</td>
                      <td>{snap.budget_cutoff ?? '—'}</td>
                      <td>{snap.contract_cutoff ?? '—'}</td>
                      <td>
                        {snap.seats_budget ?? '—'} / {snap.seats_contract ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
