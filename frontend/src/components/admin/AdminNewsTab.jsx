import { useState } from 'react';
import { api } from '../../api/client.js';

export default function AdminNewsTab({ articles, onUpdated }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const emptyForm = {
    slug: '',
    title: '',
    excerpt: '',
    body: '',
    category: 'announcement',
    status: 'draft',
  };

  const [form, setForm] = useState(emptyForm);

  function loadArticle(article) {
    setEditingId(article.id);
    setForm({
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt || '',
      body: article.body,
      category: article.category || '',
      status: article.status,
    });
  }

  async function save() {
    setBusy(true);
    setError('');
    try {
      if (editingId) {
        await api.adminUpdateNews(editingId, form);
      } else {
        await api.adminCreateNews(form);
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

  async function togglePublish(article) {
    setBusy(true);
    setError('');
    try {
      await api.adminUpdateNews(article.id, {
        status: article.status === 'published' ? 'draft' : 'published',
      });
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
        <h2>{editingId ? 'Редактировать новость' : 'Новая статья'}</h2>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Slug
          <input
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Заголовок
          <input
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Краткое описание
          <input
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
            value={form.excerpt}
            onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Категория
          <input
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Тело (HTML)
          <textarea
            rows={6}
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Статус
          <select
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="draft">draft</option>
            <option value="published">published</option>
          </select>
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
                setForm(emptyForm);
              }}
            >
              Отмена
            </button>
          )}
        </div>
      </div>

      <h2>Все статьи</h2>
      {articles.map((article) => (
        <div key={article.id} className="card admin-card">
          <h3>{article.title}</h3>
          <p className="muted">
            {article.slug} · {article.status} · {article.category || '—'}
          </p>
          <div className="admin-actions">
            <button type="button" className="btn btn-secondary" onClick={() => loadArticle(article)}>
              Редактировать
            </button>
            <button type="button" className="btn" disabled={busy} onClick={() => togglePublish(article)}>
              {article.status === 'published' ? 'Снять с публикации' : 'Опубликовать'}
            </button>
          </div>
        </div>
      ))}
      {!articles.length && <p className="muted">Статей пока нет.</p>}
    </>
  );
}
