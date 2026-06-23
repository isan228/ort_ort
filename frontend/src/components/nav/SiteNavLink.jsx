import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { AccountIcon } from '../icons/AccountIcons.jsx';

export default function SiteNavLink({ item, pathname, onClick, showIcon = false, className = '' }) {
  const { t } = useI18n();
  const active = item.match(pathname);

  return (
    <Link
      to={item.to}
      className={`site-nav-link${active ? ' is-active' : ''}${showIcon ? ' site-nav-link--row' : ''} ${className}`.trim()}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
    >
      {showIcon && item.icon && <AccountIcon name={item.icon} size={18} className="site-nav-link-icon" />}
      <span className="site-nav-link-label">{t(item.key)}</span>
    </Link>
  );
}
