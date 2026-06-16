import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import FavoriteButton from '../components/FavoriteButton.jsx';

export default function ProgramPage() {
  const { slug } = useParams();
  const [program, setProgram] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .getProgram(slug)
      .then((data) => {
        setProgram(data.program);
        setIsPremium(data.is_premium ?? false);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <p>Загрузка...</p>;
  if (error) return <div className="error">{error}</div>;
  if (!program) return <p>Программа не найдена</p>;

  const rule = program.programRules?.[0];
  const snapshots = rule?.passingScores || [];

  return (
    <>
      <p className="muted">
        {program.faculty?.university?.slug ? (
          <Link to={`/universities/${program.faculty.university.slug}`}>
            ← {program.faculty.university.name}
          </Link>
        ) : (
          <Link to="/universities">← Каталог</Link>
        )}
      </p>

      <h1>{program.name}</h1>
      <FavoriteButton entityType="specialty" entityId={program.id} />
      <p className="muted">
        {program.faculty?.university?.name} · {program.faculty?.name}
      </p>
      {program.profession_description && <p>{program.profession_description}</p>}

      {program.contract_cost != null && (
        <p>
          Стоимость контракта: <strong>{Number(program.contract_cost).toLocaleString('ru-RU')} сом</strong>
        </p>
      )}

      <div className="card">
        <h2>Правила поступления</h2>
        {!rule || rule.premium_locked ? (
          <p className="muted">
            Детальные пороги и предметные требования доступны в{' '}
            <Link to="/subscription">Premium</Link>.
          </p>
        ) : (
          <>
            <p>Сезон: {rule.season_year}</p>
            <p>Минимальный балл: {rule.main_score_min ?? '—'}</p>
            <p>ОРТ обязателен: {rule.ort_required ? 'да' : 'нет'}</p>
            {rule.extra_exam_required && <p className="muted">Требуется доп. экзамен</p>}
            {rule.subject_requirements_json && Object.keys(rule.subject_requirements_json).length > 0 && (
              <>
                <h3>Предметные пороги</h3>
                <ul>
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
        <div className="card">
          <h2>Исторические проходные</h2>
          <table className="data-table">
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
      )}

      <Link to="/analysis" className="btn">
        Анализировать шансы
      </Link>
    </>
  );
}
