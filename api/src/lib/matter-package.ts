/**
 * A complete CMS matter as related tables, rather than one row per case.
 *
 * A Clio migration export is relational: `tables.Matters`, `tables.Contacts`,
 * `tables.Medical_Visits`, `tables.Medical_Bills` and so on, joined by matter,
 * contact and visit ids. The basic importer flattens a document into one row,
 * so a package like that arrived as a single "case" whose columns were whole
 * tables serialised into a cell — the client went unread and the notes table
 * became the case description.
 *
 * This module only reads. It finds the tables (a `tables` envelope, top-level
 * arrays, or the sheets of a workbook), joins each related record to its
 * matter, and validates required fields and references, so the attorney sees
 * exactly what would be created before anything is. The writer lives in
 * `matter-package-import.ts`.
 */
import crypto from 'crypto'
import { parseIncidentDate } from './imported-date'
import { normalizeClaimType, parseImportedMoney, splitDiagnoses } from './import-mapping'

export type MatterTableKind =
  | 'matters'
  | 'contacts'
  | 'matterContacts'
  | 'customFields'
  | 'accidents'
  | 'insurance'
  | 'medicalVisits'
  | 'medicalBills'
  | 'billingInvoices'
  | 'timeEntries'
  | 'liens'
  | 'expenses'
  | 'negotiations'
  | 'tasks'
  | 'notes'
  | 'timeline'
  | 'documents'

/** Normalised table names each kind answers to. */
const TABLE_ALIASES: Record<MatterTableKind, string[]> = {
  matters: ['matters', 'matter', 'cases', 'case', 'projects', 'project'],
  contacts: ['contacts', 'contact', 'clients', 'client', 'people', 'persons', 'parties', 'party', 'accounts', 'account', 'names', 'namecards'],
  matterContacts: [
    'mattercontacts', 'matterparties', 'relationships', 'matterrelationships', 'caseparties', 'roles',
    'projectcontacts', 'projectpeople', 'casenames', 'matterroles', 'matterparticipants',
  ],
  // Clio's backup/export puts PI facts such as Date of Loss in a separate
  // custom_fields.csv. They are folded back into their matter below.
  customFields: ['customfields', 'customfield', 'customfieldvalues', 'customfieldvalue', 'projectfields', 'casefields'],
  accidents: ['accidentdetails', 'accident', 'accidents', 'incidents', 'incident', 'incidentdetails', 'lossdetails', 'loss', 'caseloss'],
  insurance: ['insurance', 'insurancepolicies', 'policies', 'insuranceclaims', 'claims', 'coverage', 'insuranceinfo', 'insurancedetails'],
  medicalVisits: [
    'medicalvisits', 'visits', 'treatments', 'treatment', 'medicalrecords', 'medicaltreatment',
    'appointments', 'providers', 'medicalproviders',
  ],
  // A bare Clio bills.csv is the firm's legal billing, not treatment charges.
  // Importing it as medical specials would inflate the case valuation.
  medicalBills: ['medicalbills', 'medicalcharges', 'medicalexpenses'],
  billingInvoices: ['bills', 'billing', 'invoices', 'legalbills'],
  timeEntries: ['timeentries', 'timeentry'],
  liens: ['liens', 'lienholders'],
  expenses: ['expenses', 'expense', 'expenseentries', 'costs', 'caseexpenses', 'casecosts'],
  negotiations: ['negotiations', 'negotiationhistory', 'offers', 'demands', 'settlementnegotiations', 'offersanddemands'],
  tasks: ['tasks', 'task', 'projecttasks', 'casetasks', 'deadlines', 'todos', 'calendarentries', 'calendarevent', 'calendarevents'],
  notes: ['notes', 'note', 'casenotes', 'matternotes', 'projectnotes', 'contentnotes'],
  timeline: ['timeline', 'timelineevents', 'events', 'event', 'activities', 'activity', 'history', 'casehistory'],
  documents: [
    'documents', 'document', 'files', 'file', 'documentmetadata', 'attachments', 'attachment',
    'contentdocuments', 'contentdocument', 'contentversions', 'contentversion',
  ],
}

export const MATTER_TABLE_LABELS: Record<MatterTableKind, string> = {
  matters: 'Matters',
  contacts: 'Contacts',
  matterContacts: 'Matter contacts',
  customFields: 'Custom fields',
  accidents: 'Accident details',
  insurance: 'Insurance',
  medicalVisits: 'Medical visits',
  medicalBills: 'Medical bills',
  billingInvoices: 'Billing invoices',
  timeEntries: 'Time entries',
  liens: 'Liens',
  expenses: 'Expenses',
  negotiations: 'Negotiations',
  tasks: 'Tasks & deadlines',
  notes: 'Notes',
  timeline: 'Timeline events',
  documents: 'Documents',
}

type Row = Record<string, unknown>

export type MatterPackageTables = Partial<Record<MatterTableKind, Row[]>> & {
  /** Tables present in the file that we do not know how to import. */
  unrecognized?: string[]
}

function norm(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function sourceNameVariants(name: string): string[] {
  const withoutExtension = name.replace(/\.(?:csv|json|xlsx|xls|tsv|txt)$/i, '')
  const variants = new Set([withoutExtension])
  // Salesforce/Litify API names look like `litify_pm__Matter__c`. The middle
  // segment is the useful object/field name.
  const namespaced = withoutExtension.split('__')
  if (namespaced.length >= 3 && /^(c|r)$/i.test(namespaced[namespaced.length - 1])) {
    variants.add(namespaced[namespaced.length - 2])
  }
  variants.add(withoutExtension.replace(/^litify(?:_[a-z0-9]+)*__/i, '').replace(/__(?:c|r)$/i, ''))
  return [...variants].map(norm).filter(Boolean)
}

function kindForTableName(name: string): MatterTableKind | null {
  // Separate CSV exports arrive keyed by filename, while workbook sheets and
  // JSON packages use a bare table name.
  const keys = sourceNameVariants(name)
  for (const [kind, aliases] of Object.entries(TABLE_ALIASES) as Array<[MatterTableKind, string[]]>) {
    if (keys.some((key) => aliases.includes(key))) return kind
  }
  return null
}

function isRowArray(value: unknown): value is Row[] {
  return Array.isArray(value) && value.length > 0 && value.every((v) => v && typeof v === 'object' && !Array.isArray(v))
}

const IGNORED_DOCUMENTATION_TABLES = new Set(['starthere', 'fieldmapping', 'readme'])

/**
 * The named tables in a set of candidate arrays, or null when they do not look
 * like a relational package.
 *
 * A package needs a matters table plus at least one related table, or a
 * matters-less file with contacts and two other related tables. One array on
 * its own is a flat case list, which the basic importer already reads.
 */
function tablesFrom(candidates: Record<string, unknown>): MatterPackageTables | null {
  const tables: MatterPackageTables = {}
  const unrecognized: string[] = []
  for (const [name, value] of Object.entries(candidates)) {
    if (!Array.isArray(value)) continue
    const kind = kindForTableName(name)
    if (!kind) {
      if (sourceNameVariants(name).some((key) => IGNORED_DOCUMENTATION_TABLES.has(key))) continue
      if (isRowArray(value)) unrecognized.push(name)
      continue
    }
    if (value.length === 0) {
      tables[kind] = tables[kind] ?? []
      continue
    }
    if (!isRowArray(value)) continue
    tables[kind] = [...(tables[kind] ?? []), ...value]
  }
  const related = (Object.keys(tables) as MatterTableKind[]).filter((k) => k !== 'matters' && (tables[k]?.length ?? 0) > 0)
  const hasMatters = (tables.matters?.length ?? 0) > 0
  if (hasMatters ? related.length < 1 : !(tables.contacts?.length && related.length >= 3)) return null
  if (unrecognized.length) tables.unrecognized = unrecognized
  return tables
}

/**
 * Tables from a parsed JSON document, or null when it is a flat case export.
 *
 * Accepts `{ tables: {...} }`, the same under `data` / `export`, and the tables
 * sitting directly on the root. Top-level scalars such as `matter_id` are kept
 * as a one-row matters table when the file has none of its own, since a
 * single-matter export often names its matter only there.
 */
export function detectMatterPackage(value: unknown): MatterPackageTables | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const root = value as Row
  const envelopes = ['tables', 'data', 'export', 'matterPackage', 'package']
  for (const key of envelopes) {
    const nested = root[key]
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      const tables = tablesFrom(nested as Row) ?? tablesFromWithRootMatter(nested as Row, root)
      if (tables) return withRootMatter(tables, root)
    }
  }
  const tables = tablesFrom(root) ?? tablesFromWithRootMatter(root, root)
  return tables ? withRootMatter(tables, root) : null
}

