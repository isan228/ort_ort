import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getStoredUser } from '../api/client.js';

export default function ScoresPage() {
  const user = getStoredUser();
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

  if (!user) {
    return (
      <div className="card">
        <h1>Баллы и сертификат</h1>
        <p>Нужно <Link to="/login">войти</Link></p>
      </div>
    );
  }

  if (loading) return <p>Загрузка...</p>;

  const isBeforeResults = state?.phase === 'before_results';
  const isLocked = state?.final?.is_locked;

  return (
    <>
      <h1>Баллы и сертификат</h1>
      <p className="muted">Фаза: {state?.phase}</p>

      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}

      <div className="card">
        <h2>Основной балл ОРТ</h2>
        <input
          type="number"
          value={mainScore}
          onChange={(e) => setMainScore(e.target.value)}
          disabled={isLocked}
          style={{ padding: 8, width: 120 }}
        />

        {isBeforeResults && (
          <p style={{ marginTop: 12 }}>
            <button type="button" className="btn" onClick={saveDraft}>
              Сохранить черновик
            </button>
          </p>
        )}

        {!isBeforeResults && !isLocked && (
          <>
            <div className="dev-panel" style={{ marginTop: 12 }}>
              <strong>Предупреждение</strong>
              <p className="muted">
                После фиксации баллы нельзя будет изменить самостоятельно. Правки — только через
                запрос администратору после проверки сертификата.
              </p>
              <label>
                <input
                  type="checkbox"
                  checked={lockAck}
                  onChange={(e) => setLockAck(e.target.checked)}
                />{' '}
                Я понимаю и подтверждаю фиксацию
              </label>
            </div>
            <button type="button" className="btn" onClick={finalize}>
              Зафиксировать реальные баллы
            </button>
          </>
        )}

        {isLocked && <p className="muted">Баллы зафиксированы: {state.final.main_score}</p>}
      </div>

      {(isLocked || state?.certificate) && (
        <div className="card">
          <h2>Сертификат</h2>
          <p>Статус: {state?.certificate?.status || 'not_uploaded'}</p>
          {state?.certificate?.rejection_reason && (
            <p className="error">Причина отклонения: {state.certificate.rejection_reason}</p>
          )}
          {state?.certificate?.status !== 'verified' && (
            <input type="file" accept="image/*,.pdf" onChange={onCertUpload} />
          )}
        </div>
      )}

      {isLocked && (
        <div className="card">
          <h2>Запрос на исправление баллов</h2>
          {state?.correction_request && (
            <p className="muted">
              Последний запрос: <strong>{state.correction_request.status}</strong>
              {state.correction_request.admin_comment && (
                <> — {state.correction_request.admin_comment}</>
              )}
            </p>
          )}
          {state?.correction_request?.status === 'pending' ? (
            <p className="muted">Запрос на рассмотрении у администратора.</p>
          ) : (
            <>
              <textarea
                value={correctionMessage}
                onChange={(e) => setCorrectionMessage(e.target.value)}
                rows={4}
                style={{ width: '100%', marginBottom: 8 }}
                placeholder="Опишите, что нужно исправить"
              />
              <button type="button" className="btn btn-secondary" onClick={sendCorrection}>
                Отправить запрос
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
