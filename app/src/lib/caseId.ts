// Human-meaningful case reference, e.g. "CCIQ-2606-MVA-7F3A".
//
// Format: CCIQ-<YYMM>-<TYPE>-<XXXX>
//   CCIQ  brand prefix
//   YYMM  intake year + month (omitted when no date is available)
//   TYPE  3-letter claim-type code (see CLAIM_TYPE_CODES, defaults to "PI")
//   XXXX  stable 4-char suffix derived from the underlying record id
//
// This is a display-only label derived from existing fields. The underlying
// database id remains the source of truth for routing, links, and lookups.

const CLAIM_TYPE_CODES: Record<string, string> = {
  auto: 'MVA',
  motor_vehicle: 'MVA',
  motor_vehicle_accident: 'MVA',
  mva: 'MVA',
  car_accident: 'MVA',
  truck_accident: 'TRK',
  motorcycle: 'MTC',
  motorcycle_accident: 'MTC',
  pedestrian: 'PED',
  bicycle: 'BIK',
  slip_and_fall: 'SLF',
  premises: 'PRM',
  premises_liability: 'PRM',
  dog_bite: 'DOG',
  medmal: 'MED',
  medical_malpractice: 'MED',
  product: 'PRD',
  product_liability: 'PRD',
  nursing_home_abuse: 'NRS',
  nursing_home: 'NRS',
  wrongful_death: 'WDT',
  high_severity_surgery: 'SRG',
  workplace: 'WRK',
  workers_comp: 'WRK',
}

export function claimTypeCode(claimType?: string | null): string {
  if (!claimType) return 'PI'
  const key = String(claimType).trim().toLowerCase().replace(/[\s-]+/g, '_')
  return CLAIM_TYPE_CODES[key] || 'PI'
}

function yearMonthSegment(date?: string | number | Date | null): string | null {
  if (!date) return null
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return null
  const yy = String(d.getFullYear()).slice(-2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${yy}${mm}`
}

function suffixSegment(id?: string | null): string {
  const cleaned = String(id ?? '').replace(/[^a-zA-Z0-9]/g, '')
  return (cleaned.slice(-4) || '0000').toUpperCase()
}

export interface CaseIdInput {
  id?: string | null
  claimType?: string | null
  createdAt?: string | number | Date | null
}

export function formatCaseId(input: CaseIdInput): string {
  const segments = [
    'CCIQ',
    yearMonthSegment(input.createdAt),
    claimTypeCode(input.claimType),
    suffixSegment(input.id),
  ].filter(Boolean)
  return segments.join('-')
}

/** Convenience for lead-shaped objects ({ id, assessment: { claimType, createdAt } }). */
export function formatLeadCaseId(lead: any): string {
  const assessment = lead?.assessment || lead?.lead?.assessment || {}
  return formatCaseId({
    id: assessment.id || lead?.id,
    claimType: assessment.claimType ?? lead?.claimType,
    createdAt: assessment.createdAt ?? lead?.createdAt,
  })
}
