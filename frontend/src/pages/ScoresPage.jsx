import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { AccountAlerts, AccountPageWrap, AccountPanel, AccountLoading } from '../components/account/AccountSection.jsx';
import PageHint from '../components/ux/PageHint.jsx';
import { useToast } from '../components/ux/ToastContext.jsx';
import {
  ORT_MAIN_SCORE_MIN,
  ORT_MAIN_SCORE_MAX,
  validateOrtMainScore,
  getOrtScoreErrorMessage,
} from '../utils/ortScore.js';
import { useI18n } from '../i18n/I18nContext.jsx';

export default function ScoresPage() {
  const { t } = useI18n();
  const toast = useToast();
  const [state, setState] = useState(null);
  const [mainScore, setMainScore] = useState('');
  const [lockAck, setLockAck] = useState(false);
  const [correctionMessage, setCorrectionMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getScores();
      setState(data);
      const profile = data.final || data.draft;
      if (profile?.main_score != null) setMainScore(String(profile.main_score));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveDraft() {
    setError('');
    const check = validateOrtMainScore(mainScore);
    if (!check.valid) {
      setError(getOrtScoreErrorMessage(check.error));
      return;
    }
    try {
      await api.saveDraftScores({ main_score: check.value, subject_scores_json: {} });
      toast.success('Черновые баллы сохранены');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function finalize() {
    setError('');
    const check = validateOrtMainScore(mainScore);
    if (!check.valid) {
      setError(getOrtScoreErrorMessage(check.error));
      return;
    }
    try {
      await api.finalizeScores({
        main_score: check.value,
        subject_scores_json: {},
        lock_acknowledged: lockAck,
      });
      toast.success('Баллы зафиксированы');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onCertUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      await api.uploadCertificate(file);
      toast.success('Сертификат отправлен на проверку');
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
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <AccountLoading />;

  const isBeforeResults = state?.phase === 'before_results';
  const isLocked = state?.final?.is_locked;

  return (
    <AccountPageWrap
      title="Баллы и сертификат"
      subtitle={`Фаза приёмной кампании: ${state?.phase || '—'}`}
    >
      <PageHint hintId="scores" title={t('ux.hint.scores.title')}>
        {t('ux.hint.scores.text')}
      </PageHint>
      <AccountAlerts error={error} />

      <AccountPanel title="Основной балл ОРТ">
        <div className="account-field-row">
          <label className="account-field">
            <span>Балл</span>
            <input
              type="number"
              className="account-input account-input--short"
              min={ORT_MAIN_SCORE_MIN}
              max={ORT_MAIN_SCORE_MAX}
              value={mainScore}
              onChange={(e) => setMainScore(e.target.value)}
              disabled={isLocked}
            />
          </label>
        </div>
        <p className="account-muted-line">
          Допустимый диапазон: от {ORT_MAIN_SCORE_MIN} до {ORT_MAIN_SCORE_MAX} (порог вступления в вуз — от 110
          баллов).
        </p>
        <p className="account-muted-line">
          <Link to="/analysis">{t('account.runAnalysis')}</Link> — узнайте шансы поступления по вашему баллу.
        </p>

        {isBeforeResults && (
          <button type="button" className="btn" onClick={saveDraft}>
            Сохранить черновик
          </button>
        )}

        {!isBeforeResults && !isLocked && (
          <div className="account-warning-box">
            <strong>Предупреждение</strong>
            <p>
              После фиксации баллы нельзя будет изменить самостоятельно. Правки — только через
              запрос администратору после проверки сертификата.
            </p>
            <label className="account-check">
              <input
                type="checkbox"
                checked={lockAck}
                onChange={(e) => setLockAck(e.target.checked)}
              />
              Я понимаю и подтверждаю фиксацию
            </label>
            <button type="button" className="btn" onClick={finalize}>
              Зафиксировать реальные баллы
            </button>
          </div>
        )}

        {isLocked && (
          <p className="account-muted-line">
            Баллы зафиксированы: <strong>{state.final.main_score}</strong>
          </p>
        )}
      </AccountPanel>

      {(isLocked || state?.certificate) && (
        <AccountPanel title="Сертификат">
          <p className="account-muted-line">
            Статус: <span className="account-status-pill">{state?.certificate?.status || 'not_uploaded'}</span>
          </p>
          {state?.certificate?.rejection_reason && (
            <div className="error account-alert">{state.certificate.rejection_reason}</div>
          )}
          {state?.certificate?.status !== 'verified' && (
            <label className="account-file-input">
              <span>Загрузить файл (JPEG, PNG, PDF)</span>
              <input type="file" accept="image/*,.pdf" onChange={onCertUpload} />
            </label>
          )}
        </AccountPanel>
      )}

      {isLocked && (
        <AccountPanel title="Запрос на исправление баллов">
          {state?.correction_request && (
            <p className="account-muted-line">
              Последний запрос: <strong>{state.correction_request.status}</strong>
              {state.correction_request.admin_comment && <> — {state.correction_request.admin_comment}</>}
            </p>
          )}
          {state?.correction_request?.status === 'pending' ? (
            <p className="account-muted-line">Запрос на рассмотрении у администратора.</p>
          ) : (
            <>
              <textarea
                className="account-textarea"
                value={correctionMessage}
                onChange={(e) => setCorrectionMessage(e.target.value)}
                rows={4}
                placeholder="Опишите, что нужно исправить"
              />
              <button type="button" className="btn btn-secondary" onClick={sendCorrection}>
                Отправить запрос
              </button>
            </>
          )}
        </AccountPanel>
      )}
    </AccountPageWrap>
  );
}
