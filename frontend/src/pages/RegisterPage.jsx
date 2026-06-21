import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useI18n } from '../i18n/I18nContext.jsx';
import PasswordInput from '../components/ux/PasswordInput.jsx';
import {
  ORT_MAIN_SCORE_MIN,
  ORT_MAIN_SCORE_MAX,
  ORT_SUBJECT_OPTIONS,
  validateOrtMainScore,
  validateOrtSubjectScore,
  getOrtScoreErrorMessage,
} from '../utils/ortScore.js';

function emptySubjectRow() {
  return { id: crypto.randomUUID(), subject: '', score: '' };
}

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
    main_score: '',
  });
  const [subjects, setSubjects] = useState([]);
  const [certificateFile, setCertificateFile] = useState(null);
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

  function addSubject() {
    setSubjects((prev) => [...prev, emptySubjectRow()]);
  }

  function updateSubject(id, patch) {
    setSubjects((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function removeSubject(id) {
    setSubjects((prev) => prev.filter((row) => row.id !== id));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const mainCheck = validateOrtMainScore(form.main_score);
    if (!mainCheck.valid) {
      setError(getOrtScoreErrorMessage(mainCheck.error, t));
      setLoading(false);
      return;
    }

    const subjectScores = {};
    for (const row of subjects) {
      if (!row.subject && !row.score) continue;
      if (!row.subject || row.score === '') {
        setError(t('register.subjectIncomplete'));
        setLoading(false);
        return;
      }
      const subjectCheck = validateOrtSubjectScore(row.score);
      if (!subjectCheck.valid) {
        setError(getOrtScoreErrorMessage(subjectCheck.error, t));
        setLoading(false);
        return;
      }
      if (subjectScores[row.subject] != null) {
        setError(t('register.subjectDuplicate'));
        setLoading(false);
        return;
      }
      subjectScores[row.subject] = subjectCheck.value;
    }

    if (!certificateFile) {
      setError(t('register.certificateRequired'));
      setLoading(false);
      return;
    }

    if (!consents.privacy || !consents.offer) {
      setError(t('register.consentRequired'));
      setLoading(false);
      return;
    }

    try {
      const payload = new FormData();
      payload.append('identifier', form.identifier);
      payload.append('password', form.password);
      payload.append('full_name', form.full_name);
      payload.append('nickname', form.nickname);
      payload.append('public_display_mode', form.public_display_mode);
      payload.append('main_score', String(mainCheck.value));
      payload.append('subject_scores_json', JSON.stringify(subjectScores));
      payload.append('consents', JSON.stringify(consents));
      if (referralCode) payload.append('referral_code', referralCode);
      payload.append('certificate', certificateFile);

      await api.register(payload);
      await api.login({ identifier: form.identifier, password: form.password });
      navigate('/analysis');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const usedSubjects = new Set(subjects.map((s) => s.subject).filter(Boolean));

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--wide">
        <Link to="/" className="auth-logo">
          ORT.KG
        </Link>
        <h1>{t('register.title')}</h1>
        <p className="auth-subtitle">{t('register.subtitle')}</p>
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

          <div className="auth-section">
            <h2 className="auth-section-title">{t('register.scoresTitle')}</h2>
            <label className="auth-field">
              <span>{t('register.mainScore')} *</span>
              <input
                className="auth-input"
                type="number"
                min={ORT_MAIN_SCORE_MIN}
                max={ORT_MAIN_SCORE_MAX}
                value={form.main_score}
                onChange={(e) => updateField('main_score', e.target.value)}
                required
              />
            </label>
            <p className="auth-hint">{t('score.hint')}</p>

            {subjects.map((row) => (
              <div key={row.id} className="auth-subject-row">
                <select
                  className="auth-select"
                  value={row.subject}
                  onChange={(e) => updateSubject(row.id, { subject: e.target.value })}
                >
                  <option value="">{t('register.selectSubject')}</option>
                  {ORT_SUBJECT_OPTIONS.map((opt) => (
                    <option
                      key={opt.key}
                      value={opt.key}
                      disabled={usedSubjects.has(opt.key) && row.subject !== opt.key}
                    >
                      {opt.label}
                    </option>
                  ))}
                </select>
                <input
                  className="auth-input"
                  type="number"
                  min={60}
                  max={300}
                  placeholder={t('register.subjectScore')}
                  value={row.score}
                  onChange={(e) => updateSubject(row.id, { score: e.target.value })}
                />
                <button type="button" className="btn btn-secondary auth-subject-remove" onClick={() => removeSubject(row.id)}>
                  ×
                </button>
              </div>
            ))}

            <button type="button" className="btn btn-secondary auth-add-subject" onClick={addSubject}>
              {t('register.addSubject')}
            </button>
            <p className="auth-hint">{t('register.subjectHint')}</p>
          </div>

          <div className="auth-section">
            <label className="auth-file-label">
              <span className="btn btn-secondary">{t('register.uploadCertificate')}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,application/pdf,image/*,.pdf"
                onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
              />
            </label>
            {certificateFile && (
              <p className="auth-hint">
                {t('register.fileSelected')}: {certificateFile.name}
              </p>
            )}
            <p className="auth-hint">{t('register.certificateNote')}</p>
          </div>

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
