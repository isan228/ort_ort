import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import NavNotifications from './NavNotifications.jsx';
import { api, getStoredUser, isStaffRole } from '../api/client.js';
import { useI18n } from '../i18n/I18nContext.jsx';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const isAccount = location.pathname.startsWith('/account');
  const isNews = location.pathname.startsWith('/news');
  const { t, locale, setLocale } = useI18n();
  const [user, setUser] = useState(() => getStoredUser());
  const staff = isStaffRole(user?.role?.code);

  async function handleLogout() {
    await api.logout();
    setUser(null);
    navigate('/');
  }

  return (
    <>
      {!isAccount && (
        <header className={`site-header${isLanding ? ' site-header--landing' : ''}`}>
          <div className="container header-inner">
            <Link to="/" className="logo">
              ORT.KG
            </Link>
            <nav className="nav">
              <Link to="/universities">{t('nav.universities')}</Link>
              <Link to="/analysis">{t('nav.analysis')}</Link>
              <Link to="/tours">{t('nav.tours')}</Link>
              <Link to="/rankings">{t('nav.rankings')}</Link>
              <Link to="/news" className={isNews ? 'nav-link-active' : undefined}>{t('nav.news')}</Link>
              <Link to="/subscription">{t('nav.subscription')}</Link>
              <Link to="/account">{t('nav.account')}</Link>
              {!isLanding && <NavNotifications label={t('nav.notifications')} />}
              {staff && <Link to="/admin">{t('nav.admin')}</Link>}
              {user && !isLanding ? (
                <>
                  <Link to="/account/scores">{t('nav.scores')}</Link>
                  <button type="button" className="btn-link" onClick={handleLogout}>
                    {t('nav.logout')}
                  </button>
                </>
              ) : null}
            </nav>
            <div className="header-controls">
              <div className="lang-switch" role="group" aria-label={t('account.language')}>
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
              {user ? (
                isLanding ? (
                  <Link to="/account" className="btn btn-header-auth">
                    {t('nav.account')}
                  </Link>
                ) : null
              ) : (
                <Link to="/login" className={isLanding ? 'btn btn-header-auth' : undefined}>
                  {isLanding ? t('nav.loginRegister') : t('nav.login')}
                </Link>
              )}
            </div>
          </div>
        </header>
      )}
      <main className={isLanding ? 'main-landing' : isAccount ? 'main-account' : isNews ? 'main-news' : 'container'}>
        <Outlet />
      </main>
      {!isLanding && !isAccount && (
        <footer className="site-footer">
          <div className="container footer-inner">
            <span className="muted">{t('footer.rights')}</span>
            <nav className="footer-nav">
              <Link to="/legal/privacy">{t('legal.privacy')}</Link>
              <Link to="/legal/terms">{t('legal.terms')}</Link>
              <Link to="/legal/offer">{t('legal.offer')}</Link>
              <Link to="/faq">{t('legal.faq')}</Link>
            </nav>
          </div>
        </footer>
      )}
    </>
  );
}
