/**
 * Pure helpers for IntakeWizardQuick — unit-tested without React/i18n.
 */

export const INJURY_TO_CLAIM: Record<string, string> = {
  vehicle: 'auto',
  slip_fall: 'slip_and_fall',
  workplace: 'high_severity_surgery',
  medmal: 'medmal',
  dog_bite: 'dog_bite',
  product: 'product',
  assault: 'wrongful_death',
  toxic: 'product',
  other: 'product',
}

export const CA_COUNTIES = [
  'Alameda', 'Alpine', 'Amador', 'Butte', 'Calaveras', 'Colusa', 'Contra Costa', 'Del Norte', 'El Dorado',
  'Fresno', 'Glenn', 'Humboldt', 'Imperial', 'Inyo', 'Kern', 'Kings', 'Lake', 'Lassen', 'Los Angeles',
  'Madera', 'Marin', 'Mariposa', 'Mendocino', 'Merced', 'Modoc', 'Mono', 'Monterey', 'Napa', 'Nevada',
  'Orange', 'Placer', 'Plumas', 'Riverside', 'Sacramento', 'San Benito', 'San Bernardino', 'San Diego',
  'San Francisco', 'San Joaquin', 'San Luis Obispo', 'San Mateo', 'Santa Barbara', 'Santa Clara',
  'Santa Cruz', 'Shasta', 'Sierra', 'Siskiyou', 'Solano', 'Sonoma', 'Stanislaus', 'Sutter', 'Tehama',
  'Trinity', 'Tulare', 'Tuolumne', 'Ventura', 'Yolo', 'Yuba',
] as const

export function normalizeCounty(county: string): string {
  const c = county.replace(/\s*County\s*$/i, '').trim()
  return CA_COUNTIES.find((x) => x.toLowerCase() === c.toLowerCase()) || c
}

export function sanitizeDetectedCounty(state: string, county: string): string {
  const normalizedState = state.trim().toUpperCase()
  const normalizedCounty = normalizeCounty(county)
  if (!normalizedCounty) return ''

  if (normalizedState === 'CA') {
    return CA_COUNTIES.includes(normalizedCounty as (typeof CA_COUNTIES)[number]) ? normalizedCounty : ''
  }

  return normalizedCounty
}

export function injuryTypeToClaimType(injuryType: string): string {
  return INJURY_TO_CLAIM[injuryType] ?? 'product'
}
