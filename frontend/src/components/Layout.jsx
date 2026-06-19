import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import NavNotifications from './NavNotifications.jsx';
import ScrollToTop from './ux/ScrollToTop.jsx';
import BackToTop from './ux/BackToTop.jsx';
import HelpFab from './ux/HelpFab.jsx';
import BurgerButton from './ux/BurgerButton.jsx';
import { api, getStoredUser, isStaffRole } from '../api/client.js';
import { useI18n } from '../i18n/I18nContext.jsx';

const MAIN_LINKS = [
  { to: '/universities', key: 'nav.universities', match: (p) => p === '/universities' || p.startsWith('/universities/') || p.startsWith('/programs/') },
  { to: '/analysis', key: 'nav.analysis', match: (p) => p.startsWith('/analysis') },
  { to: '/tours', key: 'nav.tours', match: (p) => p.startsWith('/tours') },
  { to: '/rankings', key: 'nav.rankings', match: (p) => p === '/rankings' },
  { to: '/news', key: 'nav.news', match: (p) => p.startsWith('/news') },
];

const MORE_LINKS = [
  { to: '/subscription', key: 'nav.subscription', match: (p) => p === '/subscription' },
  { to: '/account', key: 'nav.account', match: (p) => p.startsWith('/account') },
  { to: '/faq', key: 'legal.faq', match: (p) => p === '/faq' },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const isLanding = pathname === '/';
  const isAccount = pathname.startsWith('/account');
  const isAuth = ['/login', '/register', '/forgot-password', '/reset-password'].includes(pathname);
  const isAdmin = pathname.startsWith('/admin');

  function mainClassName() {
    if (isLanding) return 'main-landing';
    if (isAccount) return 'main-account';
    if (pathname.startsWith('/news')) return 'main-news';
    if (pathname.startsWith('/tours')) return 'main-tours';
    if (pathname.startsWith('/analysis')) return 'main-analysis';
    if (pathname === '/universities' || pathname.startsWith('/universities/') || pathname.startsWith('/programs/')) {
      return 'main-universities';
    }
    if (isAuth) return 'main-auth';
    if (isAdmin) return 'main-admin';
    return 'main-page';
  }

  const { t, locale, setLocale } = useI18n();
  const [user, setUser] = useState(() => getStoredUser());
  const [menuOpen, setMenuOpen] = useState(false);
  const staff = isStaffRole(user?.role?.code);

  useEffect(() => {
    setMenuOpen(false);
    setUser(getStoredUser());
  }, [pathname]);

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

  async function handleLogout() {
    await api.logout();
    setUser(null);
    setMenuOpen(false);
    navigate('/');
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  function navLinkClass(matchFn) {
    return matchFn(pathname) ? 'nav-link-active' : undefined;
  }

  return (
    <>
      <a href="#main-content" className="skip-link">
        {t('ux.skipToContent')}
      </a>
      <ScrollToTop />
      {!isAccount && (
        <header
          className={`site-header${isLanding ? ' site-header--landing' : ''}${menuOpen ? ' site-header--menu-open' : ''}`}
        >
          <div className="container header-inner">
            <Link to="/" className="logo" onClick={closeMenu}>
              ORT.KG
            </Link>

            <nav className="header-nav-desktop" aria-label={t('ux.nav.main')}>
              {MAIN_LINKS.map((item) => (
                <Link key={item.to} to={item.to} className={navLinkClass(item.match)}>
                  {t(item.key)}
                </Link>
              ))}
              {MORE_LINKS.slice(0, 2).map((item) => (
                <Link key={item.to} to={item.to} className={navLinkClass(item.match)}>
                  {t(item.key)}
                </Link>
              ))}
              {!isLanding && user && <NavNotifications label={t('nav.notifications')} />}
              {staff && (
                <Link to="/admin" className={navLinkClass((p) => p.startsWith('/admin'))}>
                  {t('nav.admin')}
                </Link>
              )}
              {user && !isLanding ? (
                <>
                  <Link to="/account/scores">{t('nav.scores')}</Link>
                  <button type="button" className="btn-link" onClick={handleLogout}>
                    {t('nav.logout')}
                  </button>
                </>
              ) : null}
            </nav>

            <div className="header-mobile-actions">
              {user ? (
                <Link to="/account" className="header-mobile-auth" onClick={closeMenu}>
                  {t('nav.account')}
                </Link>
              ) : (
                <Link to="/login" className="header-mobile-auth header-mobile-auth--primary" onClick={closeMenu}>
                  {t('nav.login')}
                </Link>
              )}
            </div>

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
                ) : (
                  <Link to="/account" className="btn btn-secondary btn-header-mini">
                    {t('nav.account')}
                  </Link>
                )
              ) : (
                <Link
                  to="/login"
                  className={isLanding ? 'btn btn-header-auth' : 'btn btn-secondary btn-header-mini'}
                >
                  {isLanding ? t('nav.loginRegister') : t('nav.login')}
                </Link>
              )}
            </div>

            <BurgerButton
              open={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              label={t('ux.menu')}
              controlsId="site-nav"
            />
          </div>

          {menuOpen && (
            <button
              type="button"
              className="header-backdrop"
              aria-label={t('ux.menuClose')}
              tabIndex={-1}
              onClick={closeMenu}
            />
          )}

          <nav id="site-nav" className={`site-nav-drawer${menuOpen ? ' is-open' : ''}`}>
            <div className="container site-nav-drawer-inner">
              <div className="nav-drawer-group">
                <p className="nav-drawer-section">{t('ux.nav.sectionMain')}</p>
                {MAIN_LINKS.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={navLinkClass(item.match)}
                    onClick={closeMenu}
                  >
                    {t(item.key)}
                  </Link>
                ))}
              </div>

              <div className="nav-drawer-group">
                <p className="nav-drawer-section">{t('ux.nav.sectionMore')}</p>
                {MORE_LINKS.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={navLinkClass(item.match)}
                    onClick={closeMenu}
                  >
                    {t(item.key)}
                  </Link>
                ))}
                {!isLanding && user && (
                  <NavNotifications label={t('nav.notifications')} />
                )}
                {staff && (
                  <Link to="/admin" className={navLinkClass((p) => p.startsWith('/admin'))} onClick={closeMenu}>
                    {t('nav.admin')}
                  </Link>
                )}
                {user && !isLanding && (
                  <>
                    <Link to="/account/scores" onClick={closeMenu}>
                      {t('nav.scores')}
                    </Link>
                    <button type="button" className="nav-drawer-logout" onClick={handleLogout}>
                      {t('nav.logout')}
                    </button>
                  </>
                )}
              </div>

              <div className="nav-mobile-extras">
                <div className="lang-switch lang-switch--nav" role="group" aria-label={t('account.language')}>
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
                {!user && (
                  <Link to="/register" className="btn btn-secondary" onClick={closeMenu}>
                    {t('nav.register')}
                  </Link>
                )}
              </div>
            </div>
          </nav>
        </header>
      )}
      <main id="main-content" className={mainClassName()} tabIndex={-1}>
        <Outlet />
      </main>
      {!isLanding && !isAccount && !isAuth && (
        <footer className="site-footer">
          <div className="container footer-inner">
            <nav className="footer-quick" aria-label={t('ux.quickNav')}>
              <Link to="/universities">{t('nav.universities')}</Link>
              <Link to="/analysis">{t('nav.analysis')}</Link>
              <Link to="/tours">{t('nav.tours')}</Link>
              <Link to="/rankings">{t('nav.rankings')}</Link>
              <Link to="/account/support">{t('account.nav.help')}</Link>
            </nav>
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
      {!isAuth && !isAccount && (
        <>
          <HelpFab />
          <BackToTop />
        </>
      )}
    </>
  );
}
