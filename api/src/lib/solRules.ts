// Statute of Limitations rules for different states and claim types
export interface SOLRule {
  years: number
  discoveryRule?: boolean
  minorTolling?: boolean
  notes?: string
}

const STATE_CODES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL',
  'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME',
  'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH',
  'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI',
  'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI',
  'WY',
] as const

type StateCode = typeof STATE_CODES[number]

const CLAIM_TYPE_ALIASES: Record<string, string> = {
  auto_accident: 'auto',
  premises: 'slip_and_fall',
  pi: 'slip_and_fall',
  personal_injury: 'slip_and_fall',
  workplace_injury: 'workers',
  intentional_tort: 'slip_and_fall',
  toxic_exposure: 'slip_and_fall',
  other_pi: 'slip_and_fall',
}

const GENERAL_PERSONAL_INJURY_YEARS: Record<StateCode, number> = {
  AL: 2, AK: 2, AZ: 2, AR: 3, CA: 2, CO: 2, CT: 2, DE: 2, DC: 3, FL: 2,
  GA: 2, HI: 2, ID: 2, IL: 2, IN: 2, IA: 2, KS: 2, KY: 1, LA: 2, ME: 6,
  MD: 3, MA: 3, MI: 3, MN: 2, MS: 3, MO: 5, MT: 3, NE: 4, NV: 2, NH: 3,
  NJ: 2, NM: 3, NY: 3, NC: 3, ND: 6, OH: 2, OK: 2, OR: 2, PA: 2, RI: 3,
  SC: 3, SD: 3, TN: 1, TX: 2, UT: 4, VT: 3, VA: 2, WA: 3, WV: 2, WI: 3,
  WY: 4,
}

const AUTO_YEARS_OVERRIDES: Partial<Record<StateCode, number>> = {
  CO: 3,
  KY: 2,
}

const MEDMAL_YEARS: Record<StateCode, number> = {
  AL: 2, AK: 2, AZ: 2, AR: 2, CA: 1, CO: 2, CT: 2, DE: 2, DC: 3, FL: 2,
  GA: 2, HI: 2, ID: 2, IL: 2, IN: 2, IA: 2, KS: 2, KY: 1, LA: 1, ME: 3,
  MD: 3, MA: 3, MI: 2, MN: 4, MS: 2, MO: 2, MT: 3, NE: 2, NV: 3, NH: 3,
  NJ: 2, NM: 3, NY: 2.5, NC: 3, ND: 2, OH: 1, OK: 2, OR: 2, PA: 2, RI: 3,
  SC: 3, SD: 2, TN: 1, TX: 2, UT: 2, VT: 3, VA: 2, WA: 3, WV: 2, WI: 3,
  WY: 2,
}

const WRONGFUL_DEATH_YEARS: Record<StateCode, number> = {
  AL: 2, AK: 2, AZ: 2, AR: 3, CA: 2, CO: 2, CT: 2, DE: 2, DC: 2, FL: 2,
  GA: 2, HI: 2, ID: 2, IL: 2, IN: 2, IA: 2, KS: 2, KY: 1, LA: 2, ME: 2,
  MD: 3, MA: 3, MI: 3, MN: 3, MS: 3, MO: 3, MT: 3, NE: 2, NV: 2, NH: 3,
  NJ: 2, NM: 3, NY: 2, NC: 2, ND: 2, OH: 2, OK: 2, OR: 3, PA: 2, RI: 3,
  SC: 3, SD: 3, TN: 1, TX: 2, UT: 2, VT: 2, VA: 2, WA: 3, WV: 2, WI: 3,
  WY: 2,
}

const WORKERS_COMP_YEARS: Record<StateCode, number> = {
  AL: 2, AK: 2, AZ: 1, AR: 2, CA: 1, CO: 2, CT: 1, DE: 2, DC: 2, FL: 2,
  GA: 1, HI: 2, ID: 1, IL: 3, IN: 2, IA: 2, KS: 200 / 365.25, KY: 2, LA: 1, ME: 2,
  MD: 2, MA: 2, MI: 2, MN: 2, MS: 2, MO: 2, MT: 1, NE: 2, NV: 90 / 365.25, NH: 2,
  NJ: 2, NM: 1, NY: 2, NC: 2, ND: 1, OH: 2, OK: 2, OR: 1, PA: 3, RI: 2,
  SC: 2, SD: 2, TN: 1, TX: 1, UT: 6, VT: 6, VA: 2, WA: 1, WV: 0.5, WI: 6,
  WY: 1,
}

