export const NAV_PRIMARY = [
  {
    to: '/universities',
    key: 'nav.universities',
    icon: '🏛',
    match: (p) => p === '/universities' || p.startsWith('/universities/') || p.startsWith('/programs/'),
  },
  {
    to: '/analysis',
    key: 'nav.analysis',
    icon: '📊',
    match: (p) => p.startsWith('/analysis'),
  },
  {
    to: '/tours',
    key: 'nav.tours',
    icon: '🎯',
    match: (p) => p.startsWith('/tours'),
  },
  {
    to: '/rankings',
    key: 'nav.rankings',
    icon: '🏆',
    match: (p) => p === '/rankings',
  },
  {
    to: '/news',
    key: 'nav.news',
    icon: '📰',
    match: (p) => p.startsWith('/news'),
  },
];

export const NAV_SECONDARY = [
  {
    to: '/subscription',
    key: 'nav.subscription',
    icon: '⭐',
    match: (p) => p === '/subscription',
  },
  {
    to: '/account',
    key: 'nav.account',
    icon: '👤',
    match: (p) => p.startsWith('/account'),
  },
  {
    to: '/faq',
    key: 'legal.faq',
    icon: '❓',
    match: (p) => p === '/faq',
  },
];

export function isNavActive(pathname, matchFn) {
  return matchFn(pathname);
}
