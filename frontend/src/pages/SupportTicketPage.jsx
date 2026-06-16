import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';

export default function SupportTicketPage() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getSupportTicket(id);
      setTicket(data.ticket);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function sendReply(e) {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      await api.replySupportTicket(id, reply);
      setReply('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  if (loading) return <p>Загрузка...</p>;
  if (error && !ticket) return <div className="error">{error}</div>;
  if (!ticket) return <p>Тикет не найден</p>;

  return (
    <>
      <p className="muted">
        <Link to="/account/support">← Все обращения</Link>
      </p>

      <h1>{ticket.topic}</h1>
      <p className="muted">Статус: {ticket.status}</p>

      {error && <div className="error">{error}</div>}

      <div className="chat-thread">
        {(ticket.messages || []).map((msg) => (
          <div
            key={msg.id}
            className={`chat-bubble${msg.sender_role === 'user' ? ' chat-user' : ' chat-staff'}`}
          >
            <div className="chat-meta">{msg.sender_role}</div>
            <p>{msg.message}</p>
            <span className="muted chat-time">
              {new Date(msg.created_at).toLocaleString('ru-RU')}
            </span>
          </div>
        ))}
      </div>

      {ticket.status !== 'closed' && (
        <form className="card" onSubmit={sendReply}>
          <h2>Ответить</h2>
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            required
            rows={3}
            style={{ width: '100%', marginBottom: 8 }}
          />
          <button type="submit" className="btn" disabled={sending}>
            {sending ? 'Отправка...' : 'Отправить'}
          </button>
        </form>
      )}
    </>
  );
}
