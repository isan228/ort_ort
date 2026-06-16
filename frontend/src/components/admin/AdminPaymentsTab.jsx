import { useState } from 'react';
import { api } from '../../api/client.js';

const STATUSES = ['', 'pending', 'completed', 'failed', 'cancelled'];

function PaymentCard({ payment, onUpdated }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const user = payment.user;
  const plan = payment.plan;

  async function run(action) {
    setBusy(true);
    setError('');
    try {
      await action();
      onUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card admin-card">
      <h3>
        {plan?.title || plan?.code || 'План'} · {payment.amount_kgs} KGS
      </h3>
      <p className="muted">
        {user?.profile?.nickname || user?.email || payment.user_id} · {payment.status} ·{' '}
        {payment.provider}
      </p>
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        id: <code>{payment.id}</code>
      </p>
      {error && <div className="error">{error}</div>}
      {payment.status === 'pending' && (
        <div className="admin-actions">
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => run(() => api.adminConfirmPayment(payment.id))}
          >
            Подтвердить (stub)
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            onClick={() => run(() => api.adminCancelPayment(payment.id))}
          >
            Отменить
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            onClick={() => run(() => api.adminFailPayment(payment.id))}
          >
            Failed
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminPaymentsTab({ payments, total, onFilter, onUpdated }) {
  const [status, setStatus] = useState('');

  return (
    <>
      <div className="card">
        <h2>Платежи ({total})</h2>
        <div className="admin-actions">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ padding: 8 }}
          >
            {STATUSES.map((s) => (
              <option key={s || 'all'} value={s}>
                {s || 'все статусы'}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-secondary" onClick={() => onFilter(status)}>
            Применить
          </button>
        </div>
        <p className="muted">Reconcile для stub: подтверждение активирует подписку пользователю.</p>
      </div>

      {payments.map((payment) => (
        <PaymentCard key={payment.id} payment={payment} onUpdated={onUpdated} />
      ))}
      {!payments.length && <p className="muted">Платежей нет.</p>}
    </>
  );
}
