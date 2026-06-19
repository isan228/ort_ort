import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';

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
          <Link to="/account" role="menuitem" onClick={() => setOpen(false)}>
            {t('nav.account')}
          </Link>
          <Link to="/account/scores" role="menuitem" onClick={() => setOpen(false)}>
            {t('nav.scores')}
          </Link>
          <Link to="/account/notifications" role="menuitem" onClick={() => setOpen(false)}>
            {t('nav.notifications')}
          </Link>
          {staff && (
            <Link to="/admin" role="menuitem" onClick={() => setOpen(false)}>
              {t('nav.admin')}
            </Link>
          )}
          <button type="button" className="header-user-logout" role="menuitem" onClick={() => { setOpen(false); onLogout(); }}>
            {t('nav.logout')}
          </button>
        </div>
      )}
    </div>
  );
}
