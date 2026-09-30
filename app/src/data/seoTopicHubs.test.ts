import { describe, it, expect } from 'vitest'
import { allLandingPages } from './seoLandingPages'
import { caseTypeHubBySlug, caseTypeHubByType } from './caseTypeHubDefs'
import {
  caseTypeRelatedResources,
  relatedLandingPages,
  relatedSlugsFor,
  pagesInCategory,
} from './seoTopicHubs'

const RELATED_LIMIT = 6

/** Pages outside the six case types keep the category walk. */
const walked = allLandingPages.filter((page) => !page.caseType)
const caseTyped = allLandingPages.filter((page) => page.caseType)

describe('sibling links', () => {
  it('gives every page a full set of related links', () => {
    // The original cycle only walked a page's own category, which silently
    // returned nothing for a category holding a single page in that language.
    // Three Spanish pages were in exactly that position and rendered no related
    // links at all.
    const short = walked
      .map((page) => ({ slug: page.slug, count: relatedLandingPages(page.slug, RELATED_LIMIT).length }))
      .filter((entry) => entry.count < RELATED_LIMIT)
    expect(short, `pages with fewer than ${RELATED_LIMIT} related links`).toEqual([])
  })

  it('never links a page to itself', () => {
    for (const page of allLandingPages) {
      expect(relatedSlugsFor(page.slug), `${page.slug} links to itself`).not.toContain(page.slug)
    }
  })

  it('never repeats a link on the same page', () => {
    for (const page of allLandingPages) {
      const slugs = relatedSlugsFor(page.slug)
      expect(new Set(slugs).size, `${page.slug} repeats a related link`).toBe(slugs.length)
    }
  })

  it('keeps each language in its own cycle', () => {
    // A Spanish page advertising an English read, or the reverse, sends the
    // reader to a page they cannot use and muddies the hreflang grouping.
    for (const page of allLandingPages) {
      const spanish = page.slug.startsWith('/es/')
      for (const related of relatedSlugsFor(page.slug)) {
        expect(related.startsWith('/es/'), `${page.slug} -> ${related} crosses languages`).toBe(spanish)
      }
    }
  })

  it('prefers same-category siblings before topping up', () => {
    // Top-up is a fallback. Where a category can fill the cycle on its own it
    // should, so related links stay topical rather than drifting site-wide.
    for (const page of walked) {
      const category = pagesInCategory(page.category, page.locale).filter((sibling) => !sibling.caseType)
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
      for (const related of relatedSlugsFor(page.slug)) {
        inbound.set(related, (inbound.get(related) ?? 0) + 1)
      }
    }
    const unlinked = allLandingPages.filter((page) => !inbound.has(page.slug)).map((p) => p.slug)
    expect(unlinked, 'pages nothing links to').toEqual([])
  })

  it('is stable across calls so server and client markup agree', () => {
    for (const page of allLandingPages.slice(0, 20)) {
      expect(relatedSlugsFor(page.slug)).toEqual(relatedSlugsFor(page.slug))
    }
  })
})

describe('case-type related resources', () => {
  it('opens with the value page, closes with the hub, and fills the middle from the case type', () => {
    for (const page of caseTyped) {
      const resources = caseTypeRelatedResources(page.slug)
      const hub = caseTypeHubByType.get(page.caseType!)!
      expect(resources, page.slug).not.toBeNull()
      const slugs = resources!.map((resource) => resource.to)
      if (page.slug !== hub.valueSlug) expect(slugs[0], page.slug).toBe(hub.valueSlug)
      expect(slugs[slugs.length - 1], page.slug).toBe(hub.slug)
      expect(slugs.length, page.slug).toBeGreaterThanOrEqual(4)
    }
  })

  it('stays inside the case type apart from the hub', () => {
    const strays = caseTyped.flatMap((page) =>
      relatedSlugsFor(page.slug)
        .filter((slug) => !caseTypeHubBySlug.has(slug))
        .filter((slug) => allLandingPages.find((other) => other.slug === slug)?.caseType !== page.caseType)
        .map((slug) => `${page.slug} -> ${slug}`)
    )
    expect(strays).toEqual([])
  })

  it('gives every link a one-line description', () => {
    for (const page of caseTyped.slice(0, 50)) {
      for (const resource of caseTypeRelatedResources(page.slug) ?? []) {
        expect(resource.description.length, `${page.slug} -> ${resource.to}`).toBeGreaterThan(20)
        expect(resource.description.length, `${page.slug} -> ${resource.to}`).toBeLessThanOrEqual(151)
      }
    }
  })
})
