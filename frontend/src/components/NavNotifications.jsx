import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getStoredUser } from '../api/client.js';

export default function NavNotifications({ label = 'Уведомления' }) {
  const user = getStoredUser();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    api
      .getNotifications()
      .then((data) => setUnread(data.unread_count ?? 0))
      .catch(() => setUnread(0));
  }, [user]);

  if (!user) return null;

  return (
    <Link to="/account/notifications" className="nav-notifications">
      {label}
      {unread > 0 && <span className="nav-badge">{unread}</span>}
    </Link>
  );
}
