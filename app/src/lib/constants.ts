/**
 * US States and Territories
 * Complete list of all 50 states plus DC, organized alphabetically
 */
export const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' }
] as const

/**
 * State codes only (for backward compatibility)
 */
export const STATE_CODES = US_STATES.map(state => state.code)

/**
 * Helper function to get state name from code
 */
export function getStateName(code: string): string {
  return US_STATES.find(state => state.code === code)?.name || code
}

/**
 * Helper function to get state code from name
 */
export function getStateCode(name: string): string {
  return US_STATES.find(state => state.name === name)?.code || name
}

/**
 * Attorney practice/service case types. These mirror the client-facing incident
 * types shown in the intake wizard (#49) so attorneys and plaintiffs pick from
 * the exact same categories. `value` is the intake incident-type slug; the API
 * routing engine maps these to the stored claim type (see case-type-match.ts)
 * so matching stays correct.
 */
export const ATTORNEY_CASE_TYPES = [
  { value: 'vehicle', label: 'Vehicle Accident (car, truck, motorcycle, rideshare)' },
  { value: 'slip_fall', label: 'Slip / Trip / Unsafe Property' },
  { value: 'workplace', label: 'Workplace Injury' },
  { value: 'medmal', label: 'Medical Error or Malpractice' },
  { value: 'dog_bite', label: 'Dog Bite / Animal Attack' },
  { value: 'product', label: 'Defective Product' },
  { value: 'assault', label: 'Assault or Negligent Security' },
  { value: 'toxic', label: 'Exposure to Toxic Substances' },
  { value: 'other', label: 'Other Injury' },
]

/**
 * Friendly labels for legacy claim-type slugs that older attorney profiles may
 * still have stored (before #49 aligned practice areas to intake incident types).
 */
const LEGACY_SPECIALTY_LABELS: Record<string, string> = {
  auto: 'Vehicle Accident (car, truck, motorcycle, rideshare)',
  slip_and_fall: 'Slip / Trip / Unsafe Property',
  workplace_injury: 'Workplace Injury',
  intentional_tort: 'Assault or Negligent Security',
  toxic_exposure: 'Exposure to Toxic Substances',
  other_pi: 'Other Injury',
  nursing_home_abuse: 'Nursing Home Abuse',
  wrongful_death: 'Wrongful Death',
  high_severity_surgery: 'Catastrophic Injury',
}

/**
 * Format a stored specialty/service-type value for display. Maps known slugs to
 * friendly labels and falls back to de-underscoring + title-casing so legacy or
 * label-style values never render with raw underscores.
 */
export function formatSpecialty(value: string): string {
  const match = ATTORNEY_CASE_TYPES.find((type) => type.value === value)
  if (match) return match.label
  if (LEGACY_SPECIALTY_LABELS[value]) return LEGACY_SPECIALTY_LABELS[value]
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

/** California counties (common PI jurisdictions) */
export const CA_COUNTIES = [
  'Alameda', 'Alpine', 'Amador', 'Butte', 'Calaveras', 'Colusa', 'Contra Costa', 'Del Norte', 'El Dorado',
  'Fresno', 'Glenn', 'Humboldt', 'Imperial', 'Inyo', 'Kern', 'Kings', 'Lake', 'Lassen', 'Los Angeles',
  'Madera', 'Marin', 'Mariposa', 'Mendocino', 'Merced', 'Modoc', 'Mono', 'Monterey', 'Napa', 'Nevada',
  'Orange', 'Placer', 'Plumas', 'Riverside', 'Sacramento', 'San Benito', 'San Bernardino', 'San Diego',
  'San Francisco', 'San Joaquin', 'San Luis Obispo', 'San Mateo', 'Santa Barbara', 'Santa Clara',
  'Santa Cruz', 'Shasta', 'Sierra', 'Siskiyou', 'Solano', 'Sonoma', 'Stanislaus', 'Sutter', 'Tehama',
  'Trinity', 'Tulare', 'Tuolumne', 'Ventura', 'Yolo', 'Yuba'
]
