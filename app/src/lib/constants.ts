import { formatClaimType } from './claimTypes'

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
  { code: 'DC', name: 'District of Columbia' },
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
  { code: 'WY', name: 'Wyoming' }
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
/**
 * Practice areas offered as a dropdown when a firm names a workflow, so the field
 * is a consistent controlled value instead of free text (CP-338). Broad enough to
 * cover the personal-injury verticals the platform routes.
 */
export const PRACTICE_AREAS = [
  'Personal Injury (General)',
  'Auto / Vehicle Accident',
  'Slip & Fall / Premises Liability',
  'Workplace Injury',
  'Medical Malpractice',
  'Product Liability',
  'Dog Bite / Animal Attack',
  'Nursing Home Abuse',
  'Wrongful Death',
  'Assault / Negligent Security',
  'Toxic Exposure / Mass Tort',
  'Other',
]

export const ATTORNEY_CASE_TYPES = [
  'vehicle',
  'slip_fall',
  'workplace',
  'medmal',
  'dog_bite',
  'product',
  'assault',
  'toxic',
  'nursing_home_abuse',
  'wrongful_death',
  'high_severity_surgery',
  'other',
].map((value) => ({ value, label: formatClaimType(value) }))

/**
 * Older attorney profiles and the firm roster stored claim-type slugs (`auto`,
 * `slip_and_fall`, …) before #49 aligned practice areas to intake incident
 * types. Maps each onto the intake slug it means so pickers show it as checked.
 */
export function toAttorneyCaseType(value: string): string {
  const label = formatClaimType(value)
  return ATTORNEY_CASE_TYPES.find((type) => type.label === label)?.value ?? value
}

/**
 * Format a stored specialty/service-type value for display, using the same
 * wording the claimant saw in intake. Unknown values are de-underscored rather
 * than shown raw.
 */
export function formatSpecialty(value: string): string {
  return formatClaimType(value)
}

/**
 * Concise, human-friendly label for a claim-type slug, used where a compact
 * label is needed such as the Messages conversation subtitle. Delegates to the
 * canonical shared map so web and mobile never name the same incident type
 * differently (CP-406).
 */
export function formatClaimTypeShort(value: string | null | undefined): string {
  return formatClaimType(value)
}

/**
 * California counties — a fallback for `usLocationData`, which is the county
 * source everything else should use. Kept only so a failed load of the upstream
 * dataset degrades to California rather than to an empty picker.
 */
export const CA_COUNTIES = [
  'Alameda', 'Alpine', 'Amador', 'Butte', 'Calaveras', 'Colusa', 'Contra Costa', 'Del Norte', 'El Dorado',
  'Fresno', 'Glenn', 'Humboldt', 'Imperial', 'Inyo', 'Kern', 'Kings', 'Lake', 'Lassen', 'Los Angeles',
  'Madera', 'Marin', 'Mariposa', 'Mendocino', 'Merced', 'Modoc', 'Mono', 'Monterey', 'Napa', 'Nevada',
  'Orange', 'Placer', 'Plumas', 'Riverside', 'Sacramento', 'San Benito', 'San Bernardino', 'San Diego',
  'San Francisco', 'San Joaquin', 'San Luis Obispo', 'San Mateo', 'Santa Barbara', 'Santa Clara',
  'Santa Cruz', 'Shasta', 'Sierra', 'Siskiyou', 'Solano', 'Sonoma', 'Stanislaus', 'Sutter', 'Tehama',
  'Trinity', 'Tulare', 'Tuolumne', 'Ventura', 'Yolo', 'Yuba'
]
