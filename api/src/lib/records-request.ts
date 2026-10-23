/**
 * Provider medical-records and billing requests, the checks that stand between
 * a draft and a send, and the separate letter of protection.
 *
 * A records request makes factual, legally meaningful statements: that the
 * firm represents the client and that the client signed an authorization
 * covering this provider. Each is printed only when something on the case backs
 * it (a retainer signed in ClearCaseIQ, or an attorney's recorded attestation
 * of an outside engagement; a signed, unexpired HIPAA authorization that names
 * this provider or leaves the custodian to counsel). `requestChecks` re-reads
 * the final, edited text and blocks a send that asserts what the case cannot
 * back, still carries a blank or template token, or comes from a test case.
 *
 * A letter of protection is not a paragraph in a records request: it promises
 * payment from the recovery and puts a lien on the case. It is its own letter,
 * sent only by an attorney who has reviewed its terms, confirmed the client
 * authorized it, and signed it.
 */
import { prisma } from './prisma'
import { BLANK, UPLOAD_LINK_TOKEN, type LetterContext } from './representation-letters'
import { findTestDocuments } from './medical-overview'

export const REQUEST_TYPES = ['records_and_billing', 'records', 'billing'] as const
export type RequestType = (typeof REQUEST_TYPES)[number]

export const RECORD_TYPES = {
  clinical_notes: 'Office visit and clinical notes',
  er_records: 'Emergency department records, including triage, physician and nursing notes',
  imaging_reports: 'Radiology and imaging reports',
  imaging_files: 'The imaging studies themselves in DICOM format (by secure link or on disc)',
  diagnostic_results: 'Diagnostic and laboratory results',
  therapy_notes: 'Therapy initial evaluation, daily and progress notes, and discharge summary',
  operative_reports: 'Operative and procedure reports',
  medication_records: 'Prescription and medication records',
  referrals: 'Referrals, orders and correspondence with other providers',
} as const
export type RecordType = keyof typeof RECORD_TYPES
export const RECORD_TYPE_KEYS = Object.keys(RECORD_TYPES) as RecordType[]

const BILLING_LINE =
  'An itemized billing statement (UB-04, CMS-1500 or equivalent) showing each date of service, CPT/HCPCS codes, charges, payments, adjustments and the outstanding balance'

/** HIPAA authorizations rendered by ClearCaseIQ expire two years after signature. */
const HIPAA_VALID_DAYS = 730

/** Record types that fit the kind of provider, from its name or specialty. */
export function defaultRecordTypes(providerName: string, specialty?: string | null): RecordType[] {
  const s = `${providerName} ${specialty || ''}`.toLowerCase()
  if (/imaging|radiolog|mri|x-?ray|\bct\b/.test(s)) return ['imaging_reports', 'imaging_files']
  if (/urgent care|emergency|\ber\b|hospital/.test(s)) return ['er_records', 'imaging_reports', 'diagnostic_results']
  if (/therapy|rehab|chiropract|\bpt\b/.test(s)) return ['therapy_notes']
  if (/\blab\b|laborator/.test(s)) return ['diagnostic_results']
  if (/surg|ortho/.test(s)) return ['clinical_notes', 'imaging_reports', 'operative_reports']
  return ['clinical_notes', 'diagnostic_results', 'imaging_reports']
}

export function sameProvider(a: string | null | undefined, b: string | null | undefined): boolean {
  const norm = (s: string | null | undefined) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const x = norm(a)
  const y = norm(b)
  return Boolean(x && y) && (x === y || x.includes(y) || y.includes(x))
}

// ---- Representation -------------------------------------------------------------

export interface RepresentationStatus {
  verified: boolean
  basis: 'signed_retainer' | 'attested' | null
  signedAt: string | null
  attestation: { id: string; attorneyName: string; engagementDate: string; attestedByEmail: string | null; createdAt: string } | null
}

