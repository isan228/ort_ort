import { mediaUrl } from '../utils/mediaUrl.js';

function getInitials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export default function UniLogo({ name, logoUrl, className = '', size = 48 }) {
  const src = mediaUrl(logoUrl);
  const style = { width: size, height: size };

  if (src) {
    return (
      <img
        src={src}
        alt={name ? `Логотип ${name}` : 'Логотип вуза'}
        className={`uni-logo-img ${className}`.trim()}
        style={style}
        loading="lazy"
      />
    );
  }

  return (
    <div className={`uni-logo-fallback ${className}`.trim()} style={style} aria-hidden>
      {getInitials(name)}
    </div>
  );
}