function rootScalars(root: Row): Row {
  return Object.fromEntries(
    Object.entries(root).filter(([, v]) => v === null || ['string', 'number', 'boolean'].includes(typeof v)),
  )
}

/** A file with no matters table but a matter id on its root still has one matter. */
function tablesFromWithRootMatter(candidates: Row, root: Row): MatterPackageTables | null {
  const scalars = rootScalars(root)
  if (!pick(scalars, FIELDS.matterId)) return null
  return tablesFrom({ ...candidates, matters: [scalars] })
}

function withRootMatter(tables: MatterPackageTables, root: Row): MatterPackageTables {
  if ((tables.matters?.length ?? 0) > 0) {
    // Root-level fields fill gaps on a single matter, never override it.
    if (tables.matters!.length === 1) {
      const scalars = rootScalars(root)
      tables.matters = [{ ...scalars, ...tables.matters![0] }]
    }
    return tables
  }
  const scalars = rootScalars(root)
  if (Object.keys(scalars).length) tables.matters = [scalars]
  return tables
}

/** Tables from a workbook's sheets, keyed by sheet name. */
export function detectMatterPackageFromSheets(sheets: Record<string, Row[]>): MatterPackageTables | null {
  if (Object.keys(sheets).length < 2) return null
  return tablesFrom(sheets)
}

// ---------------------------------------------------------------------------
// Field access

/** Candidate column names, most specific first; compared normalised. */
const FIELDS = {
  matterId: [
    'matter_id', 'matterId', 'matter_number', 'display_number', 'matter_ref', 'matter',
    'project_id', 'projectId', 'projectId.native', 'projectIdNative', 'project_number',
    'case_id', 'case_number', 'case_num', 'file_number',
    'what_id', 'whatId', 'parent_id', 'parentId', 'subject_id', 'first_publish_location_id',
  ],
  recordId: ['id', 'record_id', 'uuid', 'external_id'],
  contactId: [
    'contact_id', 'contactId', 'client_id', 'person_id', 'personId', 'personId.native',
    'personIdNative', 'party_id', 'name_id', 'account_id', 'accountId', 'who_id', 'whoId',
  ],
  clientRef: [
    'client_id', 'clientId', 'clientId.native', 'clientIdNative', 'client', 'primary_client_id',
    'client_contact_id', 'primary_contact_id', 'plaintiff_id', 'person_id', 'account_id', 'accountId',
  ],
  visitId: ['visit_id', 'visitId', 'treatment_id', 'encounter_id', 'appointment_id'],
  firstName: ['first_name', 'firstName', 'given_name', 'first'],
  lastName: ['last_name', 'lastName', 'surname', 'family_name', 'last'],
  fullName: ['name', 'full_name', 'display_name', 'contact_name', 'client_name', 'project_or_client_name', 'project_name'],
  email: ['email', 'email_address', 'primary_email'],
  phone: ['phone', 'phone_number', 'mobile', 'cell', 'primary_phone', 'telephone'],
  fax: ['fax'],
  company: ['company', 'company_name', 'organization', 'firm', 'employer'],
  role: ['role', 'contact_role', 'relationship', 'party_type', 'contact_type', 'type', 'category'],
  street: ['street', 'address', 'address_line_1', 'address1', 'street_address', 'mailing_address'],
  city: ['city'],
  zip: ['zip', 'zip_code', 'postal_code', 'postcode'],
  state: ['venue_state', 'state', 'jurisdiction_state', 'accident_state', 'incident_state'],
  county: ['venue_county', 'county', 'jurisdiction_county', 'accident_county'],
  // Prefer the specific matter/project classification over a broad practice
  // area such as "Personal Injury".
  caseType: ['case_type', 'matter_type', 'claim_type', 'project_type', 'project_type_code', 'classification', 'practice_area', 'phase_name', 'type'],
  incidentDate: ['incident_date', 'date_of_loss', 'accident_date', 'dol', 'doi', 'date_of_incident', 'loss_date'],
  description: ['description', 'matter_description', 'narrative', 'facts', 'summary', 'accident_description', 'incident_description'],
  location: ['location', 'accident_location', 'incident_location', 'address'],
  policeReport: ['police_report_number', 'police_report', 'report_number'],
  injuries: ['injuries', 'injury', 'injury_description', 'reported_injuries', 'body_parts'],
  status: ['status', 'state_of_task', 'stage'],
  provider: ['provider', 'provider_name', 'facility', 'facility_name', 'doctor', 'physician', 'clinic'],
  specialty: ['specialty', 'speciality', 'provider_type', 'department'],
  visitDate: ['visit_date', 'date_of_service', 'service_date', 'dos', 'start_date', 'date', 'appointment_date'],
  endDate: ['end_date', 'discharge_date', 'last_visit_date'],
  visitType: ['visit_type', 'encounter_type', 'treatment_type', 'type'],
  diagnosis: ['diagnosis', 'diagnoses', 'dx', 'assessment'],
  icd: ['icd_codes', 'icd10', 'icd_10', 'diagnosis_codes', 'icd'],
  cpt: ['cpt_codes', 'cpt', 'procedure_codes', 'hcpcs'],
  amount: ['amount', 'billed_amount', 'billed', 'charges', 'total_charges', 'total', 'total_usd', 'charge_amount'],
  paid: ['paid_amount', 'paid', 'amount_paid', 'payments'],
  adjusted: ['adjusted_amount', 'adjustment', 'write_off', 'writeoff', 'contractual_adjustment'],
  balance: ['balance', 'balance_due', 'outstanding'],
  payer: ['payer', 'payor', 'paid_by', 'insurer'],
  date: ['date', 'event_date', 'created_at', 'created', 'entered_at', 'timestamp'],
  carrier: ['carrier', 'carrier_name', 'insurance_carrier', 'insurance_company', 'company', 'insurer', 'insurer_name'],
  policyNumber: ['policy_number', 'policy_no', 'policy'],
  policyLimit: ['policy_limit', 'policy_limit_usd', 'policy_limits', 'limits', 'coverage_limit', 'bi_limit', 'liability_limit'],
  claimNumber: ['claim_number', 'claim_no', 'claim'],
  adjusterName: ['adjuster_name', 'adjuster'],
  adjusterEmail: ['adjuster_email'],
  adjusterPhone: ['adjuster_phone'],
  coverageType: ['coverage_type', 'policy_type', 'coverage', 'type'],
  insuredParty: ['insured_party', 'insured', 'party', 'policy_holder_type', 'insured_type'],
  holder: ['lien_holder', 'holder', 'name', 'lienholder'],
  title: ['title', 'name', 'subject', 'task', 'task_name', 'summary'],
  dueDate: ['due_date', 'due', 'deadline', 'due_at', 'activity_date', 'start_datetime', 'start_date_time', 'date'],
  priority: ['priority'],
  assignee: ['assignee', 'assigned_to', 'owner', 'responsible'],
  body: ['note', 'body', 'content', 'text', 'detail', 'details', 'description', 'message'],
  author: ['author', 'created_by', 'user', 'entered_by'],
  eventType: ['event_type', 'type', 'kind', 'direction'],
  counterparty: ['counterparty', 'party', 'from', 'by'],
  fileName: ['file_name', 'filename', 'name', 'title', 'document_name'],
  docCategory: ['category', 'document_type', 'doc_type', 'type'],
  url: ['url', 'link', 'path', 'file_path', 'download_url'],
  customFieldName: ['field_name', 'custom_field_name', 'name', 'label'],
  customFieldValue: ['field_value', 'value', 'text_value', 'display_value'],
  invoiceNumber: ['invoice_number', 'bill_number', 'number', 'bill_id', 'id'],
  paidDate: ['paid_at', 'paid_date', 'payment_date'],
  quantity: ['quantity', 'hours', 'duration_hours'],
  minutes: ['minutes', 'duration_minutes'],
  price: ['price', 'hourly_rate', 'hourly_rate_usd', 'rate'],
  activity: ['activity_description', 'activity', 'activity_type', 'type'],
  billable: ['billable', 'is_billable'],
} satisfies Record<string, string[]>

