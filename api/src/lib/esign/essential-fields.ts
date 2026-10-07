/**
 * The essential fields of a retainer agreement and a HIPAA authorization: the
 * case-specific values a firm's own template needs filled in before it goes out
 * for signature. Everything else in the firm's template (the legal clauses) is
 * kept as the firm wrote it.
 *
 * Field keys double as merge tokens ({{client_name}}) in Word and text
 * templates, and as the names matched against fillable PDF form fields.
 */
import { prisma } from '../prisma'
import { parseCaseFacts } from '../case-facts'
import { readClaimantContact } from '../claimant-contact'
import { listCaseProviders } from '../representation-letters'
import { fullName } from './firm-template-doc'

export type EssentialDocType = 'retainer' | 'hipaa_authorization'

export type EssentialField = {
  key: string
  label: string
  group: string
  multiline?: boolean
  /** Other names a firm's PDF form field or token may use for this value. */
  aliases?: string[]
}

export type EssentialValues = Record<string, string>

export const FIRM_SETTING_DEFAULT_CONTINGENCY = 'defaultContingencyPercent'
export const PLATFORM_DEFAULT_CONTINGENCY = 33.33

const FIRM_FIELDS: EssentialField[] = [
  { key: 'firm_name', label: 'Firm name', group: 'Firm', aliases: ['law_firm', 'firm'] },
  { key: 'firm_address', label: 'Firm address', group: 'Firm' },
  { key: 'firm_phone', label: 'Firm phone', group: 'Firm' },
  { key: 'firm_email', label: 'Firm email', group: 'Firm' },
]

export const RETAINER_FIELDS: EssentialField[] = [
  ...FIRM_FIELDS,
  { key: 'attorney_name', label: 'Attorney name', group: 'Attorney', aliases: ['attorney', 'responsible_attorney'] },
  { key: 'attorney_bar_number', label: 'Bar number', group: 'Attorney', aliases: ['bar_number', 'bar_no'] },
  { key: 'client_name', label: 'Client name', group: 'Client', aliases: ['client', 'name'] },
  { key: 'client_address', label: 'Client address', group: 'Client' },
  { key: 'client_phone', label: 'Client phone', group: 'Client' },
  { key: 'client_email', label: 'Client email', group: 'Client' },
  { key: 'incident_date', label: 'Incident date', group: 'Case', aliases: ['date_of_incident', 'date_of_loss', 'accident_date'] },
  { key: 'case_description', label: 'Case description', group: 'Case', multiline: true, aliases: ['matter_description', 'scope'] },
  { key: 'fee_percentage', label: 'Fee percentage', group: 'Fees', aliases: ['contingency_percent', 'contingency_fee', 'fee_percent'] },
  { key: 'fee_amount', label: 'Flat fee amount (if any)', group: 'Fees', aliases: ['flat_fee'] },
  { key: 'costs_terms', label: 'Costs', group: 'Fees', multiline: true, aliases: ['costs', 'costs_responsibility'] },
  { key: 'payment_terms', label: 'Payment terms', group: 'Fees', multiline: true },
  { key: 'agreement_date', label: 'Agreement date', group: 'Signatures', aliases: ['date'] },
]

export const HIPAA_FIELDS: EssentialField[] = [
  ...FIRM_FIELDS.filter((f) => f.key !== 'firm_email'),
  { key: 'patient_name', label: 'Patient name', group: 'Patient', aliases: ['client_name', 'name'] },
  { key: 'patient_dob', label: 'Date of birth', group: 'Patient', aliases: ['client_dob', 'dob', 'date_of_birth'] },
  { key: 'provider_name', label: 'Provider name', group: 'Provider', aliases: ['records_custodian', 'provider'] },
  { key: 'provider_address', label: 'Provider address', group: 'Provider' },
  { key: 'records_requested', label: 'Records requested', group: 'Records', multiline: true },
  { key: 'records_date_range', label: 'Date range', group: 'Records', aliases: ['date_range'] },
  { key: 'purpose', label: 'Purpose', group: 'Authorization', multiline: true },
  { key: 'expiration', label: 'Expiration', group: 'Authorization', aliases: ['expiration_date'] },
  { key: 'revocation_contact', label: 'Revocation contact', group: 'Authorization', multiline: true },
  { key: 'signature_date', label: 'Signature date', group: 'Signature', aliases: ['date'] },
]

