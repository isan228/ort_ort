const DEFAULT_SIZE = 18;

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
  university: (
    <>
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 21v-6h6v6" />
    </>
  ),
  directions: (
    <>
      <path d="M4 19V5M4 19h16" />
      <path d="M8 16l3-5 3 3 4-6" />
    </>
  ),
  users: (
    <>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </>
  ),
  gradCap: (
    <>
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M5 10v5c0 2.5 3 4.5 7 5 4-.5 7-2.5 7-5v-5" />
    </>
  ),
  arrowRight: (
    <>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </>
  ),
  chart: (
    <>
      <path d="M4 19V5M4 19h16" />
      <path d="M8 17l3-5 3 3 4-7" />
    </>
  ),
};

export function UniversityIcon({ name, size, className }) {
  const content = ICONS[name];
  if (!content) return null;
  return (
    <Svg size={size} className={className}>
      {content}
    </Svg>
  );
}
