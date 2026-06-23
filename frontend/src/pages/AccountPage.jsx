import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useI18n } from '../i18n/I18nContext.jsx';
import { AccountLoading } from '../components/account/AccountSection.jsx';
import { AccountIcon } from '../components/icons/AccountIcons.jsx';
import PageHint from '../components/ux/PageHint.jsx';

const CHANCE_LABEL = {
  high: 'analysis.chance.high',
  medium: 'analysis.chance.medium',
  low: 'analysis.chance.low',
  unlikely: 'analysis.chance.unlikely',
};

const UPCOMING_EVENTS = [
  { date: '15 июн', titleKey: 'account.event.deadline', icon: 'clock', tone: 'red' },
  { date: '20 июн', titleKey: 'account.event.tour', icon: 'calendar', tone: 'blue' },
  { date: '25 июн', titleKey: 'account.event.webinar', icon: 'chart', tone: 'purple' },
  { date: '1 июл', titleKey: 'account.event.enrollment', icon: 'trophy', tone: 'green' },
];

const TOOL_TILES = [
  { to: '/analysis', icon: 'analysis', labelKey: 'account.tool.analysis' },
  { to: '/universities', icon: 'catalog', labelKey: 'account.tool.catalog' },
  { to: '/rankings', icon: 'ranking', labelKey: 'account.tool.ranking' },
  { to: '/account/scores', icon: 'calc', labelKey: 'account.tool.calc' },
  { to: '/account/collections', icon: 'compare', labelKey: 'account.tool.compare' },
];