export function essentialFieldsFor(docType: EssentialDocType): EssentialField[] {
  return docType === 'hipaa_authorization' ? HIPAA_FIELDS : RETAINER_FIELDS
}

export function isEssentialDocType(value: unknown): value is EssentialDocType {
  return value === 'retainer' || value === 'hipaa_authorization'
}

/** Normalized form of a field / token name, so "Client Name" matches client_name. */
export function normalizeFieldName(name: string): string {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/** Every name (key + aliases, normalized) → value, for token and PDF-field matching. */
export function valueLookup(docType: EssentialDocType, values: EssentialValues): Map<string, string> {
  const map = new Map<string, string>()
  for (const field of essentialFieldsFor(docType)) {
    const value = String(values[field.key] ?? '').trim()
    for (const name of [field.key, ...(field.aliases || [])]) {
      const k = normalizeFieldName(name)
      if (!map.has(k)) map.set(k, value)
    }
  }
  return map
}

/** Keep only known keys, as trimmed strings. */
export function sanitizeEssentialValues(docType: EssentialDocType, raw: unknown): EssentialValues {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const out: EssentialValues = {}
  for (const field of essentialFieldsFor(docType)) {
    const v = src[field.key]
    out[field.key] = typeof v === 'string' ? v.trim().slice(0, 4000) : v == null ? '' : String(v).slice(0, 4000)
  }
  return out
}

export async function readFirmDefaultContingency(lawFirmId: string | null | undefined): Promise<number | null> {
  if (!lawFirmId) return null
  const row = await (prisma as any).firmSetting
    .findUnique({ where: { lawFirmId_key: { lawFirmId, key: FIRM_SETTING_DEFAULT_CONTINGENCY } } })
    .catch(() => null)
  const n = Number(row?.value ? JSON.parse(row.value) : NaN)
  return Number.isFinite(n) && n > 0 && n <= 100 ? n : null
}

/** Firm default, else the platform env default, else 33.33%. */
export async function resolveDefaultContingency(lawFirmId: string | null | undefined): Promise<number> {
  const firm = await readFirmDefaultContingency(lawFirmId).catch(() => null)
  if (firm) return firm
  const env = Number(process.env.DEFAULT_CONTINGENCY_PERCENT)
  return Number.isFinite(env) && env > 0 ? env : PLATFORM_DEFAULT_CONTINGENCY
}

const longDate = (d: Date) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

function formatDateish(value: unknown): string {
  if (!value) return ''
  const s = String(value).trim()
  const parsed = /^\d{4}-\d{2}-\d{2}/.test(s) ? new Date(`${s.slice(0, 10)}T12:00:00`) : null
  return parsed && !Number.isNaN(parsed.getTime()) ? longDate(parsed) : s
}

function joinAddress(parts: Array<string | null | undefined>): string {
  return parts.map((p) => String(p || '').trim()).filter(Boolean).join(', ')
}

function treatmentDateRange(facts: any): string {
  const dates: number[] = []
  for (const t of Array.isArray(facts?.treatment) ? facts.treatment : []) {
    for (const k of ['startDate', 'endDate', 'date', 'visitDate', 'treatmentDate']) {
      const ms = Date.parse(String(t?.[k] || ''))
      if (Number.isFinite(ms)) dates.push(ms)
    }
  }
  if (!dates.length) return ''
  const from = longDate(new Date(Math.min(...dates)))
  return `${from} to present`
}

/**
 * Case values for the essential fields, from intake, the firm and the acting
 * attorney. The attorney reviews and edits these before sending.
 */
export async function buildEssentialPrefill(params: {
  leadId: string
  attorneyId: string
  docType: EssentialDocType
}): Promise<EssentialValues> {
  const [lead, actingAttorney] = await Promise.all([
    prisma.leadSubmission.findUnique({
      where: { id: params.leadId },
      select: {
        assessmentId: true,
        assignedAttorneyId: true,
        assessment: { select: { claimType: true, venueState: true, venueCounty: true, facts: true } },
      },
    }),
    prisma.attorney.findUnique({
      where: { id: params.attorneyId },
      select: {
        name: true,
        email: true,
        phone: true,
        barNumber: true,
        barState: true,
        lawFirm: {
          select: { id: true, name: true, address: true, city: true, state: true, zip: true, phone: true, primaryEmail: true },
        },
      },
    }),
  ])
  // A case accepted by a colleague is that colleague's matter: name them.
  const attorney =
    lead?.assignedAttorneyId && lead.assignedAttorneyId !== params.attorneyId
      ? (await prisma.attorney.findUnique({
          where: { id: lead.assignedAttorneyId },
          select: {
            name: true,
            email: true,
            phone: true,
            barNumber: true,
            barState: true,
            lawFirm: {
              select: { id: true, name: true, address: true, city: true, state: true, zip: true, phone: true, primaryEmail: true },
            },
          },
        })) || actingAttorney
      : actingAttorney

  const firm = attorney?.lawFirm || actingAttorney?.lawFirm || null
  const firmName = firm?.name || ''
  const firmAddress = joinAddress([firm?.address, firm?.city, [firm?.state, firm?.zip].filter(Boolean).join(' ')])
  const firmPhone = firm?.phone || attorney?.phone || ''
  const firmEmail = firm?.primaryEmail || attorney?.email || ''
  const bar = attorney?.barNumber ? [attorney.barState, attorney.barNumber].filter(Boolean).join(' ') : ''

  const assessmentId = lead?.assessmentId || ''
  const contact = assessmentId ? await readClaimantContact(assessmentId).catch(() => null) : null
  const facts: any = parseCaseFacts(lead?.assessment?.facts)
  const clientName = fullName(contact?.firstName, contact?.lastName)
  const clientAddress = joinAddress([
    contact?.addressLine1,
    contact?.addressLine2,
    contact?.city,
    [contact?.state, contact?.postalCode].filter(Boolean).join(' '),
  ])
  const pc = facts?.plaintiffContext || {}
  const dob = formatDateish(pc.dateOfBirth || pc.birthDate || pc.dob)
  const incidentDate = formatDateish(facts?.incident?.date)
  const claim = String(lead?.assessment?.claimType || '').replace(/_/g, ' ')
  const venue = joinAddress([lead?.assessment?.venueCounty, lead?.assessment?.venueState])
  const narrative = String(facts?.incident?.narrative || '').trim()
  const caseDescription =
    narrative.slice(0, 600) ||
    [claim ? `${claim.charAt(0).toUpperCase()}${claim.slice(1)} claim` : 'Personal injury claim', incidentDate && `arising from the incident on ${incidentDate}`, venue && `in ${venue}`]
      .filter(Boolean)
      .join(' ')
  const today = longDate(new Date())

  if (params.docType === 'retainer') {
    const pct = await resolveDefaultContingency(firm?.id)
    return {
      firm_name: firmName,
      firm_address: firmAddress,
      firm_phone: firmPhone,
      firm_email: firmEmail,
      attorney_name: attorney?.name || '',
      attorney_bar_number: bar,
      client_name: clientName,
      client_address: clientAddress,
      client_phone: contact?.phone || '',
      client_email: contact?.email || '',
      incident_date: incidentDate,
      case_description: caseDescription,
      fee_percentage: `${pct}%`,
      fee_amount: '',
      costs_terms: 'Case costs are advanced by the firm and reimbursed from the recovery.',
      payment_terms: 'The fee and costs are paid only from any recovery. If there is no recovery, the client owes no fee.',
      agreement_date: today,
    }
  }

  const providers = assessmentId ? await listCaseProviders(params.leadId, assessmentId).catch(() => []) : []
  return {
    firm_name: firmName,
    firm_address: firmAddress,
    firm_phone: firmPhone,
    patient_name: clientName,
    patient_dob: dob,
    provider_name: providers[0]?.name || '',
    provider_address: '',
    records_requested:
      'All medical records, itemized bills, imaging, test results and reports for treatment related to the incident.',
    records_date_range: treatmentDateRange(facts) || (incidentDate ? `${incidentDate} to present` : ''),
    purpose: `To evaluate and pursue my personal injury claim${incidentDate ? ` arising from the incident on ${incidentDate}` : ''}.`,
    expiration: 'Two years from the date signed, or when my claim is resolved, whichever is earlier.',
    revocation_contact: [firmName, firmAddress, firmEmail].filter(Boolean).join(', '),
    signature_date: today,
  }
}
