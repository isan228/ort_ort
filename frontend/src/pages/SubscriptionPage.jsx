import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getStoredUser } from '../api/client.js';
import { useToast } from '../components/ux/ToastContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import PageHint from '../components/ux/PageHint.jsx';

export default function SubscriptionPage() {
  const { t } = useI18n();
  const toast = useToast();
  const user = getStoredUser();
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

    try {
      const result = await api.createPayment(planId, applyBalance);
      const paymentId = result.payment.id;
      const confirmed = await api.confirmPayment(paymentId);
      toast.success(confirmed.message || 'Подписка активирована');
      setSubscription(confirmed.subscription);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setPayingPlanId(null);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page-inner">
          <p className="page-empty">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-inner">
        <p className="page-breadcrumbs">
          <Link to="/">Главная</Link> &gt; Подписка
        </p>

        <header className="page-head">
          <h1>Подписка / Оплата</h1>
          <p>Доступ к проходным баллам, расширенному анализу и симуляции туров.</p>
        </header>

        <PageHint hintId="subscription" title={t('ux.hint.subscription.title')}>
          {t('ux.hint.subscription.text')}
        </PageHint>

        <div className="page-callout page-callout--warn">
          Платёжный провайдер — заглушка. Реальную интеграцию добавим позже.
        </div>

        {!user && (
          <div className="page-callout">
            Для оплаты нужно <Link to="/login">войти</Link> или{' '}
            <Link to="/register">зарегистрироваться</Link>.
          </div>
        )}

        {error && <div className="error">{error}</div>}

        {subscription && (
          <div className="page-card">
            <h2>Активная подписка</h2>
            <div className="page-meta-row">
              <span className="page-meta-item">
                Статус: <strong>{subscription.status}</strong>
              </span>
              <span className="page-meta-item">
                До: <strong>{new Date(subscription.ends_at).toLocaleString('ru-RU')}</strong>
              </span>
            </div>
          </div>
        )}

        {user && wallet && (
          <div className="page-stats-row">
            <div className="page-stat-card">
              <div className="page-stat-icon">🎁</div>
              <div>
                <strong>{wallet.bonus_balance ?? 0}</strong>
                <span>Бонусный баланс</span>
              </div>
            </div>
          </div>
        )}

        {user && (
          <label className="page-check">
            <input
              type="checkbox"
              checked={applyBalance}
              onChange={(e) => setApplyBalance(e.target.checked)}
            />
            <span>Списать бонусы (до 50% от стоимости)</span>
          </label>
        )}

        <div className="page-plan-grid">
          {plans.map((plan, idx) => (
            <article key={plan.id} className={`page-plan-card${idx === 1 ? ' featured' : ''}`}>
              <h3>{plan.title}</h3>
              <p className="muted">{plan.description}</p>
              <div className="page-plan-price">
                {plan.price_kgs} сом <span>/ {plan.duration_days} дн.</span>
              </div>
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
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
