import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DEFAULT_LANGUAGE } from '../i18n'
import { hreflangFor, localeFromPath } from '../i18n/routing'
import { alternatesForPath, translatedPaths } from './localeAlternates'
import { LOCALE_PATH_PAIRS, pathForLocale } from './localePathPairs'
import { allMarketingPages, marketingPagesByPath } from './marketingPages'
import { marketingPagesEs } from './marketingPagesEs'
import { marketingPagesZh } from './marketingPagesZh'
import { allLandingPages } from './seoLandingPages'

const translatedPages = allMarketingPages.filter((page) => page.translationOf)

/**
 * Landing pages with a twin, shaped like a marketing page so the pair check can
 * treat both registries the same way. Spanish-only pages have no `translationOf`
 * and so belong in neither list.
 */
const translatedLandingPages = allLandingPages
  .filter((page) => page.translationOf)
  .map((page) => ({ path: page.slug, locale: page.locale, translationOf: page.translationOf }))

describe('translated page registry', () => {
  it('points every translation at a page that exists', () => {
    for (const page of translatedPages) {
      expect(marketingPagesByPath.has(page.translationOf!)).toBe(true)
    }
  })

  it('gives every translation a locale matching its URL prefix', () => {
    for (const page of translatedPages) {
      expect(page.locale).toBe(localeFromPath(page.path))
      expect(page.locale).not.toBe(DEFAULT_LANGUAGE)
    }
  })

  it('only translates pages that server-render', () => {
    // A translated page whose body is client-rendered serves a crawler an empty
    // shell while competing with the English page for the same intent.
    for (const page of translatedPages) {
      expect(page.serverRender).toBe(true)
      expect(marketingPagesByPath.get(page.translationOf!)?.serverRender).toBe(true)
    }
  })

  it('seeds the namespaces the shared Layout needs', () => {
    for (const page of translatedPages) {
      expect(page.namespaces).toContain('common')
      expect(page.namespaces).toContain('footer')
    }
  })

  it('names only namespaces the dictionary actually has', () => {
    for (const [locale, pages] of [
      ['es', marketingPagesEs],
      ['zh', marketingPagesZh],
    ] as const) {
      const dictionary = JSON.parse(
        readFileSync(join(__dirname, '..', 'i18n', 'locales', `${locale}.json`), 'utf8')
      ) as Record<string, unknown>

      for (const page of pages) {
        for (const namespace of page.namespaces ?? []) {
          expect(Object.keys(dictionary), `${page.path} names ${namespace}`).toContain(namespace)
        }
      }
    }
  })

  it('dates each translated set separately from the English one', () => {
    for (const page of [...marketingPagesEs, ...marketingPagesZh]) {
      expect(page.contentUpdated).toBeTruthy()
    }
  })
})

describe('hreflang sets', () => {
  it('is reciprocal: every page in a set lists every other page', () => {
    for (const path of translatedPaths()) {
      const links = alternatesForPath(path)
      for (const link of links) {
        if (link.hreflang === 'x-default') continue
        expect(alternatesForPath(link.path)).toEqual(links)
      }
    }
  })

  it('includes a self-reference, which is what makes the set valid', () => {
    for (const page of translatedPages) {
      const links = alternatesForPath(page.path)
      expect(links.some((link) => link.path === page.path)).toBe(true)
    }
  })

  it('names exactly one x-default, pointing at the default language', () => {
    for (const path of translatedPaths()) {
      const defaults = alternatesForPath(path).filter((link) => link.hreflang === 'x-default')
      expect(defaults).toHaveLength(1)
      expect(localeFromPath(defaults[0].path)).toBe(DEFAULT_LANGUAGE)
    }
  })

  it('says nothing at all for pages with no translation', () => {
    // A lone self-referencing annotation adds no information and invites the
    // "no return tag" errors that make Google discard the whole set.
    expect(alternatesForPath('/press')).toEqual([])
    expect(alternatesForPath('/editorial-standards')).toEqual([])
  })
})

