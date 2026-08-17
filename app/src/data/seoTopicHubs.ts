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
 */
export function relatedLandingPages(slug: string, limit = 6): LandingPage[] {
  const page = landingPagesBySlug.get(slug)
  if (!page) return []

  const siblings = pagesInCategory(page.category, page.locale ?? DEFAULT_LANGUAGE)
  const index = siblings.findIndex((sibling) => sibling.slug === slug)
  if (index < 0) return siblings.slice(0, limit)

  const picked: LandingPage[] = []
  for (let step = 1; picked.length < limit && step < siblings.length; step += 1) {
    picked.push(siblings[(index + step) % siblings.length])
  }
  return picked
}
