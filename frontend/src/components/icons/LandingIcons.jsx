const DEFAULT_SIZE = 22;

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
  medicine: (
  <>
    <path d="M12 21s-6-4.5-6-9a6 6 0 1112 0c0 4.5-6 9-6 9z" />
    <path d="M12 8v6M9 11h6" />
  </>
  ),
  dentistry: (
  <>
    <path d="M12 3c-2 0-3.5 1.5-3.5 3.5C8.5 10 10 13 12 21c2-8 3.5-11 3.5-14.5C15.5 4.5 14 3 12 3z" />
  </>
  ),
  it: (
  <>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" />
    <path d="M8 9h3M8 12h5" />
  </>
  ),
  economics: (
  <>
    <path d="M4 19V5M4 19h16" />
    <path d="M8 17l3-5 3 3 4-7" />
  </>
  ),
  law: (
  <>
    <path d="M12 3v18M5 7h14M7 7l5 4 5-4" />
    <path d="M9 21h6" />
  </>
  ),
  edit: (
  <>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
  </>
  ),
  shield: (
  <>
    <path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" />
    <path d="M9 12l2 2 4-4" />
  </>
  ),
  gradCap: (
  <>
    <path d="M12 3l9 5-9 5-9-5 9-5z" />
    <path d="M5 10v5c0 2.5 3 4.5 7 5 4-.5 7-2.5 7-5v-5" />
    <path d="M21 10v6" />
  </>
  ),
  form: (
  <>
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M9 8h6M9 12h6M9 16h4" />
  </>
  ),
  chart: (
  <>
    <path d="M4 19V5M4 19h16" />
    <path d="M8 17V11M12 17V7M16 17v-4" />
  </>
  ),
  compare: (
  <>
    <path d="M8 8h8M8 12h5" />
    <rect x="4" y="4" width="7" height="16" rx="1.5" />
    <rect x="13" y="4" width="7" height="16" rx="1.5" />
  </>
  ),
  trendUp: <path d="M6 16l4-5 3 3 5-7" />,
  trendFlat: <path d="M6 12h12" />,
  trendDown: <path d="M6 8l4 5 3-3 5 7" />,
  arrowRight: (
  <>
    <path d="M5 12h14" />
    <path d="M13 6l6 6-6 6" />
  </>
  ),
  uni: (
  <>
    <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
  </>
  ),
  cap: (
  <>
    <path d="M12 3l9 5v2H3V8l9-5zM5 10v8M19 10v8M4 18h16" />
  </>
  ),
  users: (
  <>
    <circle cx="9" cy="8" r="3" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M3 19c0-3 2.5-5 6-5s6 2 6 5M14 19c0-2 1.5-3.5 4-3.5" />
  </>
  ),
  trophy: (
  <>
    <path d="M8 4h8v3a4 4 0 01-8 0V4zM6 4H4v2a2 2 0 002 2M18 4h2v2a2 2 0 01-2 2M12 11v3M9 20h6M10 14h4v6h-4z" />
  </>
  ),
  calendar: (
  <>
    <rect x="4" y="5" width="16" height="16" rx="2" />
    <path d="M4 9h16M8 3v4M16 3v4" />
  </>
  ),
  target: (
  <>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
  </>
  ),
  user: (
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M5 20c0-4 3-7 7-7s7 3 7 7" />
  </>
  ),
  news: (
  <>
    <path d="M6 4h12a2 2 0 012 2v14l-4-3-4 3-4-3-4 3V6a2 2 0 012-2z" />
    <path d="M9 8h6M9 12h6" />
  </>
  ),
  search: (
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-4-4" />
  </>
  ),
  gift: (
  <>
    <rect x="4" y="8" width="16" height="12" rx="1.5" />
    <path d="M12 8V20M4 12h16M8.5 8C7 8 6 6.8 6 5.5 6 4.1 7.1 3 8.5 3c1.2 0 2.2.7 3 1.8.8-1.1 1.8-1.8 3-1.8C15.9 3 17 4.1 17 5.5 17 6.8 16 8 14.5 8" />
  </>
  ),
};

export function LandingIcon({ name, size = DEFAULT_SIZE, className = '' }) {
  const content = ICONS[name];
  if (!content) return null;
  return (
    <span className={`landing-icon ${className}`.trim()}>
      <Svg size={size}>{content}</Svg>
    </span>
  );
}

export const DIRECTION_ICON_NAMES = ['medicine', 'dentistry', 'it', 'economics', 'law'];
export const STEP_ICON_NAMES = ['form', 'search', 'chart', 'target', 'gradCap'];
export const STAT_ICON_NAMES = ['uni', 'cap', 'chart', 'users', 'trophy'];
export const CHANCE_ICON_NAMES = { high: 'trendUp', medium: 'trendFlat', low: 'trendDown' };
