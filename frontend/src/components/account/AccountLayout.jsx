import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { api, getStoredUser } from '../../api/client.js';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { AccountIcon } from '../icons/AccountIcons.jsx';

function getInitials(user) {
  const name = user?.profile?.nickname || user?.email || user?.phone || 'U';
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getDisplayName(user) {
  return user?.profile?.nickname || user?.email?.split('@')[0] || user?.phone || 'Пользователь';
}

function navClass({ isActive }) {
  return isActive ? 'account-nav-link active' : 'account-nav-link';
}

export default function AccountLayout() {
  const { t } = useI18n();
  const location = useLocation();
  const stored = getStoredUser();
  const [unread, setUnread] = useState(0);
  const isDashboard = location.pathname === '/account';

  useEffect(() => {
    api
      .getNotifications()
      .then((data) => setUnread(data.unread_count ?? 0))
      .catch(() => setUnread(0));
  }, [location.pathname]);

  const mainNav = [
    { to: '/account', icon: 'home', label: t('account.nav.home'), end: true },
    { to: '/account/scores', icon: 'user', label: t('account.nav.data') },
    { to: '/analysis', icon: 'chart', label: t('account.nav.analyses') },
    { to: '/tours', icon: 'calendar', label: t('account.nav.tours') },
    { to: '/account/collections', icon: 'star', label: t('account.nav.favorites') },
    { to: '/account/notifications', icon: 'bell', label: t('account.nav.notifications'), badge: unread },
  ];

  const toolsNav = [
    { to: '/analysis', icon: 'analysis', label: t('account.nav.toolAnalysis') },
    { to: '/universities', icon: 'catalog', label: t('account.nav.toolCatalog') },
    { to: '/rankings', icon: 'ranking', label: t('account.nav.toolRanking') },
    { to: '/account/scores', icon: 'calc', label: t('account.nav.toolCalc') },
    { to: '/account/collections', icon: 'compare', label: t('account.nav.toolCompare') },
  ];

  const supportNav = [
    { to: '/account/support', icon: 'help', label: t('account.nav.help') },
    { to: '/faq', icon: 'faq', label: t('account.nav.faq') },
    { to: '/account/support', icon: 'mail', label: t('account.nav.contact') },
  ];

  return (
    <div className="account-shell">
      <div className="account-topbar">
        <h1 className="account-topbar-title">{t('account.title')}</h1>
        <div className="account-topbar-actions">
          <Link to="/account/notifications" className="account-bell-btn" aria-label={t('account.nav.notifications')}>
            <AccountIcon name="bell" size={22} />
            {unread > 0 && <span className="account-bell-badge">{unread > 9 ? '9+' : unread}</span>}
          </Link>
          <div className="account-user-chip">
            <div className="account-avatar">{getInitials(stored)}</div>
            <div className="account-user-meta">
              <strong>{getDisplayName(stored)}</strong>
              <span className="account-user-id">
                ID: {stored?.id ? String(stored.id).slice(0, 8) : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="account-body">
        <aside className="account-sidebar">
          <nav className="account-nav">
            {mainNav.map((item) => (
              <NavLink key={item.to + item.label} to={item.to} end={item.end} className={navClass}>
                <AccountIcon name={item.icon} size={18} />
                <span>{item.label}</span>
                {item.badge > 0 && <span className="account-nav-badge">{item.badge}</span>}
              </NavLink>
            ))}
          </nav>

          <p className="account-nav-section">{t('account.nav.tools')}</p>
          <nav className="account-nav account-nav--tools">
            {toolsNav.map((item) => (
              <NavLink key={item.label} to={item.to} className={navClass}>
                <AccountIcon name={item.icon} size={18} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <p className="account-nav-section">{t('account.nav.support')}</p>
          <nav className="account-nav account-nav--tools">
            {supportNav.map((item) => (
              <NavLink key={item.label} to={item.to} className={navClass}>
                <AccountIcon name={item.icon} size={18} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="account-invite-card">
            <AccountIcon name="gift" size={24} className="account-invite-icon" />
            <div>
              <strong>{t('account.invite.title')}</strong>
              <p>{t('account.invite.desc')}</p>
            </div>
            <Link to="/account/wallet" className="btn btn-sm account-invite-btn">
              {t('account.invite.btn')}
            </Link>
          </div>
        </aside>

        <div className={`account-content${isDashboard ? ' account-content--dashboard' : ''}`}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
