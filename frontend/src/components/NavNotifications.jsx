import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getStoredUser } from '../api/client.js';

export default function NavNotifications({ label = 'Уведомления', variant = 'text' }) {
  const userId = getStoredUser()?.id ?? null;
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!userId) {
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
  }, [userId]);

  if (!userId) return null;

  if (variant === 'icon') {
    return (
      <Link
        to="/account/notifications"
        className="header-bell"
        aria-label={unread > 0 ? `${label}: ${unread}` : label}
      >
        <span aria-hidden="true">🔔</span>
        {unread > 0 && <span className="header-bell-badge">{unread > 9 ? '9+' : unread}</span>}
      </Link>
    );
  }

  return (
    <Link to="/account/notifications" className="nav-notifications site-nav-link site-nav-link--row">
      <span className="site-nav-link-icon" aria-hidden="true">
        🔔
      </span>
      <span className="site-nav-link-label">{label}</span>
      {unread > 0 && <span className="nav-badge">{unread}</span>}
    </Link>
  );
}
