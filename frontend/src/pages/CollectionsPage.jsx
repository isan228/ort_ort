import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { AccountAlerts, AccountPageWrap, AccountPanel } from '../components/account/AccountSection.jsx';

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

  if (loading) return <p className="account-loading">Загрузка...</p>;

  return (
    <AccountPageWrap title="Избранное и сравнение" subtitle="Сохраняйте вузы и сравнивайте программы">
      <AccountAlerts error={error} message={message} />

      <AccountPanel title="Избранное">
        {favorites.length === 0 ? (
          <p className="account-muted-line">
            Добавляйте вузы и программы через кнопку «В избранное» в каталоге.
          </p>
        ) : (
          <ul className="account-list-rows">
            {favorites.map((fav) => (
              <li key={fav.id} className="account-list-row">
                <div>
                  <strong>{fav.entity?.name || fav.entity_id}</strong>
                  <span className="account-muted-line">{fav.entity_type}</span>
                </div>
                <div className="account-btn-row">
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
      </AccountPanel>

      <AccountPanel title="Сравнение программ">
        <p className="account-muted-line">Premium или бонусный unlock. До 5 программ.</p>

        <label className="account-field">
          <span>Название сравнения</span>
          <input
            type="text"
            className="account-input"
            value={compareName}
            onChange={(e) => setCompareName(e.target.value)}
          />
        </label>

        <div className="account-program-picker">
          {programs.map((program) => {
            const checked = selectedIds.includes(program.id);
            return (
              <label key={program.id} className={`account-program-option${checked ? ' selected' : ''}`}>
                <input type="checkbox" checked={checked} onChange={() => toggleProgram(program.id)} />
                <span>
                  <strong>{program.name}</strong>
                  <span className="account-muted-line">
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
          disabled={creating || selectedIds.length < 2}
          onClick={createComparison}
        >
          {creating ? 'Сохранение...' : `Сравнить (${selectedIds.length})`}
        </button>
      </AccountPanel>

      {comparisons.length > 0 && (
        <AccountPanel title="Сохранённые сравнения">
          {comparisons.map((cmp) => (
            <div key={cmp.id} className="account-compare-block">
              <h4>{cmp.name}</h4>
              <p className="account-muted-line">{new Date(cmp.created_at).toLocaleString('ru-RU')}</p>
              <table className="account-table">
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
        </AccountPanel>
      )}
    </AccountPageWrap>
  );
}
