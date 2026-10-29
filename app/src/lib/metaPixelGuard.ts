/**
 * Keeps the Meta Pixel (and, after the landing page, Clarity) off the screens
 * that carry health information.
 *
 * The GTM container is only loaded on server-classified marketing pages (see
 * _document), and the Pixel is a Custom HTML tag in it. That is not enough on
 * its own for Meta: once `fbevents.js` is
 * loaded it sends a PageView, with the full URL, on every client-side route
 * change by itself, and it attaches automatic button and form listeners. So the
 * app takes the decision itself, and fails closed:
 *
 * - Meta is allowed only on a page the server rendered as public marketing
 *   content (`publicPage`, an allow list). Anywhere else, including error pages
 *   and routes nobody classified, `window.fbq` is defined as an inert function
 *   before the container loads. The tag's base code only loads `fbevents.js`
 *   when `fbq` is undefined, so Meta's script never reaches the page and the
 *   tag's `init`/`track` calls do nothing.
 *
 * - On an allowed page the standard base code is installed here, with automatic
 *   PageViews on history changes (`disablePushState`) and automatic events
 *   (`autoConfig`) turned off before the tag's `init` runs. The tag then finds
 *   `fbq` defined and only initialises the pixel and records the landing
 *   PageView.
 *
 * - On the first client-side move away from the landing page, wherever it
 *   goes, consent is revoked and is not granted again for the life of the
 *   document. Meta only counts the landing page, so this costs no measurement,
 *   and it does not depend on classifying the destination. Meta may hold events
 *   fired while consent is revoked until it is granted, so granting on the way
 *   back out could release them.
 *
 * - That move is then made a full page load rather than a client-side one.
 *   Switching vendors off one by one does not cover them all: a browser test
 *   caught a Google Ads click conversion in the container reporting
 *   `/assess?step=consent&lead=<id>`, and Ads reads neither `ga-disable` nor
 *   Meta's consent. A new document for the next route is answered by the
 *   server's allow list, which loads no container on app screens, so nothing
 *   the container installed survives into them.
 *
 * The site's conversion measurement for intake stays in ClearCaseIQ's own
 * reporting and in Google Ads; none of it depends on Meta.
 */

/** Not a secret: it ships in the page source. The environment can override or blank it. */
export const DEFAULT_META_PIXEL_ID = '1594082249036343'

export function metaPixelId(): string | null {
  const configured = process.env.NEXT_PUBLIC_META_PIXEL_ID
  if (configured === undefined) return DEFAULT_META_PIXEL_ID
  return configured.trim() || null
}

/** Base code for the top of `<head>`, ahead of the GTM container. */
export function metaGuardSnippet(allowed: boolean, pixelId: string | null): string {
  if (!allowed || !pixelId) {
    return (
      `(function(w){var n=function(){};n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];` +
      `w.fbq=n;w._fbq=n;w.__cciqMetaBlocked=!0;})(window);`
    )
  }
  return (
    `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?` +
    `n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;` +
    `n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;` +
    `t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}` +
    `(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');` +
    `window.fbq.disablePushState=!0;window.fbq('set','autoConfig',false,'${pixelId}');` +
    // Set by the consent snippet ahead of this one. Revoked consent makes Meta
    // hold events until the visitor accepts (see cookieConsent.ts).
    `if(!window.__cciqAdsGranted)window.fbq('consent','revoke');`
  )
}

/**
 * Called on every route the app renders. Remembers the landing path and, once
 * the visitor leaves it, revokes Meta consent, stops the Clarity recording and
 * switches off Google Analytics.
 *
 * The container only loads on marketing pages, but its tags stay resident for
 * the rest of the single-page session. Clarity records everything on screen,
 * so it has to stop before the intake wizard renders. It is asked again on
 * every later route change, because its script loads asynchronously and may
 * not have arrived by the first one.
 */
export function applyLandingOnlyTracking(pathname: string, scope: Record<string, unknown>): void {
  if (!Array.isArray(scope.dataLayer) && typeof scope.fbq !== 'function') return
  if (scope.__cciqLanding === undefined) {
    scope.__cciqLanding = pathname
    stopOnHistoryChange(scope)
    return
  }
  if (pathname === scope.__cciqLanding && !scope.__cciqLeftLanding) return
  leaveLanding(scope)
}

/**
 * The route effect runs after the new screen has rendered, by which time
 * Clarity's mutation observer has already captured it. The router changes the
 * URL before it renders, so stopping there keeps the first app screen out too.
 *
 * The URL is deliberately left as it is while the next document loads: tags
 * that fire in that gap (on the click that started it, or on a history-change
 * trigger) read `location.href`, and it still names the landing page.
 */
function stopOnHistoryChange(scope: Record<string, unknown>): void {
  const history = scope.history as History | undefined
  const location = scope.location as Location | undefined
  if (!history || !location) return
  for (const method of ['pushState', 'replaceState'] as const) {
    const original = history[method]
    history[method] = function (this: History, ...args: Parameters<History['pushState']>) {
      if (scope.__cciqReloading) return
      const url = args[2]
      if (url == null) return original.apply(this, args)
      const target = new URL(String(url), location.href)
      if (target.pathname === scope.__cciqLanding) return original.apply(this, args)
      leaveLanding(scope)
      scope.__cciqReloading = true
      if (method === 'replaceState') location.replace(target.href)
      else location.assign(target.href)
    }
  }
}

function leaveLanding(scope: Record<string, unknown>): void {
  scope.__cciqLeftLanding = true
  const fbq = scope.fbq
  if (typeof fbq === 'function' && !scope.__cciqMetaBlocked && !scope.__cciqMetaRevoked) {
    fbq('consent', 'revoke')
    scope.__cciqMetaRevoked = true
  }
  const clarity = scope.clarity
  if (typeof clarity === 'function' && !scope.__cciqClarityStopped) {
    clarity('stop')
    scope.__cciqClarityStopped = true
  }
  for (const id of googleAnalyticsIds(scope)) scope[`ga-disable-${id}`] = true
}

/**
 * Every GA4 property loaded on the page, including the ones the container
 * brings in, which the app is not configured with.
 *
 * GA4's enhanced measurement sends a page_view with the full URL on each
 * history change, so a property that is not switched off reports the intake
 * wizard's URL the moment the router enters it.
 */
function googleAnalyticsIds(scope: Record<string, unknown>): string[] {
  const loaded = scope.google_tag_manager
  const ids = loaded && typeof loaded === 'object' ? Object.keys(loaded) : []
  return ids.filter((id) => /^G-[A-Z0-9]+$/.test(id))
}
