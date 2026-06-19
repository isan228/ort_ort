import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';

const LINKS = [
  { to: '/universities', key: 'nav.universities', icon: '🏛' },
  { to: '/analysis', key: 'nav.analysis', icon: '📊' },
  { to: '/tours', key: 'nav.tours', icon: '🎯' },
  { to: '/rankings', key: 'nav.rankings', icon: '🏆' },
  { to: '/news', key: 'nav.news', icon: '📰' },
  { to: '/faq', key: 'legal.faq', icon: '❓' },
];

export default function QuickNav() {
  const { t } = useI18n();
  const location = useLocation();

  if (location.pathname === '/') return null;

  return (
    <nav className="quick-nav" aria-label={t('ux.quickNav')}>
      {LINKS.map((item) => {
        const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`quick-nav-item${active ? ' active' : ''}`}
          >
            <span className="quick-nav-icon" aria-hidden="true">{item.icon}</span>
            <span className="quick-nav-label">{t(item.key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
