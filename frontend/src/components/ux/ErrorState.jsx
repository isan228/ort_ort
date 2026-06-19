import { useI18n } from '../../i18n/I18nContext.jsx';

export default function ErrorState({ message, onRetry, retryLabel }) {
  const { t } = useI18n();
  return (
    <div className="ux-error" role="alert">
      <span className="ux-error-icon" aria-hidden="true">⚠</span>
      <p>{message || t('common.error')}</p>
      {onRetry && (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          {retryLabel || t('common.retry')}
        </button>
      )}
    </div>
  );
}
