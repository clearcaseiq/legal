// Statute of Limitations rules for different states and claim types
export interface SOLRule {
  years: number
  discoveryRule?: boolean
  minorTolling?: boolean
  notes?: string
}

const CLAIM_TYPE_ALIASES: Record<string, string> = {
  auto_accident: 'auto',
  premises: 'slip_and_fall',
  pi: 'slip_and_fall',
  personal_injury: 'slip_and_fall',
}

export const SOL_RULES: Record<string, Record<string, SOLRule>> = {
  CA: {
    auto: { years: 2, discoveryRule: false },
    premises: { years: 2, discoveryRule: false },
    slip_and_fall: { years: 2, discoveryRule: false },
    dog_bite: { years: 2, discoveryRule: false },
    medmal: { years: 1, discoveryRule: true, minorTolling: true },
    product: { years: 2, discoveryRule: false },
    nursing_home_abuse: { years: 2, discoveryRule: false },
    wrongful_death: { years: 2, discoveryRule: false },
    high_severity_surgery: { years: 2, discoveryRule: false },
    workers: { years: 1, discoveryRule: false }
  },
  NY: {
    auto: { years: 3, discoveryRule: false },
    premises: { years: 3, discoveryRule: false },
    slip_and_fall: { years: 3, discoveryRule: false },
    dog_bite: { years: 3, discoveryRule: false },
    medmal: { years: 2.5, discoveryRule: true, minorTolling: true },
    product: { years: 3, discoveryRule: false },
    nursing_home_abuse: { years: 3, discoveryRule: false },
    wrongful_death: { years: 2, discoveryRule: false },
    high_severity_surgery: { years: 3, discoveryRule: false },
    workers: { years: 2, discoveryRule: false }
  },
  TX: {
    auto: { years: 2, discoveryRule: false },
    premises: { years: 2, discoveryRule: false },
    slip_and_fall: { years: 2, discoveryRule: false },
    dog_bite: { years: 2, discoveryRule: false },
    medmal: { years: 2, discoveryRule: true, minorTolling: true },
    product: { years: 2, discoveryRule: false },
    nursing_home_abuse: { years: 2, discoveryRule: false },
    wrongful_death: { years: 2, discoveryRule: false },
    high_severity_surgery: { years: 2, discoveryRule: false },
    workers: { years: 1, discoveryRule: false }
  },
  FL: {
    auto: { years: 4, discoveryRule: false },
    premises: { years: 4, discoveryRule: false },
    slip_and_fall: { years: 4, discoveryRule: false },
    dog_bite: { years: 4, discoveryRule: false },
    medmal: { years: 2, discoveryRule: true, minorTolling: true },
    product: { years: 4, discoveryRule: false },
    nursing_home_abuse: { years: 4, discoveryRule: false },
    wrongful_death: { years: 2, discoveryRule: false },
    high_severity_surgery: { years: 4, discoveryRule: false },
    workers: { years: 1, discoveryRule: false }
  }
}

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
