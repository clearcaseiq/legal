import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { allMarketingPages } from './data/marketingPages'

/**
 * Guards the fix for the hydration collapse.
 *
 * A route the server renders must not be declared with `React.lazy`. The server
 * emits the real markup, but the client reaches hydration before that route's
 * chunk has arrived, cannot resolve the boundary, discards the server HTML and
 * renders the route fallback instead. Measured on production, the document went
 * from 4209px to the 940px viewport and back over roughly 300ms, which scored
 * 0.7574 CLS on desktop and pushed LCP to 3.6s. `ssrRoute` (next/dynamic) makes
 * Next load the chunks the server used before hydration starts, so the boundary
 * never suspends and the markup is hydrated in place.
 *
 * This reads the source rather than the module because the distinction is in how
 * the component is declared, which is invisible once it is a value.
 */
const source = readFileSync(join(__dirname, 'App.tsx'), 'utf8')

function declarationsUsing(helper: string): Set<string> {
  const names = new Set<string>()
  const pattern = new RegExp(`^const (\\w+) = ${helper}\\(`, 'gm')
  for (const match of source.matchAll(pattern)) names.add(match[1])
  return names
}

const ssrRouted = declarationsUsing('dynamic')
const lazyRouted = declarationsUsing('lazy')

/** `path` -> component, for routes registered with a literal path. */
const routeComponents = new Map<string, string>()
for (const match of source.matchAll(/<Route path="([^"]+)" element=\{<(\w+)\s*\/>\}/g)) {
  routeComponents.set(match[1], match[2])
}

/**
 * Components that stand in front of a route component rather than being one.
 * `HomeRoute` picks between a redirect and `Home` depending on the stored role;
 * only the component it can actually render matters here.
 */
const WRAPPERS: Record<string, string> = { HomeRoute: 'Home' }

/** Route groups registered from a list rather than a literal path. */
const GENERATED_ROUTE_COMPONENTS: Record<string, string> = {
  '/topics/': 'TopicHub',
  '/es/temas': 'TopicsEs',
}

function componentFor(path: string): string | undefined {
  const direct = routeComponents.get(path)
  if (direct) return WRAPPERS[direct] ?? direct
  for (const [prefix, component] of Object.entries(GENERATED_ROUTE_COMPONENTS)) {
    if (path.startsWith(prefix)) return component
  }
  return undefined
}

describe('routes the server renders', () => {
  const serverRendered = allMarketingPages.filter((page) => page.serverRender)

  it('has marketing pages to check', () => {
    expect(serverRendered.length).toBeGreaterThan(30)
  })

  it('registers a component for every server-rendered path', () => {
    // A path we cannot resolve would pass the next test vacuously, so fail here
    // instead and make whoever changed the route table extend the mapping.
    const unresolved = serverRendered.map((page) => page.path).filter((path) => !componentFor(path))
    expect(unresolved).toEqual([])
  })

  it('renders none of them through React.lazy', () => {
    const suspending = serverRendered
      .map((page) => ({ path: page.path, component: componentFor(page.path) }))
      .filter((entry) => entry.component && lazyRouted.has(entry.component))
      .map((entry) => `${entry.path} -> ${entry.component}`)
    expect(suspending).toEqual([])
  })

  it('passes each dynamic import inline, where the compiler can read it', () => {
    // Next takes the module path out of the source to know which chunks the
    // server used. Hand `dynamic` a loader built somewhere else — a shared
    // helper, a map, a variable — and it still compiles and still renders, but
    // the chunk is never registered, the client puts nothing where the server
    // had content, and React regenerates the tree with a hydration mismatch.
    // Anything other than an open paren after `dynamic(` is not an inline arrow.
    const indirect = [...source.matchAll(/^const (\w+) = dynamic\(\s*[^\s(]/gm)].map(
      (match) => match[1]
    )
    expect(indirect).toEqual([])
  })

  it('renders all of them through next/dynamic', () => {
    const missing = serverRendered
      .map((page) => ({ path: page.path, component: componentFor(page.path) }))
      .filter((entry) => entry.component && !ssrRouted.has(entry.component))
      .map((entry) => `${entry.path} -> ${entry.component}`)
    expect(missing).toEqual([])
  })

  it('covers the landing page templates, which the server renders too', () => {
    // These are not in the marketing registry: they are the 149 SEO pages, and
    // they are the ones the collapse was measured on.
    for (const component of ['SeoLandingPage', 'SeoLandingPageEs', 'TopicHub', 'TopicsEs']) {
      expect(ssrRouted.has(component), `${component} must use ssrRoute`).toBe(true)
    }
  })

  it('leaves client-only routes on React.lazy', () => {
    // The reverse mistake costs bundle size for no gain: nothing is server
    // rendered for these, so the fallback is the correct first paint.
    for (const component of ['Login', 'AttorneyLogin', 'AttorneyWorkspaceLayout']) {
      expect(lazyRouted.has(component), `${component} should stay lazy`).toBe(true)
    }
  })
})
