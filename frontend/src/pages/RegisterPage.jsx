import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useI18n } from '../i18n/I18nContext.jsx';
import PasswordInput from '../components/ux/PasswordInput.jsx';

export default function RegisterPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refFromUrl = searchParams.get('ref') || '';
  const [form, setForm] = useState({
    identifier: '',
    password: '',
    full_name: '',
    nickname: '',
    public_display_mode: 'nickname',
  });
  const [consents, setConsents] = useState({ privacy: false, offer: false });
  const [referralCode, setReferralCode] = useState(refFromUrl);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (refFromUrl) setReferralCode(refFromUrl);
  }, [refFromUrl]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.register({ ...form, consents, referral_code: referralCode || undefined });
      await api.login({ identifier: form.identifier, password: form.password });
      navigate('/account/scores');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--wide">
        <Link to="/" className="auth-logo">
          ORT.KG
        </Link>
        <h1>{t('register.title')}</h1>
        <p className="auth-subtitle">{t('home.step1.desc')}</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>{t('login.identifier')}</span>
            <input
              className="auth-input"
              value={form.identifier}
              onChange={(e) => updateField('identifier', e.target.value)}
              required
            />
          </label>
          <label className="auth-field">
            <span>{t('register.password')}</span>
            <PasswordInput
              value={form.password}
              onChange={(e) => updateField('password', e.target.value)}
              required
              autoComplete="new-password"
            />
          </label>
          <label className="auth-field">
            <span>{t('register.fullName')}</span>
            <input
              className="auth-input"
              value={form.full_name}
              onChange={(e) => updateField('full_name', e.target.value)}
              required
            />
          </label>
          <label className="auth-field">
            <span>{t('register.nickname')}</span>
            <input
              className="auth-input"
              value={form.nickname}
              onChange={(e) => updateField('nickname', e.target.value)}
              required
              minLength={3}
              maxLength={30}
            />
          </label>
          <label className="auth-field">
            <span>{t('register.publicName')}</span>
            <select
              className="auth-select"
              value={form.public_display_mode}
              onChange={(e) => updateField('public_display_mode', e.target.value)}
            >
              <option value="nickname">{t('register.publicNickname')}</option>
              <option value="certificate_number">{t('register.publicCert')}</option>
            </select>
          </label>
          <label className="auth-field">
            <span>{t('register.referral')}</span>
            <input
              className="auth-input"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
            />
          </label>
          <label className="auth-check">
            <input
              type="checkbox"
              checked={consents.privacy}
              onChange={(e) => setConsents((c) => ({ ...c, privacy: e.target.checked }))}
            />
            <span>
              {t('register.consentPrivacy')}{' '}
              <Link to="/legal/privacy" target="_blank" rel="noreferrer">
                →
              </Link>
            </span>
          </label>
          <label className="auth-check">
            <input
              type="checkbox"
              checked={consents.offer}
              onChange={(e) => setConsents((c) => ({ ...c, offer: e.target.checked }))}
            />
            <span>
              {t('register.consentOffer')}{' '}
              <Link to="/legal/offer" target="_blank" rel="noreferrer">
                →
              </Link>
            </span>
          </label>
          {error && <div className="error">{error}</div>}
          <button type="submit" className="btn auth-submit" disabled={loading}>
            {loading ? t('register.submitting') : t('register.submit')}
          </button>
        </form>
        <p className="auth-footer">
          {t('register.hasAccount')}{' '}
          <Link to="/login">{t('login.submit')}</Link>
        </p>
      </div>
    </div>
  );
}
