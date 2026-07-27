/**
 * Canonical, human-readable claim/incident type labels.
 *
 * The web app and the mobile apps each used to carry their own label map, so the
 * same case read as "Auto" on web and "Motor vehicle" on mobile (CP-406). This
 * module is the single source of truth for those names.
 *
 * Keys are the claim-type slugs stored on `Assessment.claimType`, plus the
 * legacy/alias slugs that older rows and attorney profiles still use.
 */
export const CLAIM_TYPE_LABELS: Record<string, string> = {
  auto: 'Motor vehicle',
  vehicle: 'Motor vehicle',
  motor_vehicle: 'Motor vehicle',
  car_accident: 'Motor vehicle',
  truck_accident: 'Motor vehicle',
  motorcycle: 'Motor vehicle',
  slip_and_fall: 'Slip & fall',
  slip_fall: 'Slip & fall',
  premises: 'Premises liability',
  premises_liability: 'Premises liability',
  workplace: 'Workplace injury',
  workplace_injury: 'Workplace injury',
  workers_comp: 'Workplace injury',
  medmal: 'Medical malpractice',
  medical_malpractice: 'Medical malpractice',
  med_mal: 'Medical malpractice',
  dog_bite: 'Dog bite',
  product: 'Product liability',
  product_liability: 'Product liability',
  assault: 'Assault & negligent security',
  intentional_tort: 'Assault & negligent security',
  toxic: 'Toxic exposure',
  toxic_exposure: 'Toxic exposure',
  nursing_home_abuse: 'Nursing home abuse',
  nursing_home: 'Nursing home abuse',
  wrongful_death: 'Wrongful death',
  high_severity_surgery: 'Catastrophic injury',
  other: 'Other injury',
  other_pi: 'Other injury',
}

/** Shown when a case carries no claim type at all. */
export const DEFAULT_CLAIM_TYPE_LABEL = 'Personal injury'

/**
 * Display label for a claim-type slug. Unknown slugs fall back to sentence case
 * with underscores removed, so they read consistently with the mapped labels.
 */
export function formatClaimType(value: string | null | undefined): string {
  const raw = String(value ?? '').trim()
  if (!raw) return DEFAULT_CLAIM_TYPE_LABEL
  const key = raw.toLowerCase().replace(/[\s-]+/g, '_')
  const mapped = CLAIM_TYPE_LABELS[key]
  if (mapped) return mapped
  const spaced = raw.replace(/_/g, ' ').trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}
