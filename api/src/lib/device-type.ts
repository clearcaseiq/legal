/**
 * What kind of device a claimant started intake on.
 *
 * Three buckets, from the User-Agent header, and no more than that. The
 * question this exists to answer is whether the wizard is losing people on
 * phones — a multi-step form with date pickers and file uploads behaves very
 * differently on a 390px screen — and that question needs three answers, not a
 * browser-and-version matrix.
 *
 * Derived on the server rather than sent by the client. The header is already
 * on the request, and a field the browser fills in is a field that can arrive
 * saying anything.
 *
 * User-Agent parsing is guesswork by construction and this makes no attempt to
 * be exhaustive. It is a reporting dimension, so a strange browser landing in
 * `unknown` costs a row in a breakdown; nothing branches on it.
 */
export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown'

export const DEVICE_TYPES: DeviceType[] = ['mobile', 'tablet', 'desktop', 'unknown']

/**
 * Tablets are checked before phones because their strings overlap.
 *
 * An iPad reports "iPad", but Android tablets are identified by the *absence*
 * of "Mobile" from a string that still says "Android" — Chrome adds "Mobile"
 * only on phones. Checking phone patterns first would file every Android tablet
 * as a phone, and tablets are the one bucket where a cramped layout is not the
 * likely explanation for a drop-off.
 */
function isTablet(ua: string): boolean {
  if (/ipad/.test(ua)) return true
  if (/android/.test(ua) && !/mobile/.test(ua)) return true
  if (/\b(tablet|kindle|silk|playbook)\b/.test(ua)) return true
  // iPadOS 13+ requests desktop sites by default and reports itself as a Mac.
  // The give-away is a Mac that reports touch points, which no real Mac does.
  return /macintosh/.test(ua) && /mobile\/\w+/.test(ua)
}

function isMobile(ua: string): boolean {
  return /\b(iphone|ipod|android|windows phone|blackberry|bb10|opera mini|iemobile|mobile safari)\b/.test(
    ua,
  ) || /\bmobile\b/.test(ua)
}

export function deviceTypeFromUserAgent(userAgent: string | null | undefined): DeviceType {
  if (!userAgent || !userAgent.trim()) return 'unknown'
  const ua = userAgent.toLowerCase()

  // Bots are not claimants. Left as unknown rather than counted as desktop,
  // which would quietly inflate desktop completion rates with traffic that
  // never intended to complete anything.
  if (/\b(bot|crawler|spider|crawling|headlesschrome|phantomjs|lighthouse)\b/.test(ua)) {
    return 'unknown'
  }

  if (isTablet(ua)) return 'tablet'
  if (isMobile(ua)) return 'mobile'
  if (/\b(windows nt|macintosh|x11|linux|cros)\b/.test(ua)) return 'desktop'
  return 'unknown'
}
