import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

const PLATFORM_LABELS = {
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  other: 'Другое',
};

export default function CommunityPage() {
  const [links, setLinks] = useState([]);
  const [disclaimer, setDisclaimer] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .getTutorLinks()
      .then((data) => {
        setLinks(data.links || []);
        setDisclaimer(data.disclaimer || '');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page">
        <div className="page-inner">
          <p className="page-empty">Загрузка...</p>
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
          <p>
            Сообщества консультантов и выпускников. Перед переходом по ссылке убедитесь, что это нужная
            группа.
          </p>
        </header>

        {disclaimer && <div className="page-callout page-callout--warn">{disclaimer}</div>}
        {error && <div className="error">{error}</div>}

        {!links.length && !error ? (
          <p className="page-empty">Ссылки пока не добавлены</p>
        ) : (
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
                {link.responsible_tutor && (
                  <p>Ответственный: {link.responsible_tutor}</p>
                )}
              </a>
            ))}
          </div>
        )}

        <p className="page-breadcrumbs" style={{ marginTop: '1.5rem' }}>
          <Link to="/">На главную</Link>
        </p>
      </div>
    </div>
  );
}
