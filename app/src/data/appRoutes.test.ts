import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  KNOWN_ROUTE_PREFIXES,
  SEO_CLUSTER_PREFIXES,
  isKnownAppRoute,
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
