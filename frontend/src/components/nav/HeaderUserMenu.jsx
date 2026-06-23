import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { AccountIcon } from '../icons/AccountIcons.jsx';

const MENU_ITEMS = [
  { to: '/account', key: 'nav.account', icon: 'user' },
  { to: '/account/scores', key: 'nav.scores', icon: 'calc' },
  { to: '/account/notifications', key: 'nav.notifications', icon: 'bell' },
];

export default function HeaderUserMenu({ user, staff, onLogout }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onDoc(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;

  const label = user.profile?.nickname || user.email?.split('@')[0] || user.phone || t('nav.account');

  return (
    <div className="header-user-menu" ref={rootRef}>
      <button
        type="button"
        className={`header-user-trigger${open ? ' is-open' : ''}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="header-user-avatar" aria-hidden="true">
          {label.charAt(0).toUpperCase()}
        </span>
        <span className="header-user-name">{label}</span>
      </button>
      {open && (
        <div className="header-user-dropdown" role="menu">
          {MENU_ITEMS.map((item) => (
            <Link key={item.to} to={item.to} role="menuitem" className="header-user-dropdown-link" onClick={() => setOpen(false)}>
              <AccountIcon name={item.icon} size={18} />
              <span>{t(item.key)}</span>
            </Link>
          ))}
          {staff && (
            <Link to="/admin" role="menuitem" className="header-user-dropdown-link" onClick={() => setOpen(false)}>
              <AccountIcon name="admin" size={18} />
              <span>{t('nav.admin')}</span>
            </Link>
          )}
          <button
            type="button"
            className="header-user-dropdown-link header-user-logout"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            <AccountIcon name="logout" size={18} />
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      )}
    </div>
  );
}
