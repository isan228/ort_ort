import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { AccountAlerts, AccountPageWrap, AccountPanel, AccountLoading } from '../components/account/AccountSection.jsx';

const STATUS_LABELS = {
  open: 'Открыт',
  in_progress: 'В работе',
  closed: 'Закрыт',
};

export default function SupportPage() {
  const [tickets, setTickets] = useState([]);
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getSupportTickets();
      setTickets(data.tickets || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await api.createSupportTicket({ topic, message });
      setTopic('');
      setMessage('');
      setSuccess('Обращение создано');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AccountPageWrap title="Поддержка" subtitle="Задайте вопрос команде ORT.KG или сообщите о проблеме">
      <AccountAlerts error={error} message={success} />

      <AccountPanel title="Новое обращение">
        <form className="account-form" onSubmit={handleCreate}>
          <label className="account-field">
            <span>Тема</span>
            <input
              className="account-input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
            />
          </label>
          <label className="account-field">
            <span>Сообщение</span>
            <textarea
              className="account-textarea"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={4}
            />
          </label>
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? 'Отправка...' : 'Отправить'}
          </button>
        </form>
      </AccountPanel>

      <AccountPanel title="Мои обращения">
        {loading ? (
          <AccountLoading compact />
        ) : tickets.length === 0 ? (
          <p className="account-muted-line">Обращений пока нет.</p>
        ) : (
          <div className="account-ticket-list">
            {tickets.map((ticket) => (
              <Link key={ticket.id} to={`/account/support/${ticket.id}`} className="account-ticket-card">
                <div className="account-ticket-head">
                  <strong>{ticket.topic}</strong>
                  <span className="account-status-pill">{STATUS_LABELS[ticket.status] || ticket.status}</span>
                </div>
                <p className="account-muted-line">
                  Обновлено: {new Date(ticket.updated_at || ticket.last_reply_at).toLocaleString('ru-RU')}
                </p>
              </Link>
            ))}
          </div>
        )}
      </AccountPanel>
    </AccountPageWrap>
  );
}
