import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getUserRole } from '../api/client.js';
import AdminCatalogTab from '../components/admin/AdminCatalogTab.jsx';
import AdminToursTab from '../components/admin/AdminToursTab.jsx';
import AdminNewsTab from '../components/admin/AdminNewsTab.jsx';
import AdminUsersTab from '../components/admin/AdminUsersTab.jsx';
import AdminLegalTab from '../components/admin/AdminLegalTab.jsx';
import AdminFaqTab from '../components/admin/AdminFaqTab.jsx';
import AdminPaymentsTab from '../components/admin/AdminPaymentsTab.jsx';
import AdminPromoTab from '../components/admin/AdminPromoTab.jsx';
import { ORT_MAIN_SCORE_MIN, ORT_MAIN_SCORE_MAX, validateOrtMainScore, getOrtScoreErrorMessage } from '../utils/ortScore.js';
import PageLoader from '../components/ux/PageLoader.jsx';
import { useToast } from '../components/ux/ToastContext.jsx';

function CertificateCard({ cert, onUpdated }) {
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function verify() {
    setBusy(true);
    setError('');
    try {
      await api.adminVerifyCertificate(cert.id);
      onUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    setBusy(true);
    setError('');
    try {
      await api.adminRejectCertificate(cert.id, rejectReason || 'Документ не прошёл проверку');
      onUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const user = cert.user;
  const profile = user?.profile;

  return (
    <div className="card admin-card">
      <h3>{profile?.nickname || user?.email || user?.phone || cert.user_id}</h3>
      <p className="muted">
        {user?.email} {user?.phone ? `· ${user.phone}` : ''}
      </p>
      <p>Статус: {cert.status}</p>
      {cert.file && (
        <p className="muted">
          Файл: {cert.file.mime_type} · {(cert.file.size / 1024).toFixed(1)} KB
        </p>
      )}
      {error && <div className="error">{error}</div>}
      <div className="admin-actions">
        <button type="button" className="btn" disabled={busy} onClick={verify}>
          Подтвердить
        </button>
        <input
          type="text"
          placeholder="Причина отклонения"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          style={{ flex: 1, minWidth: 160, padding: 8 }}
        />
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={reject}>
          Отклонить
        </button>
      </div>
    </div>
  );
}

function CorrectionCard({ request, onUpdated }) {
  const profile = request.scoreProfile;
  const [mainScore, setMainScore] = useState(String(profile?.main_score ?? ''));
  const [adminComment, setAdminComment] = useState('');
  const [rejectComment, setRejectComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function approve() {
    setBusy(true);
    setError('');
    const check = validateOrtMainScore(mainScore);
    if (!check.valid) {
      setError(getOrtScoreErrorMessage(check.error));
      setBusy(false);
      return;
    }
    try {
      await api.adminApproveCorrection(request.id, {
        main_score: check.value,
        admin_comment: adminComment || undefined,
      });
      onUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    setBusy(true);
    setError('');
    try {
      await api.adminRejectCorrection(request.id, rejectComment || 'Запрос отклонён');
      onUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const user = request.user;

  return (
    <div className="card admin-card">
      <h3>{user?.profile?.nickname || user?.email || request.user_id}</h3>
      <p className="muted">Текущий балл: {profile?.main_score ?? '—'}</p>
      <p>{request.message}</p>
      <label>
        Новый основной балл
        <input
          type="number"
          min={ORT_MAIN_SCORE_MIN}
          max={ORT_MAIN_SCORE_MAX}
          value={mainScore}
          onChange={(e) => setMainScore(e.target.value)}
          style={{ display: 'block', width: 120, padding: 8, marginTop: 4, marginBottom: 8 }}
        />
      </label>
      <input
        type="text"
        placeholder="Комментарий (одобрение)"
        value={adminComment}
        onChange={(e) => setAdminComment(e.target.value)}
        style={{ width: '100%', padding: 8, marginBottom: 8 }}
      />
      <input
        type="text"
        placeholder="Причина отклонения"
        value={rejectComment}
        onChange={(e) => setRejectComment(e.target.value)}
        style={{ width: '100%', padding: 8, marginBottom: 8 }}
      />
      {error && <div className="error">{error}</div>}
      <div className="admin-actions">
        <button type="button" className="btn" disabled={busy} onClick={approve}>
          Одобрить
        </button>
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={reject}>
          Отклонить
        </button>
      </div>
    </div>
  );
}

function SupportTicketCard({ ticket, onUpdated }) {
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const user = ticket.user;
  const lastMessage = ticket.messages?.[0];

  async function sendReply() {
    if (!reply.trim()) return;
    setBusy(true);
    setError('');
    try {
      await api.replySupportTicket(ticket.id, reply.trim());
      setReply('');
      onUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card admin-card">
      <h3>{ticket.topic}</h3>
      <p className="muted">
        {user?.profile?.nickname || user?.email || ticket.user_id} · {ticket.status}
      </p>
      {lastMessage && <p className="muted">Последнее: {lastMessage.message}</p>}
      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        rows={2}
        placeholder="Ответ менеджера"
        style={{ width: '100%', marginBottom: 8 }}
      />
      {error && <div className="error">{error}</div>}
      <button type="button" className="btn" disabled={busy} onClick={sendReply}>
        Ответить
      </button>
    </div>
  );
}

export default function AdminPage() {
  const toast = useToast();
  const [tab, setTab] = useState('certificates');
  const [certificates, setCertificates] = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [tours, setTours] = useState([]);
  const [newsArticles, setNewsArticles] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [roles, setRoles] = useState([]);
  const [legalDocuments, setLegalDocuments] = useState({});
  const [faqItems, setFaqItems] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paymentsTotal, setPaymentsTotal] = useState(0);
  const [promoCodes, setPromoCodes] = useState([]);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [certs, corr, support, catalogRes, toursRes, newsRes, usersRes, rolesRes, legalRes, faqRes] =
        await Promise.all([
        api.adminPendingCertificates(),
        api.adminPendingCorrections(),
        api.adminSupportTickets(),
        api.adminGetCatalog(),
        api.adminGetTours(),
        api.adminGetNews(),
        api.adminGetUsers({ search: userSearch || undefined }),
        api.adminGetRoles(),
        api.adminGetLegal(),
        api.adminGetFaq(),
      ]);
      setCertificates(certs.certificates || []);
      setCorrections(corr.requests || []);
      setSupportTickets(support.tickets || []);
      setCatalog(catalogRes.universities || []);
      setTours(toursRes.tours || []);
      setNewsArticles(newsRes.articles || []);
      setAdminUsers(usersRes.users || []);
      setUsersTotal(usersRes.total || 0);
      setRoles(rolesRes.roles || []);
      setLegalDocuments(legalRes.documents || {});
      setFaqItems(faqRes.items || []);

      const role = getUserRole();
      if (role === 'admin' || role === 'superadmin') {
        const [paymentsRes, promoRes] = await Promise.all([
          api.adminGetPayments({ status: paymentStatusFilter || undefined }),
          api.adminGetPromoCodes(),
        ]);
        setPayments(paymentsRes.payments || []);
        setPaymentsTotal(paymentsRes.total || 0);
        setPromoCodes(promoRes.promo_codes || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function filterPayments(status) {
    setPaymentStatusFilter(status);
    setLoading(true);
    setError('');
    try {
      const paymentsRes = await api.adminGetPayments({ status: status || undefined });
      setPayments(paymentsRes.payments || []);
      setPaymentsTotal(paymentsRes.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const canManagePayments = ['admin', 'superadmin'].includes(getUserRole());

  async function searchUsers(query) {
    setUserSearch(query);
    setLoading(true);
    setError('');
    try {
      const usersRes = await api.adminGetUsers({ search: query || undefined });
      setAdminUsers(usersRes.users || []);
      setUsersTotal(usersRes.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-inner">
      <header className="admin-page-head">
      <h1>Админ-панель</h1>
      <p className="muted">
        Модерация, каталог вузов, туры, новости и системные настройки.
      </p>
      </header>

      <div className="admin-tabs">
        <button
          type="button"
          className={tab === 'certificates' ? 'btn' : 'btn btn-secondary'}
          onClick={() => setTab('certificates')}
        >
          Сертификаты ({certificates.length})
        </button>
        <button
          type="button"
          className={tab === 'corrections' ? 'btn' : 'btn btn-secondary'}
          onClick={() => setTab('corrections')}
        >
          Исправления ({corrections.length})
        </button>
        <button
          type="button"
          className={tab === 'support' ? 'btn' : 'btn btn-secondary'}
          onClick={() => setTab('support')}
        >
          Поддержка ({supportTickets.length})
        </button>
        <button
          type="button"
          className={tab === 'catalog' ? 'btn' : 'btn btn-secondary'}
          onClick={() => setTab('catalog')}
        >
          Каталог ({catalog.length})
        </button>
        <button
          type="button"
          className={tab === 'tours' ? 'btn' : 'btn btn-secondary'}
          onClick={() => setTab('tours')}
        >
          Туры ({tours.length})
        </button>
        <button
          type="button"
          className={tab === 'news' ? 'btn' : 'btn btn-secondary'}
          onClick={() => setTab('news')}
        >
          Новости ({newsArticles.length})
        </button>
        <button
          type="button"
          className={tab === 'users' ? 'btn' : 'btn btn-secondary'}
          onClick={() => setTab('users')}
        >
          Пользователи ({usersTotal})
        </button>
        <button
          type="button"
          className={tab === 'legal' ? 'btn' : 'btn btn-secondary'}
          onClick={() => setTab('legal')}
        >
          Legal
        </button>
        <button
          type="button"
          className={tab === 'faq' ? 'btn' : 'btn btn-secondary'}
          onClick={() => setTab('faq')}
        >
          FAQ ({faqItems.length})
        </button>
        {canManagePayments && (
          <button
            type="button"
            className={tab === 'payments' ? 'btn' : 'btn btn-secondary'}
            onClick={() => setTab('payments')}
          >
            Платежи ({paymentsTotal})
          </button>
        )}
        {canManagePayments && (
          <button
            type="button"
            className={tab === 'promo' ? 'btn' : 'btn btn-secondary'}
            onClick={() => setTab('promo')}
          >
            Промокоды
          </button>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <PageLoader compact />
      ) : (
        <>
          {tab === 'certificates' && (
            <>
              {certificates.map((cert) => (
                <CertificateCard key={cert.id} cert={cert} onUpdated={load} />
              ))}
              {!certificates.length && <p className="muted">Нет сертификатов на проверке.</p>}
            </>
          )}

          {tab === 'corrections' && (
            <>
              {corrections.map((req) => (
                <CorrectionCard key={req.id} request={req} onUpdated={load} />
              ))}
              {!corrections.length && <p className="muted">Нет открытых запросов.</p>}
            </>
          )}

          {tab === 'support' && (
            <>
              {supportTickets.map((ticket) => (
                <SupportTicketCard key={ticket.id} ticket={ticket} onUpdated={load} />
              ))}
              {!supportTickets.length && <p className="muted">Нет тикетов поддержки.</p>}
            </>
          )}

          {tab === 'catalog' && (
            <AdminCatalogTab universities={catalog} onUpdated={load} />
          )}

          {tab === 'tours' && <AdminToursTab tours={tours} onUpdated={load} />}

          {tab === 'news' && <AdminNewsTab articles={newsArticles} onUpdated={load} />}

          {tab === 'users' && (
            <AdminUsersTab
              users={adminUsers}
              roles={roles}
              total={usersTotal}
              onSearch={searchUsers}
              onUpdated={load}
            />
          )}

          {tab === 'legal' && (
            <AdminLegalTab documents={legalDocuments} onUpdated={load} />
          )}

          {tab === 'faq' && <AdminFaqTab items={faqItems} onUpdated={load} />}

          {tab === 'payments' && canManagePayments && (
            <AdminPaymentsTab
              payments={payments}
              total={paymentsTotal}
              onFilter={filterPayments}
              onUpdated={load}
            />
          )}

          {tab === 'promo' && canManagePayments && (
            <AdminPromoTab promoCodes={promoCodes} onUpdated={load} />
          )}
        </>
      )}

      <p className="page-breadcrumbs" style={{ marginTop: '1rem' }}>
        <Link to="/account">← Кабинет</Link>
      </p>
      </div>
    </div>
  );
}
