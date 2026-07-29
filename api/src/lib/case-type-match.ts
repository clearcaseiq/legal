/**
 * Shared case-type matching used by the routing/eligibility engine.
 *
 * Since #49, attorneys pick their practice areas from the same client-facing
 * incident types shown in the intake wizard (vehicle, slip_fall, workplace,
 * medmal, dog_bite, product, assault, toxic, other), while assessments store a
 * claimType. We map both sides into claim-type space before comparing.
 *
 * This map used to collapse workplace and assault and other onto slip_and_fall,
 * and toxic onto product, mirroring the lossy intake mapping fixed in CP-406.
 * Now that intake preserves what the plaintiff chose, each incident type maps to
 * its own claim type, so a slip & fall practice no longer silently matches
 * workplace and assault cases.
 */

const INCIDENT_TO_CLAIM: Record<string, string> = {
  vehicle: 'auto',
  slip_fall: 'slip_and_fall',
  workplace: 'workplace_injury',
  medmal: 'medmal',
  dog_bite: 'dog_bite',
  product: 'product',
  assault: 'intentional_tort',
  toxic: 'toxic_exposure',
  other: 'other_pi',
}

/**
 * Claim types recorded before CP-406, mapped to the type they'd be stored as
 * today, so an attorney's practice areas still match cases already in the
 * database. premises_liability was never emitted by intake but exists in the
 * label map and on some imported rows.
 */
const CLAIM_TYPE_SYNONYMS: Record<string, string> = {
  premises: 'slip_and_fall',
  premises_liability: 'slip_and_fall',
  slip_fall: 'slip_and_fall',
  motor_vehicle: 'auto',
  auto_accident: 'auto',
  medical_malpractice: 'medmal',
  med_mal: 'medmal',
  product_liability: 'product',
  workers_comp: 'workplace_injury',
  nursing_home: 'nursing_home_abuse',
}

/** Map an incident-type slug to its claim type; pass through claim types as-is. */
export function toClaimType(value: string): string {
  const key = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  return INCIDENT_TO_CLAIM[key] ?? CLAIM_TYPE_SYNONYMS[key] ?? key
}

function norm(value: string): string {
  return String(value || '').toLowerCase().replace(/_/g, ' ').trim()
}

/**
 * True when a single stored practice-area/specialty (or excluded) value covers
 * the given claim type. Tolerant of incident-type slugs, underscores, spacing.
 */
export function caseTypeMatches(stored: string, claimType: string): boolean {
  const c = norm(claimType)
  if (!c) return false
  if (norm(stored) === c) return true
  // Both sides go through toClaimType so a legacy synonym on either side (an
  // attorney listing "premises liability" against a case stored as
  // slip_and_fall, or the reverse) still matches.
  return norm(toClaimType(stored)) === norm(toClaimType(claimType))
}

/** True when any of the stored practice-area/specialty values covers the claim type. */
export function coversClaimType(stored: string[], claimType: string): boolean {
  return stored.some((value) => caseTypeMatches(value, claimType))
}
