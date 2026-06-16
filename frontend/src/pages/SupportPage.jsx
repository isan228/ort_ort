import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

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
    <>
      <h1>Поддержка</h1>
      <p className="muted">Задайте вопрос команде ORT.KG или сообщите о проблеме.</p>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="card">
        <h2>Новое обращение</h2>
        <form onSubmit={handleCreate}>
          <label>
            Тема
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
              style={{ display: 'block', width: '100%', maxWidth: 480, padding: 8, margin: '4px 0 12px' }}
            />
          </label>
          <label>
            Сообщение
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={4}
              style={{ display: 'block', width: '100%', marginBottom: 12 }}
            />
          </label>
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? 'Отправка...' : 'Отправить'}
          </button>
        </form>
      </div>

      <h2>Мои обращения</h2>
      {loading ? (
        <p>Загрузка...</p>
      ) : tickets.length === 0 ? (
        <p className="muted">Обращений пока нет.</p>
      ) : (
        <div className="ticket-list">
          {tickets.map((ticket) => (
            <Link key={ticket.id} to={`/account/support/${ticket.id}`} className="card ticket-card">
              <div className="ticket-card-head">
                <strong>{ticket.topic}</strong>
                <span className="muted">{STATUS_LABELS[ticket.status] || ticket.status}</span>
              </div>
              <p className="muted">
                Обновлено: {new Date(ticket.updated_at || ticket.last_reply_at).toLocaleString('ru-RU')}
              </p>
            </Link>
          ))}
        </div>
      )}

      <p style={{ marginTop: 16 }}>
        <Link to="/account">← Кабинет</Link>
      </p>
    </>
  );
}
