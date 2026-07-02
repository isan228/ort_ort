import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import FavoriteButton from '../components/FavoriteButton.jsx';
import UniLogo from '../components/UniLogo.jsx';
import PageLoader from '../components/ux/PageLoader.jsx';
import EmptyState from '../components/ux/EmptyState.jsx';
import ErrorState from '../components/ux/ErrorState.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';

function typeBadgeClass(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('част')) return 'universities-type-badge--private';
  if (t.includes('межд')) return 'universities-type-badge--intl';
  return '';
}

export default function UniversityPage() {
  const { t } = useI18n();
  const { slug } = useParams();
  const [university, setUniversity] = useState(null);
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
      .getUniversity(slug)
      .then((data) => {
        setUniversity(data.university);
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

  if (!university) {
    return (
      <div className="universities-page">
        <div className="universities-page-inner">
          <EmptyState
            icon="🏛"
            title={t('ux.empty.notFound')}
            description="Такого вуза нет в каталоге."
            actionLabel={t('ux.empty.toCatalog')}
            actionTo="/universities"
          />
        </div>
      </div>
    );
  }

  const programCount = (university.faculties || []).reduce(
    (sum, f) => sum + (f.specialties?.length || 0),
    0
  );

  return (
    <div className="universities-page">
      <div className="universities-page-inner">
        <p className="universities-breadcrumbs">
          <Link to="/">Главная</Link> &gt; <Link to="/universities">Вузы</Link> &gt; {university.name}
        </p>

        <div className="uni-detail-hero">
          <UniLogo name={university.name} logoUrl={university.logo_url} size={64} className="uni-detail-logo" />
          <div className="uni-detail-head">
            <h1>{university.name}</h1>
            <div className="universities-meta-row">
              {university.city && (
                <span className="universities-meta-item">
                  <strong>{university.city}</strong>
                </span>
              )}
              {university.type && (
                <span className={`universities-type-badge ${typeBadgeClass(university.type)}`}>
                  {university.type}
                </span>
              )}
              <span className="universities-meta-item">{programCount} программ</span>
            </div>
            {university.description && <p style={{ margin: '0.75rem 0 0', color: '#475569' }}>{university.description}</p>}
            <div className="uni-detail-actions">
              <FavoriteButton entityType="university" entityId={university.id} />
              {university.official_site && (
                <a href={university.official_site} target="_blank" rel="noreferrer" className="btn btn-secondary">
                  Официальный сайт
                </a>
              )}
            </div>
          </div>
        </div>

        {!isPremium && (
          <div className="page-callout page-callout--warn">
            Базовый просмотр. Проходные баллы и детальные правила — в{' '}
            <Link to="/subscription">Premium</Link>.
          </div>
        )}

        <header className="universities-page-head">
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Факультеты и программы</h2>
        </header>

        {(university.faculties || []).length === 0 ? (
          <EmptyState
            icon="📚"
            title="Факультеты пока не добавлены"
            description="Загляните позже или выберите другой вуз."
            actionLabel={t('ux.empty.toCatalog')}
            actionTo="/universities"
          />
        ) : (
          <div className="uni-faculty-grid">
            {(university.faculties || []).map((faculty) => (
              <article key={faculty.id} className="uni-faculty-card">
                <h3>{faculty.name}</h3>
                {faculty.description && <p className="muted">{faculty.description}</p>}
                {(faculty.specialties || []).length > 0 ? (
                  <ul className="uni-program-list">
                    {faculty.specialties.map((spec) => (
                      <li key={spec.id}>
                        <Link to={`/programs/${spec.slug}`}>{spec.name}</Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">Программы пока не добавлены</p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
