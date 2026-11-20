/**
 * Does the State Bar record belong to the attorney claiming it?
 *
 * A bar lookup answers a narrower question than it appears to. Searching a
 * number against the California State Bar proves that number exists and is
 * active; it says nothing about who typed it in. Without this comparison
 * anybody can claim any published bar number — every one of them is public —
 * and collect a "California Bar Verified" badge on someone else's licence.
 *
 * The comparison is deliberately lenient, for the same reason the claimant
 * document check is: the cost of the two errors is not symmetric. Withholding a
 * badge from a real attorney because the Bar lists a maiden name, a middle name
 * or a firm-style "John Q. Smith III" is a support ticket and an insult.
 * Granting one on a stranger's licence is the failure the check exists to stop.
 * When the account surname is known, the record must carry it or share two
 * names with the account: a common first name alone is not evidence. A
 * married-name change therefore fails here and goes to admin review.
 */
import { nameTokens } from './claimant-identity-check'

/**
 * `unknown` is not a soft mismatch — it means one side had nothing comparable,
 * so no conclusion was reached. Callers must not treat it as a pass: the State
 * Bar returning no name is exactly the parse failure that would otherwise hand
 * out badges silently.
 */
export type BarNameMatch = 'match' | 'mismatch' | 'unknown'

export interface BarNameComparison {
  match: BarNameMatch
  /** The name as the State Bar publishes it, for display and for admin review. */
  recordName: string | null
}

/**
 * Compare the name on a State Bar record to the name an attorney registered
 * under.
 *
 * Both sides go through `nameTokens`, which drops credentials and bare
 * initials. That matters more here than for claimants: "Esq." on one side and
 * not the other is the normal case, and a shared middle initial is not evidence
 * of anything.
 */
export function compareBarRecordName(
  recordName: string | null | undefined,
  registeredName: string | null | undefined,
  options: { surname?: string | null } = {},
): BarNameComparison {
  const record = String(recordName ?? '').trim()
  const recordTokens = nameTokens(record)
  const registeredTokens = nameTokens(registeredName)

  if (recordTokens.length === 0 || registeredTokens.length === 0) {
    return { match: 'unknown', recordName: record || null }
  }

  const sharedCount = recordTokens.filter((token) => registeredTokens.includes(token)).length
  // With a known surname, a lone shared first name ("John") is not enough:
  // the record has to carry the surname, or two of the registered names.
  const surnameTokens = nameTokens(options.surname)
  if (surnameTokens.length > 0) {
    const surnameOnRecord = surnameTokens.some((token) => recordTokens.includes(token))
    return { match: surnameOnRecord || sharedCount >= 2 ? 'match' : 'mismatch', recordName: record }
  }
  return { match: sharedCount > 0 ? 'match' : 'mismatch', recordName: record }
}

/**
 * Whether a lookup earns the public verified badge.
 *
 * Both halves have to hold: the licence is active, and the record plausibly
 * names this attorney. Anything else keeps the badge off while still recording
 * what the Bar said, so an admin can resolve it without the attorney having to
 * re-enter anything.
 */
export function earnsVerifiedBadge(activeLicence: boolean, match: BarNameMatch): boolean {
  return activeLicence && match === 'match'
}