export async function getRepresentationStatus(leadId: string): Promise<RepresentationStatus> {
  const [retainer, attestation] = await Promise.all([
    prisma.documentEnvelope.findFirst({
      where: { leadId, documentType: { in: ['retainer', 'fee_agreement'] }, status: 'signed' },
      orderBy: { signedAt: 'desc' },
      select: { signedAt: true },
    }),
    (prisma as any).representationAttestation.findFirst({
      where: { leadId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    }),
  ])
  const att = attestation
    ? {
        id: attestation.id,
        attorneyName: attestation.attorneyName,
        engagementDate: new Date(attestation.engagementDate).toISOString(),
        attestedByEmail: attestation.attestedByEmail ?? null,
        createdAt: new Date(attestation.createdAt).toISOString(),
      }
    : null
  if (retainer) {
    return { verified: true, basis: 'signed_retainer', signedAt: retainer.signedAt?.toISOString() ?? null, attestation: att }
  }
  if (att) return { verified: true, basis: 'attested', signedAt: null, attestation: att }
  return { verified: false, basis: null, signedAt: null, attestation: null }
}

// ---- HIPAA authorization ------------------------------------------------------

export interface HipaaCoverage {
  status: 'ok' | 'missing' | 'expired' | 'other_provider'
  envelopeId: string | null
  signedFilePath: string | null
  signedAt: string | null
  expiresAt: string | null
  custodian: string | null
  dateRange: string | null
  /** The patient's date of birth as entered on the authorization, when it was. */
  dob: string | null
}

function parseFieldValues(raw: string | null | undefined): Record<string, any> {
  if (!raw) return {}
  try {
    const v = JSON.parse(raw)
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}

function pick(values: Record<string, any>, keys: string[]): string | null {
  for (const k of keys) {
    const v = values[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

/** A custodian line that names no one provider ("As directed by counsel") covers every provider. */
function custodianCovers(custodian: string | null, providerName: string): boolean {
  if (!custodian) return true
  if (/directed by counsel|all (treating )?providers|any (treating )?provider|all medical providers/i.test(custodian)) return true
  return custodian
    .split(/[;,\n]| and /i)
    .some((part) => sameProvider(part, providerName))
}

/** The newest signed, unexpired authorization that covers this provider, or why there is none. */
export async function getHipaaCoverage(leadId: string, providerName: string, now = new Date()): Promise<HipaaCoverage> {
  const envelopes = await prisma.documentEnvelope.findMany({
    where: { leadId, documentType: 'hipaa_authorization', status: 'signed' },
    orderBy: [{ signedAt: 'desc' }, { updatedAt: 'desc' }],
    select: { id: true, signedAt: true, signedFilePath: true, fieldValues: true },
  })
  const empty: HipaaCoverage = {
    status: 'missing',
    envelopeId: null,
    signedFilePath: null,
    signedAt: null,
    expiresAt: null,
    custodian: null,
    dateRange: null,
    dob: null,
  }
  if (!envelopes.length) return empty

  let fallback: HipaaCoverage | null = null
  for (const env of envelopes) {
    const values = parseFieldValues(env.fieldValues)
    const custodian = pick(values, ['recordsCustodian', 'records_custodian', 'provider_name', 'provider'])
    const signedAt = env.signedAt ?? null
    const expiresAt = signedAt ? new Date(signedAt.getTime() + HIPAA_VALID_DAYS * 86_400_000) : null
    const view: HipaaCoverage = {
      status: 'ok',
      envelopeId: env.id,
      signedFilePath: env.signedFilePath,
      signedAt: signedAt?.toISOString() ?? null,
      expiresAt: expiresAt?.toISOString() ?? null,
      custodian,
      dateRange: pick(values, ['recordsDateRange', 'records_date_range']),
      dob: pick(values, ['patient_dob', 'clientDob', 'client_dob', 'dob']),
    }
    const covers = custodianCovers(custodian, providerName)
    const expired = Boolean(expiresAt && expiresAt < now)
    if (covers && !expired) return view
    if (!fallback) fallback = { ...view, status: expired ? 'expired' : 'other_provider' }
  }
  return fallback ?? empty
}

// ---- Patient identifiers ----------------------------------------------------------

export async function patientDob(assessmentId: string, hipaa: HipaaCoverage): Promise<{ dob: string | null; source: 'case' | 'authorization' | null }> {
  const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId }, select: { facts: true } })
  let facts: any = {}
  const raw0: unknown = assessment?.facts
  try {
    facts = typeof raw0 === 'string' ? JSON.parse(raw0) || {} : raw0 || {}
  } catch {
    facts = {}
  }
  const pc = facts?.plaintiffContext || {}
  const raw = pc.dateOfBirth || pc.birthDate || pc.dob
  if (raw) {
    const d = new Date(String(raw))
    const dob = Number.isNaN(d.getTime())
      ? String(raw)
      : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
    return { dob, source: 'case' }
  }
  if (hipaa.dob) return { dob: hipaa.dob, source: 'authorization' }
  return { dob: null, source: null }
}

export async function isTestCase(assessmentId: string) {
  const docs = await findTestDocuments(assessmentId)
  return { isTest: docs.length > 0, documents: docs }
}

// ---- The request letter ----------------------------------------------------------

export interface ProviderRequestOptions {
  providerName: string
  fax?: string | null
  address?: string | null
  requestType: RequestType
  recordTypes: RecordType[]
  /** YYYY-MM-DD; `to` null means "to the present". */
  from: string | null
  to: string | null
  representationVerified: boolean
  hipaaSignedAt: string | null
  dob: string | null
}

const REQUEST_TITLE: Record<RequestType, string> = {
  records_and_billing: 'Medical Records and Itemized Billing',
  records: 'Medical Records',
  billing: 'Itemized Billing',
}

function longDay(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
}

export function requestSubject(clientName: string, requestType: RequestType): string {
  return `Request for ${REQUEST_TITLE[requestType]} — ${clientName || 'our client'}`
}

export function providerRequestBody(ctx: LetterContext, o: ProviderRequestOptions): string {
  const or = (v: string | null | undefined) => (v && v.trim() ? v.trim() : BLANK)
  const range = `${longDay(o.from) || or(ctx.dateOfLoss)} through ${o.to ? longDay(o.to) : 'the present'}`
  const wantsRecords = o.requestType !== 'billing'
  const wantsBilling = o.requestType !== 'records'
  const dept = wantsRecords && wantsBilling ? 'Custodian of Records and Billing Department' : wantsRecords ? 'Custodian of Records' : 'Billing Department'

  const lines: string[] = [ctx.today, '', o.providerName, `Attn: ${dept}`]
  if (o.address) lines.push(o.address)
  if (o.fax) lines.push(`Via fax: ${o.fax}`)
  lines.push(
    '',
    `RE: Request for ${REQUEST_TITLE[o.requestType]}`,
    `Patient: ${or(ctx.clientName)}`,
    ...(o.dob ? [`Date of birth: ${o.dob}`] : []),
    `Date of injury: ${or(ctx.dateOfLoss)}`,
    `Dates of service requested: ${range}`,
    '',
    `Dear ${dept}:`,
    '',
  )
  if (o.representationVerified) {
    lines.push(
      `${or(ctx.firmName)} represents ${or(ctx.clientName)} in connection with injuries sustained on ${or(ctx.dateOfLoss)}.`,
      '',
    )
  }
  const authRef = o.hipaaSignedAt
    ? `the enclosed HIPAA-compliant authorization signed by the patient on ${longDay(o.hipaaSignedAt)}`
    : 'the enclosed HIPAA-compliant authorization signed by the patient'
  lines.push(`Pursuant to ${authRef}, please provide the following for dates of service from ${range}:`, '')
  if (wantsRecords) for (const t of o.recordTypes) lines.push(`- ${RECORD_TYPES[t]}`)
  if (wantsBilling) lines.push(`- ${BILLING_LINE}`)
  lines.push(
    '',
    'Please upload the records through our secure link, where the signed authorization can also be viewed:',
    UPLOAD_LINK_TOKEN,
    '',
    `If you cannot use the link, please send them to ${or(ctx.attorneyEmail)}${ctx.firmPhone ? ` or call ${ctx.firmPhone}` : ''}. If any part of this request cannot be produced, please tell us what is withheld and why, and let us know of any copying charge before processing.`,
    '',
    'We would appreciate a response within 30 days. Thank you for your help.',
    '',
    'Sincerely,',
    '',
    or(ctx.attorneyName),
    'Attorney at Law',
    or(ctx.firmName),
    '',
    `Enclosure: HIPAA authorization${o.hipaaSignedAt ? ` signed ${longDay(o.hipaaSignedAt)}` : ''}`,
  )
  return lines.join('\n')
}

// ---- Letter of protection --------------------------------------------------------

export interface LopOptions {
  providerName: string
  fax?: string | null
  address?: string | null
  from: string | null
  to: string | null
  reductionTerms?: string | null
}

export function letterOfProtectionBody(ctx: LetterContext, o: LopOptions): string {
  const or = (v: string | null | undefined) => (v && v.trim() ? v.trim() : BLANK)
  const range = `${longDay(o.from) || or(ctx.dateOfLoss)}${o.to ? ` through ${longDay(o.to)}` : ' onward'}`
  const lines = [
    ctx.today,
    '',
    o.providerName,
    'Attn: Billing Department',
    ...(o.address ? [o.address] : []),
    ...(o.fax ? [`Via fax: ${o.fax}`] : []),
    '',
    'RE: LETTER OF PROTECTION',
    `Patient: ${or(ctx.clientName)}`,
    `Date of injury: ${or(ctx.dateOfLoss)}`,
    '',
    'Dear Billing Department:',
    '',
    `${or(ctx.firmName)} represents ${or(ctx.clientName)} for injuries sustained on ${or(ctx.dateOfLoss)}. Our client has authorized this letter of protection.`,
    '',
    `In consideration of your agreement to defer collection while the claim is pending, ${or(ctx.firmName)} agrees to pay your reasonable and necessary charges for treatment of injuries related to this incident, for dates of service from ${range}, from any settlement, judgment or award recovered in this matter, before disbursing the remaining proceeds to our client.`,
    '',
    'Terms:',
    '- Payment is made only from recovery proceeds. This is not a personal guarantee by the firm or any attorney.',
    '- If there is no recovery, or the recovery is insufficient, the patient remains responsible under their agreement with you.',
    '- Charges are payable as shown on your itemized bills for the dates of service above.',
    ...(o.reductionTerms && o.reductionTerms.trim() ? [`- ${o.reductionTerms.trim()}`] : []),
    '- Please withhold collection activity and credit reporting on this account while the claim is pending, and send itemized bills to our office.',
    '',
    'Sincerely,',
    '',
  ]
  return lines.join('\n')
}

/** The signed close of a letter of protection, added at send time from the attorney's typed signature. */
export function lopSignatureBlock(ctx: LetterContext, signedBy: string, when: Date): string {
  const date = when.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  return [`/s/ ${signedBy}`, `${signedBy}, Attorney at Law`, ctx.firmName, `Signed electronically ${date}`].join('\n')
}

// ---- Pre-send checks --------------------------------------------------------------

export type CheckStatus = 'ok' | 'warn' | 'block'
export interface RequestCheck {
  key: string
  label: string
  status: CheckStatus
  detail: string
}

const REPRESENTATION_CLAIM = /\b(represents?|representing|represented by|our client)\b/i
const STRAY_TOKEN = /\{\{\s*(?!records_upload_link\s*\}\})[a-z0-9_.]+\s*\}\}/i

