/**
 * What the app tells the tag manager about the screen the visitor is on.
 *
 * Two problems, both created by the site being a single-page app behind a
 * catch-all route.
 *
 * The container's own pageview fires once, when the document loads. Every
 * screen reached after that is a client-side navigation the container never
 * sees, so without the push below the claimant funnel reads as a single
 * pageview per visit and answers nothing about where people stop — which is the
 * question the tracking was added to answer. Tags that should count screens
 * therefore need to fire on the `screen_view` event rather than on All Pages,
 * or the landing screen is counted twice and the rest not at all.
 *
 * The other is that the URL itself is not safe to report. Claimant paths carry
 * assessment ids, and `/evidence-upload/<id>?token=<token>` carries a
 * credential that opens someone's evidence. `screenPath` reduces a URL to the
 * route that was visited, `/claim/:id` rather than `/claim/9f3c...`, which is
 * also the form that aggregates: a hundred distinct ids report as one screen
 * instead of a hundred.
 *
 * The query string is dropped whole rather than filtered. An allow list of
 * safe parameters would be one forgotten entry away from publishing a token,
 * and nothing currently in a query string is worth that risk.
 *
 * This governs only what the app pushes. A tag that reads `location.href` for
 * itself still sees the unredacted URL; see `tagManager.ts`.
 */

/** Locale prefixes, which name a language rather than a record. */
const LOCALE_SEGMENTS = new Set(['es', 'zh'])

/**
 * Routes whose next segment is a secret rather than merely an identifier.
 *
 * Shape detection below catches generated ids by how they look, but a claim
 * token is only recognisable by where it sits in the path. These are redacted
 * positionally so a short or word-shaped token cannot slip through on the
 * grounds that it does not look generated.
 */
const TOKEN_BEARING_ROUTES = new Set(['claim', 'respond', 'evidence-upload'])

/**
 * Whether a path segment names a record rather than a screen.
 *
 * Shape rather than position, so a new `/<thing>/<id>` route needs no entry
 * here. Step names (`step-2`, `injury-details`) are left alone on purpose:
 * those are the funnel, and redacting them would defeat the point.
 */
function looksLikeIdentifier(segment: string): boolean {
  if (/^\d+$/.test(segment)) return true
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-/i.test(segment)) return true
  if (/^c[a-z0-9]{20,}$/i.test(segment)) return true
  if (/^[0-9a-f]{16,}$/i.test(segment)) return true
  // Long enough and mixed enough to have been generated rather than written by
  // a person naming a screen.
  return segment.length >= 12 && /\d/.test(segment)
}

/** Reduces a URL to the route that was visited, with ids and secrets removed. */
export function screenPath(url: string): string {
  const path = (url || '/').split('?')[0].split('#')[0]
  const segments = path.split('/').filter(Boolean)
  if (!segments.length) return '/'

  const redacted = segments.map((segment, index) => {
    const lower = segment.toLowerCase()
    if (index === 0 && LOCALE_SEGMENTS.has(lower)) return lower

    const parent = index === 0 ? null : segments[index - 1].toLowerCase()
    if (parent && TOKEN_BEARING_ROUTES.has(parent)) return ':id'

    return looksLikeIdentifier(segment) ? ':id' : lower
  })

  return `/${redacted.join('/')}`
}

/**
 * Announces the current screen to the container.
 *
 * Silent when no container has loaded: the array is created by the GTM
 * snippet, so its absence means there is nothing listening. That is the normal
 * state in tests and on hosts where the container is switched off.
 */
export function pushScreenView(
  url: string,
  scope: Record<string, unknown> | undefined = typeof window === 'undefined'
    ? undefined
    : (window as unknown as Record<string, unknown>),
): void {
  const dataLayer = scope?.dataLayer
  if (!Array.isArray(dataLayer)) return

  dataLayer.push({ event: 'screen_view', screen_path: screenPath(url) })
}