const GENERAL_NOTES: Partial<Record<StateCode, string>> = {
  AZ: 'Public-entity claims may require earlier notice.',
  CO: 'Auto accident claims commonly use a three-year deadline.',
  CT: 'Minor tolling and repose rules are limited for some claims.',
  FL: 'Florida negligence claims are generally two years for incidents after the 2023 tort reform change.',
  KS: 'Repose and minor-tolling limits may shorten some claims.',
  KY: 'Motor vehicle claims may use a two-year deadline.',
  LA: 'Louisiana changed many personal injury claims to two years for injuries after July 1, 2024; older claims may be one year.',
  MD: 'Medical malpractice and government claims have separate timing rules.',
  MN: 'Some Minnesota personal injury theories may use longer periods; confirm claim classification.',
  NM: 'Government claims may require notice within 90 days.',
  NY: 'Government defendants may require notice of claim within 90 days.',
  OH: 'Repose and tolling rules may cap some claims.',
  OK: 'Government claims may require advance notice.',
  TX: 'Discovery and repose rules are limited for some claims.',
  WV: 'Discovery rule may apply to some claims.',
}

const MEDMAL_NOTES: Partial<Record<StateCode, string>> = {
  AL: 'Two years, with discovery and repose exceptions.',
  CA: 'Generally one year from discovery or three years from injury, whichever occurs first, with exceptions.',
  FL: 'Generally two years from discovery with repose and fraud/concealment exceptions.',
  MD: 'Often three years from discovery, subject to a five-year outer limit.',
  NV: 'Nevada med-mal timing includes discovery and repose limits.',
  NY: 'Generally two years and six months, with special rules for foreign objects and continuous treatment.',
  OH: 'Generally one year with notice and repose exceptions.',
  TX: 'Generally two years with a ten-year repose period.',
  WA: 'Generally three years with discovery and repose limits.',
  WY: 'Generally two years with discovery and minor exceptions.',
}

const WORKERS_NOTES = 'Workers compensation deadlines often require much earlier employer notice and can vary for occupational disease or denied benefits.'

function rule(years: number, options: Omit<SOLRule, 'years'> = {}): SOLRule {
  return { years, discoveryRule: false, ...options }
}

function buildRulesForState(state: StateCode): Record<string, SOLRule> {
  const generalYears = GENERAL_PERSONAL_INJURY_YEARS[state]
  const generalNote = GENERAL_NOTES[state]
  const generalRule = rule(generalYears, generalNote ? { notes: generalNote } : {})
  const autoYears = AUTO_YEARS_OVERRIDES[state] ?? generalYears

  return {
    auto: rule(autoYears, GENERAL_NOTES[state] ? { notes: GENERAL_NOTES[state] } : {}),
    premises: generalRule,
    slip_and_fall: generalRule,
    dog_bite: generalRule,
    medmal: rule(MEDMAL_YEARS[state], {
      discoveryRule: true,
      minorTolling: true,
      notes: MEDMAL_NOTES[state] || 'Medical malpractice deadlines often have discovery, repose, pre-suit notice, and minor-tolling exceptions.',
    }),
    product: generalRule,
    nursing_home_abuse: generalRule,
    wrongful_death: rule(WRONGFUL_DEATH_YEARS[state], { notes: 'Wrongful death deadlines may run from date of death rather than injury.' }),
    high_severity_surgery: generalRule,
    workers: rule(WORKERS_COMP_YEARS[state], { notes: WORKERS_NOTES }),
  }
}

export const SOL_RULES: Record<string, Record<string, SOLRule>> = Object.fromEntries(
  STATE_CODES.map((state) => [state, buildRulesForState(state)]),
)

