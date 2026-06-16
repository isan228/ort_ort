import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useI18n } from '../i18n/I18nContext.jsx';

export default function LoginPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.login({ identifier, password });
      navigate('/account/scores');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 420 }}>
      <h1>{t('login.title')}</h1>
      <form onSubmit={handleSubmit}>
        <label>
          {t('login.identifier')}
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            style={{ width: '100%', marginTop: 4, marginBottom: 12, padding: 8 }}
          />
        </label>
        <label>
          {t('login.password')}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', marginTop: 4, marginBottom: 12, padding: 8 }}
          />
        </label>
        {error && <div className="error">{error}</div>}
        <p style={{ marginBottom: 12 }}>
          <Link to="/forgot-password">{t('login.forgot')}</Link>
        </p>
        <button type="submit" className="btn" disabled={loading}>
          {loading ? t('login.submitting') : t('login.submit')}
        </button>
      </form>
      <p className="muted" style={{ marginTop: 16 }}>
        {t('login.noAccount')}{' '}
        <Link to="/register">{t('register.link')}</Link>
      </p>
    </div>
  );
}
