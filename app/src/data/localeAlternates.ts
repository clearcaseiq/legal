import { DEFAULT_LANGUAGE, type LanguageCode } from '../i18n'
import { hreflangFor } from '../i18n/routing'
import { allMarketingPages } from './marketingPages'
import { allLandingPages } from './seoLandingPages'

export type AlternateLink = {
  /** `hreflang` value: a language code, or `x-default` for the unmatched case. */
  hreflang: string
  /** Site-relative path. */
  path: string
}

type TranslatablePage = {
  path: string
  locale?: LanguageCode
  translationOf?: string
}

/**
 * Translation groups, keyed by the default-language path.
 *
 * Built from one list of pages rather than written out per page, because
 * hreflang only works when every page in a set points at every other one
 * including itself. Hand-maintaining that reciprocity is how hreflang usually
 * ends up silently ignored: Google drops any annotation the other side does not
 * confirm.
 */
function buildGroups() {
  const pages: TranslatablePage[] = [
    ...allMarketingPages,
    ...allLandingPages.map((page) => ({
      path: page.slug,
      locale: page.locale,
      translationOf: page.translationOf,
    })),
  ]

  const groups = new Map<string, Map<LanguageCode, string>>()

  for (const page of pages) {
    const locale = page.locale ?? DEFAULT_LANGUAGE
    // A translated page names its original; an original is its own group root.
    const root = page.translationOf ?? (locale === DEFAULT_LANGUAGE ? page.path : undefined)
    if (!root) continue

    const group = groups.get(root) ?? new Map<LanguageCode, string>()
    group.set(locale, page.path)
    groups.set(root, group)
  }

  // A page with no translation needs no annotation at all. Emitting a set of one
  // is noise, and a self-referencing hreflang on a page with no alternates tells
  // a crawler nothing it did not already know from the canonical.
  const byPath = new Map<string, AlternateLink[]>()

  for (const [root, group] of groups) {
    if (group.size < 2) continue

    const links: AlternateLink[] = []
    const defaultPath = group.get(DEFAULT_LANGUAGE) ?? root

    for (const [locale, path] of group) {
      links.push({ hreflang: hreflangFor(locale), path })
    }
    // x-default is what a searcher outside every targeted language should get.
    links.push({ hreflang: 'x-default', path: defaultPath })

    for (const path of group.values()) {
      byPath.set(path, links)
    }
  }

  return byPath
}

const alternatesByPath = buildGroups()

/** The hreflang set a path belongs to, or an empty array if it has no translation. */
export function alternatesForPath(path: string): AlternateLink[] {
  return alternatesByPath.get(path) ?? []
}

/** Every path that participates in a translation set, for tests and the sitemap. */
export function translatedPaths() {
  return [...alternatesByPath.keys()]
}
