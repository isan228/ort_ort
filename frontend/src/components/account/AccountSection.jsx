import { useEffect, useRef } from 'react';
import { useToast } from '../ux/ToastContext.jsx';

export function AccountPageWrap({ title, subtitle, children }) {
  return (
    <div className="account-page">
      {(title || subtitle) && (
        <header className="account-page-head">
          {title && <h2>{title}</h2>}
          {subtitle && <p>{subtitle}</p>}
        </header>
      )}
      {children}
    </div>
  );
}

export function AccountPanel({ title, children, className = '' }) {
  return (
    <section className={`account-panel account-inner-panel ${className}`.trim()}>
      {title && <h3>{title}</h3>}
      {children}
    </section>
  );
}

export function AccountAlerts({ error, message }) {
  const toast = useToast();
  const lastMessage = useRef('');

  useEffect(() => {
    if (message && message !== lastMessage.current) {
      lastMessage.current = message;
      toast.success(message);
    }
    if (!message) lastMessage.current = '';
  }, [message, toast]);

  if (!error) return null;
  return <div className="error account-alert">{error}</div>;
}

export { default as AccountLoading } from '../ux/PageLoader.jsx';
