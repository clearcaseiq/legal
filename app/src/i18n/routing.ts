import { DEFAULT_LANGUAGE, type LanguageCode } from '.'

/**
 * Where a language lives in the URL.
 *
 * Until now language was a browser preference only: the same URL served English
 * markup to everyone and swapped to Spanish after hydration, so there was no
 * Spanish page for a search engine to index and nothing to link to. A locale in
 * the path gives each translation its own crawlable URL.
 *
 * The default language has no prefix. Serving the English homepage at both `/`
 * and `/en` would be two URLs for one page, which is the duplicate-content
 * problem hreflang exists to prevent.
 */
export const LOCALE_PREFIXES: Partial<Record<LanguageCode, string>> = {
  es: '/es',
  zh: '/zh',
}

/** Locales that have their own URL space, in the order hreflang should list them. */
export const PREFIXED_LOCALES = Object.keys(LOCALE_PREFIXES) as LanguageCode[]

/**
 * The language a path is served in, from the path alone.
 *
 * Deliberately not from `localStorage` or `Accept-Language`: on a prefixed URL
 * the path is the authority, or a visitor whose stored preference is English
 * would land on a Spanish URL and be flipped out of it.
 */
export function localeFromPath(pathname: string): LanguageCode {
  const path = pathname.split('?')[0]
  for (const [locale, prefix] of Object.entries(LOCALE_PREFIXES)) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return locale as LanguageCode
    }
  }
  return DEFAULT_LANGUAGE
}

/** True when the path is inside a non-default locale's URL space. */
export function isLocalizedPath(pathname: string) {
  return localeFromPath(pathname) !== DEFAULT_LANGUAGE
}

/**
 * Where a language's section starts, for links from a page that has no twin in
 * that language. The default language's home is the site root.
 */
export function localeHome(locale: LanguageCode) {
  return LOCALE_PREFIXES[locale] ?? '/'
}

/**
 * The BCP 47 tag for `<html lang>` and `hreflang`.
 *
 * Chinese is annotated by script rather than by bare language. `zh.json` is
 * Simplified, and a reader who wants Traditional is a different audience needing
 * a different content set, not a fallback. Claiming plain `zh` would offer this
 * edition to both and make the Traditional set, if it is ever written, unable to
 * distinguish itself.
 */
const BCP47: Partial<Record<LanguageCode, string>> = {
  zh: 'zh-Hans',
}

export function hreflangFor(locale: LanguageCode) {
  return BCP47[locale] ?? locale
}
