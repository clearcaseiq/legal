import { DEFAULT_SITE_URL } from '../data/siteOrigin'

/**
 * Server-side deployment identity: which public origin this container is
 * serving, and whether it may be indexed.
 *
 * Both are read from plain (non-`NEXT_PUBLIC_`) variables so they resolve when
 * the request is handled rather than when the image is built. That is the whole
 * point: Next inlines `NEXT_PUBLIC_*` at build time, so the previous
 * `NEXT_PUBLIC_SITE_URL` compiled one environment's hostname into the bundle
 * and made the image unpromotable — QA and production could not run the same
 * artifact, which is most of the reason to have a QA tier at all.
 *
 * Only import these from server-rendered code (`getServerSideProps`, API and
 * page routes). In the browser `process.env.SITE_URL` is undefined and both
 * fall back, which is safe but not the value you wanted.
 */

function normalizeOrigin(value: string | undefined): string {
  return value?.trim().replace(/\/+$/, '') || ''
}

export function serverSiteUrl(): string {
  const runtime = normalizeOrigin(process.env.SITE_URL)
  if (runtime) return runtime

  // Kept so an image built before this change, or a local `next dev` using the
  // old variable, keeps resolving to the same origin it always did.
  const baked = normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL)
  if (baked) return baked

  return DEFAULT_SITE_URL
}

/**
 * QA serves the same 176 indexable pages as production. Left crawlable it would
 * compete with the real site for the same queries and split the signal, so
 * non-production deployments set SEARCH_ENGINE_INDEXING=disabled, which turns
 * robots.txt into a blanket disallow and marks every page `noindex`.
 *
 * Defaults to enabled: forgetting the variable on QA is recoverable, but having
 * it silently disable indexing on production would quietly delist the site.
 */
export function indexingEnabled(): boolean {
  return process.env.SEARCH_ENGINE_INDEXING?.trim().toLowerCase() !== 'disabled'
}
