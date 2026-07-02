const API_BASE = import.meta.env.VITE_API_URL || '';

/** Абсолютный URL для статики с API (логотипы вузов). */
export function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE}${path}`;
}
