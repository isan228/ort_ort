import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useI18n } from '../i18n/I18nContext.jsx';
import PasswordInput from '../components/ux/PasswordInput.jsx';
import {
  ORT_MAIN_SCORE_MIN,
  ORT_MAIN_SCORE_MAX,
  ORT_SUBJECT_SCORE_MIN,
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
  const [searchParams, setSearchParams] = useSearchParams();
  const refFromUrl = searchParams.get('ref') || '';
  const [form, setForm] = useState({
    identifier: '',
    password: '',
    full_name: '',
    main_score: '',
  });
  const [subjects, setSubjects] = useState([]);
  const [certificateFile, setCertificateFile] = useState(null);
  const [consents, setConsents] = useState({ privacy: false, offer: false });
  const [promoCode, setPromoCode] = useState(refFromUrl);
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [returnPending, setReturnPending] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (refFromUrl) setPromoCode(refFromUrl);
  }, [refFromUrl]);

  useEffect(() => {
    api
      .getPlans()
      .then((data) => {
        const list = data.plans || [];
        setPlans(list);
        if (list.length === 1) setSelectedPlanId(list[0].id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const paymentId = searchParams.get('payment_id');
    if (searchParams.get('payment') === 'return' && paymentId) {
      pollRegistrationAfterPayment(paymentId);
    }
  }, [searchParams]);

  async function pollRegistrationAfterPayment(paymentId) {
    setReturnPending(true);
    setError('');
    const delays = [0, 2000, 4000, 8000, 12000];

    for (const delay of delays) {
      if (delay) await new Promise((r) => setTimeout(r, delay));
      try {
        const status = await api.getRegisterCheckoutStatus(paymentId);
        if (status.status === 'completed') {
          setReturnPending(false);
          searchParams.delete('payment');
          searchParams.delete('payment_id');
          setSearchParams(searchParams, { replace: true });
          if (status.access_token || status.session_already_issued) {
            navigate(status.access_token ? '/analysis' : '/login');
          } else {
            navigate('/analysis');
          }
          return;
        }
        if (status.status === 'failed') {
          setReturnPending(false);
          setError(t('register.paymentFailed'));
          return;
        }
      } catch {
        // keep polling
      }
    }

    setReturnPending(false);
    setError(t('register.paymentPending'));
  }

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

    if (!selectedPlanId) {
      setError(t('register.planRequired'));
      setLoading(false);
      return;
    }

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
      payload.append('main_score', String(mainCheck.value));
      payload.append('subject_scores_json', JSON.stringify(subjectScores));
      payload.append('consents', JSON.stringify(consents));
      payload.append('plan_id', selectedPlanId);
      if (promoCode.trim()) payload.append('referral_code', promoCode.trim());
      payload.append('certificate', certificateFile);

      const result = await api.register(payload);

      if (result.payment_url) {
        window.location.href = result.payment_url;
        return;
      }

      if (result.stub_confirm_url || result.provider === 'stub') {
        await api.confirmRegisterStubPayment(result.payment_id);
        navigate('/analysis');
        return;
      }

      throw new Error(t('register.paymentUrlMissing'));
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
        {returnPending && <div className="auth-hint">{t('register.processingPayment')}</div>}
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
                  min={ORT_SUBJECT_SCORE_MIN}
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
              <span className="btn btn-secondary">{t('register.uploadCertificate')} *</span>
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
            <span>{t('register.promoCode')}</span>
            <input
              className="auth-input"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            />
          </label>

          <div className="auth-section">
            <h2 className="auth-section-title">{t('register.planTitle')}</h2>
            {plans.map((plan) => (
              <label key={plan.id} className="auth-check auth-plan-option">
                <input
                  type="radio"
                  name="plan"
                  value={plan.id}
                  checked={selectedPlanId === plan.id}
                  onChange={() => setSelectedPlanId(plan.id)}
                  required={plans.length > 0}
                />
                <span>
                  <strong>{plan.title}</strong> — {plan.price_kgs} сом / {plan.duration_days} {t('register.days')}
                  {plan.description ? ` · ${plan.description}` : ''}
                </span>
              </label>
            ))}
            {plans.length === 0 && <p className="auth-hint">{t('register.plansLoading')}</p>}
          </div>

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
          <button type="submit" className="btn auth-submit" disabled={loading || returnPending || plans.length === 0}>
            {loading ? t('register.submitting') : t('register.payAndRegister')}
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
