import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useI18n } from '../i18n/I18nContext.jsx';

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
    <div className="card" style={{ maxWidth: 520 }}>
      <h1>{t('register.title')}</h1>
      <form onSubmit={handleSubmit}>
        <label>
          {t('login.identifier')}
          <input
            value={form.identifier}
            onChange={(e) => updateField('identifier', e.target.value)}
            required
            style={{ width: '100%', marginTop: 4, marginBottom: 12, padding: 8 }}
          />
        </label>
        <label>
          {t('register.password')}
          <input
            type="password"
            value={form.password}
            onChange={(e) => updateField('password', e.target.value)}
            required
            style={{ width: '100%', marginTop: 4, marginBottom: 12, padding: 8 }}
          />
        </label>
        <label>
          {t('register.fullName')}
          <input
            value={form.full_name}
            onChange={(e) => updateField('full_name', e.target.value)}
            required
            style={{ width: '100%', marginTop: 4, marginBottom: 12, padding: 8 }}
          />
        </label>
        <label>
          {t('register.nickname')}
          <input
            value={form.nickname}
            onChange={(e) => updateField('nickname', e.target.value)}
            required
            minLength={3}
            maxLength={30}
            style={{ width: '100%', marginTop: 4, marginBottom: 12, padding: 8 }}
          />
        </label>
        <label>
          {t('register.publicName')}
          <select
            value={form.public_display_mode}
            onChange={(e) => updateField('public_display_mode', e.target.value)}
            style={{ width: '100%', marginTop: 4, marginBottom: 12, padding: 8 }}
          >
            <option value="nickname">{t('register.publicNickname')}</option>
            <option value="certificate_number">{t('register.publicCert')}</option>
          </select>
        </label>
        <label>
          {t('register.referral')}
          <input
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value)}
            style={{ width: '100%', marginTop: 4, marginBottom: 12, padding: 8 }}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 8 }}>
          <input
            type="checkbox"
            checked={consents.privacy}
            onChange={(e) => setConsents((c) => ({ ...c, privacy: e.target.checked }))}
          />{' '}
          {t('register.consentPrivacy')}{' '}
          <Link to="/legal/privacy" target="_blank" rel="noreferrer">
            →
          </Link>
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={consents.offer}
            onChange={(e) => setConsents((c) => ({ ...c, offer: e.target.checked }))}
          />{' '}
          {t('register.consentOffer')}{' '}
          <Link to="/legal/offer" target="_blank" rel="noreferrer">
            →
          </Link>
        </label>
        {error && <div className="error">{error}</div>}
        <button type="submit" className="btn" disabled={loading}>
          {loading ? t('register.submitting') : t('register.submit')}
        </button>
      </form>
      <p className="muted" style={{ marginTop: 16 }}>
        {t('register.hasAccount')}{' '}
        <Link to="/login">{t('login.submit')}</Link>
      </p>
    </div>
  );
}
