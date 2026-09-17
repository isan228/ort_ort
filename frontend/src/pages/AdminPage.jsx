import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, getUserRole, getStoredUser } from '../api/client.js';
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
import { AccountIcon } from '../components/icons/AccountIcons.jsx';
import BurgerButton from '../components/ux/BurgerButton.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';

function getInitials(user) {
  const name = user?.profile?.nickname || user?.email || user?.phone || 'A';
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getDisplayName(user) {
  return user?.profile?.nickname || user?.email?.split('@')[0] || user?.phone || 'Админ';
}

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
  const navigate = useNavigate();
  const { t, locale, setLocale } = useI18n();
  const stored = getStoredUser();
  const [tab, setTab] = useState('certificates');
  const [menuOpen, setMenuOpen] = useState(false);
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

  const canManagePayments = ['admin', 'superadmin'].includes(getUserRole());

  const moderationNav = [
    { id: 'certificates', icon: 'check', label: 'Сертификаты', count: certificates.length },
    { id: 'corrections', icon: 'calc', label: 'Исправления', count: corrections.length },
    { id: 'support', icon: 'help', label: 'Поддержка', count: supportTickets.length },
  ];

  const contentNav = [
    { id: 'catalog', icon: 'catalog', label: 'Вузы и каталог', count: catalog.length },
    { id: 'tours', icon: 'calendar', label: 'Туры', count: tours.length },
    { id: 'news', icon: 'news', label: 'Новости', count: newsArticles.length },
  ];

  const systemNav = [
    { id: 'users', icon: 'user', label: 'Пользователи', count: usersTotal },
    { id: 'legal', icon: 'compare', label: 'Legal' },
    { id: 'faq', icon: 'faq', label: 'FAQ', count: faqItems.length },
    ...(canManagePayments
      ? [
          { id: 'payments', icon: 'wallet', label: 'Платежи', count: paymentsTotal },
          { id: 'promo', icon: 'gift', label: 'Промокоды', count: promoCodes.length },
        ]
      : []),
  ];

  const activeNavItem = [...moderationNav, ...contentNav, ...systemNav].find((item) => item.id === tab);

  useEffect(() => {
    setMenuOpen(false);
  }, [tab]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  async function reloadCatalog() {
    try {
      const catalogRes = await api.adminGetCatalog();
      setCatalog(catalogRes.universities || []);
    } catch (err) {
      setError(err.message);
    }
  }

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

  async function handleLogout() {
    await api.logout();
    setMenuOpen(false);
    navigate('/login');
  }

  function selectTab(id) {
    setTab(id);
    setMenuOpen(false);
  }

  function renderNavItems(items) {
    return items.map((item) => (
      <button
        key={item.id}
        type="button"
        className={`account-nav-link admin-nav-btn${tab === item.id ? ' active' : ''}`}
        onClick={() => selectTab(item.id)}
      >
        <AccountIcon name={item.icon} size={18} />
        <span>{item.label}</span>
        {item.count != null && item.count > 0 && (
          <span className="account-nav-badge">{item.count > 99 ? '99+' : item.count}</span>
        )}
      </button>
    ));
  }

  return (
    <div className="account-shell admin-shell">
      <header className={`account-topbar${menuOpen ? ' account-topbar--menu-open' : ''}`}>
        <div className="account-topbar-left">
          <Link to="/" className="account-logo">
            ORT.KG
          </Link>
          <span className="account-topbar-sep" aria-hidden />
          <span className="account-topbar-label">Админ-панель</span>
        </div>

        <div className="account-topbar-actions">
          <div className="lang-switch account-lang-switch" role="group" aria-label={t('account.language')}>
            <button
              type="button"
              className={locale === 'ru' ? 'chip active' : 'chip'}
              onClick={() => setLocale('ru')}
            >
              {t('lang.ru')}
            </button>
            <button
              type="button"
              className={locale === 'ky' ? 'chip active' : 'chip'}
              onClick={() => setLocale('ky')}
            >
              {t('lang.ky')}
            </button>
          </div>

          <div className="account-user-chip">
            <div className="account-avatar">{getInitials(stored)}</div>
            <div className="account-user-meta">
              <strong>{getDisplayName(stored)}</strong>
              <span className="account-user-id">{getUserRole() || 'staff'}</span>
            </div>
          </div>

          <button type="button" className="account-logout-btn" onClick={handleLogout}>
            {t('nav.logout')}
          </button>

          <BurgerButton
            open={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            label={t('ux.menu')}
            controlsId="admin-nav-drawer"
          />
        </div>
      </header>

      {menuOpen && (
        <button
          type="button"
          className="header-backdrop"
          aria-label={t('ux.menuClose')}
          tabIndex={-1}
          onClick={() => setMenuOpen(false)}
        />
      )}

      <div id="admin-nav-drawer" className={`account-header-drawer${menuOpen ? ' is-open' : ''}`}>
        <div className="account-drawer-user">
          <div className="account-avatar">{getInitials(stored)}</div>
          <div>
            <strong>{getDisplayName(stored)}</strong>
            <span className="account-user-id">{getUserRole() || 'staff'}</span>
          </div>
        </div>

        <p className="nav-drawer-section">Модерация</p>
        <nav className="account-drawer-nav">{renderNavItems(moderationNav)}</nav>

        <p className="nav-drawer-section">Контент</p>
        <nav className="account-drawer-nav">{renderNavItems(contentNav)}</nav>

        <p className="nav-drawer-section">Система</p>
        <nav className="account-drawer-nav">{renderNavItems(systemNav)}</nav>

        <Link to="/account" className="account-drawer-link" onClick={() => setMenuOpen(false)}>
          <AccountIcon name="home" size={18} />
          <span>В кабинет</span>
        </Link>

        <button type="button" className="account-drawer-link account-drawer-logout" onClick={handleLogout}>
          {t('nav.logout')}
        </button>
      </div>

      <div className="account-body">
        <aside className="account-sidebar">
          <p className="account-nav-section">Модерация</p>
          <nav className="account-nav">{renderNavItems(moderationNav)}</nav>

          <p className="account-nav-section">Контент</p>
          <nav className="account-nav account-nav--tools">{renderNavItems(contentNav)}</nav>

          <p className="account-nav-section">Система</p>
          <nav className="account-nav account-nav--tools">{renderNavItems(systemNav)}</nav>

          <div className="account-invite-card admin-sidebar-card">
            <AccountIcon name="admin" size={24} className="account-invite-icon" />
            <div>
              <strong>Служебная панель</strong>
              <p>Модерация, каталог, платежи и настройки платформы</p>
            </div>
            <Link to="/account" className="btn btn-sm account-invite-btn">
              В кабинет
            </Link>
          </div>
        </aside>

        <div className="account-content">
          <header className="account-page-head">
            <h2>{activeNavItem?.label || 'Админ-панель'}</h2>
            <p>Управление платформой ORT.KG</p>
          </header>

          <div className="account-stats-row account-stats-row--admin">
            <div className="account-stat-card account-stat-card--blue">
              <AccountIcon name="check" size={22} />
              <div>
                <strong>{certificates.length}</strong>
                <span>сертификаты</span>
              </div>
            </div>
            <div className="account-stat-card account-stat-card--amber">
              <AccountIcon name="calc" size={22} />
              <div>
                <strong>{corrections.length}</strong>
                <span>исправления</span>
              </div>
            </div>
            <div className="account-stat-card account-stat-card--purple">
              <AccountIcon name="help" size={22} />
              <div>
                <strong>{supportTickets.length}</strong>
                <span>поддержка</span>
              </div>
            </div>
            <div className="account-stat-card account-stat-card--green">
              <AccountIcon name="catalog" size={22} />
              <div>
                <strong>{catalog.length}</strong>
                <span>вузы</span>
              </div>
            </div>
          </div>

          {error && <div className="error account-alert">{error}</div>}

          {loading ? (
            <PageLoader compact />
          ) : (
            <section className="account-panel admin-content-panel">
              {tab === 'certificates' && (
                <>
                  {certificates.map((cert) => (
                    <CertificateCard key={cert.id} cert={cert} onUpdated={load} />
                  ))}
                  {!certificates.length && <p className="account-muted-line">Нет сертификатов на проверке.</p>}
                </>
              )}

              {tab === 'corrections' && (
                <>
                  {corrections.map((req) => (
                    <CorrectionCard key={req.id} request={req} onUpdated={load} />
                  ))}
                  {!corrections.length && <p className="account-muted-line">Нет открытых запросов.</p>}
                </>
              )}

              {tab === 'support' && (
                <>
                  {supportTickets.map((ticket) => (
                    <SupportTicketCard key={ticket.id} ticket={ticket} onUpdated={load} />
                  ))}
                  {!supportTickets.length && <p className="account-muted-line">Нет тикетов поддержки.</p>}
                </>
              )}

              {tab === 'catalog' && (
                <AdminCatalogTab universities={catalog} onUpdated={reloadCatalog} />
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

              {tab === 'legal' && <AdminLegalTab documents={legalDocuments} onUpdated={load} />}

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
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
