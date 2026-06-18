const DEFAULT_SIZE = 20;

function Svg({ size = DEFAULT_SIZE, className = '', children }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

const ICONS = {
  home: (
    <>
      <path d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
    </>
  ),
  chart: (
    <>
      <path d="M4 19V5M4 19h16M8 17V11M12 17V7M16 17v-4" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M4 11h16" />
    </>
  ),
  star: (
    <path d="M12 3l2.4 5.8L21 10l-4.5 4.1L18 21 12 17.8 6 21l1.5-6.9L3 10l6.6-1.2L12 3z" />
  ),
  bell: (
    <>
      <path d="M18 16H6l1.2-1.5A4 4 0 019 11V8a3 3 0 116 0v3a4 4 0 011.8 3.5L18 16z" />
      <path d="M10 19a2 2 0 004 0" />
    </>
  ),
  gift: (
    <>
      <rect x="4" y="10" width="16" height="10" rx="1.5" />
      <path d="M12 10V20M4 10h16M12 7c-1.5 0-2.5-1-2.5-2.2S10.5 3 12 3s2.5.8 2.5 2.8S13.5 7 12 7zM12 7H9.5M12 7h2.5" />
    </>
  ),
  analysis: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4-4M11 8v6M8 11h6" />
    </>
  ),
  catalog: (
    <>
      <path d="M4 6h16M4 12h10M4 18h14" />
      <circle cx="19" cy="17" r="2" />
    </>
  ),
  ranking: (
    <>
      <path d="M8 20V10M12 20V4M16 20v-6" />
    </>
  ),
  calc: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M16 15h0" />
    </>
  ),
  compare: (
    <>
      <rect x="3" y="5" width="7" height="14" rx="1.5" />
      <rect x="14" y="5" width="7" height="14" rx="1.5" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 014.8 1c0 2-2.3 2-2.3 4M12 17h.01" />
    </>
  ),
  faq: (
    <>
      <path d="M4 6h16M4 12h10M4 18h14" />
      <circle cx="19" cy="12" r="2" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  crown: (
    <>
      <path d="M4 9l3 6 5-8 5 8 3-6v9H4V9z" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 4h8v3a4 4 0 01-8 0V4zM6 4H4v2a2 2 0 002 2M18 4h2v2a2 2 0 01-2 2M12 11v3M9 20h6M10 14h4v6h-4z" />
    </>
  ),
  check: <path d="M5 12l4 4L19 7" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18M16 14h2" />
    </>
  ),
};

export function AccountIcon({ name, size = DEFAULT_SIZE, className = '' }) {
  const content = ICONS[name];
  if (!content) return null;
  return (
    <span className={`account-icon ${className}`.trim()}>
      <Svg size={size}>{content}</Svg>
    </span>
  );
}
