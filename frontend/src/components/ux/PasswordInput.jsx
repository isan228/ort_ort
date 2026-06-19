import { useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';

export default function PasswordInput({ className = 'auth-input', ...props }) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-input-wrap">
      <input
        {...props}
        className={className}
        type={visible ? 'text' : 'password'}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t('ux.hidePassword') : t('ux.showPassword')}
        tabIndex={-1}
      >
        {visible ? '🙈' : '👁'}
      </button>
    </div>
  );
}
