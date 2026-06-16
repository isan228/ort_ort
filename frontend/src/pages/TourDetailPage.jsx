import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, getStoredUser } from '../api/client.js';

const SLOT_LABELS = {
  budget: 'Бюджет',
  contract: 'Контракт',
};

export default function TourDetailPage() {
  const { id } = useParams();
  const user = getStoredUser();
  const [tour, setTour] = useState(null);
  const [slotType, setSlotType] = useState('budget');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getTour(id);
      setTour(data.tour);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleJoin() {
    setActing(true);
    setError('');
    setMessage('');
    try {
      const result = await api.joinTour(id, slotType);
      setMessage(
        result.hold_expires_at
          ? `Вы в туре. Место удерживается до ${new Date(result.hold_expires_at).toLocaleTimeString('ru-RU')}`
          : 'Вы успешно присоединились к туру'
      );
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActing(false);
    }
  }

  async function handleWithdraw() {
    setActing(true);
    setError('');
    setMessage('');
    try {
      await api.withdrawTour(id);
      setMessage('Вы вышли из тура');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActing(false);
    }
  }

  if (loading) return <p>Загрузка...</p>;
  if (!tour) return <p>Тур не найден</p>;

  const joined = Boolean(tour.own_participation);
  const stats = tour.slot_stats;

  return (
    <>
      <p className="muted">
        <Link to="/tours">← Все туры</Link>
      </p>

      <h1>{tour.name}</h1>
      <p className="muted">Статус: {tour.status}</p>

      <div className="dev-panel">
        <strong>{tour.simulation_only ? 'Симуляция' : 'Тур'}</strong>
        <p className="muted">{tour.disclaimer}</p>
      </div>

      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}

      {stats && (
        <div className="card">
          <h2>Слоты</h2>
          <div className="tiles">
            <div className="tile">
              <h3>Бюджет</h3>
              <p>
                {stats.budget.joined}
                {stats.budget.limit != null ? ` / ${stats.budget.limit}` : ''} занято
              </p>
              {stats.budget.available != null && (
                <p className="muted">Свободно: {stats.budget.available}</p>
              )}
            </div>
            <div className="tile">
              <h3>Контракт</h3>
              <p>
                {stats.contract.joined}
                {stats.contract.limit != null ? ` / ${stats.contract.limit}` : ''} занято
              </p>
              {stats.contract.available != null && (
                <p className="muted">Свободно: {stats.contract.available}</p>
              )}
            </div>
          </div>
          {stats.hold_minutes > 0 && (
            <p className="muted">Удержание места после входа: {stats.hold_minutes} мин.</p>
          )}
          {stats.require_verified_certificate && (
            <p className="muted">Требуется подтверждённый сертификат.</p>
          )}
        </div>
      )}

      {user && tour.status === 'open' && !joined && (
        <div className="card">
          <h2>Участие</h2>
          <p className="muted">Нужны зафиксированные баллы и Premium / бонусный unlock.</p>
          <div style={{ marginBottom: 12 }}>
            <label>
              <input
                type="radio"
                name="slot"
                value="budget"
                checked={slotType === 'budget'}
                onChange={() => setSlotType('budget')}
              />{' '}
              Бюджетный слот
            </label>
            <label style={{ marginLeft: 16 }}>
              <input
                type="radio"
                name="slot"
                value="contract"
                checked={slotType === 'contract'}
                onChange={() => setSlotType('contract')}
              />{' '}
              Контрактный слот
            </label>
          </div>
          <button type="button" className="btn" disabled={acting} onClick={handleJoin}>
            {acting ? 'Вход...' : 'Присоединиться'}
          </button>
        </div>
      )}

      {joined && (
        <div className="card">
          <h2>Ваше участие</h2>
          <p>
            Слот: {SLOT_LABELS[tour.own_participation.slot_type] || tour.own_participation.slot_type}
          </p>
          <p>Балл в туре: {tour.own_participation.score_snapshot?.main_score ?? '—'}</p>
          {tour.own_rank && (
            <p>
              Место в рейтинге тура: <strong>#{tour.own_rank.rank}</strong>
            </p>
          )}
          {tour.hold_active && (
            <p className="muted">
              Удержание до {new Date(tour.hold_expires_at).toLocaleTimeString('ru-RU')} — выход временно
              недоступен.
            </p>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            disabled={acting || tour.hold_active}
            onClick={handleWithdraw}
          >
            Выйти из тура
          </button>
        </div>
      )}

      {!user && tour.status === 'open' && (
        <p className="muted">
          <Link to="/login">Войдите</Link>, чтобы участвовать.
        </p>
      )}

      <div className="card">
        <h2>Рейтинг тура (топ-30)</h2>
        {(tour.rankingEntries || []).length === 0 ? (
          <p className="muted">Пока нет участников.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Участник</th>
                <th>Балл</th>
                <th>Слот</th>
              </tr>
            </thead>
            <tbody>
              {tour.rankingEntries.map((row) => (
                <tr key={row.id}>
                  <td>{row.rank}</td>
                  <td>{row.public_label}</td>
                  <td>{row.score_snapshot?.main_score ?? '—'}</td>
                  <td>{SLOT_LABELS[row.score_snapshot?.slot_type] || row.score_snapshot?.slot_type || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
