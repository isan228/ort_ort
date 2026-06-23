import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { AccountIcon } from '../icons/AccountIcons.jsx';
import { NAV_PRIMARY } from '../../config/siteNav.js';

const LINKS = [...NAV_PRIMARY, { to: '/faq', key: 'legal.faq', icon: 'faq', match: (p) => p === '/faq' }];

export default function QuickNav() {
  const { t } = useI18n();
  const location = useLocation();

  if (location.pathname === '/') return null;

  return (
    <nav className="quick-nav" aria-label={t('ux.quickNav')}>
      {LINKS.map((item) => {
        const active = item.match(location.pathname);
        return (
          <Link key={item.to} to={item.to} className={`quick-nav-item${active ? ' active' : ''}`}>
            <AccountIcon name={item.icon} size={20} className="quick-nav-icon" />
            <span className="quick-nav-label">{t(item.key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
