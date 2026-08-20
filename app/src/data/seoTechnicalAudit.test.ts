/**
 * Site-wide technical SEO invariants.
 *
 * These are the failures that do not announce themselves. A redirect chain, a
 * retired URL still sitting in the sitemap, or two pages sharing a title all
 * render perfectly and cost crawl budget and ranking signals quietly. Each
 * consolidation adds redirects and removes pages, which is exactly when these
 * break, so they are asserted rather than audited by hand.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'
import nextConfig from '../../next.config.mjs'
import { allLandingPages } from './seoLandingPages'
import { allMarketingPages, marketingSitemapPaths } from './marketingPages'
import { landingPageTitle, landingPageDescription, landingPageCanonical } from './seoLandingPageSchema'
import { isKnownAppRoute } from './appRoutes'

type Redirect = { source: string; destination: string }

const redirects: Redirect[] = (await nextConfig.redirects!()) as Redirect[]
/** Literal redirects only; parameterised sources cannot be compared as strings. */
const literal = redirects.filter((r) => !r.source.includes(':') && !r.source.includes('*'))
const destinationBySource = new Map(literal.map((r) => [r.source, String(r.destination).split('?')[0]]))

const livePaths = new Set<string>([
  ...allLandingPages.map((p) => p.slug),
  ...allMarketingPages.map((p) => p.path),
])
const sitemapPaths = Array.from(
  new Set([...marketingSitemapPaths, ...allLandingPages.map((p) => p.slug)]),
)

describe('redirects', () => {
  it('never chain', () => {
    // Each hop loses signal and costs a crawl. A -> B -> C should be A -> C.
    const chains = [...destinationBySource]
      .filter(([, dest]) => destinationBySource.has(dest))
      .map(([source, dest]) => `${source} -> ${dest} -> ${destinationBySource.get(dest)}`)
    expect(chains).toEqual([])
  })

  it('never loop', () => {
    const loops = [...destinationBySource].filter(([source, dest]) => source === dest).map(([s]) => s)
    expect(loops).toEqual([])
  })

  it('land on something real', () => {
    const broken = [...destinationBySource]
      .filter(([, dest]) => !livePaths.has(dest) && !isKnownAppRoute(dest))
      .map(([source, dest]) => `${source} -> ${dest}`)
    expect(broken).toEqual([])
  })

  it('do not shadow a live page', () => {
    // A path that is both a page and a redirect source is ambiguous, and which
    // one wins depends on where it is resolved.
    const shadowed = [...destinationBySource.keys()].filter((source) => livePaths.has(source))
    expect(shadowed).toEqual([])
  })
})

describe('the sitemap', () => {
  it('lists no URL that redirects', () => {
    // Submitting a redirecting URL is a direct Search Console error and the
    // easiest way to undo a consolidation.
    const stale = sitemapPaths.filter((path) => destinationBySource.has(path))
    expect(stale).toEqual([])
  })

  it('lists nothing twice', () => {
    const duplicates = sitemapPaths.filter((path, i) => sitemapPaths.indexOf(path) !== i)
    expect(duplicates).toEqual([])
  })
})

describe('page metadata', () => {
  it('gives every landing page a self-referencing canonical', () => {
    const wrong = allLandingPages
      .filter((page) => !landingPageCanonical(page).endsWith(page.slug))
      .map((page) => `${page.slug} -> ${landingPageCanonical(page)}`)
    expect(wrong).toEqual([])
  })

  it('uses no title twice', () => {
    const byTitle = new Map<string, string[]>()
    for (const page of allLandingPages) {
      const title = landingPageTitle(page)
      byTitle.set(title, [...(byTitle.get(title) ?? []), page.slug])
    }
    for (const page of allMarketingPages) {
      byTitle.set(page.title, [...(byTitle.get(page.title) ?? []), page.path])
    }
    const duplicates = [...byTitle].filter(([, paths]) => paths.length > 1)
    expect(duplicates.map(([title, paths]) => `${title}: ${paths.join(', ')}`)).toEqual([])
  })

  it('uses no description twice', () => {
    const byDescription = new Map<string, string[]>()
    for (const page of allLandingPages) {
      const description = landingPageDescription(page)
      byDescription.set(description, [...(byDescription.get(description) ?? []), page.slug])
    }
    for (const page of allMarketingPages) {
      byDescription.set(page.description, [
        ...(byDescription.get(page.description) ?? []),
        page.path,
      ])
    }
    const duplicates = [...byDescription].filter(([, paths]) => paths.length > 1)
    expect(duplicates.map(([, paths]) => paths.join(', '))).toEqual([])
  })
})

describe('internal links', () => {
  it('point at no redirected URL', () => {
    // Linking to a redirect makes readers and crawlers take an extra hop for no
    // reason, and it is how a consolidation slowly reintroduces the URLs it
    // retired.
    const roots = [join(process.cwd(), 'src'), join(process.cwd(), 'pages')]
    const files: string[] = []
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry)
        if (statSync(full).isDirectory()) walk(full)
        else if (['.ts', '.tsx'].includes(extname(full)) && !full.includes('.test.')) files.push(full)
      }
    }
    roots.forEach(walk)

    const offenders: string[] = []
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      for (const match of text.matchAll(/(?:to|href)=["'](\/[^"'#?\s${}]*)["']/g)) {
        const path = match[1].replace(/\/$/, '') || '/'
        if (destinationBySource.has(path)) {
          offenders.push(`${file.split(/[\\/]/).slice(-2).join('/')} -> ${path}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })
})