export interface CheckInput {
  kind: 'provider_request' | 'provider_lop' | 'carrier_lor'
  body: string
  delivery: 'email' | 'download'
  recipientEmail?: string | null
  fax?: string | null
  address?: string | null
  attorneyName: string
  representation: RepresentationStatus
  hipaa?: HipaaCoverage | null
  dob?: string | null
  isTest: boolean
  requestType?: RequestType
  recordTypes?: RecordType[]
  from?: string | null
  to?: string | null
}

export function requestChecks(i: CheckInput): RequestCheck[] {
  const checks: RequestCheck[] = []
  const add = (key: string, label: string, status: CheckStatus, detail: string) => checks.push({ key, label, status, detail })

  if (i.isTest) {
    add('test_case', 'Not a test case', 'block', 'This case contains synthetic or test documents. Only a watermarked test copy can be produced; nothing can be sent.')
  }

  const asserts = REPRESENTATION_CLAIM.test(i.body)
  if (i.representation.verified) {
    add(
      'representation',
      'Representation verified',
      'ok',
      i.representation.basis === 'signed_retainer'
        ? 'Signed retainer on file in ClearCaseIQ.'
        : `Engagement attested by ${i.representation.attestation?.attorneyName || 'an attorney'}.`,
    )
  } else if (i.kind !== 'provider_request' || asserts) {
    add(
      'representation',
      'Representation verified',
      'block',
      'The letter says the firm represents the client, but no signed retainer or attorney attestation is on file. Attest the engagement or remove that statement.',
    )
  } else {
    add('representation', 'Representation verified', 'warn', 'Not verified, so the letter does not state that the firm represents the client.')
  }

  if (i.kind === 'provider_request') {
    const h = i.hipaa
    if (!h || h.status === 'missing') {
      add('hipaa', 'Signed HIPAA authorization', 'block', 'The client has not signed a HIPAA authorization. Send it from the Signatures tab.')
    } else if (h.status === 'expired') {
      add('hipaa', 'Signed HIPAA authorization', 'block', 'The signed authorization has expired. Have the client sign a new one.')
    } else if (h.status === 'other_provider') {
      add('hipaa', 'Signed HIPAA authorization', 'block', `The signed authorization names ${h.custodian}, not this provider. Have the client sign one covering this provider.`)
    } else {
      add(
        'hipaa',
        'Signed HIPAA authorization',
        'ok',
        `Signed ${h.signedAt ? new Date(h.signedAt).toLocaleDateString('en-US') : ''}${h.expiresAt ? `, valid until ${new Date(h.expiresAt).toLocaleDateString('en-US')}` : ''}${h.custodian ? `, custodian: ${h.custodian}` : ''}.`,
      )
    }
    if (h?.status === 'ok') {
      add(
        'attachment',
        'Authorization attached',
        h.signedFilePath ? 'ok' : 'warn',
        h.signedFilePath
          ? 'The signed authorization PDF goes with the letter.'
          : 'The signed PDF is not stored; the provider can view the authorization through the secure link.',
      )
    }
    add(
      'patient_identifier',
      'Patient identified',
      i.dob ? 'ok' : 'warn',
      i.dob ? 'Name, date of birth and date of injury.' : 'No date of birth on file. The provider will have to match on name and date of injury.',
    )
    const scopeOk =
      (i.requestType === 'billing' || (i.recordTypes?.length ?? 0) > 0) &&
      (!i.from || !i.to || i.from <= i.to)
    add(
      'scope',
      'Request scope',
      scopeOk ? 'ok' : 'block',
      scopeOk ? 'Record types and dates of service are set.' : 'Choose at least one record type and a valid date range.',
    )
    add(
      'upload_link',
      'Secure upload link',
      i.body.includes(UPLOAD_LINK_TOKEN) ? 'ok' : 'warn',
      i.body.includes(UPLOAD_LINK_TOKEN)
        ? 'Replaced with the provider’s secure link when sent.'
        : 'The letter has no {{records_upload_link}}, so the provider gets no upload link.',
    )
  }

  const blanks = (i.body.match(/_{4,}/g) || []).length
  const stray = STRAY_TOKEN.exec(i.body)
  add(
    'placeholders',
    'No blanks or template tokens',
    blanks || stray ? 'block' : 'ok',
    blanks
      ? `${blanks} blank${blanks === 1 ? '' : 's'} (__________) still to fill in or remove.`
      : stray
        ? `Unfilled template token ${stray[0]}.`
        : 'Every field is filled in.',
  )

  if (i.delivery === 'email') {
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(i.recipientEmail || '').trim())
    add('delivery', 'Delivery address', ok ? 'ok' : 'block', ok ? `Email to ${i.recipientEmail}.` : 'Enter a valid email address.')
  } else {
    const where = [i.fax ? `fax ${i.fax}` : null, i.address ? 'mailing address' : null].filter(Boolean).join(' and ')
    add('delivery', 'Delivery address', where ? 'ok' : 'warn', where ? `On file: ${where}.` : 'No fax number or mailing address on file for this recipient.')
  }

  const signer = i.attorneyName.trim()
  add(
    'signature',
    'Signing attorney',
    !signer ? 'block' : i.kind === 'provider_lop' || i.body.includes(signer) ? 'ok' : 'warn',
    !signer
      ? 'No attorney is assigned to sign this letter.'
      : i.kind === 'provider_lop' || i.body.includes(signer)
        ? `Signed by ${signer}.`
        : `The letter does not name ${signer} as the signer.`,
  )
  return checks
}

export function blockingChecks(checks: RequestCheck[]) {
  return checks.filter((c) => c.status === 'block' && c.key !== 'test_case')
}
export function warningChecks(checks: RequestCheck[]) {
  return checks.filter((c) => c.status === 'warn')
}

/** Default dates of service: the known visits with this provider, else the date of injury to the present. */
export async function defaultServiceRange(assessmentId: string, providerName: string, incidentDate: string | null) {
  const entries = await prisma.medicalTreatmentEntry.findMany({
    where: { assessmentId, isFuture: false },
    select: { provider: true, startDate: true, endDate: true },
  })
  const dates = entries
    .filter((e) => sameProvider(e.provider, providerName))
    .flatMap((e) => [e.startDate, e.endDate])
    .filter((d): d is Date => Boolean(d))
    .map((d) => d.toISOString().slice(0, 10))
    .sort()
  const injury = incidentDate && !Number.isNaN(new Date(incidentDate).getTime()) ? new Date(incidentDate).toISOString().slice(0, 10) : null
  return { from: dates[0] || injury, to: null as string | null }
}
