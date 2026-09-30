/**
 * Page groupings and sibling links for the topic hubs.
 *
 * Split from `seoTopicHubDefs` because this module imports the full landing page
 * content. Only import it from lazily loaded routes; anything loaded on every
 * route should take the hub definitions from `seoTopicHubDefs` instead.
 *
 * The landing pages used to be orphans. Nothing in the site chrome linked into
 * them and every page carried the same hardcoded list of six related links, so a
 * crawler starting at the home page reached 7 of 173 and the rest were only
 * discoverable through the sitemap. Sitemap-only pages still get indexed, but
 * they receive almost no internal link equity and are crawled far less often.
 *
 * Grouping is by `category`, not `cluster`: cluster is unique per page (173
 * clusters for 173 pages), so it cannot group anything.
 */
import { DEFAULT_LANGUAGE, type LanguageCode } from '../i18n'
import { allLandingPages, landingPagesBySlug, type LandingPage, type LandingPageCategory } from './seoLandingPages'
import { topicHubs, type TopicHub } from './seoTopicHubDefs'
import { caseTypeHubByType, type CaseType } from './caseTypeHubDefs'

export {
  TOPICS_INDEX_DESCRIPTION,
  TOPICS_INDEX_SLUG,
  TOPICS_INDEX_TITLE,
  hubForPage,
  topicHubBySlug,
  topicHubByCategory,
  topicHubs,
  type TopicHub,
} from './seoTopicHubDefs'

/** Stable ordering so server and client markup agree and links do not churn. */
function bySlug(a: LandingPage, b: LandingPage) {
  return a.slug.localeCompare(b.slug)
}

/**
 * Grouped by language as well as category.
 *
 * Without the language in the key, adding the Spanish pages would splice them
 * into the sibling cycle of the English pages in the same category: an English
 * whiplash page would start advertising a Spanish page as a related read, and
 * the English hubs would list it. Each language forms its own closed cycle.
 */
const pagesByCategory = new Map<string, LandingPage[]>()
for (const page of allLandingPages) {
  const key = `${page.locale ?? DEFAULT_LANGUAGE}:${page.category}`
  const list = pagesByCategory.get(key)
  if (list) list.push(page)
  else pagesByCategory.set(key, [page])
}
for (const list of pagesByCategory.values()) list.sort(bySlug)

export function pagesInCategory(
  category: LandingPageCategory,
  locale: LanguageCode = DEFAULT_LANGUAGE
): LandingPage[] {
  return pagesByCategory.get(`${locale}:${category}`) || []
}

/** Every page in one language, for topping up categories too small to fill a cycle. */
const pagesByLocale = new Map<string, LandingPage[]>()
for (const page of allLandingPages) {
  const key = page.locale ?? DEFAULT_LANGUAGE
  const list = pagesByLocale.get(key)
  if (list) list.push(page)
  else pagesByLocale.set(key, [page])
}
for (const list of pagesByLocale.values()) list.sort(bySlug)

export function pagesInHub(hub: TopicHub): LandingPage[] {
  return pagesInCategory(hub.category)
}

/** Hubs that actually have content, in the order they should be listed. */
export const populatedTopicHubs = topicHubs.filter((hub) => pagesInHub(hub).length > 0)

/** Walked pages in categories holding `limit` or fewer of them, one language at a time. */
function smallCategoryPool(locale: LanguageCode, limit: number): LandingPage[] {
  const counts = new Map<string, number>()
  const walked = (pagesByLocale.get(locale) ?? []).filter((page) => !page.caseType)
  for (const page of walked) counts.set(page.category, (counts.get(page.category) ?? 0) + 1)
  return walked
    .filter((page) => (counts.get(page.category) ?? 0) <= limit)
    .sort((a, b) => a.category.localeCompare(b.category) || bySlug(a, b))
}

/**
 * Sibling pages to link from a landing page.
 *
 * Picks the pages that follow this one in its category and wraps around the end.
 * Every page therefore links forward to its neighbours and is linked to by the
 * ones behind it, so each category forms a closed cycle and no page can end up
 * with zero inbound links — which is what a fixed list of six destinations did.
 *
 * A category smaller than the limit cannot fill that cycle, and the shortfall is
 * made up from the rest of the same language. Two things produce categories that
 * small. A language can be small everywhere: Spanish has eight pages across five
 * categories, and three of them were the only page in their category, so the
 * cycle returned nothing at all and the promise above quietly failed. And a
 * category can shrink, which is what consolidating fifteen carrier pages into two
 * guides did to Insurance. Topping up keeps the link count even across the site
 * instead of leaving whichever pages happen to sit in a thin category with a
 * fraction of the internal links everything else gets.
 */
