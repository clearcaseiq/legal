/**
 * Google Tag Manager, loaded on every page of the site.
 *
 * This deliberately reverses an earlier boundary. GTM used to render only where
 * the server had already decided the page was public marketing content, so a
 * claimant working through intake loaded no container at all. Screen-level
 * tracking of the claimant funnel was asked for, and it cannot work from behind
 * that gate: the app is a single-page app behind a catch-all route, so the
 * container has to be in the document before any of those screens render.
 *
 * Three things the reversal costs, written down so they are not rediscovered
 * from an incident:
 *
 * 1. A container is a remote loader. Whoever holds the GTM account can add a
 *    tag that fires on claimant screens without touching this repository, and
 *    no review here will see it. The review that matters now happens in the
 *    container.
 *
 * 2. Tags read `location.href` for themselves. Claimant URLs carry assessment
 *    ids, and `/evidence-upload/<id>?token=<token>` carries a credential that
 *    opens someone else's evidence. `screenView.ts` pushes a redacted path for
 *    tags to read instead, but nothing in this file can stop a tag that goes to
 *    the URL directly — that has to be configured in the container, by
 *    overriding the GA4 tag's `page_location` with the redacted variable.
 *
 * 3. `analytics_blocked` from `analyticsBoundary.ts` is now the only lever the
 *    app has over what runs on sensitive routes, and it stays inert until a
 *    blocking trigger on it exists in the container.
 */
import { indexingEnabled } from './siteConfig'

/**
 * The container id, hardcoded as the default rather than required from the
 * environment.
 *
 * It is not a secret — it ships in the page source to every visitor. Requiring
 * `NEXT_PUBLIC_GTM_CONTAINER_ID` would mean the tag silently does nothing
 * wherever that variable was missed, which is the failure mode this whole file
 * exists to avoid. The variable still overrides, so a separate container can be
 * pointed at a staging host.
 */
export const DEFAULT_CONTAINER_ID = 'GTM-PBTSJLC5'

/**
 * Which container to load, or null to load none.
 *
 * `NEXT_PUBLIC_*` values are inlined at build time, so one promotable image
 * carries production's container id everywhere it runs. Without the indexing
 * check, QA and staging would report into the production container and corrupt
 * the numbers the funnel is read from — the same reason `publicPage` is cleared
 * on non-indexed hosts. `SEARCH_ENGINE_INDEXING` is already the flag that marks
 * a host as not-the-real-site, so it is reused here rather than adding a second
 * switch that can disagree with the first.
 */
export function gtmContainerId(): string | null {
  if (!indexingEnabled()) return null
  const configured = process.env.NEXT_PUBLIC_GTM_CONTAINER_ID?.trim()
  return configured || DEFAULT_CONTAINER_ID
}

/**
 * The container bootstrap, for the top of `<head>`.
 *
 * `analytics_blocked` is seeded in the same script, ahead of `gtm.js`, so the
 * container's first evaluation already knows whether the landing route is a
 * sensitive one. Pushing it afterwards would leave a window in which tags see
 * no value and treat the route as permitted.
 */
export function gtmHeadSnippet(containerId: string, analyticsBlocked: boolean): string {
  return (
    `window.dataLayer=window.dataLayer||[];` +
    `window.dataLayer.push({analytics_blocked:${analyticsBlocked ? 'true' : 'false'}});` +
    `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':` +
    `new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],` +
    `j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=` +
    `'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);` +
    `})(window,document,'script','dataLayer','${containerId}');`
  )
}

/** Source for the `<noscript>` fallback iframe that follows `<body>`. */
export function gtmNoscriptSrc(containerId: string): string {
  return `https://www.googletagmanager.com/ns.html?id=${containerId}`
}
