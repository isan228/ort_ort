import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getStoredUser } from '../api/client.js';
import { useI18n } from '../i18n/I18nContext.jsx';

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

  if (loading) return <p>{t('common.loading')}</p>;

  return (
    <>
      <h1>{t('rankings.title')}</h1>
      <p className="muted">{t('rankings.subtitle')}</p>

      {error && <div className="error">{error}</div>}

      {data?.own_row && user && (
        <div className="card">
          <h2>{t('rankings.yourPosition')}</h2>
          <p>
            <strong>#{data.own_row.rank}</strong> · {data.own_row.public_label} ·{' '}
            {t('rankings.col.score')}{' '}
            {data.own_row.score_snapshot?.main_score ?? '—'}
          </p>
        </div>
      )}

      {!user && (
        <p className="muted">
          <Link to="/login">{t('nav.login')}</Link> — {t('rankings.loginHint')}
        </p>
      )}

      <div className="card">
        <h2>{t('rankings.top50')}</h2>
        {(data?.rankings || []).length === 0 ? (
          <p className="muted">{t('rankings.empty')}</p>
        ) : (
          <table className="data-table">
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
        )}
      </div>
    </>
  );
}