function stringify(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(stringify).filter(Boolean).join('; ')
  return ''
}

/** Flat index of a row: top-level keys and one level of nesting (`address.city`). */
function indexRow(row: Row): Map<string, string> {
  const index = new Map<string, string>()
  const set = (key: string, text: string, overwrite = true) => {
    for (const variant of sourceNameVariants(key)) {
      if (overwrite || !index.has(variant)) index.set(variant, text)
    }
  }
  for (const [key, value] of Object.entries(row)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [sub, nested] of Object.entries(value as Row)) {
        const text = stringify(nested)
        if (text) set(sub, text, false)
        if (text) set(`${key}${sub}`, text)
      }
      continue
    }
    const text = stringify(value)
    if (text) set(key, text)
  }
  return index
}

function pick(row: Row, candidates: readonly string[]): string {
  const index = indexRow(row)
  for (const candidate of candidates) {
    for (const key of sourceNameVariants(candidate)) {
      const hit = index.get(key)
      if (hit) return hit
    }
  }
  return ''
}

/** A calendar date as YYYY-MM-DD, lenient: future dates are fine here (deadlines). */
export function parseLooseDate(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

function money(raw: string): number | null {
  if (!raw) return null
  // "100,000/300,000" and "$100k" style limits: take the first figure.
  const first = raw.split(/[\/|]/)[0]
  const k = /^\s*\$?\s*([\d.]+)\s*k\s*$/i.exec(first)
  if (k) return Number(k[1]) * 1000
  return parseImportedMoney(first)
}

function codes(raw: string): string[] {
  return raw
    .split(/[;,|\s]+/)
    .map((c) => c.trim())
    .filter(Boolean)
}

// ---------------------------------------------------------------------------
// Bundles

export type IssueSeverity = 'error' | 'warning'

export type PackageIssue = {
  severity: IssueSeverity
  table: MatterTableKind | 'package'
  recordId: string | null
  message: string
}

export type ContactRecord = {
  key: string
  contactId: string | null
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  fax: string | null
  company: string | null
  role: string | null
  contactType: string
  street: string | null
  city: string | null
  state: string | null
  zip: string | null
}

export type VisitRecord = {
  key: string
  visitId: string | null
  provider: string
  specialty: string | null
  visitType: string
  startDate: string | null
  endDate: string | null
  diagnosis: string | null
  diagnosisCodes: string[]
  procedureCodes: string[]
  billedAmount: number | null
  notes: string | null
}

export type BillRecord = {
  key: string
  visitKey: string | null
  provider: string
  amount: number
  paidAmount: number | null
  adjustedAmount: number | null
  balance: number | null
  payer: string | null
  incurredAt: string | null
  status: string | null
  description: string
}

export type InsuranceRecord = {
  key: string
  carrierName: string
  policyNumber: string | null
  policyLimit: number | null
  claimNumber: string | null
  adjusterName: string | null
  adjusterEmail: string | null
  adjusterPhone: string | null
  coverageType: string | null
  insuredParty: 'defendant' | 'client' | null
  notes: string | null
}

export type LienRecord = { key: string; name: string; type: string | null; amount: number | null; status: string; notes: string | null }
export type ExpenseRecord = { key: string; category: string; description: string; amount: number; incurredAt: string | null }
export type NegotiationRecord = {
  key: string
  eventType: string
  amount: number | null
  eventDate: string | null
  status: string
  counterpartyType: string | null
  notes: string | null
}
export type TaskRecord = {
  key: string
  title: string
  dueDate: string | null
  status: string
  priority: string
  assignedTo: string | null
  notes: string | null
}
export type NoteRecord = { key: string; message: string; author: string | null; date: string | null; kind: 'note' | 'timeline' }
export type DocumentRecord = {
  key: string
  name: string
  category: string | null
  date: string | null
  url: string | null
  checksum: string | null
}
export type BillingInvoiceRecord = {
  key: string
  invoiceNumber: string | null
  amount: number
  status: string
  dueDate: string | null
  paidAt: string | null
  notes: string | null
}
export type TimeEntryRecord = {
  key: string
  workDate: string
  minutes: number
  activityType: string
  description: string | null
  billable: boolean
  hourlyRate: number | null
  amount: number | null
}

export type MatterBundle = {
  externalId: string
  /** Display name for previews: the client, else the matter's own name. */
  label: string
  claimType: string
  incidentDate: string | null
  incidentDateAmbiguous: boolean
  venueState: string | null
  venueCounty: string | null
  narrative: string
  injuryDiagnoses: string[]
  client: ContactRecord | null
  defendantName: string | null
  contacts: ContactRecord[]
  visits: VisitRecord[]
  bills: BillRecord[]
  billingInvoices: BillingInvoiceRecord[]
  timeEntries: TimeEntryRecord[]
  insurance: InsuranceRecord[]
  liens: LienRecord[]
  expenses: ExpenseRecord[]
  negotiations: NegotiationRecord[]
  tasks: TaskRecord[]
  notes: NoteRecord[]
  documents: DocumentRecord[]
  /** Errors block this matter; warnings import with the issue reported. */
  issues: PackageIssue[]
  raw: Row
}

export type MatterPackagePlan = {
  matters: MatterBundle[]
  /** Problems not tied to one matter: orphans, unknown tables, duplicates in the file. */
  issues: PackageIssue[]
  tablesFound: Array<{ kind: MatterTableKind; label: string; rows: number }>
  unrecognizedTables: string[]
}

/** JSON with deterministic object-key ordering, Unicode, and line endings. */
export function canonicalJson(value: unknown): string {
  const normalize = (input: unknown): unknown => {
    if (typeof input === 'string') return input.normalize('NFC').replace(/\r\n?/g, '\n')
    if (Array.isArray(input)) return input.map(normalize)
    if (input && typeof input === 'object') {
      return Object.fromEntries(
        Object.entries(input as Record<string, unknown>)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, nested]) => [key, normalize(nested)]),
      )
    }
    return input
  }
  return JSON.stringify(normalize(value))
}

