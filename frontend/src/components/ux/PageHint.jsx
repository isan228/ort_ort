import { useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';

export default function PageHint({ hintId, title, children }) {
  const { t } = useI18n();
  const storageKey = `ort.hint.${hintId}`;
  const [visible, setVisible] = useState(() => !localStorage.getItem(storageKey));

  if (!visible) return null;

  function dismiss() {
    localStorage.setItem(storageKey, '1');
    setVisible(false);
  }

  return (
    <div className="page-hint" role="note">
      <div className="page-hint-body">
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
      <button type="button" className="page-hint-dismiss" onClick={dismiss}>
        {t('ux.hint.dismiss')}
      </button>
    </div>
  );
}
