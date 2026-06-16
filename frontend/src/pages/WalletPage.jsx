import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getStoredUser } from '../api/client.js';

export default function WalletPage() {
  const user = getStoredUser();
  const [wallet, setWallet] = useState(null);
  const [referral, setReferral] = useState(null);
  const [rules, setRules] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [walletData, referralData, rulesData] = await Promise.all([
        api.getWallet(),
        api.getReferral(),
        api.getRedemptionRules(),
      ]);
      setWallet(walletData);
      setReferral(referralData);
      setRules(rulesData.rules);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function copyLink() {
    if (!referral?.link) return;
    navigator.clipboard.writeText(referral.link);
    setMessage('Ссылка скопирована');
  }

  async function redeem(feature) {
    setError('');
    setMessage('');
    try {
      const result = await api.redeemBonus(feature);
      setMessage(`Списано ${result.cost} бонусов за «${feature}»`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!user) {
    return (
      <div className="card">
        <h1>Бонусы и рефералы</h1>
        <p>
          <Link to="/login">Войдите</Link>, чтобы увидеть баланс и реферальную ссылку.
        </p>
      </div>
    );
  }

  if (loading) return <p>Загрузка...</p>;

  return (
    <>
      <h1>Бонусы / Рефералы</h1>
      <p className="muted">Приглашайте друзей и тратьте бонусы на функции платформы.</p>

      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}

      <div className="card">
        <h2>Баланс</h2>
        <p>
          Бонусы: <strong>{wallet?.bonus_balance ?? 0}</strong>
        </p>
        <p>
          Монеты: <strong>{wallet?.coin_balance ?? 0}</strong>
        </p>
      </div>

      <div className="card">
        <h2>Реферальная ссылка</h2>
        <p className="muted">
          За каждого приглашённого после регистрации: +{referral?.reward_per_referral ?? 100} бонусов
        </p>
        <p>
          Код: <strong>{referral?.code}</strong>
        </p>
        <p style={{ wordBreak: 'break-all' }}>{referral?.link}</p>
        <p className="muted">
          Приглашено: {referral?.referred_count ?? 0} · Начислено: {referral?.awarded_count ?? 0}
        </p>
        <button type="button" className="btn" onClick={copyLink}>
          Копировать ссылку
        </button>
      </div>

      {rules?.costs && (
        <div className="card">
          <h2>На что потратить бонусы</h2>
          <ul>
            <li>Доп. анализ — {rules.costs.extra_analysis} бонусов</li>
            <li>Сравнение программ — {rules.costs.compare_unlock} бонусов</li>
            <li>Доступ к симулятору тура — {rules.costs.tour_unlock} бонусов</li>
            <li>Скидка на подписку — до {rules.subscription_discount_max_percent}% при оплате</li>
          </ul>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            <button type="button" className="btn btn-secondary" onClick={() => redeem('extra_analysis')}>
              Купить анализ
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => redeem('compare_unlock')}>
              Открыть сравнение
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => redeem('tour_unlock')}>
              Открыть тур
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <h2>История операций</h2>
        {!wallet?.transactions?.length && <p className="muted">Пока нет операций</p>}
        <ul>
          {(wallet?.transactions || []).map((tx) => (
            <li key={tx.id}>
              {tx.type === 'credit' ? '+' : '-'}
              {tx.amount} ({tx.balance_type}) — {tx.reason}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
