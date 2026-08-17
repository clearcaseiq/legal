import { describe, expect, it } from 'vitest'
import { CONTENT_REVIEWERS, reviewerFor } from './contentReviewers'
import { allMarketingPages } from './marketingPages'
import { allLandingPages, landingPagesBySlug } from './seoLandingPages'
import {
  buildLandingPageSchema,
  buildMarketingPageSchema,
  formatContentDate,
  landingPageFirstPublished,
  landingPageLastModified,
} from './seoLandingPageSchema'

function articleFor(slug: string) {
  const page = landingPagesBySlug.get(slug)
  if (!page) throw new Error(`missing landing page ${slug}`)
  const graph = buildLandingPageSchema(page)['@graph'] as Array<Record<string, unknown>>
  const article = graph.find((node) => node['@type'] === 'Article')
  if (!article) throw new Error('missing Article node')
  return article
}

describe('marketing page schema', () => {
  const flagged = allMarketingPages.filter((page) => page.schemaType)

  it('covers the pages that render no schema of their own', () => {
    expect(flagged.map((page) => page.path).sort()).toEqual([
      '/attorneys',
      '/privacy-policy',
      '/terms-of-service',
    ])
  })

  it('only marks pages that server-render', () => {
    // Schema is emitted from getServerSideProps. On a page that does not
    // server-render, the markup would describe a document the crawler is
    // handed as an empty shell.
    for (const page of flagged) expect(page.serverRender, page.path).toBe(true)
  })

  it('keeps the brand suffix out of breadcrumb labels', () => {
    const graph = buildMarketingPageSchema({
      path: '/attorneys',
      title: 'Personal Injury Attorneys | ClearCaseIQ',
      description: 'Browse attorneys.',
      schemaType: 'CollectionPage',
    })['@graph'] as Array<Record<string, unknown>>

    const crumbs = graph.find((node) => node['@type'] === 'BreadcrumbList') as {
      itemListElement: Array<{ name: string; item: string }>
    }
    expect(crumbs.itemListElement.map((crumb) => crumb.name)).toEqual(['Home', 'Personal Injury Attorneys'])
    expect(crumbs.itemListElement[1].item).toBe('https://www.clearcaseiq.com/attorneys')
  })
})

describe('medical markup', () => {
  function graphFor(slug: string) {
    const page = landingPagesBySlug.get(slug)
    if (!page) throw new Error(`missing landing page ${slug}`)
    return buildLandingPageSchema(page)['@graph'] as Array<Record<string, unknown>>
  }

  it('claims a MedicalCondition only on pages about a condition', () => {
    // It used to be emitted on all 173, so a page about attorney contingency
    // fees declared itself a medical condition. Markup that contradicts its own
    // page is a structured data policy violation.
    for (const page of allLandingPages) {
      const hasCondition = (buildLandingPageSchema(page)['@graph'] as Array<Record<string, unknown>>).some(
        (node) => node['@type'] === 'MedicalCondition'
      )
      expect(hasCondition, page.slug).toBe(page.category === 'Symptoms')
    }
  })

  it('never publishes a case attribute as a medical symptom', () => {
    // `signals` are underwriting signals — the page says so — so mapping them to
    // MedicalSymptom produced "Policy limits" and "Wage loss" as symptoms.
    for (const page of allLandingPages) {
      for (const node of graphFor(page.slug)) {
        expect(node.signOrSymptom, page.slug).toBeUndefined()
      }
    }
  })
})

describe('content dates', () => {
  it('gives every page both a publish and a revision date', () => {
    for (const page of allLandingPages) {
      expect(landingPageFirstPublished(page), page.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(landingPageLastModified(page), page.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('never reports a page as revised before it was published', () => {
    for (const page of allLandingPages) {
      expect(
        landingPageLastModified(page) >= landingPageFirstPublished(page),
        `${page.slug} modified before published`,
      ).toBe(true)
    }
  })

  it('distinguishes publication from revision for revised content', () => {
    // The core set was revised well after it first shipped; emitting one date for
    // both told readers and crawlers the page had never been touched.
    const article = articleFor('/injuries/whiplash-after-rear-end')
    expect(article.datePublished).toBe('2026-05-20')
    expect(article.dateModified).toBe('2026-08-06')
    expect(article.datePublished).not.toBe(article.dateModified)
  })

  it('formats dates for a reader', () => {
    expect(formatContentDate('2026-08-06')).toBe('August 6, 2026')
    expect(formatContentDate('not-a-date')).toBe('not-a-date')
  })
})

describe('authorship schema', () => {
  const article = articleFor('/injuries/whiplash-after-rear-end')

  it('names an organization author pointing at the editorial policy', () => {
    const author = article.author as Record<string, unknown>
    expect(author.name).toBe('ClearCaseIQ')
    expect(author.mainEntityOfPage).toContain('/editorial-standards')
  })

  it('gives the publisher a logo', () => {
    const publisher = article.publisher as Record<string, Record<string, unknown>>
    expect(publisher.logo['@type']).toBe('ImageObject')
    expect(String(publisher.logo.url)).toMatch(/^https?:\/\/.+\.png$/)
  })
})

describe('reviewer credit', () => {
  it('claims no expert review while no reviewer is registered', () => {
    // Guards the thing that matters most here: an unpopulated registry must never
    // produce a reviewedBy assertion, because a fabricated credential on legal
    // and medical guidance misleads the reader it is aimed at.
    expect(CONTENT_REVIEWERS).toEqual([])
    for (const slug of ['/injuries/whiplash-after-rear-end', '/tools/settlement-calculator']) {
      expect(articleFor(slug).reviewedBy, slug).toBeUndefined()
    }
  })

  it('only credits a reviewer that actually exists', () => {
    expect(reviewerFor(undefined)).toBeUndefined()
    expect(reviewerFor('someone-not-registered')).toBeUndefined()
  })

  it('requires verifiable details from any reviewer added later', () => {
    for (const reviewer of CONTENT_REVIEWERS) {
      expect(reviewer.name.trim().length, reviewer.id).toBeGreaterThan(0)
      expect(reviewer.credentials.trim().length, reviewer.id).toBeGreaterThan(0)
      expect(reviewer.bio.trim().length, reviewer.id).toBeGreaterThan(20)
      // A credential a reader cannot check is not a trust signal.
      expect(Boolean(reviewer.profileUrl || reviewer.licenseUrl), reviewer.id).toBe(true)
    }
  })
})