export function stableRecordHash(value: unknown): string {
  return crypto.createHash('sha256').update(canonicalJson(value)).digest('hex')
}

/** Stable identity for a related record, for safe re-import. */
function recordKey(kind: MatterTableKind, row: Row, idFields: readonly string[] = FIELDS.recordId): string {
  const id = pick(row, idFields)
  if (id) return `${kind}:${id}`
  const digest = stableRecordHash(row).slice(0, 24)
  return `${kind}#${digest}`
}

function contactTypeFor(role: string): string {
  const r = role.toLowerCase()
  if (/client|plaintiff|claimant|injured/.test(r)) return 'client'
  if (/adjust/.test(r)) return 'adjuster'
  if (/opposing|defense counsel|defence counsel|defense attorney/.test(r)) return 'opposing_counsel'
  if (/witness/.test(r)) return 'witness'
  if (/provider|doctor|physician|clinic|hospital|chiro|therap|medical/.test(r)) return 'medical_provider'
  if (/expert/.test(r)) return 'expert'
  if (/defendant|at.?fault|tortfeasor|driver/.test(r)) return 'defendant'
  return 'other'
}

function readContact(row: Row, roleOverride?: string): ContactRecord {
  let firstName = pick(row, FIELDS.firstName)
  let lastName = pick(row, FIELDS.lastName)
  if (!firstName && !lastName) {
    const full = pick(row, FIELDS.fullName)
    const parts = full.split(/\s+/).filter(Boolean)
    firstName = parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0] || ''
    lastName = parts.length > 1 ? parts[parts.length - 1] : ''
  }
  const flaggedClient = /^(true|yes|y|1)$/i.test(pick(row, ['is_client', 'client_flag', 'primary_client']))
  const role = roleOverride || pick(row, FIELDS.role) || (flaggedClient ? 'Client' : null)
  return {
    key: recordKey('contacts', row, [...FIELDS.contactId, ...FIELDS.recordId]),
    contactId: pick(row, [...FIELDS.contactId, ...FIELDS.recordId]) || null,
    firstName,
    lastName,
    email: pick(row, FIELDS.email) || null,
    phone: pick(row, FIELDS.phone) || null,
    fax: pick(row, FIELDS.fax) || null,
    company: pick(row, FIELDS.company) || null,
    role,
    contactType: flaggedClient && !roleOverride ? 'client' : contactTypeFor(role || ''),
    street: pick(row, FIELDS.street) || null,
    city: pick(row, FIELDS.city) || null,
    state: pick(row, FIELDS.state) || null,
    zip: pick(row, FIELDS.zip) || null,
  }
}

const STATE_NAMES: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO', connecticut: 'CT',
  delaware: 'DE', florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI',
  minnesota: 'MN', mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV', newhampshire: 'NH',
  newjersey: 'NJ', newmexico: 'NM', newyork: 'NY', northcarolina: 'NC', northdakota: 'ND', ohio: 'OH', oklahoma: 'OK',
  oregon: 'OR', pennsylvania: 'PA', rhodeisland: 'RI', southcarolina: 'SC', southdakota: 'SD', tennessee: 'TN',
  texas: 'TX', utah: 'UT', vermont: 'VT', virginia: 'VA', washington: 'WA', westvirginia: 'WV', wisconsin: 'WI',
  wyoming: 'WY', districtofcolumbia: 'DC',
}

export function stateCode(raw: string | null | undefined): string | null {
  const value = (raw || '').trim()
  if (!value) return null
  if (/^[A-Za-z]{2}$/.test(value)) return value.toUpperCase()
  return STATE_NAMES[norm(value)] ?? null
}

function negotiationType(raw: string): string {
  const t = raw.toLowerCase()
  if (/counter/.test(t)) return 'counter'
  if (/demand/.test(t)) return 'demand'
  if (/offer/.test(t)) return 'offer'
  if (/call|phone/.test(t)) return 'call'
  return t ? 'note' : 'offer'
}

function taskStatus(raw: string): string {
  const s = raw.toLowerCase()
  if (/done|complete|closed|finished/.test(s)) return 'done'
  if (/progress|started/.test(s)) return 'in_progress'
  if (/cancel/.test(s)) return 'cancelled'
  return 'open'
}

function priorityOf(raw: string): string {
  const p = raw.toLowerCase()
  if (/high|urgent|critical/.test(p)) return 'high'
  if (/low/.test(p)) return 'low'
  return 'medium'
}

const EXPENSE_CATEGORIES = ['filing', 'expert', 'records', 'investigation', 'deposition', 'service']

function expenseCategory(raw: string): string {
  const c = raw.toLowerCase()
  return EXPENSE_CATEGORIES.find((cat) => c.includes(cat)) ?? 'other'
}

function coverageTypeOf(raw: string): string | null {
  const c = raw.toLowerCase()
  if (!c) return null
  if (/uim|underinsured/.test(c)) return 'uim'
  if (/\bum\b|uninsured/.test(c)) return 'um'
  if (/med ?pay|medical payments|\bpip\b/.test(c)) return 'medpay'
  if (/liab|bodily|\bbi\b/.test(c)) return 'liability'
  return 'other'
}

