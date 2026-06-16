import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getStoredUser } from '../api/client.js';

export default function SubscriptionPage() {
  const user = getStoredUser();
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [payingPlanId, setPayingPlanId] = useState(null);
  const [applyBalance, setApplyBalance] = useState(false);
  const [wallet, setWallet] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const plansData = await api.getPlans();
      setPlans(plansData.plans || []);

      if (user) {
        const [subData, walletData] = await Promise.all([
          api.getSubscription(),
          api.getWallet(),
        ]);
        setSubscription(subData.subscription);
        setWallet(walletData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePay(planId) {
    if (!user) return;
    setPayingPlanId(planId);
    setError('');
    setMessage('');

    try {
      const result = await api.createPayment(planId, applyBalance);
      const paymentId = result.payment.id;
      const confirmed = await api.confirmPayment(paymentId);
      setMessage(confirmed.message || 'Подписка активирована (stub)');
      setSubscription(confirmed.subscription);
    } catch (err) {
      setError(err.message);
    } finally {
      setPayingPlanId(null);
    }
  }

  if (loading) {
    return <p>Загрузка...</p>;
  }

  return (
    <>
      <h1>Подписка / Оплата</h1>
      <p className="muted">Платёжный провайдер — заглушка. Реальную интеграцию добавим позже.</p>

      {!user && (
        <div className="dev-panel">
          <p>
            Для оплаты нужно <Link to="/login">войти</Link> или{' '}
            <Link to="/register">зарегистрироваться</Link>.
          </p>
        </div>
      )}

      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}

      {subscription && (
        <div className="card">
          <h2>Активная подписка</h2>
          <p>Статус: {subscription.status}</p>
          <p>До: {new Date(subscription.ends_at).toLocaleString('ru-RU')}</p>
        </div>
      )}

      {user && wallet && (
        <p className="muted">
          Бонусный баланс: <strong>{wallet.bonus_balance ?? 0}</strong> бонусов
        </p>
      )}

      {user && (
        <label style={{ display: 'block', marginBottom: 16 }}>
          <input
            type="checkbox"
            checked={applyBalance}
            onChange={(e) => setApplyBalance(e.target.checked)}
          />{' '}
          Списать бонусы (до 50% от стоимости)
        </label>
      )}

      <div className="tiles">
        {plans.map((plan) => (
          <div key={plan.id} className="card">
            <h3>{plan.title}</h3>
            <p className="muted">{plan.description}</p>
            <p>
              <strong>{plan.price_kgs} сом</strong> · {plan.duration_days} дн.
            </p>
            <ul>
              {(plan.features || []).map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <button
              type="button"
              className="btn"
              disabled={!user || payingPlanId === plan.id}
              onClick={() => handlePay(plan.id)}
            >
              {payingPlanId === plan.id ? 'Обработка...' : 'Оплатить (stub)'}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
