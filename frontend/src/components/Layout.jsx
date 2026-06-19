import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import NavNotifications from './NavNotifications.jsx';
import ScrollToTop from './ux/ScrollToTop.jsx';
import BackToTop from './ux/BackToTop.jsx';
import HelpFab from './ux/HelpFab.jsx';
import QuickNav from './ux/QuickNav.jsx';
import BurgerButton from './ux/BurgerButton.jsx';
import { api, getStoredUser, isStaffRole } from '../api/client.js';
import { useI18n } from '../i18n/I18nContext.jsx';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const isAccount = location.pathname.startsWith('/account');
  const isNews = location.pathname.startsWith('/news');
  const isTours = location.pathname.startsWith('/tours');
  const isAnalysis = location.pathname.startsWith('/analysis');
  const isUniversities =
    location.pathname === '/universities' || location.pathname.startsWith('/universities/');
  const isPrograms = location.pathname.startsWith('/programs/');
  const isAuth = ['/login', '/register', '/forgot-password', '/reset-password'].includes(
    location.pathname
  );
  const isAdmin = location.pathname.startsWith('/admin');
  const isRankings = location.pathname === '/rankings';
  const isSubscription = location.pathname === '/subscription';

  function mainClassName() {
    if (isLanding) return 'main-landing';
    if (isAccount) return 'main-account';
    if (isNews) return 'main-news';
    if (isTours) return 'main-tours';
    if (isAnalysis) return 'main-analysis';
    if (isUniversities || isPrograms) return 'main-universities';
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
  }, [location.pathname]);

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

            <nav id="site-nav" className={`nav${menuOpen ? ' nav--open' : ''}`}>
              <Link
                to="/universities"
                className={isUniversities || isPrograms ? 'nav-link-active' : undefined}
                onClick={closeMenu}
              >
                {t('nav.universities')}
              </Link>
              <Link
                to="/analysis"
                className={isAnalysis ? 'nav-link-active' : undefined}
                onClick={closeMenu}
              >
                {t('nav.analysis')}
              </Link>
              <Link
                to="/tours"
                className={isTours ? 'nav-link-active' : undefined}
                onClick={closeMenu}
              >
                {t('nav.tours')}
              </Link>
              <Link
                to="/rankings"
                className={isRankings ? 'nav-link-active' : undefined}
                onClick={closeMenu}
              >
                {t('nav.rankings')}
              </Link>
              <Link
                to="/news"
                className={isNews ? 'nav-link-active' : undefined}
                onClick={closeMenu}
              >
                {t('nav.news')}
              </Link>
              <Link
                to="/subscription"
                className={isSubscription ? 'nav-link-active' : undefined}
                onClick={closeMenu}
              >
                {t('nav.subscription')}
              </Link>
              <Link
                to="/account"
                className={isAccount ? 'nav-link-active' : undefined}
                onClick={closeMenu}
              >
                {t('nav.account')}
              </Link>
              {!isLanding && <NavNotifications label={t('nav.notifications')} />}
              {staff && (
                <Link
                  to="/admin"
                  className={isAdmin ? 'nav-link-active' : undefined}
                  onClick={closeMenu}
                >
                  {t('nav.admin')}
                </Link>
              )}
              {user && !isLanding ? (
                <>
                  <Link to="/account/scores" onClick={closeMenu}>
                    {t('nav.scores')}
                  </Link>
                  <button type="button" className="btn-link" onClick={handleLogout}>
                    {t('nav.logout')}
                  </button>
                </>
              ) : null}
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
                {user ? (
                  <Link to="/account" className="btn btn-secondary" onClick={closeMenu}>
                    {t('nav.account')}
                  </Link>
                ) : (
                  <Link to="/login" className="btn" onClick={closeMenu}>
                    {t('nav.login')}
                  </Link>
                )}
              </div>
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
          <QuickNav />
          <HelpFab />
          <BackToTop />
        </>
      )}
    </>
  );
}
