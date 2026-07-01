import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, isAuthenticated } from '../api/client.js';
import { useI18n } from '../i18n/I18nContext.jsx';
import { useFeatureAccess } from '../hooks/useFeatureAccess.js';

const PLATFORM_LABELS = {
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  other: 'Другое',
};

export default function CommunityPage() {
  const { t } = useI18n();
  const { has_full_access, loading: accessLoading, loggedIn } = useFeatureAccess();
  const [links, setLinks] = useState([]);
  const [disclaimer, setDisclaimer] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (accessLoading) return undefined;

    if (!loggedIn || !has_full_access) {
      setLinks([]);
      setDisclaimer('');
      setError('');
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    api
      .getTutorLinks()
      .then((data) => {
        if (cancelled) return;
        setLinks(data.links || []);
        setDisclaimer(data.disclaimer || '');
      })
      .catch((err) => {
        if (cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessLoading, loggedIn, has_full_access]);

  if (loading || accessLoading) {
    return (
      <div className="page">
        <div className="page-inner">
          <p className="page-empty">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-inner">
        <p className="page-breadcrumbs">
          <Link to="/">Главная</Link> &gt; Tutor Community
        </p>

        <header className="page-head">
          <h1>Tutor Community</h1>
          <p>{t('community.subtitle')}</p>
        </header>

        {!isAuthenticated() && (
          <div className="page-callout">
            <Link to="/register">{t('nav.register')}</Link> — {t('community.blocked.register')}
          </div>
        )}

        {loggedIn && !has_full_access && (
          <div className="page-callout">
            {t('community.blocked.subscription')}{' '}
            <Link to="/subscription">{t('analysis.blocked.subscriptionLink')}</Link>
          </div>
        )}

        {disclaimer && <div className="page-callout page-callout--warn">{disclaimer}</div>}
        {error && <div className="error">{error}</div>}

        {has_full_access && !links.length && !error ? (
          <p className="page-empty">{t('community.empty')}</p>
        ) : (
          has_full_access && (
            <div className="page-grid">
              {links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="page-grid-card"
                >
                  <span className="page-badge">{PLATFORM_LABELS[link.platform] || link.platform}</span>
                  <h3>{link.title}</h3>
                  {link.description && <p>{link.description}</p>}
                  {link.responsible_tutor && <p>Ответственный: {link.responsible_tutor}</p>}
                </a>
              ))}
            </div>
          )
        )}

        <p className="page-breadcrumbs" style={{ marginTop: '1.5rem' }}>
          <Link to="/">На главную</Link>
        </p>
      </div>
    </div>
  );
}