export function relatedLandingPages(slug: string, limit = 6): LandingPage[] {
  const page = landingPagesBySlug.get(slug)
  if (!page) return []

  // Pages with a case type link through `caseTypeRelatedResources` instead, so
  // they are left out of this walk. Keeping them in would let a case-typed page
  // be the only one "behind" a page here, and it no longer links forward, so the
  // page after it would lose its inbound link. Each side stays a closed cycle.
  const inWalk = (candidate: LandingPage) => !candidate.caseType
  const locale = page.locale ?? DEFAULT_LANGUAGE
  const ownCategory = pagesInCategory(page.category, locale).filter(inWalk)
  // A category too small to fill the slots cannot guarantee its pages an inbound
  // link on its own: a lone page has no neighbour behind it. Those categories
  // share one walk, ordered by category then slug, so every page in it is still
  // linked from the one before it and its own category comes first.
  const siblings = ownCategory.length > limit ? ownCategory : smallCategoryPool(locale, limit)
  const index = siblings.findIndex((sibling) => sibling.slug === slug)

  const picked: LandingPage[] = []
  if (index < 0) {
    picked.push(...siblings.slice(0, limit))
  } else {
    for (let step = 1; picked.length < limit && step < siblings.length; step += 1) {
      picked.push(siblings[(index + step) % siblings.length])
    }
  }
  if (picked.length >= limit) return picked

  // Same wrap-around walk, over the language instead of the category, so the
  // top-up is stable and spreads across pages rather than pointing everything
  // at whichever slug happens to sort first.
  const pool = (pagesByLocale.get(locale) ?? []).filter(inWalk)
  const taken = new Set([slug, ...picked.map((p) => p.slug)])
  const start = Math.max(pool.findIndex((p) => p.slug === slug), 0)
  for (let step = 1; picked.length < limit && step < pool.length; step += 1) {
    const candidate = pool[(start + step) % pool.length]
    if (taken.has(candidate.slug)) continue
    taken.add(candidate.slug)
    picked.push(candidate)
  }
  return picked
}

/**
 * The URLs a page's related-links block points at, whichever block it renders.
 * For tests and the link map, which need one answer for every page.
 */
export function relatedSlugsFor(slug: string, limit = 6): string[] {
  const caseResources = caseTypeRelatedResources(slug)
  if (caseResources) return caseResources.map((resource) => resource.to)
  return relatedLandingPages(slug, limit).map((page) => page.slug)
}

export type RelatedResource = { to: string; label: string; description: string }

/**
 * English pages in each case type, grouped by section and then by slug. Walking
 * this order reaches a page's own section first and spills into the next one
 * only at the section's end, while keeping one cycle per case type so every page
 * is linked from the one before it, however small its section.
 */
const pagesByCaseType = new Map<CaseType, LandingPage[]>()
for (const page of allLandingPages) {
  if (!page.caseType || page.locale) continue
  const list = pagesByCaseType.get(page.caseType)
  if (list) list.push(page)
  else pagesByCaseType.set(page.caseType, [page])
}
for (const list of pagesByCaseType.values()) {
  list.sort((a, b) => (a.caseSection ?? '').localeCompare(b.caseSection ?? '') || bySlug(a, b))
}

/** One line under each link: the page's first sentence, trimmed to fit. */
function oneLine(text: string, max = 150) {
  const sentence = text.match(/^.*?[.?!](?=\s|$)/)?.[0] ?? text
  if (sentence.length <= max) return sentence
  return `${sentence.slice(0, max).replace(/\s+\S*$/, '')}…`
}

function resourceFor(page: LandingPage): RelatedResource {
  return { to: page.slug, label: page.title, description: oneLine(page.description) }
}

/**
 * The Related resources block for a page with a case type, in the order a
 * reader moving toward a decision needs it: what the claim may be worth, then
 * the pages answering neighbouring questions, then the hub for everything else.
 *
 * Neighbours are the pages after this one in the case type's section-ordered
 * cycle (see `pagesByCaseType`), so they come from the same section until it
 * runs out. Returns null for pages without a case type, which keep the category
 * walk.
 */
export function caseTypeRelatedResources(slug: string, neighbours = 3): RelatedResource[] | null {
  const page = landingPagesBySlug.get(slug)
  if (!page?.caseType || !page.caseSection || page.locale) return null
  const hub = caseTypeHubByType.get(page.caseType)
  if (!hub) return null

  const resources: RelatedResource[] = []
  const valuePage = landingPagesBySlug.get(hub.valueSlug)
  if (valuePage && valuePage.slug !== slug) resources.push(resourceFor(valuePage))

  const pool = (pagesByCaseType.get(page.caseType) ?? []).filter((candidate) => candidate.slug !== hub.valueSlug)
  // The value page is not in the pool, so it walks from the top; -1 makes the
  // first step land on index 0.
  const from = pool.findIndex((candidate) => candidate.slug === slug)
  const available = from < 0 ? pool.length : pool.length - 1
  for (let step = 1; step <= Math.min(neighbours, available); step += 1) {
    resources.push(resourceFor(pool[(from + step) % pool.length]))
  }

  resources.push({ to: hub.slug, label: `${hub.label}: the full guide`, description: oneLine(hub.description) })
  return resources
}
