import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

const DOC_TYPES = [
  { type: 'privacy', label: 'Политика конфиденциальности' },
  { type: 'terms', label: 'Пользовательское соглашение' },
  { type: 'offer', label: 'Публичная оферта' },
];

const LOCALES = [
  { code: 'ru', label: 'Русский' },
  { code: 'ky', label: 'Кыргызча' },
];

export default function AdminLegalTab({ documents, onUpdated }) {
  const [docType, setDocType] = useState('privacy');
  const [locale, setLocale] = useState('ru');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const doc = documents?.[docType]?.[locale];
    setTitle(doc?.title || '');
    setBody(doc?.body || '');
  }, [documents, docType, locale]);

  async function save() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api.adminUpdateLegal(docType, locale, { title, body });
      setMessage('Документ сохранён');
      onUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {message && <div className="success">{message}</div>}
      {error && <div className="error">{error}</div>}

      <div className="card">
        <h2>Юридические документы</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          <label>
            Документ
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
            >
              {DOC_TYPES.map((d) => (
                <option key={d.type} value={d.type}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Язык
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
            >
              {LOCALES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Заголовок
          <input
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Тело (HTML)
          <textarea
            rows={10}
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
        <button type="button" className="btn" disabled={busy} onClick={save}>
          Сохранить документ
        </button>
        <p className="muted" style={{ marginTop: 12 }}>
          Публичная страница: /legal/{docType}
        </p>
      </div>
    </>
  );
}