function insuredPartyOf(raw: string, coverage: string | null): 'defendant' | 'client' | null {
  const p = raw.toLowerCase()
  if (/defend|adverse|at.?fault|third|tortfeasor|other/.test(p)) return 'defendant'
  if (/client|plaintiff|claimant|first|own/.test(p)) return 'client'
  if (coverage === 'um' || coverage === 'uim' || coverage === 'medpay') return 'client'
  if (coverage === 'liability') return 'defendant'
  return null
}

/**
 * Join every related record to its matter and validate the result.
 *
 * `fallbackState` is the attorney's bar state, used only when a matter names
 * no venue anywhere — and reported as a warning when it is.
 */
export function buildMatterPackagePlan(
  tables: MatterPackageTables,
  options: { fallbackState?: string | null; today?: Date } = {},
): MatterPackagePlan {
  const issues: PackageIssue[] = []
  const matterRows = tables.matters ?? []
  const single = matterRows.length === 1

  const matterIdOf = (row: Row) => pick(row, [...FIELDS.matterId, ...FIELDS.recordId])
  const ids = new Map<string, Row>()
  for (const row of matterRows) {
    const id = matterIdOf(row)
    if (!id) {
      issues.push({ severity: 'error', table: 'matters', recordId: null, message: 'A matter has no matter ID, so its related records cannot be linked. Add a matter_id and re-export.' })
      continue
    }
    if (ids.has(id)) {
      issues.push({ severity: 'error', table: 'matters', recordId: id, message: `Matter ID ${id} appears more than once in the file. Only the first is imported.` })
      continue
    }
    ids.set(id, row)
  }
  const onlyId = single ? [...ids.keys()][0] ?? null : null

  /** The matter a related row belongs to, or null (reported) when it cannot be told. */
  const route = (kind: MatterTableKind, row: Row): string | null => {
    const ref = pick(row, FIELDS.matterId)
    if (ref) {
      if (ids.has(ref)) return ref
      issues.push({ severity: 'error', table: kind, recordId: pick(row, FIELDS.recordId) || null, message: `${MATTER_TABLE_LABELS[kind]} record references matter ${ref}, which is not in this file. Skipped.` })
      return null
    }
    if (onlyId) return onlyId
    issues.push({ severity: 'error', table: kind, recordId: pick(row, FIELDS.recordId) || null, message: `${MATTER_TABLE_LABELS[kind]} record has no matter ID and the file holds several matters. Skipped.` })
    return null
  }

  const grouped = new Map<string, Partial<Record<MatterTableKind, Row[]>>>()
  for (const id of ids.keys()) grouped.set(id, {})
  const contactsById = new Map<string, Row>()
  for (const row of tables.contacts ?? []) {
    const cid = pick(row, [...FIELDS.contactId, ...FIELDS.recordId])
    if (cid) contactsById.set(cid, row)
  }

  const routedKinds: MatterTableKind[] = [
    'customFields', 'accidents', 'insurance', 'medicalVisits', 'medicalBills', 'billingInvoices', 'timeEntries', 'liens', 'expenses', 'negotiations', 'tasks', 'notes', 'timeline', 'documents',
  ]
  for (const kind of routedKinds) {
    for (const row of tables[kind] ?? []) {
      const id = route(kind, row)
      if (!id) continue
      const bucket = grouped.get(id)!
      ;(bucket[kind] ??= []).push(row)
    }
  }

  // Contacts: linked by a join table, by matter_id on the contact, or by the
  // matter's client reference. In a single-matter file every contact belongs
  // to it.
  const contactLinks = new Map<string, Array<{ row: Row; role?: string }>>()
  const link = (matterId: string, row: Row, role?: string) => {
    const list = contactLinks.get(matterId) ?? []
    const key = recordKey('contacts', row, [...FIELDS.contactId, ...FIELDS.recordId])
    const existing = list.find((entry) => recordKey('contacts', entry.row, [...FIELDS.contactId, ...FIELDS.recordId]) === key)
    if (existing) {
      if (role && !existing.role) existing.role = role
      return
    }
    list.push({ row, role })
    contactLinks.set(matterId, list)
  }
  for (const row of tables.matterContacts ?? []) {
    const matterId = route('matterContacts', row)
    if (!matterId) continue
    const cid = pick(row, FIELDS.contactId)
    const contact = cid ? contactsById.get(cid) : null
    if (!contact) {
      issues.push({ severity: 'warning', table: 'matterContacts', recordId: cid || null, message: `Matter ${matterId} links to contact ${cid || '(no id)'}, which is not in the Contacts table.` })
      continue
    }
    link(matterId, contact, pick(row, FIELDS.role) || undefined)
  }
  for (const row of tables.contacts ?? []) {
    const ref = pick(row, FIELDS.matterId)
    if (ref) {
      if (ids.has(ref)) link(ref, row)
      else issues.push({ severity: 'warning', table: 'contacts', recordId: pick(row, FIELDS.contactId) || null, message: `Contact references matter ${ref}, which is not in this file. Not imported.` })
    } else if (onlyId) {
      link(onlyId, row)
    }
  }

  const matters: MatterBundle[] = []
  for (const [externalId, matterRow] of ids) {
    const bucket = grouped.get(externalId)!
    const matterIssues: PackageIssue[] = []
    const accident = bucket.accidents?.[0] ?? {}
    // Turn Clio's vertical custom-field rows into ordinary matter columns.
    // `pick` normalises punctuation, so "Date of Loss" then answers the same
    // rule as date_of_loss. Native matter columns win when both are present.
    const customMatterFields = Object.fromEntries(
      (bucket.customFields ?? [])
        .map((row) => [pick(row, FIELDS.customFieldName), pick(row, FIELDS.customFieldValue)] as const)
        .filter(([name, value]) => Boolean(name && value)),
    )
    const effectiveMatterRow = { ...customMatterFields, ...matterRow }

    const clientRef = pick(effectiveMatterRow, FIELDS.clientRef)
    if (clientRef && !contactsById.has(clientRef)) {
      matterIssues.push({ severity: 'warning', table: 'matters', recordId: externalId, message: `The matter names client ${clientRef}, who is not in the Contacts table.` })
    } else if (clientRef) {
      link(externalId, contactsById.get(clientRef)!, 'client')
    }
    const contacts = (contactLinks.get(externalId) ?? []).map(({ row, role }) => readContact(row, role))
    const client =
      (clientRef ? contacts.find((c) => c.contactId === clientRef) : undefined) ??
      contacts.find((c) => c.contactType === 'client') ??
      (contacts.length === 1 ? contacts[0] : undefined) ??
      null
    if (client) client.contactType = 'client'
    if (!client) {
      matterIssues.push({ severity: 'error', table: 'contacts', recordId: externalId, message: 'No client contact for this matter. Mark one contact with role "Client", or set client_id on the matter.' })
    } else if (!client.firstName && !client.lastName) {
      matterIssues.push({ severity: 'error', table: 'contacts', recordId: client.contactId, message: 'The client contact has no name.' })
    }
    const defendant = contacts.find((c) => c.contactType === 'defendant')

    const dateRaw = pick(effectiveMatterRow, FIELDS.incidentDate) || pick(accident, [...FIELDS.incidentDate, 'date'])
    const incident = parseIncidentDate(dateRaw, options.today)
    if (!incident.ok) {
      matterIssues.push({ severity: 'error', table: 'matters', recordId: externalId, message: incident.reason })
    }

    let venueState = stateCode(pick(effectiveMatterRow, FIELDS.state)) || stateCode(pick(accident, FIELDS.state))
    if (!venueState && client?.state) venueState = stateCode(client.state)
    if (!venueState && options.fallbackState) {
      venueState = options.fallbackState
      matterIssues.push({ severity: 'warning', table: 'matters', recordId: externalId, message: `No venue state on the matter; using your bar state (${venueState}).` })
    }
    if (!venueState) {
      matterIssues.push({ severity: 'error', table: 'matters', recordId: externalId, message: 'No venue state on the matter or its accident details.' })
    }

    const visits: VisitRecord[] = []
    const visitKeyById = new Map<string, string>()
    for (const row of bucket.medicalVisits ?? []) {
      const key = recordKey('medicalVisits', row, [...FIELDS.visitId, ...FIELDS.recordId])
      const visitId = pick(row, [...FIELDS.visitId, ...FIELDS.recordId]) || null
      const provider = pick(row, FIELDS.provider)
      if (!provider) {
        issues.push({ severity: 'error', table: 'medicalVisits', recordId: visitId, message: `Medical visit ${visitId ?? ''} has no provider. Skipped.`.replace('  ', ' ') })
        continue
      }
      const startRaw = pick(row, FIELDS.visitDate)
      const startDate = parseLooseDate(startRaw)
      if (startRaw && !startDate) {
        matterIssues.push({ severity: 'warning', table: 'medicalVisits', recordId: visitId, message: `Visit date "${startRaw}" could not be read; imported without a date.` })
      }
      if (visitId) visitKeyById.set(visitId, key)
      visits.push({
        key,
        visitId,
        provider,
        specialty: pick(row, FIELDS.specialty) || null,
        visitType: (pick(row, FIELDS.visitType) || 'follow_up').toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        startDate,
        endDate: parseLooseDate(pick(row, FIELDS.endDate)),
        diagnosis: pick(row, FIELDS.diagnosis) || null,
        diagnosisCodes: codes(pick(row, FIELDS.icd)),
        procedureCodes: codes(pick(row, FIELDS.cpt)),
        billedAmount: money(pick(row, FIELDS.amount)),
        notes: pick(row, ['notes', 'note', 'summary', 'comments']) || null,
      })
    }

    const bills: BillRecord[] = []
    for (const row of bucket.medicalBills ?? []) {
      const key = recordKey('medicalBills', row, ['bill_id', 'invoice_id', ...FIELDS.recordId])
      const billId = pick(row, ['bill_id', 'invoice_id', ...FIELDS.recordId]) || null
      const amount = money(pick(row, FIELDS.amount))
      if (amount === null) {
        issues.push({ severity: 'error', table: 'medicalBills', recordId: billId, message: `Medical bill ${billId ?? ''} has no billed amount. Skipped.`.replace('  ', ' ') })
        continue
      }
      const visitRef = pick(row, FIELDS.visitId)
      let visitKey: string | null = null
      if (visitRef) {
        visitKey = visitKeyById.get(visitRef) ?? null
        if (!visitKey) {
          matterIssues.push({ severity: 'warning', table: 'medicalBills', recordId: billId, message: `Bill ${billId ?? ''} references visit ${visitRef}, which is not in the Medical visits table. Imported unlinked.`.replace('  ', ' ') })
        }
      }
      const linkedVisit = visitKey ? visits.find((v) => v.key === visitKey) : null
      const provider = pick(row, FIELDS.provider) || linkedVisit?.provider || ''
      bills.push({
        key,
        visitKey,
        provider,
        amount,
        paidAmount: money(pick(row, FIELDS.paid)),
        adjustedAmount: money(pick(row, FIELDS.adjusted)),
        balance: money(pick(row, FIELDS.balance)),
        payer: pick(row, FIELDS.payer) || null,
        incurredAt: parseLooseDate(pick(row, ['date_of_service', 'service_date', 'bill_date', 'date'])) ?? linkedVisit?.startDate ?? null,
        status: pick(row, FIELDS.status) || null,
        description: pick(row, ['description', 'service', 'procedure']) || (provider ? `${provider} bill` : 'Medical bill'),
      })
    }
    // A visit with no billed amount of its own carries the sum of its bills,
    // so the treatment timeline and the ledger agree.
    for (const visit of visits) {
      if (visit.billedAmount !== null) continue
      const linked = bills.filter((b) => b.visitKey === visit.key)
      if (linked.length) visit.billedAmount = linked.reduce((sum, b) => sum + b.amount, 0)
    }

    const billingInvoices: BillingInvoiceRecord[] = []
    for (const row of bucket.billingInvoices ?? []) {
      const amount = money(pick(row, FIELDS.amount))
      if (amount === null) {
        issues.push({ severity: 'error', table: 'billingInvoices', recordId: pick(row, FIELDS.recordId) || null, message: 'Billing invoice has no total amount. Skipped.' })
        continue
      }
      const rawStatus = pick(row, FIELDS.status).toLowerCase()
      const paidAt = parseLooseDate(pick(row, FIELDS.paidDate))
      const dueDate = parseLooseDate(pick(row, ['due_date', 'due_at', 'due']))
      const status =
        paidAt || /paid|complete/.test(rawStatus)
          ? 'paid'
          : /overdue|past.?due/.test(rawStatus) || (dueDate && new Date(`${dueDate}T23:59:59Z`).getTime() < (options.today ?? new Date()).getTime())
            ? 'overdue'
            : 'open'
      billingInvoices.push({
        key: recordKey('billingInvoices', row, ['bill_id', 'invoice_id', ...FIELDS.recordId]),
        invoiceNumber: pick(row, FIELDS.invoiceNumber) || null,
        amount,
        status,
        dueDate,
        paidAt,
        notes: pick(row, ['notes', 'note', 'memo', 'description']) || null,
      })
    }

    const timeEntries: TimeEntryRecord[] = []
    for (const row of bucket.timeEntries ?? []) {
      const workDate = parseLooseDate(pick(row, ['work_date', 'date', 'entry_date']))
      const explicitMinutes = Number(pick(row, FIELDS.minutes))
      const quantityHours = Number(pick(row, FIELDS.quantity))
      const minutes =
        Number.isFinite(explicitMinutes) && explicitMinutes > 0
          ? Math.round(explicitMinutes)
          : Number.isFinite(quantityHours) && quantityHours > 0
            ? Math.round(quantityHours * 60)
            : 0
      if (!workDate || minutes <= 0) {
        issues.push({ severity: 'error', table: 'timeEntries', recordId: pick(row, FIELDS.recordId) || null, message: 'Time entry needs a date and positive duration. Skipped.' })
        continue
      }
      const hourlyRate = money(pick(row, FIELDS.price))
      const explicitAmount = money(pick(row, ['amount', 'amount_usd', 'total', 'total_usd']))
      const billableRaw = pick(row, FIELDS.billable)
      const billable = billableRaw ? !/^(false|no|n|0)$/i.test(billableRaw) : true
      timeEntries.push({
        key: recordKey('timeEntries', row),
        workDate,
        minutes,
        activityType: (pick(row, FIELDS.activity) || 'general').toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        description: pick(row, ['note', 'description', 'details']) || null,
        billable,
        hourlyRate,
        amount: explicitAmount ?? (billable && hourlyRate !== null ? (minutes / 60) * hourlyRate : null),
      })
    }

    const insurance: InsuranceRecord[] = []
    for (const row of bucket.insurance ?? []) {
      const carrierName = pick(row, FIELDS.carrier)
      if (!carrierName) {
        issues.push({ severity: 'error', table: 'insurance', recordId: pick(row, FIELDS.recordId) || null, message: 'Insurance record has no carrier name. Skipped.' })
        continue
      }
      const coverageType = coverageTypeOf(pick(row, FIELDS.coverageType))
      insurance.push({
        key: recordKey('insurance', row, ['policy_id', ...FIELDS.recordId, ...FIELDS.policyNumber]),
        carrierName,
        policyNumber: pick(row, FIELDS.policyNumber) || null,
        policyLimit: money(pick(row, FIELDS.policyLimit)),
        claimNumber: pick(row, FIELDS.claimNumber) || null,
        adjusterName: pick(row, FIELDS.adjusterName) || null,
        adjusterEmail: pick(row, FIELDS.adjusterEmail) || null,
        adjusterPhone: pick(row, FIELDS.adjusterPhone) || null,
        coverageType,
        insuredParty: insuredPartyOf(pick(row, FIELDS.insuredParty), coverageType),
        notes: pick(row, ['notes', 'note', 'comments']) || null,
      })
    }
    // Some exports keep the primary carrier and limits directly on the
    // matter/project row instead of providing an insurance table.
    if (insurance.length === 0) {
      const carrierName = pick(effectiveMatterRow, FIELDS.carrier)
      if (carrierName) {
        const coverageType = coverageTypeOf(pick(effectiveMatterRow, FIELDS.coverageType)) ?? 'liability'
        insurance.push({
          key: recordKey('insurance', effectiveMatterRow, [...FIELDS.matterId, ...FIELDS.recordId]),
          carrierName,
          policyNumber: pick(effectiveMatterRow, FIELDS.policyNumber) || null,
          policyLimit: money(pick(effectiveMatterRow, FIELDS.policyLimit)),
          claimNumber: pick(effectiveMatterRow, FIELDS.claimNumber) || null,
          adjusterName: pick(effectiveMatterRow, FIELDS.adjusterName) || null,
          adjusterEmail: pick(effectiveMatterRow, FIELDS.adjusterEmail) || null,
          adjusterPhone: pick(effectiveMatterRow, FIELDS.adjusterPhone) || null,
          coverageType,
          insuredParty: 'defendant',
          notes: 'Imported from matter-level insurance fields.',
        })
      }
    }

    const liens: LienRecord[] = []
    for (const row of bucket.liens ?? []) {
      const name = pick(row, FIELDS.holder)
      if (!name) {
        issues.push({ severity: 'error', table: 'liens', recordId: pick(row, FIELDS.recordId) || null, message: 'Lien has no holder name. Skipped.' })
        continue
      }
      liens.push({
        key: recordKey('liens', row),
        name,
        type: pick(row, ['lien_type', 'type']) || null,
        amount: money(pick(row, FIELDS.amount)),
        status: (pick(row, FIELDS.status) || 'open').toLowerCase(),
        notes: pick(row, ['notes', 'note']) || null,
      })
    }

    const expenses: ExpenseRecord[] = []
    for (const row of bucket.expenses ?? []) {
      const amount = money(pick(row, FIELDS.amount))
      const description = pick(row, ['description', 'memo', 'name', 'title', 'category'])
      if (amount === null || !description) {
        issues.push({ severity: 'error', table: 'expenses', recordId: pick(row, FIELDS.recordId) || null, message: 'Expense needs a description and an amount. Skipped.' })
        continue
      }
      expenses.push({
        key: recordKey('expenses', row),
        category: expenseCategory(pick(row, ['category', 'type', 'expense_type'])),
        description,
        amount,
        incurredAt: parseLooseDate(pick(row, ['incurred_at', 'expense_date', 'date'])),
      })
    }

    const negotiations: NegotiationRecord[] = []
    for (const row of bucket.negotiations ?? []) {
      const eventType = negotiationType(pick(row, FIELDS.eventType))
      const amount = money(pick(row, FIELDS.amount))
      if (amount === null && ['demand', 'offer', 'counter'].includes(eventType)) {
        issues.push({ severity: 'error', table: 'negotiations', recordId: pick(row, FIELDS.recordId) || null, message: `A ${eventType} has no amount. Skipped.` })
        continue
      }
      const party = pick(row, FIELDS.counterparty).toLowerCase()
      negotiations.push({
        key: recordKey('negotiations', row),
        eventType,
        amount,
        eventDate: parseLooseDate(pick(row, ['event_date', 'date', 'sent_date', 'received_date'])),
        status: (pick(row, FIELDS.status) || 'open').toLowerCase(),
        counterpartyType: /insur|carrier|adjust|defen/.test(party)
          ? 'insurer'
          : /client|plaintiff|claimant|firm|us/.test(party)
            ? 'claimant'
            : eventType === 'offer'
              ? 'insurer'
              : eventType === 'demand'
                ? 'claimant'
                : null,
        notes: pick(row, ['notes', 'note', 'comments', 'description']) || null,
      })
    }

    const tasks: TaskRecord[] = []
    for (const row of bucket.tasks ?? []) {
      const title = pick(row, FIELDS.title) || pick(row, ['description'])
      if (!title) {
        issues.push({ severity: 'error', table: 'tasks', recordId: pick(row, FIELDS.recordId) || null, message: 'Task has no title. Skipped.' })
        continue
      }
      tasks.push({
        key: recordKey('tasks', row),
        title: title.slice(0, 250),
        dueDate: parseLooseDate(pick(row, FIELDS.dueDate)),
        status: taskStatus(pick(row, FIELDS.status)),
        priority: priorityOf(pick(row, FIELDS.priority)),
        assignedTo: pick(row, FIELDS.assignee) || null,
        notes: pick(row, ['notes', 'note', 'description', 'details']) || null,
      })
    }

    const notes: NoteRecord[] = []
    for (const [kind, label] of [['notes', 'note'], ['timeline', 'timeline']] as const) {
      for (const row of bucket[kind] ?? []) {
        const title = kind === 'timeline' ? pick(row, ['title', 'event', 'name', 'summary']) : pick(row, ['subject', 'title'])
        const body = pick(row, FIELDS.body)
        const message = [title, body && body !== title ? body : ''].filter(Boolean).join(' — ')
        if (!message) {
          issues.push({ severity: 'error', table: kind, recordId: pick(row, FIELDS.recordId) || null, message: `${MATTER_TABLE_LABELS[kind]} entry is empty. Skipped.` })
          continue
        }
        notes.push({
          key: recordKey(kind, row),
          message,
          author: pick(row, FIELDS.author) || null,
          date: parseLooseDate(pick(row, FIELDS.date)),
          kind: label,
        })
      }
    }

    const documents: DocumentRecord[] = []
    for (const row of bucket.documents ?? []) {
      const name = pick(row, FIELDS.fileName)
      if (!name) {
        issues.push({ severity: 'error', table: 'documents', recordId: pick(row, FIELDS.recordId) || null, message: 'Document has no file name. Skipped.' })
        continue
      }
      documents.push({
        key: recordKey('documents', row),
        name,
        category: pick(row, FIELDS.docCategory) || null,
        date: parseLooseDate(pick(row, ['document_date', 'uploaded_at', 'created_at', 'date'])),
        url: pick(row, FIELDS.url) || null,
        checksum: pick(row, ['sha256', 'checksum_sha256', 'content_sha256', 'checksum', 'content_hash']) || null,
      })
    }

    // The description comes from the matter or the accident, never the notes
    // table: notes are history, and are imported as notes.
    const narrative = [
      pick(effectiveMatterRow, FIELDS.description),
      pick(accident, FIELDS.description),
      pick(accident, FIELDS.location) ? `Location: ${pick(accident, FIELDS.location)}` : '',
      pick(accident, FIELDS.policeReport) ? `Police report: ${pick(accident, FIELDS.policeReport)}` : '',
    ]
      .filter(Boolean)
      .filter((v, i, all) => all.indexOf(v) === i)
      .join('\n\n')

    const diagnoses = [
      ...splitDiagnoses(pick(effectiveMatterRow, FIELDS.injuries) || pick(accident, FIELDS.injuries)),
      ...visits.flatMap((v) => (v.diagnosis ? splitDiagnoses(v.diagnosis) : [])),
    ]
    const injuryDiagnoses = [...new Set(diagnoses.map((d) => d.trim()).filter(Boolean))].slice(0, 12)

    const clientName = client ? [client.firstName, client.lastName].filter(Boolean).join(' ') : ''
    matters.push({
      externalId,
      label: clientName || pick(effectiveMatterRow, ['matter_name', 'name', 'title', 'display_number']) || externalId,
      claimType: normalizeClaimType(pick(effectiveMatterRow, FIELDS.caseType) || pick(accident, ['accident_type', 'incident_type', 'type'])),
      incidentDate: incident.ok ? incident.date : null,
      incidentDateAmbiguous: incident.ok && incident.ambiguous,
      venueState,
      venueCounty: pick(effectiveMatterRow, FIELDS.county) || pick(accident, FIELDS.county) || null,
      narrative,
      injuryDiagnoses,
      client,
      defendantName: defendant
        ? [defendant.firstName, defendant.lastName].filter(Boolean).join(' ') || defendant.company
        : pick(effectiveMatterRow, ['defendant', 'defendant_name', 'opposing_party', 'adverse_party']) || null,
      contacts,
      visits,
      bills,
      billingInvoices,
      timeEntries,
      insurance,
      liens,
      expenses,
      negotiations,
      tasks,
      notes,
      documents,
      issues: matterIssues,
      raw: matterRow,
    })
  }

  for (const name of tables.unrecognized ?? []) {
    issues.push({ severity: 'warning', table: 'package', recordId: null, message: `Table "${name}" is not a type we import, so it was left out.` })
  }

  const tablesFound = (Object.keys(MATTER_TABLE_LABELS) as MatterTableKind[])
    .filter((kind) => tables[kind] !== undefined)
    .map((kind) => ({ kind, label: MATTER_TABLE_LABELS[kind], rows: tables[kind]?.length ?? 0 }))

  return { matters, issues, tablesFound, unrecognizedTables: tables.unrecognized ?? [] }
}

