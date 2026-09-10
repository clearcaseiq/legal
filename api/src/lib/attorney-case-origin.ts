/**
 * Provenance for cases an attorney brought with them.
 *
 * Deliberately a leaf module with no imports. The readers that need it are
 * scattered — valuation, readiness, consent, routing, billing — and several of
 * them are already imported by the case factory that writes the marker. Giving
 * the predicate its own home keeps that from becoming a cycle.
 */

/**
 * `LeadSubmission.sourceType` for a case the attorney brought themselves.
 *
 * A plain string column, not an enum, so this needs no migration — and it is
 * already a filter on `/leads/filtered`, so it reaches the UI for free.
 *
 * Three separate rules read it: the routing engine must never offer these
 * cases to anyone, the routing fee must not be charged for a lead we did not
 * source, and the consent gates must not read the absence of consumer
 * marketplace consents as a defect.
 */
export const ATTORNEY_SELF_SOURCE = 'attorney_self'

/** How the case got here. Recorded on the facts so read paths can branch. */
export type AttorneyCaseOrigin = 'manual' | 'import'

/**
 * True for a case the attorney brought with them rather than one we routed.
 *
 * The distinction matters wherever a rule exists to protect a consumer who
 * arrived through our funnel. Such a claimant has agreed to terms, a privacy
 * policy and a HIPAA authorization, and the product is right to insist on all
 * three before showing their medical detail to attorneys they have never met.
 *
 * Somebody already represented by the firm importing them has done none of
 * that with us and never will — their engagement is with the firm and predates
 * us entirely. Reading that absence as missing paperwork puts a permanent
 * defect on every imported case, for a disclosure that cannot happen: these
 * cases are routing-locked from birth and are never offered to anyone.
 */
export function isAttorneyOwnedCase(facts: unknown): boolean {
  if (!facts || typeof facts !== 'object') return false
  const origin = (facts as { origin?: { kind?: unknown } }).origin
  return Boolean(origin && typeof origin === 'object' && origin.kind === ATTORNEY_SELF_SOURCE)
}
