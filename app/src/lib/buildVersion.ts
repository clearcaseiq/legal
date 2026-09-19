/**
 * Notice when the deployed build has moved on from the one this tab is running.
 *
 * This is a single-page app, so once a tab has loaded it never fetches the HTML
 * again and keeps its original JavaScript indefinitely. The chunk files are
 * content-hashed and are not pruned on deploy, so nothing 404s and nothing
 * errors — the tab simply goes on running old code, quietly, for as long as it
 * stays open.
 *
 * That is not theoretical. A claimant's intake step kept showing a settlement
 * range from a formula that had been deleted hours earlier, and it looked like
 * the fix had failed. The ChunkLoadError recovery added previously does not
 * help here: it fires when a chunk is *missing*, and these are all still there.
 *
 * Next.js stamps every build with an id, exposed on `__NEXT_DATA__` and in the
 * static asset paths, which makes it a reliable marker to compare against.
 */

const BUILD_ID_PATTERN = /"buildId":"([^"]+)"/
const BUILD_TIME_PATTERN = /"buildTime":"([^"]+)"/

/** The build this tab started with, or '' when it cannot be determined. */
export function currentBuildId(): string {
  const data = (globalThis as any)?.__NEXT_DATA__
  return typeof data?.buildId === 'string' ? data.buildId : ''
}

/** The build id advertised by freshly fetched HTML, or '' if absent. */
export function parseBuildId(html: string | null | undefined): string {
  const match = BUILD_ID_PATTERN.exec(String(html ?? ''))
  return match ? match[1] : ''
}

/**
 * When the build described by freshly fetched HTML was made, or '' if absent.
 *
 * Stamped into the page props by the server from the runtime `BUILD_TIME`, so
 * it is missing in local development and on any image built before that was
 * added. Callers must treat '' as "unknown" and still report the new version.
 */
export function parseBuildTime(html: string | null | undefined): string {
  const match = BUILD_TIME_PATTERN.exec(String(html ?? ''))
  return match ? match[1] : ''
}

/**
 * An ISO build stamp as a date and time the reader can place, in their own
 * locale and zone. Returns null for anything unparseable, so a malformed stamp
 * degrades to a prompt with no date rather than one reading "Invalid Date".
 */
export function formatBuildTime(
  iso: string | null | undefined,
  locale?: string,
): string | null {
  const raw = String(iso ?? '').trim()
  if (!raw) return null

  const at = new Date(raw)
  if (Number.isNaN(at.getTime())) return null

  try {
    return at.toLocaleString(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    // An unsupported locale tag must not cost the reader the date.
    return at.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }
}

/**
 * Whether to tell the user a new version exists.
 *
 * Requires both ids to be present and different. An unreadable response must
 * never be treated as a new build: prompting a reload on every network hiccup
 * would be worse than the staleness it is meant to catch.
 */
export function isNewBuild(current: string, latest: string): boolean {
  if (!current || !latest) return false
  return current !== latest
}
