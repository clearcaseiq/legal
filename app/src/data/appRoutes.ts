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
import type { LandingPageCategory } from './seoLandingPages'
import { topicHubs } from './seoTopicHubDefs'

/**
 * Where "start a free assessment" links point.
 *
 * `/assessment/start` still resolves and still 308s here — that redirect is
 * what external links, printed URLs and old bookmarks depend on, and it stays.
 * But it is also the header and footer CTA and the primary CTA on every SEO
 * landing page, so pointing *internal* links at it made the site's second most
 * linked URL a redirect: Search Console counted 136 internal links arriving at
 * a hop, every one of them costing a visitor an extra round trip before the
 * wizard starts loading and costing Googlebot a fetch that returns no content.
 *
 * Internal links go straight to the destination. A redirect is for URLs you do
 * not control; it should not be load-bearing inside your own markup.
 */
export const START_ASSESSMENT_HREF = '/assess?fresh=1'

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
  '/about',
  '/press',
  '/insights',
  '/partners/badge',
  '/tools/california-sol-checker',
  '/tools/medical-records-checklist',
  '/auth-debug',
  '/auth/callback',
  '/auth/complete-consent',
  '/case-tracker',
  '/consent-management',
  '/contact',
  '/dashboard',
  '/disclosures',
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

/**
 * Each SEO cluster's bare directory prefix, and the landing page category every
 * page beneath it carries.
 *
 * The prefixes themselves are not pages and never were — `/treatment` is what a
 * crawler gets when it truncates `/treatment/mri-after-accident`, which is
 * routine crawler behaviour and how Google found all of them. Search Console
 * reported the whole set as "Duplicate without user-selected canonical" and
 * folded six of them into `/tools`, because at the time they all answered 200
 * with an empty client-rendered body and so were identical to one another.
 *
 * The category is what makes them recoverable rather than merely 404-able: each
 * one maps to exactly one topic hub, which is a real server-rendered page with
 * its own canonical and sitemap entry. See `topicHubForClusterPrefix`.
 */
const SEO_CLUSTER_PREFIX_CATEGORIES: Record<string, LandingPageCategory> = {
  // `/case-strength` was on this list and is deliberately no longer: its eight
  // children were consolidated into a single guide that took the prefix URL
  // itself. Truncating a child now lands on a real page about the thing the URL
  // names, which answers the crawler better than a redirect to a hub did.
  '/commercial': 'Commercial',
  '/education': 'Educational / SEO Moat',
  '/injuries': 'Symptoms',
  '/insurance': 'Insurance',
  '/legal': 'Attorney Intent',
  '/liability': 'Liability',
  '/settlements': 'Settlement',
  '/treatment': 'Treatment',
}

/**
 * Prefixes whose `:slug` is validated against the landing page data.
 *
 * Derived from the mapping above so the two cannot drift. `/tools` is appended
 * rather than mapped: unlike the others it mixes landing pages with real
 * marketing pages (the deadline checker, the records checklist), so it wants a
 * decision about an index page rather than a redirect to a topic hub.
 */
export const SEO_CLUSTER_PREFIXES = [...Object.keys(SEO_CLUSTER_PREFIX_CATEGORIES), '/tools'].sort()

const hubSlugByCategory = new Map(topicHubs.map((hub) => [hub.category, hub.slug]))

/**
 * The topic hub a bare cluster prefix belongs to, or null if the path is not one.
 *
 * Only matches the prefix exactly. `/treatment/mri-after-accident` is a real
 * page and has to keep answering as one.
 */
export function topicHubForClusterPrefix(pathname: string): string | null {
  const category = SEO_CLUSTER_PREFIX_CATEGORIES[pathname]
  if (!category) return null
  return hubSlugByCategory.get(category) ?? null
}

export function isKnownAppRoute(pathname: string): boolean {
  if (KNOWN_ROUTE_PATHS.has(pathname)) return true
  return KNOWN_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}
