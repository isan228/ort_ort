export const NAV_PRIMARY = [
  {
    to: '/universities',
    key: 'nav.universities',
    icon: 'catalog',
    match: (p) => p === '/universities' || p.startsWith('/universities/') || p.startsWith('/programs/'),
  },
  {
    to: '/analysis',
    key: 'nav.analysis',
    icon: 'chart',
    match: (p) => p.startsWith('/analysis'),
  },
  {
    to: '/tours',
    key: 'nav.tours',
    icon: 'calendar',
    match: (p) => p.startsWith('/tours'),
  },
  {
    to: '/rankings',
    key: 'nav.rankings',
    icon: 'ranking',
    match: (p) => p === '/rankings',
  },
  {
    to: '/news',
    key: 'nav.news',
    icon: 'news',
    match: (p) => p.startsWith('/news'),
  },
];

export const NAV_SECONDARY = [
  {
    to: '/subscription',
    key: 'nav.subscription',
    icon: 'crown',
    match: (p) => p === '/subscription',
  },
  {
    to: '/account',
    key: 'nav.account',
    icon: 'user',
    match: (p) => p.startsWith('/account'),
  },
  {
    to: '/faq',
    key: 'legal.faq',
    icon: 'faq',
    match: (p) => p === '/faq',
  },
];

export function isNavActive(pathname, matchFn) {
  return matchFn(pathname);
}
