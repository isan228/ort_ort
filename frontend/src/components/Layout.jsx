import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import NavNotifications from './NavNotifications.jsx';
import ScrollToTop from './ux/ScrollToTop.jsx';
import BackToTop from './ux/BackToTop.jsx';
import HelpFab from './ux/HelpFab.jsx';
import BurgerButton from './ux/BurgerButton.jsx';
import SiteNavLink from './nav/SiteNavLink.jsx';
import SiteNavDrawer from './nav/SiteNavDrawer.jsx';
import HeaderUserMenu from './nav/HeaderUserMenu.jsx';
import { NAV_PRIMARY, NAV_SECONDARY } from '../config/siteNav.js';
import { api, getStoredUser, isStaffRole } from '../api/client.js';
import { useI18n } from '../i18n/I18nContext.jsx';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const isLanding = pathname === '/';
  const isAccount = pathname.startsWith('/account');
  const isAuth = ['/login', '/register', '/forgot-password', '/reset-password'].includes(pathname);

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
    if (pathname.startsWith('/admin')) return 'main-admin';
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
              <div className="header-nav-primary">
                {NAV_PRIMARY.map((item) => (
                  <SiteNavLink key={item.to} item={item} pathname={pathname} />
                ))}
              </div>
            </nav>

            <div className="header-actions">
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

                {user && !isLanding && <NavNotifications label={t('nav.notifications')} variant="icon" />}

                {user ? (
                  <HeaderUserMenu
                    user={user}
                    staff={staff}
                    onLogout={() => {
                      handleLogout();
                    }}
                  />
                ) : (
                  <Link
                    to="/login"
                    className={isLanding ? 'btn btn-header-auth' : 'btn btn-primary-soft btn-header-mini'}
                  >
                    {isLanding ? t('nav.loginRegister') : t('nav.login')}
                  </Link>
                )}
              </div>

              <div className="header-mobile-actions">
                {user && <NavNotifications label={t('nav.notifications')} variant="icon" />}
                {!user && (
                  <Link to="/login" className="header-mobile-auth header-mobile-auth--primary" onClick={closeMenu}>
                    {t('nav.login')}
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

          <SiteNavDrawer
            open={menuOpen}
            pathname={pathname}
            onClose={closeMenu}
            user={user}
            staff={staff}
            onLogout={handleLogout}
            locale={locale}
            setLocale={setLocale}
            isLanding={isLanding}
          />
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
