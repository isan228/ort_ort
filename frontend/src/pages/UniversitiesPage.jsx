import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getStoredUser } from '../api/client.js';
import { useI18n } from '../i18n/I18nContext.jsx';

export default function UniversitiesPage() {
  const { t } = useI18n();
  const [universities, setUniversities] = useState([]);
  const [isPremium, setIsPremium] = useState(false);
  const [error, setError] = useState('');
  const user = getStoredUser();

  useEffect(() => {
    api
      .getUniversities()
      .then((data) => {
        setUniversities(data.universities || []);
        setIsPremium(data.is_premium ?? data.isPremium ?? false);
      })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <>
      <h1>{t('universities.title')}</h1>
      {!isPremium && (
        <p className="muted">
          {t('universities.premiumHint')}{' '}
          <Link to="/subscription">Premium</Link>.
        </p>
      )}
      {error && <div className="error">{error}</div>}
      <div className="tiles">
        {universities.map((uni) => (
          <Link key={uni.id} to={`/universities/${uni.slug}`} className="tile">
            <h3>{uni.name}</h3>
            <p className="muted">{uni.city}</p>
          </Link>
        ))}
      </div>
      {!user && (
        <p className="muted" style={{ marginTop: 16 }}>
          {t('universities.loginHint')}{' '}
          <Link to="/login">{t('nav.login')}</Link>
        </p>
      )}
    </>
  );
}
