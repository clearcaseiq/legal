/**
 * The version of the build this tab is running, for display in the footer.
 *
 * The server stamps `buildCommit` and `buildTime` into the page props from the
 * image's runtime environment, so they reach `__NEXT_DATA__`. Both are absent in
 * local development; the Next.js build id is the fallback there.
 */

/** An ISO stamp as a date the reader can place, or null when unparseable. */
export function formatBuildDate(iso: string | null | undefined, locale?: string): string | null {
  const raw = String(iso ?? '').trim()
  if (!raw) return null
  const at = new Date(raw)
  if (Number.isNaN(at.getTime())) return null
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
  try {
    return at.toLocaleDateString(locale, options)
  } catch {
    return at.toLocaleDateString(undefined, options)
  }
}

/** e.g. "de4a5b8 · Sep 24, 2026", or null when nothing identifies the build. */
export function currentBuildVersion(locale?: string): string | null {
  const data = (globalThis as any)?.__NEXT_DATA__
  const props = data?.props?.pageProps || {}
  const id = (typeof props.buildCommit === 'string' && props.buildCommit) ||
    (typeof data?.buildId === 'string' && data.buildId !== 'development' ? data.buildId.slice(0, 8) : '')
  if (!id) return null
  const date = formatBuildDate(props.buildTime, locale)
  return date ? `${id} · ${date}` : id
}
