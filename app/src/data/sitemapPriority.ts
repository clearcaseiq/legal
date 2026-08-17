import { DEFAULT_LANGUAGE } from '../i18n'
import { pathForLocale } from './localePathPairs'

/**
 * Sitemap <priority> values.
 *
 * Lives here rather than inline in pages/sitemap.xml.tsx so `sitemapPriority.test.ts`
 * can assert every exact key is a URL the site actually serves. Four keys had
 * drifted onto slugs that never existed (`/tools/*-settlement-calculator` for
 * tools routed as `/tools/*-calculator`, and `/education/`-prefixed versions of
 * two pages that live at the root), so the boosts they were written to apply
 * were silently doing nothing.
 */

/**
 * Only paths whose priority differs from what `priorityForPath` already derives
 * from the URL shape. Restating a value the prefix rules produce anyway is how
 * the drift went unnoticed, so the tool pages are absent here on purpose: the
 * `/tools/` rule below gives them 0.9.
 */
export const exactPriorities: Record<string, string> = {
  '/': '1.0',
  '/tools/settlement-calculator': '1.0',
  '/when-to-hire-a-lawyer-after-accident': '0.8',
}

/** The value derived from the URL shape alone, ignoring `exactPriorities`. */
export function derivedPriorityForPath(path: string) {
  if (path.startsWith('/how-much') || path.startsWith('/average-')) return '0.95'
  // The topic index and hubs are the navigation spine into the landing pages, so
  // they should not rank below the leaves they organise.
  if (path === '/topics' || path.startsWith('/topics/')) return '0.9'
  if (path.startsWith('/settlements/') || path.startsWith('/tools/')) return '0.9'
  if (path.startsWith('/injuries/') || path.startsWith('/treatment/')) return '0.8'
  if (path.startsWith('/insurance/') || path.startsWith('/liability/')) return '0.8'
  if (path.startsWith('/commercial/') || path.startsWith('/legal/')) return '0.8'
  if (path.startsWith('/case-strength/') || path.startsWith('/case-strength-')) return '0.8'
  if (path.endsWith('-car-accident')) return '0.8'
  if (path.startsWith('/california-statute-of-limitations-') || path === '/missed-the-statute-of-limitations') return '0.8'
  if (path.startsWith('/medical-records') || path.includes('medical-records') || path.includes('medical-chronology')) return '0.8'
  if (path.startsWith('/education/')) return '0.7'
  return '0.75'
}

export function priorityForPath(path: string): string {
  const exact = exactPriorities[path]
  if (exact) return exact

  // A translation is exactly as important as the page it translates, so it
  // inherits rather than falling to the default. Without this the Spanish
  // homepage ranked below an ordinary leaf page in the same sitemap.
  const englishTwin = pathForLocale(path, DEFAULT_LANGUAGE)
  if (englishTwin && englishTwin !== path) return priorityForPath(englishTwin)

  return derivedPriorityForPath(path)
}
