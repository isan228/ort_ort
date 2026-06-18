import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { AccountAlerts, AccountPageWrap } from '../components/account/AccountSection.jsx';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count ?? 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function markRead(id, actionUrl) {
    try {
      await api.markNotificationRead(id);
      await load();
      if (actionUrl) navigate(actionUrl);
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p className="account-loading">Загрузка...</p>;

  return (
    <AccountPageWrap
      title="Уведомления"
      subtitle={unreadCount > 0 ? `Непрочитанных: ${unreadCount}` : 'Все уведомления прочитаны'}
    >
      <AccountAlerts error={error} />

      <div className="account-notification-list">
        {notifications.map((item) => (
          <article
            key={item.id}
            className={`account-notification-item${item.is_read ? '' : ' unread'}`}
          >
            <div className="account-notification-head">
              <strong>{item.title}</strong>
              <time>{new Date(item.created_at).toLocaleString('ru-RU')}</time>
            </div>
            <p>{item.body}</p>
            <div className="account-btn-row">
              {!item.is_read && (
                <button type="button" className="btn btn-secondary" onClick={() => markRead(item.id, null)}>
                  Прочитано
                </button>
              )}
              {item.action_url && (
                <button type="button" className="btn" onClick={() => markRead(item.id, item.action_url)}>
                  Открыть
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      {!notifications.length && <p className="account-muted-line">Уведомлений пока нет.</p>}
    </AccountPageWrap>
  );
}
