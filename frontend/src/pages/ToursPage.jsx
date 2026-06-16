import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useI18n } from '../i18n/I18nContext.jsx';

export default function ToursPage() {
  const { t } = useI18n();
  const [tours, setTours] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getTours()
      .then((data) => setTours(data.tours || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>{t('common.loading')}</p>;

  return (
    <>
      <h1>{t('tours.title')}</h1>
      <div className="dev-panel">
        <strong>{t('tours.simulation')}</strong>
        <p className="muted">{t('tours.disclaimer')}</p>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="tiles">
        {tours.map((tour) => (
          <Link key={tour.id} to={`/tours/${tour.id}`} className="tile">
            <h3>{tour.name}</h3>
            <p className="muted">
              {t(`tours.status.${tour.status}`, tour.status)} ·{' '}
              {tour.slot_stats?.budget?.joined ?? 0}/{tour.slot_stats?.budget?.limit ?? '∞'} бюджет
            </p>
          </Link>
        ))}
      </div>
    </>
  );
}
