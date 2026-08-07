/**
 * Client-side California SOL helper for the public deadline tool.
 *
 * Filing periods mirror `api/src/lib/solRules.ts` for common CA claim types.
 * Government-claim presentation (≈6 months) is an educational overlay — the
 * backend SOL calculator does not yet model public-entity notice clocks.
 */

export type CaSolClaimType =
  | 'auto'
  | 'slip_and_fall'
  | 'dog_bite'
  | 'product'
  | 'medmal'
  | 'wrongful_death'
  | 'workers'

export const CA_SOL_CLAIM_OPTIONS: {
  value: CaSolClaimType
  label: string
  years: number
  note?: string
}[] = [
  { value: 'auto', label: 'Car / auto accident', years: 2 },
  { value: 'slip_and_fall', label: 'Slip and fall / premises', years: 2 },
  { value: 'dog_bite', label: 'Dog bite', years: 2 },
  { value: 'product', label: 'Product liability', years: 2 },
  {
    value: 'medmal',
    label: 'Medical malpractice',
    years: 1,
    note: 'Often one year from discovery or three years from injury, whichever comes first — exceptions apply.',
  },
  {
    value: 'wrongful_death',
    label: 'Wrongful death',
    years: 2,
    note: 'Often measured from the date of death, not the injury date.',
  },
  {
    value: 'workers',
    label: 'Workers’ compensation (admin track)',
    years: 1,
    note: 'Comp claims have separate, often earlier employer-notice rules.',
  },
]

/** Educational default for CA public-entity claim presentation. */
export const CA_GOVERNMENT_CLAIM_MONTHS = 6

export type PublicSolResult = {
  claimType: CaSolClaimType
  claimLabel: string
  incidentDate: string
  filingDeadline: Date
  daysRemaining: number
  years: number
  status: 'ok' | 'warning' | 'critical' | 'expired'
  ruleNote?: string
  governmentDeadline: Date | null
  governmentDaysRemaining: number | null
  governmentStatus: 'ok' | 'warning' | 'critical' | 'expired' | null
}

function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function addYears(date: Date, years: number): Date {
  const next = new Date(date)
  next.setFullYear(next.getFullYear() + years)
  return next
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

function daysUntil(deadline: Date): number {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(deadline)
  end.setHours(0, 0, 0, 0)
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

function statusFromDays(days: number): PublicSolResult['status'] {
  if (days < 0) return 'expired'
  if (days <= 90) return 'critical'
  if (days <= 365) return 'warning'
  return 'ok'
}

export function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function computeCaliforniaSol(input: {
  incidentDate: string
  claimType: CaSolClaimType
  againstGovernment: boolean
}): PublicSolResult | { error: string } {
  const incident = parseDateOnly(input.incidentDate)
  if (!incident) return { error: 'Enter a valid incident date.' }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (incident > today) return { error: 'Incident date cannot be in the future.' }

  const option = CA_SOL_CLAIM_OPTIONS.find((row) => row.value === input.claimType)
  if (!option) return { error: 'Choose a claim type.' }

  const filingDeadline = addYears(incident, option.years)
  const daysRemaining = daysUntil(filingDeadline)

  let governmentDeadline: Date | null = null
  let governmentDaysRemaining: number | null = null
  let governmentStatus: PublicSolResult['governmentStatus'] = null

  if (input.againstGovernment) {
    governmentDeadline = addMonths(incident, CA_GOVERNMENT_CLAIM_MONTHS)
    governmentDaysRemaining = daysUntil(governmentDeadline)
    governmentStatus = statusFromDays(governmentDaysRemaining)
  }

  return {
    claimType: input.claimType,
    claimLabel: option.label,
    incidentDate: input.incidentDate,
    filingDeadline,
    daysRemaining,
    years: option.years,
    status: statusFromDays(daysRemaining),
    ruleNote: option.note,
    governmentDeadline,
    governmentDaysRemaining,
    governmentStatus,
  }
}

export function statusLabel(status: PublicSolResult['status'] | NonNullable<PublicSolResult['governmentStatus']>): string {
  switch (status) {
    case 'expired':
      return 'May be past the general deadline'
    case 'critical':
      return 'Urgent — under 90 days'
    case 'warning':
      return 'Approaching — under one year'
    default:
      return 'Within a typical window'
  }
}
