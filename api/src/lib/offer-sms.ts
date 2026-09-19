/**
 * The text an attorney gets when a case is routed to them.
 *
 * This was two copies of the same template — one in `case-notifications.ts`
 * for the notification pipeline, one in `sms.ts` for direct sends — which had
 * already drifted. Both are now built here.
 *
 * What the old message looked like:
 *
 *     CaseIQ: New case routed to you.
 *     Claim: Motor vehicle
 *     Location: CA, Los Angeles
 *     Est. Value: $17k–$37k
 *     Evidence: See case file
 *     Liability: Moderate
 *     Reply ACCEPT CMU7Y2 to accept or DECLINE CMU7Y2 to decline. (1 hour)
 *
 * Four things were wrong with it. There was no link, although the notification
 * function computes one and puts it in the email — so "See case file" named a
 * file the reader had no way to open. `Evidence: See case file` is the
 * placeholder for *no* documented treatment, so the one line asking for action
 * was also the least informative. The window was relative, and a text read
 * forty minutes late does not say how much of it is left. And there was no
 * opt-out, though the inbound handler has always honoured STOP.
 *
 * It also cost twice what it should: the en dash in the value range is outside
 * GSM-7 and forced the whole message to UCS-2. That is fixed centrally in
 * `sms-text.ts`, not here, so a template cannot undo it.
 */
import { webUrl } from './app-url'
import { offerReferenceCode, formatResponseWindow } from './offer-reference'

/**
 * Where each state's courts sit, for turning a response window into a wall
 * clock time.
 *
 * The case's jurisdiction rather than the attorney's own location, because that
 * is what we reliably have: the venue is on the assessment, while an attorney
 * profile has no timezone field. It is also the likelier match, since an
 * attorney is normally admitted where the case is.
 *
 * Split states are listed under the zone holding most of their population, so a
 * Florida panhandle attorney reads a time an hour late. The abbreviation is
 * always printed, so the time is unambiguous even when the zone is wrong.
 */
const STATE_TIME_ZONES: Record<string, string> = {
  AK: 'America/Anchorage',
  AL: 'America/Chicago',
  AR: 'America/Chicago',
  AZ: 'America/Phoenix',
  CA: 'America/Los_Angeles',
  CO: 'America/Denver',
  CT: 'America/New_York',
  DC: 'America/New_York',
  DE: 'America/New_York',
  FL: 'America/New_York',
  GA: 'America/New_York',
  HI: 'Pacific/Honolulu',
  IA: 'America/Chicago',
  ID: 'America/Boise',
  IL: 'America/Chicago',
  IN: 'America/Indiana/Indianapolis',
  KS: 'America/Chicago',
  KY: 'America/New_York',
  LA: 'America/Chicago',
  MA: 'America/New_York',
  MD: 'America/New_York',
  ME: 'America/New_York',
  MI: 'America/New_York',
  MN: 'America/Chicago',
  MO: 'America/Chicago',
  MS: 'America/Chicago',
  MT: 'America/Denver',
  NC: 'America/New_York',
  ND: 'America/Chicago',
  NE: 'America/Chicago',
  NH: 'America/New_York',
  NJ: 'America/New_York',
  NM: 'America/Denver',
  NV: 'America/Los_Angeles',
  NY: 'America/New_York',
  OH: 'America/New_York',
  OK: 'America/Chicago',
  OR: 'America/Los_Angeles',
  PA: 'America/New_York',
  RI: 'America/New_York',
  SC: 'America/New_York',
  SD: 'America/Chicago',
  TN: 'America/Chicago',
  TX: 'America/Chicago',
  UT: 'America/Denver',
  VA: 'America/New_York',
  VT: 'America/New_York',
  WA: 'America/Los_Angeles',
  WI: 'America/Chicago',
  WV: 'America/New_York',
  WY: 'America/Denver',
}

/** A dollar figure short enough for a text: `$17k`, `$1.2M`. */
export function formatCompactUsd(n: number): string {
  if (n >= 1_000_000) {
    const millions = n / 1_000_000
    return `$${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`
  }
  if (n >= 1000) return `$${Math.round(n / 1000)}k`
  return `$${Math.round(n)}`
}

/**
 * The state code in a `"CA, Los Angeles"` jurisdiction string, if there is one.
 *
 * Venue is stored as state-then-county and joined for display, so the state is
 * the first comma-separated part. Returns null for anything else rather than
 * guessing.
 */
function stateCodeOf(jurisdiction: string): string | null {
  const first = jurisdiction.split(',')[0]?.trim().toUpperCase()
  return first && /^[A-Z]{2}$/.test(first) && first in STATE_TIME_ZONES ? first : null
}