function ChanceRing({ percent, label }) {
  const safe = Math.min(100, Math.max(0, Number(percent) || 0));
  return (
    <div
      className="account-ring"
      style={{ background: `conic-gradient(#22c55e ${safe}%, #e2e8f0 0)` }}
    >
      <div className="account-ring-inner">
        <strong>{safe}%</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function StatCard({ icon, tone, value, label }) {
  return (
    <div className={`account-stat-card account-stat-card--${tone}`}>
      <AccountIcon name={icon} size={22} />
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function getDisplayName(account) {
  return (
    account?.profile?.nickname ||
    account?.user?.email?.split('@')[0] ||
    account?.user?.phone ||
    'Пользователь'
  );
}

function getBestChance(results) {
  const valid = (results || []).filter((r) => !r.error && r.chance_percent != null);
  if (!valid.length) return { percent: 0, category: 'low' };
  const best = valid.reduce((a, b) => (a.chance_percent > b.chance_percent ? a : b));
  return { percent: best.chance_percent, category: best.chance_category || 'medium' };
}

export default function AccountPage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [account, setAccount] = useState(null);
  const [analysisTotal, setAnalysisTotal] = useState(0);
  const [lastAnalysis, setLastAnalysis] = useState(null);
  const [lastResults, setLastResults] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [ortScore, setOrtScore] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [me, history, scores, favs, sub, plansData] = await Promise.all([
          api.me(),
          api.getAnalysisHistory({ limit: 1 }),
          api.getScores(),
          api.getFavorites(),
          api.getSubscription().catch(() => ({ subscription: null })),
          api.getPlans().catch(() => ({ plans: [] })),
        ]);

        setAccount(me);
        setAnalysisTotal(history.total ?? history.analyses?.length ?? 0);
        setFavorites(favs.favorites || []);
        setSubscription(sub.subscription);
        setPlans(plansData.plans || []);

        const final = scores.final || scores.draft;
        setOrtScore(final?.main_score ?? null);

        const latest = history.analyses?.[0];
        if (latest) {
          setLastAnalysis(latest);
          const programs = latest.result_json?.programs || [];
          setLastResults(programs.filter((r) => !r.error).slice(0, 4));
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const bestChance = useMemo(() => getBestChance(lastResults), [lastResults]);
  const isPremium = account?.premium?.active;
  const displayPlans = useMemo(() => {
    return plans.map((p) => ({
      id: p.id,
      code: p.code,
      title: p.title || 'Premium',
      price: p.price_kgs,
      period: p.duration_days >= 90 ? t('account.plan.year') : t('account.plan.month'),
      featured: true,
      features: p.features || [],
    }));
  }, [plans, t]);

  if (loading) {
    return <AccountLoading label={t('common.loading')} />;
  }

  return (
    <div className="account-dashboard">
      <div className="account-dashboard-main">
        {error && <div className="error">{error}</div>}

        <header className="account-greeting">
          <h2>
            {t('account.greeting')}, {getDisplayName(account)}!
          </h2>
          <p>{t('account.greetingSub')}</p>
        </header>

        <PageHint hintId="account" title={t('ux.hint.account.title')}>
          {t('ux.hint.account.text')}
        </PageHint>

        <div className="account-stats-row">
          <StatCard
            icon="chart"
            tone="blue"
            value={analysisTotal}
            label={t('account.stat.analyses')}
          />
          <StatCard
            icon="star"
            tone="green"
            value={favorites.length}
            label={t('account.stat.universities')}
          />
          <StatCard icon="calendar" tone="purple" value="—" label={t('account.stat.tour')} />
          <StatCard
            icon="trophy"
            tone="amber"
            value={ortScore ?? '—'}
            label={t('account.stat.score')}
          />
        </div>

        <section className="account-panel">
          <div className="account-panel-head">
            <h3>{t('account.lastAnalysis')}</h3>
            {lastAnalysis && (
              <span className="account-tag account-tag--green">{t('account.tag.actual')}</span>
            )}
          </div>

          {!lastAnalysis ? (
            <div className="account-empty-block">
              <p className="muted">{t('account.noAnalysis')}</p>
              <Link to="/analysis" className="btn">
                {t('account.runAnalysis')}
              </Link>
            </div>
          ) : (
            <>
              <p className="account-panel-meta muted">
                {new Date(lastAnalysis.created_at).toLocaleString('ru-RU')}
              </p>
              <div className="account-analysis-preview">
                <ChanceRing
                  percent={bestChance.percent}
                  label={t(CHANCE_LABEL[bestChance.category] || CHANCE_LABEL.medium)}
                />
                <div className="account-analysis-bars">
                  {lastResults.map((row) => (
                    <div key={`${row.university}-${row.specialty_name}`} className="account-bar-row">
                      <div className="account-bar-head">
                        <span>{row.university}</span>
                        <strong>{row.chance_percent}%</strong>
                      </div>
                      <div className="account-bar-track">
                        <div
                          className="account-bar-fill"
                          style={{ width: `${row.chance_percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Link to="/analysis" className="btn account-panel-btn">
                {t('account.openAnalysis')}
              </Link>
            </>
          )}
        </section>

        <section className="account-panel">
          <h3>{t('account.upcoming')}</h3>
          <ul className="account-events">
            {UPCOMING_EVENTS.map((ev) => (
              <li key={ev.titleKey} className={`account-event account-event--${ev.tone}`}>
                <span className="account-event-date">{ev.date}</span>
                <AccountIcon name={ev.icon} size={18} />
                <span>{t(ev.titleKey)}</span>
              </li>
            ))}
          </ul>
        </section>

        {favorites.length > 0 && (
          <section className="account-panel">
            <h3>{t('account.recent')}</h3>
            <div className="account-recent-scroll">
              {favorites.slice(0, 6).map((fav) => (
                <Link
                  key={fav.id}
                  to={fav.link || '/universities'}
                  className="account-recent-card"
                >
                  <div className="account-recent-logo">
                    {(fav.entity?.name || 'ВУЗ').slice(0, 3).toUpperCase()}
                  </div>
                  <strong>{fav.entity?.name || 'Вуз'}</strong>
                  <span className="muted">
                    {fav.entity?.university?.name || fav.entity?.faculty?.name || ''}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="account-panel">
          <h3>{t('account.tools')}</h3>
          <div className="account-tools-grid">
            {TOOL_TILES.map((tool) => (
              <Link key={tool.labelKey} to={tool.to} className="account-tool-tile">
                <AccountIcon name={tool.icon} size={28} />
                <span>{t(tool.labelKey)}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <aside className="account-dashboard-aside">
        <section className="account-panel account-sub-card">
          <h3>{t('account.subscription')}</h3>
          {isPremium ? (
            <>
              <div className="account-premium-badge">
                <AccountIcon name="crown" size={20} />
                <span>Premium</span>
              </div>
              {subscription?.ends_at && (
                <p className="muted">
                  {t('account.subUntil')}{' '}
                  {new Date(subscription.ends_at).toLocaleDateString('ru-RU')}
                </p>
              )}
              <ul className="account-check-list">
                <li>
                  <AccountIcon name="check" size={16} /> {t('account.subFeature1')}
                </li>
                <li>
                  <AccountIcon name="check" size={16} /> {t('account.subFeature2')}
                </li>
                <li>
                  <AccountIcon name="check" size={16} /> {t('account.subFeature3')}
                </li>
              </ul>
            </>
          ) : (
            <p className="muted">{t('account.noSubscription')}</p>
          )}
          <Link to="/subscription" className="btn account-sub-manage">
            {t('account.manageSub')}
          </Link>
        </section>

        <section className="account-panel account-sub-card">
          <div className="account-plans-head">
            <h3>{t('account.plans')}</h3>
          </div>

          <div className="account-plans-list">
            {displayPlans.map((plan) => {
              const isCurrent = subscription?.plan_id === plan.id;
              const isFeatured = plan.featured;
              return (
                <div
                  key={plan.id || plan.code}
                  className={`account-plan-card${isFeatured ? ' featured' : ''}${isCurrent ? ' current' : ''}`}
                >
                  {isFeatured && <span className="account-plan-popular">{t('account.plan.popular')}</span>}
                  <h4>{plan.title}</h4>
                  <p className="account-plan-price">
                    {plan.price ? `${plan.price} сом` : t('account.plan.freePrice')}
                    {plan.price > 0 && <span> / {plan.period}</span>}
                  </p>
                  <ul>
                    {(plan.features || []).slice(0, 3).map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  <Link
                    to="/subscription"
                    className={isFeatured ? 'btn' : 'btn btn-secondary'}
                  >
                    {isCurrent ? t('account.plan.renew') : t('account.plan.select')}
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        <section className="account-panel account-sub-card">
          <h3>{t('account.payments')}</h3>
          {subscription ? (
            <div className="account-payment-row">
              <div>
                <strong>Premium</strong>
                <p className="muted">
                  {subscription.starts_at
                    ? new Date(subscription.starts_at).toLocaleDateString('ru-RU')
                    : '—'}
                </p>
              </div>
              <span className="account-pay-status">{t('account.payment.success')}</span>
            </div>
          ) : (
            <p className="muted">{t('account.noPayments')}</p>
          )}
        </section>
      </aside>
    </div>
  );
}
