import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  KNOWN_ROUTE_PREFIXES,
  SEO_CLUSTER_PREFIXES,
  START_ASSESSMENT_HREF,
  isKnownAppRoute,
  topicHubForClusterPrefix,
} from './appRoutes'
import { landingPagesBySlug } from './seoLandingPages'
import { marketingPagesByPath } from './marketingPages'

/**
 * The server answers 404 for anything it does not recognise, so a route added
 * to App.tsx but not registered in appRoutes.ts would return 404 for a page
 * that really exists. This keeps the two in step.
 */
function routePathsDeclaredInApp(): string[] {
  const source = readFileSync(join(__dirname, '..', 'App.tsx'), 'utf8')
  return [...source.matchAll(/<Route\s+path="([^"]+)"/g)]
    .map((match) => match[1])
    // Nested <Route path="cases"> children are relative; their parent prefix
    // already covers them.
    .filter((path) => path.startsWith('/'))
}

describe('app route registry', () => {
  const declared = routePathsDeclaredInApp()

  it('finds the routes declared in App.tsx', () => {
    expect(declared.length).toBeGreaterThan(100)
  })

  it('recognises every static route declared in App.tsx', () => {
    const unregistered = declared
      .filter((path) => !path.includes(':'))
      .filter(
        (path) =>
          !isKnownAppRoute(path) &&
          !landingPagesBySlug.has(path) &&
          !marketingPagesByPath.has(path)
      )

    expect(unregistered).toEqual([])
  })

  it('recognises every dynamic route declared in App.tsx', () => {
    const unregistered = declared
      .filter((path) => path.includes(':'))
      .filter((path) => {
        const base = `/${path.split('/').filter(Boolean)[0]}`
        return !KNOWN_ROUTE_PREFIXES.includes(base) && !SEO_CLUSTER_PREFIXES.includes(base)
      })

    expect(unregistered).toEqual([])
  })

  it('rejects paths that do not exist', () => {
    for (const path of ['/not-a-real-page', '/injuries/made-up-injury', '/tools/fake']) {
      expect(isKnownAppRoute(path)).toBe(false)
      expect(landingPagesBySlug.has(path)).toBe(false)
    }
  })
})

/**
 * Search Console reported every one of these as a duplicate with no declared
 * canonical, and folded most of them into /tools. They are bare directory
 * prefixes that crawlers reach by truncating a child URL, so they keep being
 * rediscovered no matter how often they 404.
 */
describe('bare SEO cluster prefixes', () => {
  const REPORTED_BY_SEARCH_CONSOLE = [
    '/case-strength',
    '/commercial',
    '/education',
    '/injuries',
    '/insurance',
    '/liability',
    '/settlements',
    '/treatment',
  ]

  it('resolves every reported prefix, by redirect or by being a page', () => {
    // `/case-strength` takes the second route: its children were consolidated
    // into one guide that claimed the prefix URL, so a truncating crawler now
    // gets a real page rather than a hop to a hub. Either outcome resolves the
    // duplicate Search Console reported; what would not is a bare 200 with no
    // canonical, which is the state all of these started in.
    const unresolved = REPORTED_BY_SEARCH_CONSOLE.filter(
      (path) => !topicHubForClusterPrefix(path) && !landingPagesBySlug.has(path),
    )
    expect(unresolved).toEqual([])
  })

  it('keeps /case-strength a page rather than a prefix', () => {
    expect(landingPagesBySlug.has('/case-strength')).toBe(true)
    expect(SEO_CLUSTER_PREFIXES).not.toContain('/case-strength')
  })

  it('sends them somewhere that is a real server-rendered page', () => {
    for (const path of SEO_CLUSTER_PREFIXES) {
      const hub = topicHubForClusterPrefix(path)
      if (!hub) continue
      const page = marketingPagesByPath.get(hub)
      expect(page, `${path} redirects to ${hub}, which is not a marketing page`).toBeDefined()
      expect(page?.serverRender).toBe(true)
    }
  })

  it('leaves the child pages alone', () => {
    // A redirect matching by prefix rather than exact path would take out the
    // 47 landing pages that live under these directories.
    for (const slug of landingPagesBySlug.keys()) {
      expect(topicHubForClusterPrefix(slug)).toBeNull()
    }
  })

  it('leaves /tools unmapped pending a decision about an index page', () => {
    // It mixes landing pages with real marketing pages, so unlike the others it
    // has no single hub that represents it.
    expect(SEO_CLUSTER_PREFIXES).toContain('/tools')
    expect(topicHubForClusterPrefix('/tools')).toBeNull()
  })
})

/**
 * `/assessment/start` is a redirect, and a redirect is for URLs you do not
 * control. It was the header CTA, the footer CTA and the primary CTA on every
 * SEO landing page, so Search Console counted 136 internal links arriving at a
 * hop that returns no content — a wasted round trip for the visitor and a
 * wasted fetch for the crawler, on the most clicked link on the site.
 *
 * The redirect itself stays, for external links and printed URLs. This only
 * asserts that nothing in our own markup depends on it.
 */
describe('internal links skip the redirect', () => {
  const SRC = join(__dirname, '..')

  function sourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) return sourceFiles(full)
      return /\.tsx?$/.test(entry.name) && !entry.name.includes('.test.') ? [full] : []
    })
  }

  // Link-shaped references only. The bare path legitimately survives elsewhere:
  // the <Route> that redirects it, the absolute URL printed into the PDF export,
  // and the pathname comparisons in Layout.
  const LINKS_TO_REDIRECT = /(?:to=|href[=:]\s*)["'`]\/assessment\/start\b/

  it('never points a link at /assessment/start', () => {
    const offenders = sourceFiles(SRC)
      .filter((file) => LINKS_TO_REDIRECT.test(readFileSync(file, 'utf8')))
      .map((file) => relative(SRC, file))

    expect(offenders).toEqual([])
  })

  it('sends them somewhere that is a real route and not another hop', () => {
    const [path] = START_ASSESSMENT_HREF.split('?')

    expect(path).toBe('/assess')
    expect(isKnownAppRoute(path)).toBe(true)
    expect(topicHubForClusterPrefix(path)).toBeNull()
  })
})
