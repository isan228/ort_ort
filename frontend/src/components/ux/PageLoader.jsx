import { useI18n } from '../../i18n/I18nContext.jsx';

export default function PageLoader({ label, compact = false, className = '' }) {
  const { t } = useI18n();
  return (
    <div
      className={`page-loader${compact ? ' page-loader--compact' : ''} ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      <div className="page-loader-spinner" aria-hidden="true" />
      <p>{label || t('common.loading')}</p>
    </div>
  );
}
