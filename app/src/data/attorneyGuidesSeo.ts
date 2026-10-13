import { attorneyGuides, type AttorneyGuide } from './attorneyGuides'

/**
 * URLs, metadata and structured data for the public attorney guide pages.
 *
 * Kept out of `seoLandingPageSchema` on purpose: the guide pages import the
 * title helpers on the client, and that module drags the landing page data in
 * with it. Callers pass the origin, which on the server is `siteUrl`.
 */

export const ATTORNEY_GUIDES_PATH = '/attorney-guides'
export const ATTORNEY_GUIDES_APP_PATH = '/attorney-dashboard/guides'

export const ATTORNEY_GUIDES_INDEX_TITLE = 'Attorney Guides | How to Use ClearCaseIQ'
export const ATTORNEY_GUIDES_INDEX_DESCRIPTION =
  'Step-by-step ClearCaseIQ guides for attorneys and firm staff: onboarding, accepting cases, the case workspace, tasks, messaging, e-signatures and billing.'

/** Latest revision across the guides, for the index page's lastmod. */
export const ATTORNEY_GUIDES_UPDATED = attorneyGuides.reduce(
  (latest, guide) => (guide.updated > latest ? guide.updated : latest),
  attorneyGuides[0]?.updated ?? '2026-10-12'
)

const MAX_TITLE_LENGTH = 60

export function attorneyGuidePublicPath(slug: string) {
  return `${ATTORNEY_GUIDES_PATH}/${slug}`
}

export function attorneyGuideAppPath(slug: string) {
  return `${ATTORNEY_GUIDES_APP_PATH}/${slug}`
}

/** The longest of the title shapes that fits in a search result. */
export function attorneyGuideMetaTitle(guide: Pick<AttorneyGuide, 'title'>) {
  const candidates = [`${guide.title}: Attorney Guide | ClearCaseIQ`, `${guide.title} | ClearCaseIQ`]
  return candidates.find((candidate) => candidate.length <= MAX_TITLE_LENGTH) ?? guide.title
}

const guidesByPublicPath = new Map(attorneyGuides.map((guide) => [attorneyGuidePublicPath(guide.slug), guide]))

export function attorneyGuideForPublicPath(pathname: string): AttorneyGuide | undefined {
  return guidesByPublicPath.get(pathname)
}

const publisher = (origin: string) => ({
  '@type': 'Organization',
  name: 'ClearCaseIQ',
  url: origin,
  logo: { '@type': 'ImageObject', url: `${origin}/clearcaseiq-logo.png` },
})

/** CollectionPage for the index, listing the guides the page renders. */
export function buildAttorneyGuidesIndexSchema(origin: string) {
  const canonical = `${origin}${ATTORNEY_GUIDES_PATH}`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: 'Attorney Guides',
        description: ATTORNEY_GUIDES_INDEX_DESCRIPTION,
        inLanguage: 'en-US',
        url: canonical,
        dateModified: ATTORNEY_GUIDES_UPDATED,
        isPartOf: { '@type': 'WebSite', name: 'ClearCaseIQ', url: origin },
        publisher: publisher(origin),
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: attorneyGuides.map((guide, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: guide.title,
            url: `${origin}${attorneyGuidePublicPath(guide.slug)}`,
          })),
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
          { '@type': 'ListItem', position: 2, name: 'Attorney Guides', item: canonical },
        ],
      },
    ],
  }
}

/** TechArticle for one guide, with the same trail the page renders. */
export function buildAttorneyGuideSchema(guide: AttorneyGuide, origin: string) {
  const canonical = `${origin}${attorneyGuidePublicPath(guide.slug)}`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TechArticle',
        headline: guide.title,
        description: guide.summary,
        inLanguage: 'en-US',
        dateModified: guide.updated,
        articleSection: guide.sections.map((section) => section.heading),
        ...(guide.readMinutes ? { timeRequired: `PT${guide.readMinutes}M` } : {}),
        author: { '@type': 'Organization', name: 'ClearCaseIQ', url: origin },
        publisher: publisher(origin),
        mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
        url: canonical,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
          { '@type': 'ListItem', position: 2, name: 'Attorney Guides', item: `${origin}${ATTORNEY_GUIDES_PATH}` },
          { '@type': 'ListItem', position: 3, name: guide.title, item: canonical },
        ],
      },
    ],
  }
}
