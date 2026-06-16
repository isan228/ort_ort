import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useI18n } from '../i18n/I18nContext.jsx';

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [devToken, setDevToken] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    setDevToken('');
    try {
      const result = await api.forgotPassword(identifier);
      setMessage(t('auth.forgot.sent'));
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
    <div className="card" style={{ maxWidth: 480 }}>
      <h1>{t('auth.forgot.title')}</h1>
      <p className="muted">{t('auth.forgot.subtitle')}</p>
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
        {error && <div className="error">{error}</div>}
        {message && <div className="success">{message}</div>}
        {devToken && (
          <div className="dev-panel">
            <strong>Dev token</strong>
            <p className="muted">{t('auth.forgot.devTokenHint')}</p>
            <code style={{ wordBreak: 'break-all' }}>{devToken}</code>
            <p style={{ marginTop: 8 }}>
              <Link to={`/reset-password?token=${devToken}`}>{t('auth.forgot.goReset')}</Link>
            </p>
          </div>
        )}
        <button type="submit" className="btn" disabled={loading}>
          {loading ? t('common.loading') : t('auth.forgot.submit')}
        </button>
      </form>
      <p className="muted" style={{ marginTop: 16 }}>
        <Link to="/login">{t('common.back')}</Link>
      </p>
    </div>
  );
}
