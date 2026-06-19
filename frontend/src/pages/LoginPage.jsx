import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useI18n } from '../i18n/I18nContext.jsx';
import PasswordInput from '../components/ux/PasswordInput.jsx';
import { useToast } from '../components/ux/ToastContext.jsx';

function safeReturnTo(path) {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return '/account';
  return path;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get('returnTo'));
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
      navigate(returnTo, { replace: true });
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
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
        <h1>{t('login.title')}</h1>
        <p className="auth-subtitle">{t('home.heroSubtitle')}</p>
        {searchParams.get('returnTo') && (
          <p className="auth-return-hint">{t('ux.loginToContinue')}</p>
        )}
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>{t('login.identifier')}</span>
            <input
              className="auth-input"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoComplete="username"
            />
          </label>
          <label className="auth-field">
            <span>{t('login.password')}</span>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          <div className="auth-link-row">
            <span />
            <Link to="/forgot-password">{t('login.forgot')}</Link>
          </div>
          {error && <div className="error">{error}</div>}
          <button type="submit" className="btn auth-submit" disabled={loading}>
            {loading ? t('login.submitting') : t('login.submit')}
          </button>
        </form>
        <p className="auth-footer">
          {t('login.noAccount')}{' '}
          <Link to="/register">{t('register.link')}</Link>
        </p>
      </div>
    </div>
  );
}
