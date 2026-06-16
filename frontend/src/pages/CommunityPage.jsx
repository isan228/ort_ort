import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

export default function CommunityPage() {
  const [links, setLinks] = useState([]);
  const [disclaimer, setDisclaimer] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getTutorLinks()
      .then((data) => {
        setLinks(data.links || []);
        setDisclaimer(data.disclaimer || '');
      })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <>
      <h1>Tutor Community</h1>
      <p className="muted">
        Сообщества консультантов и выпускников. Перед переходом по ссылке убедитесь, что это нужная группа.
      </p>

      {disclaimer && <div className="dev-panel">{disclaimer}</div>}
      {error && <div className="error">{error}</div>}

      <div className="tiles">
        {links.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="tile"
          >
            <h3>{link.title}</h3>
            <p className="muted">{link.platform}</p>
            <p>{link.description}</p>
            {link.responsible_tutor && (
              <p className="muted">Ответственный: {link.responsible_tutor}</p>
            )}
          </a>
        ))}
      </div>

      {!links.length && !error && <p className="muted">Ссылки пока не добавлены</p>}

      <p style={{ marginTop: 16 }}>
        <Link to="/">На главную</Link>
      </p>
    </>
  );
}
