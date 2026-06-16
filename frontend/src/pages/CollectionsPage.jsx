import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

export default function CollectionsPage() {
  const [favorites, setFavorites] = useState([]);
  const [comparisons, setComparisons] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [compareName, setCompareName] = useState('Моё сравнение');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const selectedPrograms = useMemo(
    () => programs.filter((p) => selectedIds.includes(p.id)),
    [programs, selectedIds]
  );

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [favData, cmpData, progData] = await Promise.all([
        api.getFavorites(),
        api.getComparisons(),
        api.listPrograms(),
      ]);
      setFavorites(favData.favorites || []);
      setComparisons(cmpData.comparisons || []);
      setPrograms(progData.programs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function toggleProgram(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 5 ? prev : [...prev, id]
    );
  }

  async function removeFavorite(id) {
    try {
      await api.removeFavorite(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function createComparison() {
    if (selectedIds.length < 2) {
      setError('Выберите минимум 2 программы');
      return;
    }

    setCreating(true);
    setError('');
    setMessage('');
    try {
      const items = selectedPrograms.map((p) => ({
        type: 'specialty',
        id: p.id,
        slug: p.slug,
        name: p.name,
        university: p.university,
        main_score_min: p.main_score_min,
      }));
      await api.createComparison({ name: compareName, items });
      setMessage('Сравнение сохранено');
      setSelectedIds([]);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <p>Загрузка...</p>;

  return (
    <>
      <h1>Избранное и сравнение</h1>

      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}

      <section className="card">
        <h2>Избранное</h2>
        {favorites.length === 0 ? (
          <p className="muted">
            Добавляйте вузы и программы через кнопку «В избранное» в каталоге.
          </p>
        ) : (
          <ul className="plain-list">
            {favorites.map((fav) => (
              <li key={fav.id} className="list-row">
                <div>
                  <strong>{fav.entity?.name || fav.entity_id}</strong>
                  <span className="muted block">{fav.entity_type}</span>
                </div>
                <div className="list-row-actions">
                  {fav.link && (
                    <Link to={fav.link} className="btn btn-secondary">
                      Открыть
                    </Link>
                  )}
                  <button type="button" className="btn btn-secondary" onClick={() => removeFavorite(fav.id)}>
                    Удалить
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Сравнение программ</h2>
        <p className="muted">Premium или бонусный unlock. До 5 программ.</p>

        <input
          type="text"
          value={compareName}
          onChange={(e) => setCompareName(e.target.value)}
          placeholder="Название сравнения"
          style={{ width: '100%', maxWidth: 360, padding: 8, marginBottom: 12 }}
        />

        <div className="program-picker">
          {programs.map((program) => {
            const checked = selectedIds.includes(program.id);
            return (
              <label key={program.id} className={`program-option${checked ? ' selected' : ''}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleProgram(program.id)}
                />
                <span>
                  <strong>{program.name}</strong>
                  <span className="muted block">
                    {program.university} · порог {program.main_score_min ?? '—'}
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        <button
          type="button"
          className="btn"
          style={{ marginTop: 12 }}
          disabled={creating || selectedIds.length < 2}
          onClick={createComparison}
        >
          {creating ? 'Сохранение...' : `Сравнить (${selectedIds.length})`}
        </button>
      </section>

      {comparisons.length > 0 && (
        <section>
          <h2>Сохранённые сравнения</h2>
          {comparisons.map((cmp) => (
            <div key={cmp.id} className="card">
              <h3>{cmp.name}</h3>
              <p className="muted">{new Date(cmp.created_at).toLocaleString('ru-RU')}</p>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Программа</th>
                    <th>Вуз</th>
                    <th>Порог</th>
                  </tr>
                </thead>
                <tbody>
                  {(cmp.items_json || []).map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td>
                        {item.slug ? <Link to={`/programs/${item.slug}`}>{item.name}</Link> : item.name}
                      </td>
                      <td>{item.university || '—'}</td>
                      <td>{item.main_score_min ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      )}

      <p style={{ marginTop: 16 }}>
        <Link to="/account">← Кабинет</Link>
      </p>
    </>
  );
}
