import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useI18n } from '../i18n/I18nContext.jsx';
import { useToast } from '../components/ux/ToastContext.jsx';

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const toast = useToast();
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [devToken, setDevToken] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setDevToken('');
    try {
      const result = await api.forgotPassword(identifier);
      toast.success(t('auth.forgot.sent'));
      if (result.dev_token) {
        setDevToken(result.dev_token);
      }
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
        <h1>{t('auth.forgot.title')}</h1>
        <p className="auth-subtitle">{t('auth.forgot.subtitle')}</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>{t('login.identifier')}</span>
            <input
              className="auth-input"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </label>
          {error && <div className="error">{error}</div>}
          {devToken && (
            <div className="auth-dev-panel">
              <strong>Dev token</strong>
              <p className="muted">{t('auth.forgot.devTokenHint')}</p>
              <code>{devToken}</code>
              <p style={{ marginTop: 8 }}>
                <Link to={`/reset-password?token=${devToken}`}>{t('auth.forgot.goReset')}</Link>
              </p>
            </div>
          )}
          <button type="submit" className="btn auth-submit" disabled={loading}>
            {loading ? t('common.loading') : t('auth.forgot.submit')}
          </button>
        </form>
        <p className="auth-footer">
          <Link to="/login">{t('common.back')}</Link>
        </p>
      </div>
    </div>
  );
}
