import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, getStoredUser } from '../api/client.js';
import { useToast } from '../components/ux/ToastContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import PageHint from '../components/ux/PageHint.jsx';

export default function SubscriptionPage() {
  const { t } = useI18n();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = getStoredUser();
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payingPlanId, setPayingPlanId] = useState(null);
  const [applyBalance, setApplyBalance] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoPreview, setPromoPreview] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [returnPending, setReturnPending] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (searchParams.get('payment') === 'return' && user) {
      setReturnPending(true);
      pollSubscriptionAfterReturn();
    }
  }, [searchParams, user]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const plansData = await api.getPlans();
      setPlans(plansData.plans || []);

      if (user) {
        const [subData, walletData] = await Promise.all([api.getSubscription(), api.getWallet()]);
        setSubscription(subData.subscription);
        setWallet(walletData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function pollSubscriptionAfterReturn() {
    const delays = [0, 2000, 4000, 8000];
    for (const delay of delays) {
      if (delay) await new Promise((r) => setTimeout(r, delay));
      try {
        const subData = await api.getSubscription();
        if (subData.subscription) {
          setSubscription(subData.subscription);
          setReturnPending(false);
          searchParams.delete('payment');
          setSearchParams(searchParams, { replace: true });
          toast.success('Подписка активирована');
          return;
        }
      } catch {
        // keep polling
      }
    }
    setReturnPending(false);
    toast.info('Оплата обрабатывается. Обновите страницу через минуту, если подписка не появилась.');
  }

  async function handlePay(planId) {
    if (!user) return;
    setPayingPlanId(planId);
    setError('');

    try {
      const result = await api.createPayment(planId, applyBalance, promoCode.trim() || null);

      if (result.free_checkout && result.subscription) {
        toast.success('Подписка активирована');
        setSubscription(result.subscription);
        return;
      }

      if (result.payment_url) {
        window.location.href = result.payment_url;
        return;
      }

      if (result.stub_confirm_url || result.payment?.provider === 'stub') {
        const confirmed = await api.confirmPayment(result.payment.id);
        toast.success(confirmed.message || 'Подписка активирована');
        setSubscription(confirmed.subscription);
        return;
      }

      throw new Error('Не получена ссылка на оплату');
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setPayingPlanId(null);
    }
  }

  async function handlePromoPreview(planId) {
    if (!promoCode.trim()) {
      setPromoPreview(null);
      return;
    }
    try {
      const preview = await api.previewPromoCode(planId, promoCode.trim());
      setPromoPreview(preview);
      setError('');
    } catch (err) {
      setPromoPreview(null);
      setError(err.message);
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
          <p>Premium открывает каталог, анализ, туры, рейтинги и все функции платформы.</p>
        </header>

        <PageHint hintId="subscription" title={t('ux.hint.subscription.title')}>
          {t('ux.hint.subscription.text')}
        </PageHint>

        {returnPending && (
          <div className="page-callout">
            Проверяем статус оплаты Finik…
          </div>
        )}

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
          <div className="page-card" style={{ marginBottom: '1rem' }}>
            <h2>Промокод</h2>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value.toUpperCase());
                  setPromoPreview(null);
                }}
                placeholder="Введите промокод"
                style={{ flex: 1, minWidth: 180, padding: '0.65rem 0.75rem' }}
              />
              {plans[0] && (
                <button type="button" className="btn btn-secondary" onClick={() => handlePromoPreview(plans[0].id)}>
                  Проверить
                </button>
              )}
            </div>
            {promoPreview && (
              <p className="muted" style={{ marginTop: '0.75rem' }}>
                Скидка: {promoPreview.discount_applied} сом · Итого: {promoPreview.final_price} сом
              </p>
            )}
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
          {plans.map((plan) => (
            <article key={plan.id} className="page-plan-card featured">
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
                {payingPlanId === plan.id ? 'Переход к оплате...' : 'Оплатить через Finik'}
              </button>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
