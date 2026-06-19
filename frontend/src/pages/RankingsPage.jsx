import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getStoredUser } from '../api/client.js';
import { useI18n } from '../i18n/I18nContext.jsx';
import PageLoader from '../components/ux/PageLoader.jsx';
import EmptyState from '../components/ux/EmptyState.jsx';
import PageHint from '../components/ux/PageHint.jsx';

export default function RankingsPage() {
  const { t } = useI18n();
  const user = getStoredUser();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getRanking({ limit: 50 })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page">
        <div className="page-inner">
          <PageLoader label={t('common.loading')} />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-inner">
        <p className="page-breadcrumbs">
          <Link to="/">Главная</Link> &gt; {t('rankings.title')}
        </p>

        <header className="page-head">
          <h1>{t('rankings.title')}</h1>
          <p>{t('rankings.subtitle')}</p>
        </header>

        <PageHint hintId="rankings" title={t('ux.hint.rankings.title')}>
          {t('ux.hint.rankings.text')}
        </PageHint>

        {error && <div className="error">{error}</div>}

        {data?.own_row && user && (
          <div className="page-stats-row">
            <div className="page-stat-card">
              <div className="page-stat-icon">#</div>
              <div>
                <strong>{data.own_row.rank}</strong>
                <span>{t('rankings.yourPosition')}</span>
              </div>
            </div>
            <div className="page-stat-card">
              <div className="page-stat-icon">★</div>
              <div>
                <strong>{data.own_row.public_label}</strong>
                <span>{t('rankings.col.participant')}</span>
              </div>
            </div>
            <div className="page-stat-card">
              <div className="page-stat-icon">↑</div>
              <div>
                <strong>{data.own_row.score_snapshot?.main_score ?? '—'}</strong>
                <span>{t('rankings.col.score')}</span>
              </div>
            </div>
          </div>
        )}

        {!user && (
          <div className="page-callout">
            <Link to="/login">{t('nav.login')}</Link> — {t('rankings.loginHint')}
          </div>
        )}

        <div className="page-card">
          <h2>{t('rankings.top50')}</h2>
          {(data?.rankings || []).length === 0 ? (
            <EmptyState
              icon="🏆"
              title={t('rankings.empty')}
              description={user ? t('account.noAnalysis') : t('rankings.loginHint')}
              actionLabel={user ? t('ux.empty.toScores') : t('ux.empty.toLogin')}
              actionTo={user ? '/account/scores' : '/login'}
              secondaryLabel={user ? t('ux.empty.toAnalysis') : t('ux.empty.toRegister')}
              secondaryTo={user ? '/analysis' : '/register'}
            />
          ) : (
            <div className="page-table-wrap">
              <table className="page-table">
                <thead>
                  <tr>
                    <th>{t('rankings.col.rank')}</th>
                    <th>{t('rankings.col.participant')}</th>
                    <th>{t('rankings.col.score')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rankings.map((row) => (
                    <tr key={row.id} className={data.own_row?.id === row.id ? 'row-own' : ''}>
                      <td>{row.rank}</td>
                      <td>{row.public_label}</td>
                      <td>{row.score_snapshot?.main_score ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
