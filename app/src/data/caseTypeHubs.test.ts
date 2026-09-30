import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CASE_SECTION_ANCHORS, caseTypeHubs } from './caseTypeHubDefs'
import { caseTypeHubContent } from './caseTypeHubs'
import { CASE_TYPE_DRAFT_SLUGS, caseTypeDraftPages } from './seoCaseTypeDrafts'
import { allLandingPages, landingPagesBySlug } from './seoLandingPages'
import { marketingPagesByPath, marketingSitemapPaths } from './marketingPages'
import { buildCaseTypeHubSchema, buildLandingPageSchema, landingPageBreadcrumbs, siteUrl } from './seoLandingPageSchema'

const appSource = readFileSync(join(__dirname, '..', 'App.tsx'), 'utf8')

describe('case-type hubs', () => {
  it('defines six hubs, each with content', () => {
    expect(caseTypeHubs.map((hub) => hub.slug)).toEqual([
      '/car-accident',
      '/slip-and-fall',
      '/dog-bite',
      '/pedestrian-accident',
      '/medical-malpractice',
      '/wrongful-death',
    ])
    for (const hub of caseTypeHubs) expect(caseTypeHubContent[hub.caseType], hub.slug).toBeDefined()
  })

  it('routes, server-renders and indexes every hub', () => {
    for (const hub of caseTypeHubs) {
      expect(appSource, hub.slug).toContain(`<Route path="${hub.slug}" element={<CaseTypeHub />} />`)
      const page = marketingPagesByPath.get(hub.slug)
      expect(page?.serverRender, hub.slug).toBe(true)
      expect(page?.noindex, hub.slug).toBeFalsy()
      expect(marketingSitemapPaths, hub.slug).toContain(hub.slug)
    }
  })

  it('does not collide with an article URL', () => {
    for (const hub of caseTypeHubs) expect(landingPagesBySlug.has(hub.slug), hub.slug).toBe(false)
  })

  it('covers every part of a claim, with two to four links per section', () => {
    const required = ['claims', 'injuries', 'liability', 'treatment', 'insurance', 'evidence', 'value', 'deadlines']
    for (const hub of caseTypeHubs) {
      const { sections } = caseTypeHubContent[hub.caseType]
      expect(sections.map((section) => section.id), hub.slug).toEqual(required)
      for (const section of sections) {
        expect(section.links.length, `${hub.slug}#${section.id}`).toBeGreaterThanOrEqual(2)
        expect(section.links.length, `${hub.slug}#${section.id}`).toBeLessThanOrEqual(4)
      }
    }
  })

  it('links only to real, indexed pages, or drafts awaiting review', () => {
    const broken: string[] = []
    for (const hub of caseTypeHubs) {
      for (const section of caseTypeHubContent[hub.caseType].sections) {
        for (const link of section.links) {
          const article = landingPagesBySlug.get(link.to)
          const marketing = marketingPagesByPath.get(link.to)
          const indexed = article ? !article.noindex || CASE_TYPE_DRAFT_SLUGS.has(article.slug) : marketing && !marketing.noindex
          if (!indexed) broken.push(`${hub.slug}#${section.id} -> ${link.to}`)
        }
      }
    }
    expect(broken).toEqual([])
  })

  it('links every draft down from its own hub', () => {
    const unlinked = caseTypeDraftPages.filter((page) => {
      const content = caseTypeHubContent[page.caseType!]
      return !content.sections.some((section) => section.links.some((link) => link.to === page.slug))
    })
    expect(unlinked.map((page) => page.slug)).toEqual([])
  })

  it('links the value page from its own hub', () => {
    for (const hub of caseTypeHubs) {
      const value = caseTypeHubContent[hub.caseType].sections.find((section) => section.id === 'value')
      expect(value?.links.map((link) => link.to), hub.slug).toContain(hub.valueSlug)
    }
  })

  it('emits WebPage, BreadcrumbList and the FAQ the page renders', () => {
    for (const hub of caseTypeHubs) {
      const content = caseTypeHubContent[hub.caseType]
      const graph = buildCaseTypeHubSchema(hub, content, '2026-09-29')['@graph'] as Array<Record<string, unknown>>
      expect(graph.map((node) => node['@type'])).toEqual(['WebPage', 'BreadcrumbList', 'FAQPage'])
      const faq = graph[2] as { mainEntity: Array<{ name: string }> }
      expect(faq.mainEntity.map((entry) => entry.name)).toEqual(content.faqs.map((entry) => entry.q))
    }
  })
})

describe('case-type breadcrumbs', () => {
  function schemaTrail(slug: string) {
    const page = landingPagesBySlug.get(slug)!
    const graph = buildLandingPageSchema(page)['@graph'] as Array<Record<string, unknown>>
    const list = graph.find((node) => node['@type'] === 'BreadcrumbList') as {
      itemListElement: Array<{ name: string; item: string }>
    }
    return list.itemListElement
  }

  it('reads Home > case type > section > page', () => {
    const trail = landingPageBreadcrumbs(landingPagesBySlug.get('/injuries/herniated-disc-after-accident')!)
    expect(trail.map((crumb) => crumb.label)).toEqual([
      'Home',
      'Car Accidents',
      'Injuries',
      'Herniated Disc After an Accident',
    ])
    expect(trail[2].to).toBe('/car-accident#injuries')
  })

  it('matches the visible trail in the structured data, on every English page', () => {
    for (const page of allLandingPages.filter((candidate) => !candidate.locale)) {
      const visible = landingPageBreadcrumbs(page)
      const schema = schemaTrail(page.slug)
      expect(schema.map((crumb) => crumb.name), page.slug).toEqual(visible.map((crumb) => crumb.label))
      visible.forEach((crumb, index) => {
        if (crumb.to) expect(schema[index].item, page.slug).toBe(`${siteUrl}${crumb.to}`)
      })
    }
  })

  it('points each section crumb at a section the hub renders', () => {
    const rendered = new Set(['claims', 'injuries', 'liability', 'treatment', 'insurance', 'evidence', 'value', 'deadlines', 'near-you'])
    for (const anchor of Object.values(CASE_SECTION_ANCHORS)) expect(rendered.has(anchor), anchor).toBe(true)
  })

  it('keeps the subject-hub trail on pages outside the case types', () => {
    const trail = landingPageBreadcrumbs(landingPagesBySlug.get('/how-much-is-a-motorcycle-accident-case-worth')!)
    expect(trail).toHaveLength(3)
    expect(trail[1].to?.startsWith('/topics/')).toBe(true)
  })
})
