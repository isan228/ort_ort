import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setItems((list) => list.filter((item) => item.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (type, text, duration = 4200) => {
      if (!text) return;
      const id = ++toastId;
      setItems((list) => [...list.slice(-4), { id, type, text }]);
      const timer = setTimeout(() => dismiss(id), duration);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      success: (text, duration) => push('success', text, duration),
      error: (text, duration) => push('error', text, duration),
      info: (text, duration) => push('info', text, duration),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-relevant="additions">
        {items.map((item) => (
          <div key={item.id} className={`toast toast--${item.type}`} role="status">
            <span className="toast-icon" aria-hidden="true">
              {item.type === 'success' ? '✓' : item.type === 'error' ? '!' : 'i'}
            </span>
            <span className="toast-text">{item.text}</span>
            <button type="button" className="toast-close" onClick={() => dismiss(item.id)} aria-label="Закрыть">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
