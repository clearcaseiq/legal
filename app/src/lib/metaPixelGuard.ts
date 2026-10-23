/**
 * Keeps the Meta Pixel off the screens that carry health information.
 *
 * The Pixel is a Custom HTML tag in the GTM container, firing on every page
 * load, and nothing in the container honours `analytics_blocked`. Even with a
 * blocking trigger it would not be enough: once `fbevents.js` is loaded on a
 * public page it sends a PageView, with the full URL, on every client-side
 * route change by itself, and it attaches automatic button and form listeners.
 * A container trigger cannot stop either. So the app takes the decision itself:
 *
 * - Landing on a sensitive route: `window.fbq` is defined as an inert function
 *   before the container loads. The tag's base code only loads `fbevents.js`
 *   when `fbq` is undefined, so Meta's script never reaches the page and the
 *   tag's `init`/`track` calls do nothing.
 *
 * - Landing on a public route: the standard base code is installed here, with
 *   automatic PageViews on history changes (`disablePushState`) and automatic
 *   events (`autoConfig`) turned off before the tag's `init` runs. The tag then
 *   finds `fbq` defined and only initialises the pixel and records the landing
 *   PageView.
 *
 * - Moving from a public route into a sensitive one: consent is revoked and is
 *   not granted again for the life of the document. Meta may hold events fired
 *   while consent is revoked until it is granted, so granting on the way back
 *   out could release them.
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
export function metaGuardSnippet(analyticsBlocked: boolean, pixelId: string | null): string {
  if (analyticsBlocked) {
    return (
      `(function(w){var n=function(){};n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];` +
      `w.fbq=n;w._fbq=n;w.__cciqMetaBlocked=!0;})(window);`
    )
  }
  if (!pixelId) return ''
  return (
    `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?` +
    `n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;` +
    `n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;` +
    `t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}` +
    `(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');` +
    `window.fbq.disablePushState=!0;window.fbq('set','autoConfig',false,'${pixelId}');`
  )
}

/** Revokes Meta consent on the first sensitive route; never re-grants within the document. */
export function applyMetaBoundary(blocked: boolean, scope: Record<string, unknown>): void {
  if (!blocked || scope.__cciqMetaBlocked || scope.__cciqMetaRevoked) return
  const fbq = scope.fbq
  if (typeof fbq !== 'function') return
  fbq('consent', 'revoke')
  scope.__cciqMetaRevoked = true
}