export function normalizeClaimTypeForSOL(claimType: string): string {
  const raw = String(claimType || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  return CLAIM_TYPE_ALIASES[raw] || raw
}

function addFractionalYears(date: Date, years: number): Date {
  const wholeYears = Math.trunc(years)
  const fractional = years - wholeYears
  const result = new Date(date)
  result.setFullYear(result.getFullYear() + wholeYears)
  if (fractional !== 0) {
    result.setMonth(result.getMonth() + Math.round(fractional * 12))
  }
  return result
}

function parseDateInput(value?: string | null): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function calculateAgeAtDate(birthDate: Date, targetDate: Date): number {
  let age = targetDate.getFullYear() - birthDate.getFullYear()
  const monthDiff = targetDate.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && targetDate.getDate() < birthDate.getDate())) {
    age -= 1
  }
  return age
}

export function calculateSOL(incidentDate: string, venue: { state: string; county?: string }, claimType: string): {
  expiresAt: Date
  yearsRemaining: number
  daysRemaining: number
  rule: SOLRule
} {
  const incident = new Date(incidentDate)
  const normalizedState = String(venue.state || '').toUpperCase()
  const normalizedClaimType = normalizeClaimTypeForSOL(claimType)
  const rule = SOL_RULES[normalizedState]?.[normalizedClaimType]
  
  if (!rule) {
    throw new Error(`No SOL rule found for ${normalizedState} ${normalizedClaimType}`)
  }
  
  const expiresAt = addFractionalYears(incident, rule.years)
  
  const now = new Date()
  const msRemaining = expiresAt.getTime() - now.getTime()
  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24))
  const yearsRemaining = daysRemaining / 365.25
  
  return {
    expiresAt,
    yearsRemaining,
    daysRemaining,
    rule
  }
}

export function deriveSOLStatus(params: {
  incidentDate?: string | null
  discoveryDate?: string | null
  birthDate?: string | null
  venue: { state: string; county?: string }
  claimType: string
}): {
  status: 'ok' | 'expiring_soon' | 'expired' | 'unknown'
  expiresAt?: Date
  daysRemaining?: number
  rule?: SOLRule
  appliedDateType?: 'incident' | 'discovery' | 'minor_tolling'
} {
  const incidentDate = parseDateInput(params.incidentDate)
  if (!incidentDate) return { status: 'unknown' }

  const normalizedState = String(params.venue.state || '').toUpperCase()
  const normalizedClaimType = normalizeClaimTypeForSOL(params.claimType)
  const rule = SOL_RULES[normalizedState]?.[normalizedClaimType]
  if (!rule) return { status: 'unknown' }

  const discoveryDate = parseDateInput(params.discoveryDate)
  const birthDate = parseDateInput(params.birthDate)

  let anchorDate = incidentDate
  let appliedDateType: 'incident' | 'discovery' | 'minor_tolling' = 'incident'

  if (rule.discoveryRule && discoveryDate && discoveryDate > incidentDate) {
    anchorDate = discoveryDate
    appliedDateType = 'discovery'
  }

  let expiresAt = addFractionalYears(anchorDate, rule.years)
  if (rule.minorTolling && birthDate) {
    const ageAtIncident = calculateAgeAtDate(birthDate, incidentDate)
    if (ageAtIncident < 18) {
      const majorityDate = new Date(birthDate)
      majorityDate.setFullYear(majorityDate.getFullYear() + 18)
      const tolledExpiry = addFractionalYears(majorityDate, rule.years)
      if (tolledExpiry > expiresAt) {
        expiresAt = tolledExpiry
        appliedDateType = 'minor_tolling'
      }
    }
  }

  const daysRemaining = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const status =
    daysRemaining < 0
      ? 'expired'
      : getSOLStatus(daysRemaining) === 'warning' || getSOLStatus(daysRemaining) === 'critical'
        ? 'expiring_soon'
        : 'ok'

  return {
    status,
    expiresAt,
    daysRemaining,
    rule,
    appliedDateType
  }
}

export function getSOLStatus(daysRemaining: number): 'safe' | 'warning' | 'critical' {
  if (daysRemaining > 365) return 'safe'
  if (daysRemaining > 90) return 'warning'
  return 'critical'
}
