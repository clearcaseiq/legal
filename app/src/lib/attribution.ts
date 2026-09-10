/**
 * First-touch marketing attribution.
 *
 * Records the campaign that brought someone to the site, so it can be stored
 * against their intake lead and, later, joined forward to whether the case was
 * retained. That join is the only way spend becomes measurable here: GA4 sees
 * the visit but never the conversion, because the intake wizard and the results
 * page deliberately carry no analytics tag — their URLs can hold an assessment
 * id or a claim token. See `analyticsBoundary.ts`.
 *
 * Nothing here is sent to an analytics vendor. It goes to our own API, attached
 * to a record we already keep.
 *
 * First touch, not last. Someone arrives on a landing page from a paid ad, then
 * clicks through to the assessment; by the time a lead row exists the URL no
 * longer carries the campaign, and `document.referrer` is our own site. Capture
 * once, on the first page of the visit, and never overwrite.
 */

const STORAGE_KEY = 'ccq_attribution'

/** Recognised as their own columns, because they are what gets grouped by. */
const NAMED_PARAMS: Record<string, 'utmSource' | 'utmMedium' | 'utmCampaign' | 'gclid'> = {
  utm_source: 'utmSource',
  utm_medium: 'utmMedium',
  utm_campaign: 'utmCampaign',
  gclid: 'gclid',
}

/** Kept as JSON. Useful to have, rarely worth a column. */
const EXTRA_PARAMS = ['utm_term', 'utm_content', 'utm_id', 'gbraid', 'wbraid', 'fbclid', 'msclkid']

export type Attribution = {
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  gclid?: string
  referrer?: string
  landingPath?: string
  extra?: Record<string, string>
}

function storage(): Storage | null {
  try {
    return window.sessionStorage
  } catch {
    // Safari in private mode, and anyone blocking storage. Attribution is a
    // nice-to-have; never let it break the page it is measuring.
    return null
  }
}

/**
 * Capture attribution if this is the first page of the visit.
 *
 * Session-scoped rather than persistent: a visitor returning next week from a
 * different ad should be credited to that ad, not to the one that brought them
 * the first time.
 */
export function captureAttribution(
  search: string = typeof window === 'undefined' ? '' : window.location.search,
  referrer: string = typeof document === 'undefined' ? '' : document.referrer,
  path: string = typeof window === 'undefined' ? '' : window.location.pathname,
): void {
  const store = storage()
  if (!store || store.getItem(STORAGE_KEY)) return

  const params = new URLSearchParams(search)
  const captured: Attribution = {}

  for (const [param, field] of Object.entries(NAMED_PARAMS)) {
    const value = params.get(param)
    if (value) captured[field] = value.slice(0, 200)
  }

  const extra: Record<string, string> = {}
  for (const param of EXTRA_PARAMS) {
    const value = params.get(param)
    if (value) extra[param] = value.slice(0, 200)
  }
  if (Object.keys(extra).length) captured.extra = extra

  // An external referrer is itself attribution — it is how organic search and
  // links from other sites are told apart from direct arrivals. Our own domain
  // is not: that is an internal navigation, which means this is not first touch.
  if (referrer && !isInternal(referrer)) captured.referrer = referrer.slice(0, 500)
  if (path) captured.landingPath = path.slice(0, 500)

  // Store even when empty. The marker is what makes this first-touch: without
  // it, a later page with no parameters would look like a fresh capture and
  // overwrite a campaign with nothing.
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(captured))
  } catch {
    // Quota or a blocked write. Nothing to do and nothing worth breaking.
  }
}

function isInternal(referrer: string): boolean {
  try {
    return new URL(referrer).hostname === window.location.hostname
  } catch {
    return false
  }
}

/**
 * The captured attribution, or undefined when there is nothing worth sending.
 *
 * A visit with no campaign, no click id and no external referrer is a direct
 * arrival. Sending `{}` for it would only write seven null columns.
 */
export function getAttribution(): Attribution | undefined {
  const store = storage()
  if (!store) return undefined

  const raw = store.getItem(STORAGE_KEY)
  if (!raw) return undefined

  try {
    const parsed = JSON.parse(raw) as Attribution
    const meaningful =
      parsed.utmSource || parsed.utmMedium || parsed.utmCampaign || parsed.gclid || parsed.referrer
    return meaningful ? parsed : undefined
  } catch {
    return undefined
  }
}
