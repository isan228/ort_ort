import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import FavoriteButton from '../components/FavoriteButton.jsx';

export default function UniversityPage() {
  const { slug } = useParams();
  const [university, setUniversity] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .getUniversity(slug)
      .then((data) => {
        setUniversity(data.university);
        setIsPremium(data.is_premium ?? false);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <p>Загрузка...</p>;
  if (error) return <div className="error">{error}</div>;
  if (!university) return <p>Вуз не найден</p>;

  return (
    <>
      <p className="muted">
        <Link to="/universities">← Каталог вузов</Link>
      </p>
      <h1>{university.name}</h1>
      <FavoriteButton entityType="university" entityId={university.id} />
      <p className="muted">
        {university.city} · {university.type}
      </p>
      {university.description && <p>{university.description}</p>}
      {university.official_site && (
        <p>
          <a href={university.official_site} target="_blank" rel="noreferrer">
            Официальный сайт
          </a>
        </p>
      )}

      {!isPremium && (
        <div className="dev-panel">
          Базовый просмотр. Проходные баллы и детальные правила — в{' '}
          <Link to="/subscription">Premium</Link>.
        </div>
      )}

      <h2>Факультеты</h2>
      <div className="tiles">
        {(university.faculties || []).map((faculty) => (
          <div key={faculty.id} className="tile card">
            <h3>{faculty.name}</h3>
            {faculty.description && <p className="muted">{faculty.description}</p>}
            {(faculty.specialties || []).length > 0 ? (
              <ul>
                {faculty.specialties.map((spec) => (
                  <li key={spec.id}>
                    <Link to={`/programs/${spec.slug}`}>{spec.name}</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Программы пока не добавлены</p>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
