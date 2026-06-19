import { Link } from 'react-router-dom';

export default function EmptyState({
  icon = '📋',
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
  secondaryLabel,
  secondaryTo,
}) {
  return (
    <div className="ux-empty">
      {icon && <span className="ux-empty-icon" aria-hidden="true">{icon}</span>}
      {title && <h3 className="ux-empty-title">{title}</h3>}
      {description && <p className="ux-empty-desc">{description}</p>}
      <div className="ux-empty-actions">
        {actionTo && actionLabel && (
          <Link to={actionTo} className="btn">
            {actionLabel}
          </Link>
        )}
        {onAction && actionLabel && (
          <button type="button" className="btn" onClick={onAction}>
            {actionLabel}
          </button>
        )}
        {secondaryTo && secondaryLabel && (
          <Link to={secondaryTo} className="btn btn-secondary">
            {secondaryLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
