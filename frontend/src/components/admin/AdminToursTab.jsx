import { useState } from 'react';
import { api } from '../../api/client.js';

const TOUR_STATUSES = ['upcoming', 'open', 'closed'];
const TIMER_MODES = ['global', 'university', 'faculty', 'specialty'];

export default function AdminToursTab({ tours, onUpdated }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const emptyForm = {
    name: '',
    status: 'upcoming',
    timer_mode: 'global',
    starts_at: '',
    ends_at: '',
    budget_slots: 50,
    contract_slots: 100,
    hold_minutes: 15,
    require_verified_certificate: false,
    disclaimer: 'Симуляция, не официальная подача',
  };

  const [form, setForm] = useState(emptyForm);

  function loadTour(tour) {
    const s = tour.settings_json || {};
    setEditingId(tour.id);
    setForm({
      name: tour.name,
      status: tour.status,
      timer_mode: tour.timer_mode,
      starts_at: tour.starts_at ? tour.starts_at.slice(0, 16) : '',
      ends_at: tour.ends_at ? tour.ends_at.slice(0, 16) : '',
      budget_slots: s.budget_slots ?? 50,
      contract_slots: s.contract_slots ?? 100,
      hold_minutes: s.hold_minutes ?? 15,
      require_verified_certificate: Boolean(s.require_verified_certificate),
      disclaimer: s.disclaimer || '',
    });
  }

  async function save() {
    setBusy(true);
    setError('');
    try {
      const body = {
        name: form.name,
        status: form.status,
        timer_mode: form.timer_mode,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        settings_json: {
          simulation_only: true,
          disclaimer: form.disclaimer,
          budget_slots: Number(form.budget_slots),
          contract_slots: Number(form.contract_slots),
          hold_minutes: Number(form.hold_minutes),
          require_verified_certificate: form.require_verified_certificate,
        },
      };

      if (editingId) {
        await api.adminUpdateTour(editingId, body);
      } else {
        await api.adminCreateTour(body);
      }

      setEditingId(null);
      setForm(emptyForm);
      onUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {error && <div className="error">{error}</div>}

      <div className="card">
        <h2>{editingId ? 'Редактировать тур' : 'Новый тур'}</h2>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Название
          <input
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <label>
            Статус
            <select
              style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {TOUR_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Timer mode
            <select
              style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
              value={form.timer_mode}
              onChange={(e) => setForm({ ...form, timer_mode: e.target.value })}
            >
              {TIMER_MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <label>
            Начало
            <input
              type="datetime-local"
              style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
              value={form.starts_at}
              onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
            />
          </label>
          <label>
            Конец
            <input
              type="datetime-local"
              style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
              value={form.ends_at}
              onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
            />
          </label>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
          <label>
            Бюджет слотов
            <input
              type="number"
              style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
              value={form.budget_slots}
              onChange={(e) => setForm({ ...form, budget_slots: e.target.value })}
            />
          </label>
          <label>
            Контракт слотов
            <input
              type="number"
              style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
              value={form.contract_slots}
              onChange={(e) => setForm({ ...form, contract_slots: e.target.value })}
            />
          </label>
          <label>
            Hold (мин)
            <input
              type="number"
              style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
              value={form.hold_minutes}
              onChange={(e) => setForm({ ...form, hold_minutes: e.target.value })}
            />
          </label>
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <input
            type="checkbox"
            checked={form.require_verified_certificate}
            onChange={(e) => setForm({ ...form, require_verified_certificate: e.target.checked })}
          />
          Требовать verified сертификат
        </label>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Disclaimer
          <input
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
            value={form.disclaimer}
            onChange={(e) => setForm({ ...form, disclaimer: e.target.value })}
          />
        </label>
        <div className="admin-actions">
          <button type="button" className="btn" disabled={busy} onClick={save}>
            {editingId ? 'Сохранить' : 'Создать тур'}
          </button>
          {editingId && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              Отмена
            </button>
          )}
        </div>
      </div>

      <h2>Список туров</h2>
      {tours.map((tour) => (
        <div key={tour.id} className="card admin-card">
          <h3>{tour.name}</h3>
          <p className="muted">
            {tour.status} · {tour.timer_mode} · слоты: бюджет{' '}
            {tour.settings_json?.budget_slots ?? '—'} / контракт{' '}
            {tour.settings_json?.contract_slots ?? '—'}
          </p>
          <button type="button" className="btn btn-secondary" onClick={() => loadTour(tour)}>
            Редактировать
          </button>
        </div>
      ))}
      {!tours.length && <p className="muted">Туров пока нет.</p>}
    </>
  );
}
