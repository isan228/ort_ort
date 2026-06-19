import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';

export default function HelpFab() {
  const { t } = useI18n();
  const location = useLocation();
  const hidden =
    location.pathname === '/' ||
    location.pathname.startsWith('/account') ||
    ['/login', '/register', '/forgot-password', '/reset-password'].includes(location.pathname);

  if (hidden) return null;

  return (
    <Link to="/faq" className="help-fab" title={t('ux.helpFab')}>
      ?
    </Link>
  );
}
