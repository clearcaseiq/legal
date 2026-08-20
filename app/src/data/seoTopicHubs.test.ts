import { describe, it, expect } from 'vitest'
import { allLandingPages } from './seoLandingPages'
import { relatedLandingPages, pagesInCategory } from './seoTopicHubs'

const RELATED_LIMIT = 6

describe('sibling links', () => {
  it('gives every page a full set of related links', () => {
    // The original cycle only walked a page's own category, which silently
    // returned nothing for a category holding a single page in that language.
    // Three Spanish pages were in exactly that position and rendered no related
    // links at all.
    const short = allLandingPages
      .map((page) => ({ slug: page.slug, count: relatedLandingPages(page.slug, RELATED_LIMIT).length }))
      .filter((entry) => entry.count < RELATED_LIMIT)
    expect(short, `pages with fewer than ${RELATED_LIMIT} related links`).toEqual([])
  })

  it('never links a page to itself', () => {
    for (const page of allLandingPages) {
      const slugs = relatedLandingPages(page.slug, RELATED_LIMIT).map((p) => p.slug)
      expect(slugs, `${page.slug} links to itself`).not.toContain(page.slug)
    }
  })

  it('never repeats a link on the same page', () => {
    for (const page of allLandingPages) {
      const slugs = relatedLandingPages(page.slug, RELATED_LIMIT).map((p) => p.slug)
      expect(new Set(slugs).size, `${page.slug} repeats a related link`).toBe(slugs.length)
    }
  })

  it('keeps each language in its own cycle', () => {
    // A Spanish page advertising an English read, or the reverse, sends the
    // reader to a page they cannot use and muddies the hreflang grouping.
    for (const page of allLandingPages) {
      const spanish = page.slug.startsWith('/es/')
      for (const related of relatedLandingPages(page.slug, RELATED_LIMIT)) {
        expect(related.slug.startsWith('/es/'), `${page.slug} -> ${related.slug} crosses languages`).toBe(
          spanish,
        )
      }
    }
  })

  it('prefers same-category siblings before topping up', () => {
    // Top-up is a fallback. Where a category can fill the cycle on its own it
    // should, so related links stay topical rather than drifting site-wide.
    for (const page of allLandingPages) {
      const category = pagesInCategory(page.category, page.locale)
      if (category.length <= RELATED_LIMIT) continue
      for (const related of relatedLandingPages(page.slug, RELATED_LIMIT)) {
        expect(related.category, `${page.slug} left its category early`).toBe(page.category)
      }
    }
  })

  it('leaves no page without inbound links from its own language', () => {
    // The point of the cycle is reciprocity: a page that links out but is never
    // linked to still collects no internal equity.
    const inbound = new Map<string, number>()
    for (const page of allLandingPages) {
      for (const related of relatedLandingPages(page.slug, RELATED_LIMIT)) {
        inbound.set(related.slug, (inbound.get(related.slug) ?? 0) + 1)
      }
    }
    const unlinked = allLandingPages.filter((page) => !inbound.has(page.slug)).map((p) => p.slug)
    expect(unlinked, 'pages nothing links to').toEqual([])
  })

  it('is stable across calls so server and client markup agree', () => {
    for (const page of allLandingPages.slice(0, 20)) {
      const first = relatedLandingPages(page.slug, RELATED_LIMIT).map((p) => p.slug)
      const second = relatedLandingPages(page.slug, RELATED_LIMIT).map((p) => p.slug)
      expect(second).toEqual(first)
    }
  })
})
