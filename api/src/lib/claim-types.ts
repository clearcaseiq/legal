/**
 * Canonical, human-readable claim/incident type labels.
 *
 * Kept byte-identical to `shared/claim-types.ts` (the web + mobile source of
 * truth). The API cannot import the repo-root `shared/` module directly: the
 * Docker build context only copies `api/`, and the API tsconfig pins
 * `rootDir` to `src`, so an out-of-tree import fails both in CI and in the
 * image. This local copy keeps the API self-contained while staying in sync
 * with the shared labels (see the mobile `formatLead.ts` parity pattern).
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

/**
 * Labels for the narrower incident type captured during intake
 * (`facts.caseSubtype`), which says what kind of motor-vehicle or premises case
 * it is. Kept beside the claim-type map so the pair reads consistently.
 */
export const CASE_SUBTYPE_LABELS: Record<string, string> = {
  auto_accident: 'Auto accident',
  car_accident: 'Car accident',
  motorcycle_accident: 'Motorcycle accident',
  bus_accident: 'Bus or public transit accident',
  other_vehicle_accident: 'Vehicle accident',
  rideshare_accident: 'Rideshare accident',
  truck_accident: 'Truck accident',
  delivery_vehicle_accident: 'Delivery vehicle accident',
  pedestrian_accident: 'Pedestrian accident',
  bicycle_accident: 'Bicycle accident',
  multi_vehicle_accident: 'Multi-vehicle accident',
  rear_end_collision: 'Rear-end collision',
  head_on_collision: 'Head-on collision',
  left_turn_collision: 'Left-turn collision',
  grocery_premises: 'Grocery store premises',
  restaurant_premises: 'Restaurant premises',
  apartment_premises: 'Apartment premises',
  hotel_premises: 'Hotel premises',
  workplace_injury: 'Workplace injury',
  birth_injury: 'Birth injury malpractice',
  nursing_home_abuse: 'Nursing home abuse',
  negligent_security: 'Negligent security',
  toxic_exposure: 'Toxic exposure',
  other_pi: 'Personal injury',
  other: 'Personal injury',
}

/** Display label for a case-subtype slug, or '' when there is no subtype. */
export function formatCaseSubtype(value: string | null | undefined): string {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const key = raw.toLowerCase().replace(/[\s-]+/g, '_')
  const mapped = CASE_SUBTYPE_LABELS[key]
  if (mapped) return mapped
  const spaced = raw.replace(/_/g, ' ').trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

/**
 * "Motor vehicle (Rear-end collision)" — the claim type, narrowed by the
 * subtype when intake captured one that says something the claim type does not.
 * A subtype that reads the same as its parent adds nothing and is dropped.
 */
export function formatCaseTypeWithSubtype(
  claimType: string | null | undefined,
  subtype: string | null | undefined,
): string {
  const label = formatClaimType(claimType)
  const sub = formatCaseSubtype(subtype)
  if (!sub || sub.toLowerCase() === label.toLowerCase()) return label
  return `${label} (${sub})`
}

/**
 * The one incident type a filter should offer for each label, in the order the
 * options should appear. Several slugs share a label (auto/vehicle/car_accident
 * are all "Motor vehicle"), so listing raw slugs would show the same option
 * several times.
 */
export const CLAIM_TYPE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = (() => {
  const seen = new Set<string>()
  const options: Array<{ value: string; label: string }> = []
  for (const [value, label] of Object.entries(CLAIM_TYPE_LABELS)) {
    if (seen.has(label)) continue
    seen.add(label)
    options.push({ value, label })
  }
  return options
})()

/**
 * Collapses any slug onto the single value used to represent its label, so a
 * filter matches every case that reads the same to the user regardless of which
 * historical slug the row was stored with.
 */
export function canonicalClaimType(value: string | null | undefined): string {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const label = formatClaimType(raw)
  const option = CLAIM_TYPE_OPTIONS.find((o) => o.label === label)
  return option ? option.value : raw.toLowerCase().replace(/[\s-]+/g, '_')
}

/**
 * Every slug that reads as the same label as `value`, for filters that have to
 * be evaluated in the database (admin case search) rather than over rows already
 * in memory.
 */
export function claimTypeSynonyms(value: string | null | undefined): string[] {
  const raw = String(value ?? '').trim()
  if (!raw) return []
  const label = formatClaimType(raw)
  const matches = Object.entries(CLAIM_TYPE_LABELS)
    .filter(([, l]) => l === label)
    .map(([slug]) => slug)
  return matches.length > 0 ? matches : [raw.toLowerCase().replace(/[\s-]+/g, '_')]
}
