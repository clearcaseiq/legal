import type { LanguageCode } from '../i18n'

/**
 * English path to its translations, as plain strings.
 *
 * A deliberate duplicate of what `localeAlternates` derives. That module reaches
 * into the full landing page corpus, and the language switcher lives in the
 * shared Layout, so importing it there would pull ~240 KB of page content into
 * the bundle every route downloads. `localeAlternates.test.ts` fails if this
 * list and the real registry disagree, so the duplication cannot drift.
 */
export const LOCALE_PATH_PAIRS: Array<{ en: string; translations: Partial<Record<LanguageCode, string>> }> = [
  { en: '/', translations: { es: '/es', zh: '/zh' } },
  { en: '/how-it-works', translations: { es: '/es/como-funciona', zh: '/zh/ruhe-yunzuo' } },
  { en: '/about', translations: { es: '/es/quienes-somos', zh: '/zh/guanyu-women' } },
  { en: '/contact', translations: { es: '/es/contacto', zh: '/zh/lianxi-women' } },
  { en: '/help', translations: { es: '/es/centro-de-ayuda', zh: '/zh/bangzhu-zhongxin' } },
  { en: '/disclosures', translations: { es: '/es/divulgaciones', zh: '/zh/pilu-shengming' } },
  { en: '/attorney-network', translations: { es: '/es/red-de-abogados', zh: '/zh/lvshi-wangluo' } },
  // No Chinese twin: /es/temas indexes the Spanish landing pages, and there are
  // no Chinese landing pages for an equivalent hub to list.
  { en: '/topics', translations: { es: '/es/temas' } },
  // Landing pages with a Spanish edition. /es/estatus-migratorio-y-reclamos is
  // absent because it has no English original: it was written for a question
  // Spanish-speaking readers ask and English-speaking ones do not.
  { en: '/how-much-is-my-case-worth', translations: { es: '/es/cuanto-vale-mi-caso' } },
  {
    en: '/california-statute-of-limitations-personal-injury',
    translations: { es: '/es/plazo-para-demandar-en-california' },
  },
  {
    en: '/injuries/neck-pain-after-accident',
    translations: { es: '/es/dolor-de-cuello-despues-de-un-accidente' },
  },
  {
    en: '/injuries/lower-back-pain-after-accident',
    translations: { es: '/es/dolor-de-espalda-despues-de-un-accidente' },
  },
  {
    en: '/when-to-hire-a-lawyer-after-accident',
    translations: { es: '/es/cuando-contratar-un-abogado' },
  },
  {
    en: '/education/insurance-settlement-tactics',
    translations: { es: '/es/tacticas-de-las-aseguradoras' },
  },
  { en: '/commercial/rideshare-accidents', translations: { es: '/es/accidentes-de-uber-y-lyft' } },
]

const englishByLocalizedPath = new Map<string, string>()
for (const pair of LOCALE_PATH_PAIRS) {
  for (const path of Object.values(pair.translations)) {
    if (path) englishByLocalizedPath.set(path, pair.en)
  }
}

const pairByEnglishPath = new Map(LOCALE_PATH_PAIRS.map((pair) => [pair.en, pair]))

/**
 * The same page in another language, or undefined if it does not exist there.
 *
 * Undefined is meaningful: most pages have no translation, and the switcher must
 * fall back to swapping the interface language in place rather than navigating
 * somewhere that would 404.
 */
export function pathForLocale(currentPath: string, locale: LanguageCode): string | undefined {
  const englishPath = englishByLocalizedPath.get(currentPath) ?? currentPath
  if (locale === 'en') {
    return pairByEnglishPath.has(englishPath) ? englishPath : undefined
  }
  return pairByEnglishPath.get(englishPath)?.translations[locale]
}

/**
 * Rewrite an internal link for the language being read, leaving it untouched
 * when that language has no version of the target.
 *
 * Used for the shared header and footer. Without it a reader on `/es` follows
 * the navigation straight back into English, and more importantly a crawler
 * finds no links at all between the Spanish pages — they were reachable only
 * from the sitemap, which is how the landing pages were orphaned before.
 */
export function localizedPath(path: string, locale: LanguageCode): string {
  // Anchors and query strings ride along; only the path has a translation.
  const boundary = path.search(/[#?]/)
  const base = boundary === -1 ? path : path.slice(0, boundary)
  const suffix = boundary === -1 ? '' : path.slice(boundary)

  const translated =
    locale === 'en' ? englishByLocalizedPath.get(base) : pairByEnglishPath.get(base)?.translations[locale]

  return `${translated ?? base}${suffix}`
}
