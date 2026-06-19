export default function BurgerButton({ open, onClick, label, controlsId }) {
  return (
    <button
      type="button"
      className={`app-header-burger${open ? ' is-open' : ''}`}
      aria-expanded={open}
      aria-controls={controlsId}
      aria-label={label}
      onClick={onClick}
    >
      <span className="app-header-burger-icon" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
    </button>
  );
}
