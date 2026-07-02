/**
 * Shared case-type matching used by the routing/eligibility engine.
 *
 * Since #49, attorneys pick their practice areas from the same client-facing
 * incident types shown in the intake wizard (vehicle, slip_fall, workplace,
 * medmal, dog_bite, product, assault, toxic, other). Assessments, however,
 * store the collapsed `claimType` produced by the web app's
 * injuryTypeToClaimType() (auto | slip_and_fall | medmal | dog_bite | product).
 *
 * To keep attorney↔case matching correct without changing how claimType /
 * SOL are stored, we map both sides into claim-type space before comparing.
 * Legacy attorney values that are already claim types pass through unchanged.
 */

const INCIDENT_TO_CLAIM: Record<string, string> = {
  vehicle: 'auto',
  slip_fall: 'slip_and_fall',
  workplace: 'slip_and_fall',
  medmal: 'medmal',
  dog_bite: 'dog_bite',
  product: 'product',
  assault: 'slip_and_fall',
  toxic: 'product',
  other: 'slip_and_fall',
}

/** Map an incident-type slug to its claim type; pass through claim types as-is. */
export function toClaimType(value: string): string {
  const key = String(value || '').trim().toLowerCase()
  return INCIDENT_TO_CLAIM[key] ?? key
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
  return norm(toClaimType(stored)) === c
}

/** True when any of the stored practice-area/specialty values covers the claim type. */
export function coversClaimType(stored: string[], claimType: string): boolean {
  return stored.some((value) => caseTypeMatches(value, claimType))
}
