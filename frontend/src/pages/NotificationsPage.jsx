import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';

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

  if (loading) return <p>Загрузка...</p>;

  return (
    <>
      <h1>Уведомления</h1>
      {unreadCount > 0 && <p className="muted">Непрочитанных: {unreadCount}</p>}

      {error && <div className="error">{error}</div>}

      <div className="notification-list">
        {notifications.map((item) => (
          <div
            key={item.id}
            className={`card notification-item${item.is_read ? '' : ' unread'}`}
          >
            <div className="notification-head">
              <strong>{item.title}</strong>
              <span className="muted">{new Date(item.created_at).toLocaleString('ru-RU')}</span>
            </div>
            <p>{item.body}</p>
            <div className="notification-actions">
              {!item.is_read && (
                <button type="button" className="btn btn-secondary" onClick={() => markRead(item.id, null)}>
                  Прочитано
                </button>
              )}
              {item.action_url && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => markRead(item.id, item.action_url)}
                >
                  Открыть
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {!notifications.length && <p className="muted">Уведомлений пока нет.</p>}

      <p style={{ marginTop: 16 }}>
        <Link to="/account">← Личный кабинет</Link>
      </p>
    </>
  );
}