describe('switcher path pairs', () => {
  it('agrees with the real registry it duplicates', () => {
    const fromRegistry = [...translatedPages, ...translatedLandingPages]
      .map((page) => `${page.translationOf} -> ${page.locale}:${page.path}`)
      .sort()
    const fromPairs = LOCALE_PATH_PAIRS.flatMap((pair) =>
      Object.entries(pair.translations).map(([locale, path]) => `${pair.en} -> ${locale}:${path}`)
    ).sort()

    expect(fromPairs).toEqual(fromRegistry)
  })

  it('maps a page to its twin in both directions', () => {
    expect(pathForLocale('/how-it-works', 'es')).toBe('/es/como-funciona')
    expect(pathForLocale('/es/como-funciona', 'en')).toBe('/how-it-works')
    expect(pathForLocale('/', 'es')).toBe('/es')
    expect(pathForLocale('/es', 'en')).toBe('/')
  })

  it('returns nothing for a page with no twin, so the switcher stays put', () => {
    expect(pathForLocale('/press', 'es')).toBeUndefined()
    expect(pathForLocale('/dashboard', 'es')).toBeUndefined()
    expect(pathForLocale('/press', 'zh')).toBeUndefined()
  })
})

describe('Spanish routes are reachable', () => {
  it('declares a route in App.tsx for every registry entry', () => {
    const source = readFileSync(join(__dirname, '..', 'App.tsx'), 'utf8')
    const declared = new Set(
      [...source.matchAll(/<Route\s+path="([^"]+)"/g)].map((match) => match[1])
    )

    for (const page of marketingPagesEs) {
      expect(declared.has(page.path)).toBe(true)
    }
  })

  it('registers no /es route that the registry does not know about', () => {
    const source = readFileSync(join(__dirname, '..', 'App.tsx'), 'utf8')
    const declaredEs = [...source.matchAll(/<Route\s+path="(\/es[^"]*)"/g)].map((match) => match[1])
    const known = new Set(marketingPagesEs.map((page) => page.path))

    expect(declaredEs.filter((path) => !known.has(path))).toEqual([])
  })
})

describe('Chinese edition', () => {
  it('declares a route in App.tsx for every registry entry', () => {
    const source = readFileSync(join(__dirname, '..', 'App.tsx'), 'utf8')
    const declared = new Set([...source.matchAll(/<Route\s+path="([^"]+)"/g)].map((match) => match[1]))

    for (const page of marketingPagesZh) {
      expect(declared.has(page.path), `no route for ${page.path}`).toBe(true)
    }
  })

  it('registers no /zh route that the registry does not know about', () => {
    const source = readFileSync(join(__dirname, '..', 'App.tsx'), 'utf8')
    const declaredZh = [...source.matchAll(/<Route\s+path="(\/zh[^"]*)"/g)].map((match) => match[1])
    const known = new Set(marketingPagesZh.map((page) => page.path))

    expect(declaredZh.filter((path) => !known.has(path))).toEqual([])
  })

  it('annotates Chinese by script, not by bare language', () => {
    // `zh` would offer this Simplified edition to Traditional readers too, and
    // leave a future Traditional set no way to distinguish itself.
    expect(hreflangFor('zh')).toBe('zh-Hans')
    for (const page of marketingPagesZh) {
      const tags = alternatesForPath(page.path).map((link) => link.hreflang)
      expect(tags).toContain('zh-Hans')
      expect(tags).not.toContain('zh')
    }
  })

  it('keeps titles and descriptions inside the CJK snippet limits', () => {
    // Google cuts Chinese titles around 30 characters and descriptions around 80,
    // roughly half the Latin-script limits, because CJK glyphs are full-width.
    // `clampDescription` counts characters and is blind to that, so these are
    // authored short rather than clamped short.
    for (const page of marketingPagesZh) {
      expect(page.title.length, `${page.path} title`).toBeLessThanOrEqual(40)
      expect(page.description.length, `${page.path} description`).toBeLessThanOrEqual(80)
    }
  })

  it('uses ASCII slugs so URLs survive logs and analytics intact', () => {
    for (const page of marketingPagesZh) {
      expect(page.path, `${page.path} is not ASCII`).toMatch(/^[\x20-\x7E]+$/)
    }
  })
})
