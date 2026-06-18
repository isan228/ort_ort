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
  return (
    <>
      {error && <div className="error account-alert">{error}</div>}
      {message && <div className="success account-alert">{message}</div>}
    </>
  );
}
