import { Link } from 'react-router-dom';
import SiteNavLink from './SiteNavLink.jsx';
import { NAV_PRIMARY, NAV_SECONDARY } from '../../config/siteNav.js';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { AccountIcon } from '../icons/AccountIcons.jsx';

export default function SiteNavDrawer({
  open,
  pathname,
  onClose,
  user,
  staff,
  onLogout,
  locale,
  setLocale,
  isLanding,
}) {
  const { t } = useI18n();

  return (
    <nav id="site-nav" className={`site-nav-drawer${open ? ' is-open' : ''}`} aria-label={t('ux.nav.main')}>
      <div className="container site-nav-drawer-inner">
        <div className="nav-drawer-group">
          <p className="nav-drawer-section">{t('ux.nav.sectionMain')}</p>
          {NAV_PRIMARY.map((item) => (
            <SiteNavLink key={item.to} item={item} pathname={pathname} onClick={onClose} showIcon />
          ))}
        </div>

        <div className="nav-drawer-group">
          <p className="nav-drawer-section">{t('ux.nav.sectionMore')}</p>
          {NAV_SECONDARY.map((item) => (
            <SiteNavLink key={item.to} item={item} pathname={pathname} onClick={onClose} showIcon />
          ))}
          {staff && (
            <SiteNavLink
              item={{
                to: '/admin',
                key: 'nav.admin',
                icon: 'admin',
                match: (p) => p.startsWith('/admin'),
              }}
              pathname={pathname}
              onClick={onClose}
              showIcon
            />
          )}
          {user && !isLanding && (
            <>
              <SiteNavLink
                item={{
                  to: '/account/scores',
                  key: 'nav.scores',
                  icon: 'calc',
                  match: (p) => p === '/account/scores',
                }}
                pathname={pathname}
                onClick={onClose}
                showIcon
              />
              <SiteNavLink
                item={{
                  to: '/account/notifications',
                  key: 'nav.notifications',
                  icon: 'bell',
                  match: (p) => p.startsWith('/account/notifications'),
                }}
                pathname={pathname}
                onClick={onClose}
                showIcon
              />
            </>
          )}
        </div>

        <div className="nav-drawer-footer">
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
          <div className="nav-drawer-auth">
            {user ? (
              <button type="button" className="nav-drawer-logout site-nav-link site-nav-link--row" onClick={onLogout}>
                <AccountIcon name="logout" size={18} className="site-nav-link-icon" />
                <span className="site-nav-link-label">{t('nav.logout')}</span>
              </button>
            ) : (
              <>
                <Link to="/login" className="btn" onClick={onClose}>
                  {t('nav.login')}
                </Link>
                <Link to="/register" className="btn btn-secondary" onClick={onClose}>
                  {t('nav.register')}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