/** Per-matter record counts, for previews and reports. */
export function bundleCounts(bundle: MatterBundle) {
  return {
    contacts: bundle.contacts.length,
    medicalVisits: bundle.visits.length,
    medicalBills: bundle.bills.length,
    billingInvoices: bundle.billingInvoices.length,
    timeEntries: bundle.timeEntries.length,
    insurance: bundle.insurance.length,
    liens: bundle.liens.length,
    expenses: bundle.expenses.length,
    negotiations: bundle.negotiations.length,
    tasks: bundle.tasks.length,
    notes: bundle.notes.filter((n) => n.kind === 'note').length,
    timeline: bundle.notes.filter((n) => n.kind === 'timeline').length,
    documents: bundle.documents.length,
  }
}

export type BundleCounts = ReturnType<typeof bundleCounts>

export type BundleRecordEntry = {
  kind: MatterTableKind
  key: string
  hash: string
  data: Record<string, unknown>
  relationshipKeys: string[]
}

/**
 * Canonical source-side records used by reconciliation and the durable import
 * ledger. Relationships are explicit so an ID-remapped fixture can prove that
 * links survived sanitization and import.
 */
export function bundleRecordEntries(bundle: MatterBundle): BundleRecordEntry[] {
  const groups: Array<[MatterTableKind, Array<{ key: string } & Record<string, unknown>>]> = [
    ['contacts', bundle.contacts],
    ['medicalVisits', bundle.visits],
    ['medicalBills', bundle.bills],
    ['billingInvoices', bundle.billingInvoices],
    ['timeEntries', bundle.timeEntries],
    ['insurance', bundle.insurance],
    ['liens', bundle.liens],
    ['expenses', bundle.expenses],
    ['negotiations', bundle.negotiations],
    ['tasks', bundle.tasks],
    ['notes', bundle.notes.filter((n) => n.kind === 'note')],
    ['timeline', bundle.notes.filter((n) => n.kind === 'timeline')],
    ['documents', bundle.documents],
  ]
  return groups.flatMap(([kind, records]) =>
    records.map((record) => {
      const data = { ...record }
      const relationshipKeys =
        kind === 'medicalBills' && typeof data.visitKey === 'string' && data.visitKey
          ? [data.visitKey]
          : []
      return {
        kind,
        key: record.key,
        hash: stableRecordHash(data),
        data,
        relationshipKeys,
      }
    }),
  )
}

/** Every related-record key in a bundle, for the re-import manifest. */
export function bundleRecordKeys(bundle: MatterBundle): string[] {
  return bundleRecordEntries(bundle).map((record) => record.key)
}

export function matterIsImportable(bundle: MatterBundle): boolean {
  return !bundle.issues.some((i) => i.severity === 'error')
}
