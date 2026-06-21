import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { AccountAlerts, AccountPageWrap, AccountPanel, AccountLoading } from '../components/account/AccountSection.jsx';
import PageHint from '../components/ux/PageHint.jsx';
import { useToast } from '../components/ux/ToastContext.jsx';
import { ORT_SUBJECT_OPTIONS } from '../utils/ortScore.js';
import { useI18n } from '../i18n/I18nContext.jsx';

function subjectLabel(key) {
  return ORT_SUBJECT_OPTIONS.find((s) => s.key === key)?.label || key;
}

export default function ScoresPage() {
  const { t } = useI18n();
  const toast = useToast();
  const [state, setState] = useState(null);
  const [correctionMessage, setCorrectionMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getScores();
      setState(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCertReupload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      await api.uploadCertificate(file);
      toast.success('Документ отправлен на повторную проверку');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function sendCorrection() {
    setError('');
    try {
      await api.createCorrectionRequest(correctionMessage);
      toast.success('Запрос на исправление отправлен');
      setCorrectionMessage('');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <AccountLoading />;

  const profile = state?.final;
  const subjectScores = profile?.subject_scores_json || {};
  const certStatus = state?.certificate?.status;
  const canReupload = certStatus === 'rejected';

  return (
    <AccountPageWrap title={t('account.page.scores')} subtitle={t('scores.subtitle')}>
      <PageHint hintId="scores" title={t('ux.hint.scores.title')}>
        {t('ux.hint.scores.text')}
      </PageHint>
      <AccountAlerts error={error} />

      <AccountPanel title={t('scores.mainTitle')}>
        {profile ? (
          <>
            <p className="account-muted-line">
              {t('scores.mainValue')}: <strong>{profile.main_score}</strong>
            </p>
            {Object.keys(subjectScores).length > 0 && (
              <ul className="account-score-list">
                {Object.entries(subjectScores).map(([key, value]) => (
                  <li key={key}>
                    {subjectLabel(key)}: <strong>{value}</strong>
                  </li>
                ))}
              </ul>
            )}
            <p className="account-muted-line">{t('scores.lockedNote')}</p>
            <p className="account-muted-line">
              <Link to="/analysis">{t('account.runAnalysis')}</Link>
            </p>
          </>
        ) : (
          <p className="account-muted-line">{t('scores.missing')}</p>
        )}
      </AccountPanel>

      {state?.certificate && (
        <AccountPanel title={t('scores.certificateTitle')}>
          <p className="account-muted-line">
            {t('scores.certificateStatus')}:{' '}
            <span className="account-status-pill">{certStatus || 'not_uploaded'}</span>
          </p>
          {state.certificate.rejection_reason && (
            <div className="error account-alert">{state.certificate.rejection_reason}</div>
          )}
          {canReupload && (
            <label className="account-file-input">
              <span>{t('scores.reuploadCertificate')}</span>
              <input type="file" accept="image/*,.pdf" onChange={onCertReupload} />
            </label>
          )}
          {!canReupload && certStatus !== 'rejected' && (
            <p className="account-muted-line">{t('scores.certificateLocked')}</p>
          )}
        </AccountPanel>
      )}

      {profile?.is_locked && (
        <AccountPanel title={t('scores.correctionTitle')}>
          {state?.correction_request && (
            <p className="account-muted-line">
              {t('scores.lastRequest')}: <strong>{state.correction_request.status}</strong>
              {state.correction_request.admin_comment && <> — {state.correction_request.admin_comment}</>}
            </p>
          )}
          {state?.correction_request?.status === 'pending' ? (
            <p className="account-muted-line">{t('scores.correctionPending')}</p>
          ) : (
            <>
              <textarea
                className="account-textarea"
                value={correctionMessage}
                onChange={(e) => setCorrectionMessage(e.target.value)}
                rows={4}
                placeholder={t('scores.correctionPlaceholder')}
              />
              <button type="button" className="btn btn-secondary" onClick={sendCorrection}>
                {t('scores.correctionSubmit')}
              </button>
            </>
          )}
        </AccountPanel>
      )}
    </AccountPageWrap>
  );
}
