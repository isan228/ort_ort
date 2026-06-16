import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useI18n } from '../i18n/I18nContext.jsx';

export default function ResetPasswordPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) {
      setError(t('auth.reset.mismatch'));
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await api.resetPassword({ token, new_password: password });
      setMessage(t('auth.reset.success'));
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <h1>{t('auth.reset.title')}</h1>
      <p className="muted">{t('auth.reset.subtitle')}</p>
      <form onSubmit={handleSubmit}>
        <label>
          {t('auth.reset.token')}
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
            style={{ width: '100%', marginTop: 4, marginBottom: 12, padding: 8 }}
          />
        </label>
        <label>
          {t('auth.reset.newPassword')}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            style={{ width: '100%', marginTop: 4, marginBottom: 12, padding: 8 }}
          />
        </label>
        <label>
          {t('auth.reset.confirmPassword')}
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            style={{ width: '100%', marginTop: 4, marginBottom: 12, padding: 8 }}
          />
        </label>
        {error && <div className="error">{error}</div>}
        {message && <div className="success">{message}</div>}
        <button type="submit" className="btn" disabled={loading}>
          {loading ? t('common.loading') : t('auth.reset.submit')}
        </button>
      </form>
      <p className="muted" style={{ marginTop: 16 }}>
        <Link to="/login">{t('login.submit')}</Link>
      </p>
    </div>
  );
}
