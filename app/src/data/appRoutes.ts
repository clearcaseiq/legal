/**
 * The routes the SPA can actually render, so the server can tell a real URL
 * from a typo.
 *
 * Without this every invented URL answered 200 with an empty shell. Crawlers
 * treat that as a "soft 404": an unlimited supply of pages that all report
 * success, which spends crawl budget that should reach the real content.
 *
 * SEO landing routes are deliberately absent. `/injuries/:slug` accepts any
 * slug at the router level, but only slugs backed by real content should
 * answer 200, so those are checked against the landing page data instead.
 *
 * `appRoutes.test.ts` fails if a route is added to App.tsx without being
 * registered here.
 */

/** Route trees where any child path is valid (record ids, nested sections). */
export const KNOWN_ROUTE_PREFIXES = [
  '/admin',
  '/attorney-dashboard',
  '/book',
  '/booking',
  '/claim',
  '/demand',
  '/drafts',
  '/edit-assessment',
  '/evidence-dashboard',
  '/evidence-upload',
  '/firms',
  '/payment',
  '/respond',
  '/results',
  '/smart-recommendations',
]

/** Routes with no dynamic segments. */
export const KNOWN_ROUTE_PATHS = new Set([
  '/',
  '/ai-copilot',
  '/ai-ml-consent',
  '/assess',
  '/assessment/start',
  '/assessments',
  '/attorney-billing',
  '/attorney-license-upload',
  '/attorney-login',
  '/attorney-network',
  '/attorney-onboarding/payment',
  '/attorney-preferences',
  '/attorney-profile',
  '/attorney-register',
  '/attorneys',
  '/attorneys-enhanced',
  '/admin-login',
  '/auth-debug',
  '/auth/callback',
  '/auth/complete-consent',
  '/case-tracker',
  '/consent-management',
  '/contact',
  '/dashboard',
  '/disclosures',
  '/financing',
  '/firm-dashboard',
  '/firm-settings',
  '/for-attorneys',
  '/forgot-password',
  '/help',
  '/hipaa-authorization',
  '/how-it-works',
  '/integrations',
  '/intake',
  '/intake2',
  '/login',
  '/login/admin',
  '/login/attorney',
  '/login/plaintiff',
  '/login/staff',
  '/medical-providers',
  '/messaging',
  '/oauth/zoom/complete',
  '/privacy-policy',
  '/profile',
  '/recovery-hub',
  '/register',
  '/reset-password',
  '/rose',
  '/set-password',
  '/staff-login',
  '/terms-of-service',
  '/test-consent',
  '/verify-email',
])

/** Prefixes whose `:slug` is validated against the landing page data. */
export const SEO_CLUSTER_PREFIXES = [
  '/case-strength',
  '/commercial',
  '/education',
  '/injuries',
  '/insurance',
  '/legal',
  '/liability',
  '/settlements',
  '/tools',
  '/treatment',
]

export function isKnownAppRoute(pathname: string): boolean {
  if (KNOWN_ROUTE_PATHS.has(pathname)) return true
  return KNOWN_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}