/**
 * `"CA, Los Angeles"` as `"Los Angeles, CA"`.
 *
 * The stored order is convenient for sorting and wrong for reading. Anything
 * that is not state-then-county is passed through untouched.
 */
export function formatLocation(jurisdiction: string): string {
  const parts = jurisdiction
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length === 2 && stateCodeOf(jurisdiction)) return `${parts[1]}, ${parts[0]}`
  return parts.join(', ')
}

/**
 * When the offer expires, as a time the reader can act on.
 *
 * "in 1 hour" is only true at the instant of sending; carrier delay, Do Not
 * Disturb and simply not looking at the phone all erode it silently, and the
 * reader cannot tell by how much. A wall clock time does not decay.
 *
 * Falls back to the relative window when the venue state is missing or
 * unrecognised, which is better than printing a time in the wrong zone.
 */
export function formatOfferDeadline(
  responseWindowMinutes: number,
  jurisdiction: string,
  now: Date = new Date()
): string {
  const state = stateCodeOf(jurisdiction)
  const timeZone = state ? STATE_TIME_ZONES[state] : null
  if (!timeZone) return `within ${formatResponseWindow(responseWindowMinutes)}`

  const expiry = new Date(now.getTime() + responseWindowMinutes * 60_000)
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(expiry)

  // A deadline past midnight reads as though it were today, so name the day.
  const dayOf = (d: Date) => new Intl.DateTimeFormat('en-US', { timeZone, day: 'numeric' }).format(d)
  if (dayOf(expiry) !== dayOf(now)) {
    const weekday = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(expiry)
    return `by ${weekday} ${time}`
  }
  return `by ${time}`
}

/** The link in the text, short enough to leave room for the rest of it. */
export function offerShortUrl(introductionId: string): string {
  return webUrl(`/o/${offerReferenceCode(introductionId)}`)
}

export interface OfferSmsInput {
  /** Already formatted for display, e.g. `Motor vehicle`. */
  claimTypeLabel: string
  /** Venue as stored, state first: `CA, Los Angeles`. */
  jurisdiction: string
  estimatedValueLow: number
  estimatedValueHigh: number
  /** The engine's evidence note. The no-treatment placeholder is dropped. */
  evidenceSummary?: string | null
  liabilityConfidence: string
  introductionId: string
  responseWindowMinutes: number
  /** Injectable so the deadline is testable. */
  now?: Date
}

/**
 * The placeholder the routing engine uses when there is no documented
 * treatment. It reads like an instruction, so in a channel with no link it was
 * actively misleading; dropping it says the same thing in no characters.
 */
const EVIDENCE_PLACEHOLDER = 'see case file'

/**
 * The half of the message that is the same whatever the case: how to open it,
 * how to answer, how long there is, and how to stop.
 */
function offerActionLines(
  introductionId: string,
  responseWindowMinutes: number,
  jurisdiction: string,
  now?: Date
): string[] {
  const code = offerReferenceCode(introductionId)
  return [
    `Details: ${offerShortUrl(introductionId)}`,
    `Reply ACCEPT ${code} or DECLINE ${code} ${formatOfferDeadline(
      responseWindowMinutes,
      jurisdiction,
      now
    )}.`,
    'Reply STOP to end texts.',
  ]
}

/**
 * The tier routers' offer text.
 *
 * They pass a summary line they have already composed and hold no venue, so
 * there is no timezone to state a deadline in and `formatOfferDeadline` falls
 * back to the relative window. Everything else — the link, the reply codes, the
 * opt-out — is shared with the matched-case text above.
 */
export function buildTierOfferSms(
  introductionId: string,
  summaryLine: string,
  responseWindowMinutes: number
): string {
  return [
    'ClearCaseIQ: New case routed to you.',
    summaryLine,
    ...offerActionLines(introductionId, responseWindowMinutes, ''),
  ].join('\n')
}

export function buildOfferSms(input: OfferSmsInput): string {
  const facts = [
    input.claimTypeLabel,
    input.estimatedValueLow > 0 || input.estimatedValueHigh > 0
      ? `est. ${formatCompactUsd(input.estimatedValueLow)}-${formatCompactUsd(input.estimatedValueHigh)}`
      : null,
    input.liabilityConfidence ? `liability ${input.liabilityConfidence.toLowerCase()}` : null,
    input.evidenceSummary && input.evidenceSummary.trim().toLowerCase() !== EVIDENCE_PLACEHOLDER
      ? input.evidenceSummary.toLowerCase()
      : null,
  ].filter(Boolean)

  return [
    `ClearCaseIQ: New case, ${formatLocation(input.jurisdiction)}.`,
    `${facts.join(', ')}.`,
    ...offerActionLines(
      input.introductionId,
      input.responseWindowMinutes,
      input.jurisdiction,
      input.now
    ),
  ].join('\n')
}
