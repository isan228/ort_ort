import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(`(max-width: ${breakpoint}px)`).matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [breakpoint]);

  return isMobile;
}

export default function MobileFilterSheet({
  open,
  onClose,
  title,
  activeCount = 0,
  onReset,
  onApply,
  children,
}) {
  const { t } = useI18n();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!open || !isMobile) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, isMobile]);

  if (!open || !isMobile) return null;

  function handleApply() {
    onApply?.();
    onClose();
  }

  return createPortal(
    <>
      <button
        type="button"
        className="mobile-filter-backdrop"
        aria-label={t('ux.menuClose')}
        onClick={onClose}
      />
      <div className="mobile-filter-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <header className="mobile-filter-head">
          <div>
            <h2>{title}</h2>
            {activeCount > 0 && (
              <span className="mobile-filter-badge">
                {t('ux.filters.active').replace('{{count}}', String(activeCount))}
              </span>
            )}
          </div>
          <button type="button" className="mobile-filter-close" onClick={onClose} aria-label={t('ux.menuClose')}>
            ✕
          </button>
        </header>
        <div className="mobile-filter-body">{children}</div>
        <footer className="mobile-filter-foot">
          {onReset && (
            <button type="button" className="btn btn-secondary mobile-filter-reset" onClick={onReset}>
              {t('ux.filters.reset')}
            </button>
          )}
          <button type="button" className="btn mobile-filter-apply" onClick={handleApply}>
            {t('ux.filters.apply')}
          </button>
        </footer>
      </div>
    </>,
    document.body
  );
}

export function CatalogMobileBar({
  search,
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder,
  filterCount = 0,
  onOpenFilters,
  sort,
  onSortChange,
  sortOptions,
  sortLabel,
  filterLabel,
  hideSearch = false,
}) {
  const { t } = useI18n();

  return (
    <div className="catalog-mobile-bar">
      {!hideSearch && (
        <label className="catalog-mobile-search">
          <span className="sr-only">{searchPlaceholder}</span>
          <input
            type="search"
            value={search}
            placeholder={searchPlaceholder}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearchSubmit?.()}
          />
        </label>
      )}
      <div className={`catalog-mobile-actions${hideSearch ? ' catalog-mobile-actions--solo' : ''}`}>
        <button type="button" className="catalog-mobile-filter-btn" onClick={onOpenFilters}>
          {filterLabel || t('ux.filters.title')}
          {filterCount > 0 && <span className="catalog-mobile-filter-count">{filterCount}</span>}
        </button>
        {sortOptions && (
          <label className="catalog-mobile-sort">
            <span className="sr-only">{sortLabel}</span>
            <select value={sort} onChange={(e) => onSortChange(e.target.value)}>
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </div>
  );
}

export function MobileChipRow({ items, value, onChange }) {
  return (
    <div className="mobile-chip-row" role="tablist">
      {items.map((item) => {
        const active = value === item.id;
        return (
          <button
            key={item.id || 'all'}
            type="button"
            role="tab"
            aria-selected={active}
            className={`mobile-chip${active ? ' active' : ''}`}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
