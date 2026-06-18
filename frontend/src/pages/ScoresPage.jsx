import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { AccountAlerts, AccountPageWrap, AccountPanel } from '../components/account/AccountSection.jsx';

export default function ScoresPage() {
  const [state, setState] = useState(null);
  const [mainScore, setMainScore] = useState('');
  const [lockAck, setLockAck] = useState(false);
  const [correctionMessage, setCorrectionMessage] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
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
    setMessage('');
    try {
      await api.saveDraftScores({ main_score: Number(mainScore), subject_scores_json: {} });
      setMessage('Черновые баллы сохранены');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function finalize() {
    setError('');
    setMessage('');
    try {
      await api.finalizeScores({
        main_score: Number(mainScore),
        subject_scores_json: {},
        lock_acknowledged: lockAck,
      });
      setMessage('Баллы зафиксированы');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onCertUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setMessage('');
    try {
      await api.uploadCertificate(file);
      setMessage('Сертификат отправлен на проверку');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function sendCorrection() {
    setError('');
    setMessage('');
    try {
      await api.createCorrectionRequest(correctionMessage);
      setMessage('Запрос на исправление отправлен');
      setCorrectionMessage('');
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p className="account-loading">Загрузка...</p>;

  const isBeforeResults = state?.phase === 'before_results';
  const isLocked = state?.final?.is_locked;

  return (
    <AccountPageWrap
      title="Баллы и сертификат"
      subtitle={`Фаза приёмной кампании: ${state?.phase || '—'}`}
    >
      <AccountAlerts error={error} message={message} />

      <AccountPanel title="Основной балл ОРТ">
        <div className="account-field-row">
          <label className="account-field">
            <span>Балл</span>
            <input
              type="number"
              className="account-input account-input--short"
              value={mainScore}
              onChange={(e) => setMainScore(e.target.value)}
              disabled={isLocked}
            />
          </label>
        </div>

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
