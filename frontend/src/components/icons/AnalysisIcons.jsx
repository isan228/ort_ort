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
  score: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </>
  ),
  direction: (
    <>
      <path d="M12 21s-6-4.5-6-9a6 6 0 1112 0c0 4.5-6 9-6 9z" />
      <path d="M12 8v6M9 11h6" />
    </>
  ),
  form: (
    <>
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M5 10v5c0 2.5 3 4.5 7 5 4-.5 7-2.5 7-5v-5" />
    </>
  ),
  region: (
    <>
      <path d="M12 21s7-4.5 7-10a7 7 0 10-14 0c0 5.5 7 10 7 10z" />
      <circle cx="12" cy="11" r="2.5" />
    </>
  ),
  type: (
    <>
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
    </>
  ),
  bookmark: (
    <>
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
    </>
  ),
  crown: (
    <>
      <path d="M3 18h18M5 18l2-9 5 4 5-7 5 7 2-9" />
    </>
  ),
  gradCap: (
    <>
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M5 10v5c0 2.5 3 4.5 7 5 4-.5 7-2.5 7-5v-5" />
    </>
  ),
  arrowUp: (
    <>
      <path d="M12 19V5M5 12l7-7 7 7" />
    </>
  ),
  arrowDown: (
    <>
      <path d="M12 5v14M5 12l7 7 7-7" />
    </>
  ),
  arrowRight: (
    <>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </>
  ),
  filter: (
    <>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </>
  ),
};

export function AnalysisIcon({ name, size, className }) {
  const content = ICONS[name];
  if (!content) return null;
  return (
    <Svg size={size} className={className}>
      {content}
    </Svg>
  );
}
