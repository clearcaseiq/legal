/**
 * Builds the internal-linking map behind the SEO tracking sheet.
 *
 * Every row is produced by the same functions the pages render with, so the
 * sheet describes the links that are live rather than the links someone meant
 * to add: the hub sections, the breadcrumbs, the in-text next-step links, the
 * Related resources block and the case-type assessment CTAs.
 *
 * Two files, meant to be imported as two tabs:
 *   internal-link-map.csv   one row per link, with blank tracking columns
 *   internal-link-gaps.csv  English pages with no editorial link in, no
 *                           next-step link, or no case type, worst first. The
 *                           top ten are the week's "audit 10 pages" queue.
 *
 * Topic-hub listings under /topics/ are left out of both. Every page is listed
 * there, so counting them would hide exactly the pages the gaps tab exists to
 * find.
 *
 * Usage:
 *   npx tsx app/scripts/internal-link-map.ts [outDir]
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CASE_SECTION_LABELS, caseTypeAssessmentHref, caseTypeHubBySlug, caseTypeHubs } from '../src/data/caseTypeHubDefs'
import { caseTypeHubContent } from '../src/data/caseTypeHubs'
import { allLandingPages, landingPagesBySlug, nextStepsFor, type LandingPage } from '../src/data/seoLandingPages'
import { landingPageBreadcrumbs } from '../src/data/seoLandingPageSchema'
import { caseTypeRelatedResources, hubForPage, relatedLandingPages } from '../src/data/seoTopicHubs'

type Intent = 'educational' | 'commercial' | 'product'

type Link = {
  source: string
  target: string
  anchor: string
  type: string
}

const english = allLandingPages.filter((page) => !page.locale)

function pathOf(href: string) {
  return href.split(/[?#]/)[0]
}

function intentOf(href: string): Intent {
  const path = pathOf(href)
  if (path === '/assess' || path.startsWith('/tools/')) return 'product'
  if (caseTypeHubBySlug.has(path)) return 'commercial'
  const page = landingPagesBySlug.get(path)
  if (!page) return 'educational'
  if (page.caseSection === 'value') return 'commercial'
  return ['Settlement', 'Attorney Intent', 'Commercial'].includes(page.category) ? 'commercial' : 'educational'
}

function clusterOf(href: string) {
  const path = pathOf(href)
  const hub = caseTypeHubBySlug.get(path)
  if (hub) return hub.label
  const page = landingPagesBySlug.get(path)
  if (!page) return ''
  if (page.caseType && page.caseSection) {
    const caseHub = caseTypeHubs.find((candidate) => candidate.caseType === page.caseType)
    return `${caseHub?.label} / ${CASE_SECTION_LABELS[page.caseSection]}`
  }
  return hubForPage(page)?.title ?? page.category
}

function ctaOf(href: string) {
  const path = pathOf(href)
  if (path === '/assess' || caseTypeHubBySlug.has(path)) return 'Assess My Case'
  return landingPagesBySlug.get(path)?.cta ?? ''
}

function linksFromHubs(): Link[] {
  const links: Link[] = []
  for (const hub of caseTypeHubs) {
    for (const section of caseTypeHubContent[hub.caseType].sections) {
      for (const link of section.links) {
        links.push({ source: hub.slug, target: link.to, anchor: link.anchor, type: `Hub section: ${section.heading}` })
      }
    }
    for (const page of english) {
      if (page.caseType === hub.caseType && page.caseSection === 'local' && !page.noindex) {
        links.push({ source: hub.slug, target: page.slug, anchor: page.title, type: 'Hub: near you' })
      }
    }
    links.push({ source: hub.slug, target: caseTypeAssessmentHref(hub.caseType), anchor: 'Assess My Case', type: 'Assessment CTA' })
    links.push({ source: '/', target: hub.slug, anchor: hub.title.replace(/ in California$/, ''), type: 'Home: case guides' })
    links.push({ source: '(site footer)', target: hub.slug, anchor: hub.label, type: 'Footer: case guides' })
  }
  return links
}

function linksFromPage(page: LandingPage): Link[] {
  const links: Link[] = []
  for (const crumb of landingPageBreadcrumbs(page).slice(1)) {
    if (crumb.to) links.push({ source: page.slug, target: crumb.to, anchor: crumb.label, type: 'Breadcrumb' })
  }
  for (const step of nextStepsFor(page)) {
    links.push({ source: page.slug, target: step.to, anchor: step.anchor, type: 'In-text next step' })
  }
  const caseResources = caseTypeRelatedResources(page.slug)
  if (caseResources) {
    for (const resource of caseResources) {
      links.push({ source: page.slug, target: resource.to, anchor: resource.label, type: 'Related resources' })
    }
    links.push({ source: page.slug, target: caseTypeAssessmentHref(page.caseType!), anchor: 'Assess My Case', type: 'Assessment CTA' })
  } else {
    for (const sibling of relatedLandingPages(page.slug, 6)) {
      links.push({ source: page.slug, target: sibling.slug, anchor: sibling.title, type: 'Related topics' })
    }
  }
  return links
}

// Leading BOM so Excel reads curly quotes as UTF-8. Sheets detects either way.
const csv = (rows: Array<Array<string | number>>) =>
  '\uFEFF' + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n')

const outDir = process.argv[2] ?? '.'
mkdirSync(outDir, { recursive: true })

const links = [...linksFromHubs(), ...english.flatMap(linksFromPage)]

writeFileSync(
  join(outDir, 'internal-link-map.csv'),
  csv([
    ['Source page', 'Target page', 'Anchor text', 'Link type', 'Cluster', 'Intent', 'CTA', 'Link added?', 'Date', 'Page indexed?', 'Internal clicks'],
    ...links.map((link) => [
      link.source,
      link.target,
      link.anchor,
      link.type,
      clusterOf(link.target),
      intentOf(link.target),
      ctaOf(link.target),
      '',
      '',
      '',
      '',
    ]),
  ])
)

// Editorial links in: from a hub, an in-text next step, or a Related block.
// Breadcrumbs point up, never at articles, and the footer only names hubs.
const inbound = new Map<string, number>()
for (const link of links) {
  if (link.type === 'Breadcrumb' || link.type === 'Assessment CTA') continue
  const target = pathOf(link.target)
  if (link.source === target) continue
  inbound.set(target, (inbound.get(target) ?? 0) + 1)
}

const gaps = english
  .map((page) => {
    const issues: string[] = []
    const linksIn = inbound.get(page.slug) ?? 0
    const steps = nextStepsFor(page).length
    if (linksIn === 0) issues.push('No editorial link in')
    if (steps === 0) issues.push('No next-step link')
    if (!page.caseType) issues.push('No case type')
    return { page, issues, linksIn, steps }
  })
  .filter((entry) => entry.issues.length > 0)
  // Most actionable first. An unlinked page is the real failure. Then case-type
  // articles missing their next step, which is one authored sentence each; city
  // pages after them because the hub's Near you list already links them. Pages
  // outside the six case types come last: most are there by design.
  .map((entry) => ({
    ...entry,
    rank:
      entry.linksIn === 0 ? 0 : entry.page.caseType ? (entry.page.caseSection === 'local' ? 2 : 1) : 3,
  }))
  .sort((a, b) => a.rank - b.rank || a.linksIn - b.linksIn || a.page.slug.localeCompare(b.page.slug))

writeFileSync(
  join(outDir, 'internal-link-gaps.csv'),
  csv([
    ['Page', 'Title', 'Case type', 'Section', 'Editorial links in', 'Next-step links', 'Indexed', 'Issues', 'Reviewed?', 'Date'],
    ...gaps.map(({ page, issues, linksIn, steps }) => [
      page.slug,
      page.title,
      page.caseType ? caseTypeHubs.find((hub) => hub.caseType === page.caseType)?.label ?? '' : '',
      page.caseSection ? CASE_SECTION_LABELS[page.caseSection] : '',
      linksIn,
      steps,
      page.noindex ? 'no (draft)' : 'yes',
      issues.join('; '),
      '',
      '',
    ]),
  ])
)

console.log(`Wrote ${links.length} links and ${gaps.length} gap rows to ${outDir}`)
