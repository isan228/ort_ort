import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useI18n } from '../i18n/I18nContext.jsx';
import PasswordInput from '../components/ux/PasswordInput.jsx';
import { useToast } from '../components/ux/ToastContext.jsx';

export default function ResetPasswordPage() {
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) {
      setError(t('auth.reset.mismatch'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.resetPassword({ token, new_password: password });
      toast.success(t('auth.reset.success'));
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-logo">
          ORT.KG
        </Link>
        <h1>{t('auth.reset.title')}</h1>
        <p className="auth-subtitle">{t('auth.reset.subtitle')}</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>{t('auth.reset.token')}</span>
            <input
              className="auth-input"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
          </label>
          <label className="auth-field">
            <span>{t('auth.reset.newPassword')}</span>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <label className="auth-field">
            <span>{t('auth.reset.confirmPassword')}</span>
            <PasswordInput
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          {error && <div className="error">{error}</div>}
          <button type="submit" className="btn auth-submit" disabled={loading}>
            {loading ? t('common.loading') : t('auth.reset.submit')}
          </button>
        </form>
        <p className="auth-footer">
          <Link to="/login">{t('login.submit')}</Link>
        </p>
      </div>
    </div>
  );
}
