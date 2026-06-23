import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, isAuthenticated } from '../api/client.js';
import { AccountIcon } from './icons/AccountIcons.jsx';

export default function NavNotifications({ label = 'Уведомления', variant = 'text' }) {
  const authed = isAuthenticated();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!authed) {
      setUnread(0);
      return undefined;
    }

    let cancelled = false;
    api
      .getNotifications()
      .then((data) => {
        if (!cancelled) setUnread(data.unread_count ?? 0);
      })
      .catch(() => {
        if (!cancelled) setUnread(0);
      });

    return () => {
      cancelled = true;
    };
  }, [authed]);

  if (!authed) return null;

  if (variant === 'icon') {
    return (
      <Link
        to="/account/notifications"
        className="header-bell"
        aria-label={unread > 0 ? `${label}: ${unread}` : label}
      >
        <AccountIcon name="bell" size={20} />
        {unread > 0 && <span className="header-bell-badge">{unread > 9 ? '9+' : unread}</span>}
      </Link>
    );
  }

  return (
    <Link to="/account/notifications" className="nav-notifications site-nav-link site-nav-link--row">
      <AccountIcon name="bell" size={18} className="site-nav-link-icon" />
      <span className="site-nav-link-label">{label}</span>
      {unread > 0 && <span className="nav-badge">{unread}</span>}
    </Link>
  );
}
