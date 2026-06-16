import { useState } from 'react';
import { api } from '../../api/client.js';

export default function AdminFaqTab({ items, onUpdated }) {
  const [form, setForm] = useState({
    category: 'general',
    locale: 'ru',
    question: '',
    answer: '',
    sort_order: 0,
    is_published: true,
  });
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function loadItem(item) {
    setEditingId(item.id);
    setForm({
      category: item.category || 'general',
      locale: item.locale,
      question: item.question,
      answer: item.answer,
      sort_order: item.sort_order || 0,
      is_published: item.is_published,
    });
  }

  async function save() {
    setBusy(true);
    setError('');
    try {
      if (editingId) {
        await api.adminUpdateFaq(editingId, form);
      } else {
        await api.adminCreateFaq(form);
      }
      setEditingId(null);
      setForm({
        category: 'general',
        locale: 'ru',
        question: '',
        answer: '',
        sort_order: 0,
        is_published: true,
      });
      onUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function unpublish(id) {
    setBusy(true);
    setError('');
    try {
      await api.adminDeleteFaq(id);
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
        <h2>{editingId ? 'Редактировать FAQ' : 'Новый FAQ'}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
          <label>
            Категория
            <input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
            />
          </label>
          <label>
            Язык
            <select
              value={form.locale}
              onChange={(e) => setForm({ ...form, locale: e.target.value })}
              style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
            >
              <option value="ru">ru</option>
              <option value="ky">ky</option>
            </select>
          </label>
          <label>
            Порядок
            <input
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
              style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
            />
          </label>
        </div>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Вопрос
          <input
            value={form.question}
            onChange={(e) => setForm({ ...form, question: e.target.value })}
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Ответ (HTML)
          <textarea
            rows={5}
            value={form.answer}
            onChange={(e) => setForm({ ...form, answer: e.target.value })}
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
          />
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <input
            type="checkbox"
            checked={form.is_published}
            onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
          />
          Опубликован
        </label>
        <div className="admin-actions">
          <button type="button" className="btn" disabled={busy} onClick={save}>
            {editingId ? 'Сохранить' : 'Создать'}
          </button>
          {editingId && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setEditingId(null);
                setForm({
                  category: 'general',
                  locale: 'ru',
                  question: '',
                  answer: '',
                  sort_order: 0,
                  is_published: true,
                });
              }}
            >
              Отмена
            </button>
          )}
        </div>
      </div>

      <h2>Все вопросы ({items.length})</h2>
      {items.map((item) => (
        <div key={item.id} className="card admin-card">
          <h3>
            [{item.locale}] {item.question}
          </h3>
          <p className="muted">
            {item.category} · {item.is_published ? 'published' : 'hidden'} · #{item.sort_order}
          </p>
          <div className="admin-actions">
            <button type="button" className="btn btn-secondary" onClick={() => loadItem(item)}>
              Редактировать
            </button>
            {item.is_published && (
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => unpublish(item.id)}>
                Скрыть
              </button>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
