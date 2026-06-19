import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { AccountAlerts, AccountPageWrap, AccountPanel, AccountLoading } from '../components/account/AccountSection.jsx';
import { useToast } from '../components/ux/ToastContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';

export default function WalletPage() {
  const { t } = useI18n();
  const toast = useToast();
  const [wallet, setWallet] = useState(null);
  const [referral, setReferral] = useState(null);
  const [rules, setRules] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

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
    toast.success(t('ux.toast.copied'));
  }

  async function redeem(feature) {
    setError('');
    try {
      const result = await api.redeemBonus(feature);
      toast.success(`Списано ${result.cost} бонусов`);
      load();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    }
  }

  if (loading) return <AccountLoading />;

  return (
    <AccountPageWrap
      title="Бонусы и рефералы"
      subtitle="Приглашайте друзей и тратьте бонусы на функции платформы"
    >
      <AccountAlerts error={error} />

      <div className="account-stats-row account-stats-row--2">
        <div className="account-stat-card account-stat-card--blue">
          <div>
            <strong>{wallet?.bonus_balance ?? 0}</strong>
            <span>бонусов</span>
          </div>
        </div>
        <div className="account-stat-card account-stat-card--amber">
          <div>
            <strong>{wallet?.coin_balance ?? 0}</strong>
            <span>монет</span>
          </div>
        </div>
      </div>

      <AccountPanel title="Реферальная ссылка">
        <p className="account-muted-line">
          За каждого приглашённого: +{referral?.reward_per_referral ?? 100} бонусов
        </p>
        <p>
          Код: <strong>{referral?.code}</strong>
        </p>
        <p className="account-link-box">{referral?.link}</p>
        <p className="account-muted-line">
          Приглашено: {referral?.referred_count ?? 0} · Начислено: {referral?.awarded_count ?? 0}
        </p>
        <button type="button" className="btn" onClick={copyLink}>
          Копировать ссылку
        </button>
      </AccountPanel>

      {rules?.costs && (
        <AccountPanel title="На что потратить бонусы">
          <ul className="account-list">
            <li>Доп. анализ — {rules.costs.extra_analysis} бонусов</li>
            <li>Сравнение программ — {rules.costs.compare_unlock} бонусов</li>
            <li>Доступ к симулятору тура — {rules.costs.tour_unlock} бонусов</li>
            <li>Скидка на подписку — до {rules.subscription_discount_max_percent}%</li>
          </ul>
          <div className="account-btn-row">
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
        </AccountPanel>
      )}

      <AccountPanel title="История операций">
        {!wallet?.transactions?.length ? (
          <p className="account-muted-line">Пока нет операций</p>
        ) : (
          <ul className="account-tx-list">
            {(wallet.transactions || []).map((tx) => (
              <li key={tx.id} className="account-tx-item">
                <span className={tx.type === 'credit' ? 'account-tx-plus' : 'account-tx-minus'}>
                  {tx.type === 'credit' ? '+' : '−'}
                  {tx.amount}
                </span>
                <span>{tx.reason}</span>
                <span className="account-muted-line">{tx.balance_type}</span>
              </li>
            ))}
          </ul>
        )}
      </AccountPanel>
    </AccountPageWrap>
  );
}
