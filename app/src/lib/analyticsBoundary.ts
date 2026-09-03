/**
 * Keeps Google Analytics off the screens that carry health information.
 *
 * The server already decides this for the page a visitor lands on: only
 * marketing and SEO landing pages render <SiteAnalytics>, so entering directly
 * on /assess loads no tag at all. This closes the gap that leaves.
 *
 * The site is a single-page app behind a catch-all route. Someone who arrives
 * on a city landing page and then clicks through to the assessment keeps the
 * tag that page loaded, because no navigation happens at the document level.
 * No pageview is sent for that route - SiteAnalytics installs no route listener
 * - but GA4 enhanced measurement fires on its own, and every event it sends
 * carries page_location. On these routes that URL can hold an assessment id or
 * a claim token, which is precisely what must not reach an analytics vendor.
 *
 * Setting `ga-disable-<id>` is GA's own kill switch and stops all of it,
 * including anything enhanced measurement would have sent by itself. It is
 * re-enabled on the way back out to public pages, so marketing attribution
 * still works for a visitor who wanders in and back out again.
 *
 * A deny list rather than an allow list, deliberately. Deciding "is this page
 * public?" on the client means shipping the landing page corpus - hundreds of
 * entries - to every visitor, and mobile is already carrying more JavaScript
 * than it should. The trade is that a new private route has to be added here;
 * the test alongside this file is what catches the common ones going missing.
 */

/**
 * Route prefixes where no analytics may run.
 *
 * Everything a claimant, attorney or admin reaches after identifying
 * themselves, plus the intake flow, which collects injury and treatment detail
 * before any account exists.
 */
export const SENSITIVE_ROUTE_PREFIXES = [
  '/admin',
  '/assess',
  '/assessment',
  '/assessments',
  '/attorney-billing',
  '/attorney-dashboard',
  '/attorney-license-upload',
  '/attorney-onboarding',
  '/attorney-preferences',
  '/attorney-profile',
  '/auth/complete-consent',
  '/book',
  '/booking',
  '/case-tracker',
  '/claim',
  '/consent-management',
  '/dashboard',
  '/demand',
  '/documents',
  '/drafts',
  '/edit-assessment',
  '/evidence-dashboard',
  '/evidence-upload',
  '/firm-dashboard',
  '/firm-settings',
  '/hipaa-authorization',
  '/intake',
  '/intake2',
  '/messaging',
  '/payment',
  '/profile',
  '/respond',
  '/results',
  '/rose',
  '/smart-recommendations',
] as const

/** Locale-prefixed copies of the same screens, e.g. /es/assess. */
const LOCALE_PREFIXES = ['/es', '/zh']

function stripLocale(pathname: string): string {
  for (const locale of LOCALE_PREFIXES) {
    if (pathname === locale) return '/'
    if (pathname.startsWith(`${locale}/`)) return pathname.slice(locale.length)
  }
  return pathname
}

export function isSensitivePath(pathname: string): boolean {
  const path = stripLocale((pathname || '/').toLowerCase())
  return SENSITIVE_ROUTE_PREFIXES.some(
    // Prefix match on a segment boundary, so /assessments matches but a
    // hypothetical /bookstore does not get caught by /book.
    (prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`),
  )
}

/**
 * Flips GA's kill switch for the current route.
 *
 * Named for the measurement id because that is the only form GA reads; a
 * generically named flag is ignored. No-ops when no id is configured, which is
 * every non-production build.
 */
export function applyAnalyticsBoundary(
  pathname: string,
  measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
  scope: Record<string, unknown> | undefined = typeof window === 'undefined'
    ? undefined
    : (window as unknown as Record<string, unknown>),
): void {
  if (!measurementId || !scope) return
  scope[`ga-disable-${measurementId}`] = isSensitivePath(pathname)
}
