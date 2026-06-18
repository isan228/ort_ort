import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getStoredUser } from '../api/client.js';

export default function NavNotifications({ label = 'Уведомления' }) {
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

  return (
    <Link to="/account/notifications" className="nav-notifications">
      {label}
      {unread > 0 && <span className="nav-badge">{unread}</span>}
    </Link>
  );
}
