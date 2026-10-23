import { describe, expect, it } from 'vitest'
import { KNOWN_ROUTE_PATHS, KNOWN_ROUTE_PREFIXES } from '../data/appRoutes'
import { marketingPagesByPath } from '../data/marketingPages'
import { landingPagesBySlug } from '../data/seoLandingPages'
import { isSensitivePath } from './analyticsBoundary'

/**
 * Release gate for third-party trackers.
 *
 * The tag manager, and with it Google Ads, GA4, Clarity and the Meta Pixel,
 * loads on exactly the pages the server finds in the marketing and landing page
 * data (`publicPage` in pages/[[...slug]].tsx). Everything else loads none. So
 * the one way a new screen starts sending its URL to an ad platform is by being
 * entered into that data, or by an app route being added under a path the data
 * already claims. These fail the build when either happens.
 *
 * See docs/tracking-architecture.md.
 */

/** App route trees that are public content rather than app screens. */
const PUBLIC_APP_TREES = new Set(['/attorney-guides', '/blog', '/firms'])

/** App screens with no dynamic segment that are public content. */
const PUBLIC_APP_PATHS = new Set([
  '/',
  '/about',
  '/attorney-network',
  '/attorneys',
  '/attorneys-enhanced',
  '/blog',
  '/contact',
  '/disclosures',
  '/for-attorneys',
  '/help',
  '/how-it-works',
  '/insights',
  '/medical-providers',
  '/partners/badge',
  '/press',
  '/privacy-policy',
  '/terms-of-service',
  '/tools/california-sol-checker',
  '/tools/medical-records-checklist',
  '/ai-ml-consent',
  '/integrations',
])

/** Sign-in doors that carry no token, and callbacks that only redirect. Never marketing pages either. */
const UNTRACKED_UTILITY_PATHS = new Set([
  '/admin-login',
  '/attorney-login',
  '/attorney-register',
  '/auth-debug',
  '/auth/callback',
  '/forgot-password',
  '/oauth/zoom/complete',
  '/staff-login',
  '/test-consent',
])

const publicPaths = [...marketingPagesByPath.keys(), ...landingPagesBySlug.keys()]

const appTrees = KNOWN_ROUTE_PREFIXES.filter((prefix) => !PUBLIC_APP_TREES.has(prefix))
const appScreens = [...KNOWN_ROUTE_PATHS].filter((path) => !PUBLIC_APP_PATHS.has(path))

function under(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}/`)
}

describe('pages that load third-party trackers', () => {
  it('are never on a sensitive route', () => {
    expect(publicPaths.filter((path) => isSensitivePath(path))).toEqual([])
  })

  it('are never an app screen, or inside an app route tree', () => {
    const collisions = publicPaths.filter(
      (path) => appScreens.includes(path) || appTrees.some((prefix) => under(path, prefix)),
    )
    expect(collisions).toEqual([])
  })
})

describe('app screens', () => {
  /**
   * A new app route has to be classified when it is added: listed as sensitive,
   * or listed above as public content. Leaving it unclassified is what this
   * catches, because the client-side switches (GA's kill switch, the
   * analytics_blocked flag the container reads) only cover sensitive routes.
   */
  it('are all on the sensitive list, unless declared public above', () => {
    const unclassified = [...appTrees, ...appScreens].filter(
      (path) => !isSensitivePath(path) && !UNTRACKED_UTILITY_PATHS.has(path),
    )
    expect(unclassified).toEqual([])
  })
})
