import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { AccountAlerts, AccountPageWrap, AccountPanel, AccountLoading } from '../components/account/AccountSection.jsx';

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

  if (loading) return <AccountLoading />;
  if (!ticket) return <div className="error account-alert">{error || 'Тикет не найден'}</div>;

  return (
    <AccountPageWrap title={ticket.topic} subtitle={`Статус: ${ticket.status}`}>
      <p className="account-back-link">
        <Link to="/account/support">← Все обращения</Link>
      </p>

      <AccountAlerts error={error} />

      <div className="account-chat-thread">
        {(ticket.messages || []).map((msg) => (
          <div
            key={msg.id}
            className={`account-chat-bubble${msg.sender_role === 'user' ? ' user' : ' staff'}`}
          >
            <div className="account-chat-meta">{msg.sender_role}</div>
            <p>{msg.message}</p>
            <time>{new Date(msg.created_at).toLocaleString('ru-RU')}</time>
          </div>
        ))}
      </div>

      {ticket.status !== 'closed' && (
        <AccountPanel title="Ответить">
          <form className="account-form" onSubmit={sendReply}>
            <textarea
              className="account-textarea"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              required
              rows={3}
            />
            <button type="submit" className="btn" disabled={sending}>
              {sending ? 'Отправка...' : 'Отправить'}
            </button>
          </form>
        </AccountPanel>
      )}
    </AccountPageWrap>
  );
}
