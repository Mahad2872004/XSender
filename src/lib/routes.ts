/**
 * Application routes in one place.
 *
 * The dashboard lives under /app so the marketing site can own the root. Paths
 * were previously scattered as literals across nav config, server actions and
 * redirects, which made that move touch thirty files. Anything that links into
 * the product should reference these.
 */

/** Signed-in product. Everything under here is gated by src/proxy.ts. */
export const APP = {
  root: '/app',
  dashboard: '/app',
  inbox: '/app/inbox',
  contacts: '/app/contacts',
  flows: '/app/flows',
  flow: (flowId: string) => `/app/flows/${flowId}`,
  simulator: '/app/simulator',
  campaigns: '/app/campaigns',
  templates: '/app/templates',
  menu: '/app/menu',
  orders: '/app/orders',
  bookings: '/app/bookings',
  payments: '/app/payments',
  reports: '/app/reports',
  billing: '/app/billing',
  settings: '/app/settings',
  welcome: '/app/welcome',
} as const;

/** Public marketing and auth surface. */
export const PUBLIC = {
  home: '/',
  pricing: '/pricing',
  howItWorks: '/how-it-works',
  demo: '/demo',
  setupService: '/setup-service',
  about: '/about',
  contact: '/contact',
  vertical: (slug: string) => `/for/${slug}`,
  privacy: '/legal/privacy',
  terms: '/legal/terms',
  login: '/login',
  signup: '/signup',
  onboarding: '/onboarding',
} as const;

/** True for paths the proxy must protect. */
export function isAppPath(pathname: string): boolean {
  return pathname === APP.root || pathname.startsWith(`${APP.root}/`);
}
