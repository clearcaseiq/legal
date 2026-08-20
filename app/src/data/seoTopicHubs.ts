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

  const locale = page.locale ?? DEFAULT_LANGUAGE
  const siblings = pagesInCategory(page.category, locale)
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
  const pool = pagesByLocale.get(locale) ?? []
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
