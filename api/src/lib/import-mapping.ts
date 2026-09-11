/**
 * Turning a row of somebody else's case-management export into our shape.
 *
 * Extracted from routes/attorney-dashboard.ts, where it was unreachable from a
 * test: importing that router pulls in the whole Express app. Nothing here
 * touches the database or the request, so it can be exercised directly against
 * the header spellings real CMS exports use.
 *
 * The guiding rule is that a column we cannot read produces an absent field,
 * never a plausible default. An imported case that is visibly incomplete is
 * something an attorney will fix; one that quietly carries a made-up figure is
 * not.
 */

import { parseIncidentDate } from './imported-date'

export const INTAKE_IMPORT_SOURCES = ['clio', 'filevine', 'needles', 'litify', 'spreadsheet'] as const

export type IntakeImportSource = (typeof INTAKE_IMPORT_SOURCES)[number]

export type ImportedNegotiationEvent = {
  eventType: 'demand' | 'offer'
  amount: number
  eventDate: Date | null
}

export type NormalizedImportedCase = {
  externalId: string | null
  claimType: string
  venueState: string
  venueCounty: string | null
  plaintiffFirstName: string
  plaintiffLastName: string
  plaintiffEmail: string
  plaintiffPhone: string
  incidentDate?: string
  /**
   * Why there is no `incidentDate`, in words for the attorney.
   *
   * Always set when `incidentDate` is absent, and null when it is present. The
   * row is still skipped either way — we do not invent a date of loss — but a
   * skipped row that says "45000 is a number, not a date. If that column holds
   * Excel dates, format it as a date before exporting" is one the attorney can
   * fix, where "no incident date" on a row with a number in the date column is
   * one they report as a bug.
   */
  incidentDateIssue: string | null
  /**
   * The date was read month-first but could have been day-first, e.g.
   * `03/04/2026`. Imported either way; surfaced so the attorney can check,
   * because they know their export's locale and we do not.
   */
  incidentDateAmbiguous: boolean
  narrative: string
  taskTitle?: string
  taskDueDate?: Date | null
  /** Mapped columns keyed by canonical facts path; see normalizeImportedCase. */
  factPaths: Record<string, string>
  /**
   * Diagnoses, as the valuation reads them. The engine classifies the primary
   * injury from this list, and an empty one drops the case to the lowest
   * severity tier however large the medical specials are.
   */
  injuryDiagnoses: string[]
  /** Prior offers and demands already on the file. */
  negotiation: ImportedNegotiationEvent[]
  raw: Record<string, string>
}

/**
 * The subset of extracted damages that `includeMedical` governs.
 *
 * Wage loss and property damage are deliberately not here: they are economic
 * damages, not medical records, and the checkbox that would suppress them is
 * labelled "Medical specials".
 */
export const MEDICAL_FACT_PATHS = ['damages.med_charges', 'damages.med_paid', 'damages.future_medical']

/**
 * The mapped columns to actually write, after the "Medical specials" checkbox.
 *
 * Unchecking it drops the medical figures rather than importing them quietly,
 * which is the whole point of the control — a firm that keeps its billing
 * elsewhere does not want a stale specials number driving our valuation.
 */
export function importableFactPaths(
  factPaths: Record<string, string>,
  includeMedical: boolean,
): Record<string, string> {
  if (includeMedical) return factPaths
  return Object.fromEntries(
    Object.entries(factPaths).filter(([path]) => !MEDICAL_FACT_PATHS.includes(path)),
  )
}

/** Case, spaces and punctuation all ignored, so "Date of Loss", "date_of_loss" and "DateOfLoss" are one name. */
function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * The last segment of a dotted path: `case.incident_date` -> `incident_date`.
 *
 * A JSON export nests, and `flattenRow` records that nesting in the key. So a
 * perfectly ordinary Clio case file arrived with columns named
 * `case.incident_date` and `client.first_name`, which match none of the rules
 * below — the incident date went unread and every row was skipped for not
 * having one. Matching the leaf as well is what makes a nested export legible.
 */
export function headerLeaf(header: string): string {
  const index = header.lastIndexOf('.')
  return index === -1 ? header : header.slice(index + 1)
}

/**
 * The first candidate header present in the row.
 *
 * Each candidate is tried against the full column name first and then against
 * the leaf of a dotted one, rather than trying every column name and only then
 * every leaf. Candidate lists here are written most-specific-first, and that
 * order is the more meaningful of the two: for a Clio file the narrative rules
 * are `['narrative', 'description', ..., 'notes']`, and a pass-major order
 * would match the top-level `notes` array before the `incident.description`
 * the attorney actually wants.
 */
export function getImportField(row: Record<string, string>, candidates: string[]) {
  const entries = Object.entries(row)
  for (const candidate of candidates) {
    const wanted = normalizeHeader(candidate)
    if (!wanted) continue
    const exact = entries.find(([key]) => normalizeHeader(key) === wanted)
    if (exact?.[1]) return exact[1].trim()
    const leaf = entries.find(([key]) => normalizeHeader(headerLeaf(key)) === wanted)
    if (leaf?.[1]) return leaf[1].trim()
  }
  return ''
}

export function splitClientName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: '', lastName: '' }
  if (parts.length === 1) return { firstName: parts[0], lastName: '' }
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] }
}

export function normalizeClaimType(value: string) {
  const text = value.toLowerCase()
  if (text.includes('premise') || text.includes('slip') || text.includes('fall')) return 'slip_and_fall'
  if (text.includes('medical') || text.includes('malpractice') || text.includes('med mal')) return 'medmal'
  if (text.includes('dog')) return 'dog_bite'
  if (text.includes('auto') || text.includes('motor') || text.includes('vehicle') || text.includes('mva')) return 'auto'
  return value ? value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') : 'auto'
}

/**
 * The incident date, or `undefined` with nothing said about why.
 *
 * Kept for callers that only want the date. Anything reporting back to the
 * attorney should use `parseIncidentDate` directly and show its reason —
 * telling someone their row has "no incident date" when the cell plainly
 * contains `45000` sends them looking in the wrong place.
 */
export function normalizeIncidentDate(value: string) {
  const parsed = parseIncidentDate(value)
  return parsed.ok ? parsed.date : undefined
}

/**
 * A task deadline, which unlike an incident date may legitimately be ahead of
 * us — so this keeps its own lenient parse rather than borrowing the strict
 * one. A deadline we misread is a wrong reminder; a date of loss we misread is
 * a wrong statute of limitations.
 */
export function normalizeTaskDueDate(value: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Drop unmapped columns so a blank cell never overwrites anything. */
export function pruneEmpty(values: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => Boolean(value)))
}

/**
 * One diagnosis per entry.
 *
 * CMS exports put several in one cell, separated by whatever the person
 * typing felt like. Kept as separate strings because the engine matches each
 * against its injury vocabulary; a single joined string still matches, but
 * splitting keeps the stored facts readable on the case file.
 */
export function splitDiagnoses(value: string): string[] {
  if (!value.trim()) return []
  return value
    .split(/[;,|/]+|\band\b/i)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 12)
}

/**
 * A currency cell as a number, or null when there is no figure in it.
 *
 * Zero is null on purpose here: a "$0" in a last-offer column means the
 * carrier has not offered, and recording it as an offer event would show the
 * attorney a negotiation that never happened.
 */
export function parseImportedMoney(value: string): number | null {
  if (!value.trim()) return null
  const cleaned = value.replace(/[$,\s]/g, '')
  const parsed = Number(cleaned)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
}

/** Null unless the row carries a usable amount; a dateless offer is still an offer. */
function importedNegotiationEvent(
  eventType: 'demand' | 'offer',
  row: Record<string, string>,
  headers: { amount: string[]; date: string[] },
): ImportedNegotiationEvent | null {
  const amount = parseImportedMoney(getImportField(row, headers.amount))
  if (amount === null) return null
  const raw = getImportField(row, headers.date)
  const parsed = raw ? new Date(raw) : null
  return {
    eventType,
    amount,
    eventDate: parsed && !Number.isNaN(parsed.getTime()) ? parsed : null,
  }
}

const SOURCE_SPECIFIC_HEADERS: Record<IntakeImportSource, Record<string, string[]>> = {
  clio: {
    externalId: ['matter id', 'matter number', 'id', 'display number'],
    clientName: ['client name', 'client', 'primary client'],
    claimType: ['practice area', 'matter type', 'case type'],
    narrative: ['description', 'matter description', 'notes'],
  },
  filevine: {
    externalId: ['project id', 'projectId', 'project number', 'filevine id'],
    clientName: ['client name', 'clientName', 'contact name', 'project name'],
    claimType: ['project type', 'case type', 'phase name'],
    narrative: ['project description', 'summary', 'facts', 'notes'],
  },
  needles: {
    externalId: ['case number', 'case_num', 'file number', 'matter number'],
    clientName: ['client', 'client name', 'party name'],
    claimType: ['case type', 'matter type', 'classification'],
    narrative: ['case facts', 'description', 'notes', 'memo'],
  },
  litify: {
    externalId: ['matter id', 'litify id', 'matter name', 'case id'],
    clientName: ['client name', 'client', 'account name', 'matter name'],
    claimType: ['matter type', 'case type', 'practice area'],
    narrative: ['description', 'case summary', 'facts', 'notes'],
  },
  spreadsheet: {
    externalId: ['external id', 'case id', 'matter id', 'file number'],
    clientName: ['client name', 'plaintiff name', 'name'],
    claimType: ['claim type', 'case type', 'matter type'],
    narrative: ['narrative', 'description', 'facts', 'notes'],
  },
}

export function normalizeImportedCase(
  source: IntakeImportSource,
  row: Record<string, string>,
  mapping?: Record<string, string>,
): NormalizedImportedCase {
  // A user-supplied mapping (canonical field -> source header) takes priority
  // over the source's auto-detect candidates.
  const mapped = (field: string): string[] => {
    const header = mapping?.[field]
    return header ? [header] : []
  }
  const candidates = SOURCE_SPECIFIC_HEADERS[source]
  const clientName = getImportField(row, candidates.clientName)
  const splitName = splitClientName(clientName)
  const firstName = getImportField(row, [...mapped('firstName'), 'plaintiff first name', 'first name', 'client first name', 'firstName']) || splitName.firstName
  const lastName = getImportField(row, [...mapped('lastName'), 'plaintiff last name', 'last name', 'client last name', 'lastName']) || splitName.lastName
  const claimType = getImportField(row, [...mapped('caseType'), 'claim type', 'case type', 'matter type', ...candidates.claimType])
  const incident = parseIncidentDate(
    getImportField(row, [...mapped('incidentDate'), 'incident date', 'date of loss', 'dol', 'doi', 'accident date']),
  )

  return {
    externalId: getImportField(row, [...mapped('externalId'), 'external id', 'case id', 'matter id', ...candidates.externalId]) || null,
    claimType: normalizeClaimType(claimType),
    venueState: (getImportField(row, [...mapped('state'), 'venue state', 'state', 'jurisdiction state']) || 'CA').toUpperCase(),
    venueCounty: getImportField(row, [...mapped('county'), 'venue county', 'county', 'jurisdiction county']) || null,
    plaintiffFirstName: firstName,
    plaintiffLastName: lastName,
    plaintiffEmail: getImportField(row, [...mapped('email'), 'plaintiff email', 'client email', 'email']),
    plaintiffPhone: getImportField(row, [...mapped('phone'), 'plaintiff phone', 'client phone', 'phone', 'mobile']),
    incidentDate: incident.ok ? incident.date : undefined,
    incidentDateIssue: incident.ok ? null : incident.reason,
    incidentDateAmbiguous: incident.ok && incident.ambiguous,
    narrative: getImportField(row, [...mapped('description'), 'narrative', 'description', 'facts', 'summary', ...candidates.narrative]),
    taskTitle: getImportField(row, ['next task', 'task title', 'deadline name']),
    taskDueDate: normalizeTaskDueDate(getImportField(row, ['task due date', 'deadline', 'due date'])),
    // Keyed by canonical facts path. These were not captured at all before, so
    // an imported case arrived with no carrier, no claim number and no policy
    // limit however fully the export had been filled in — which is most of why
    // imported cases could not be valued. The factory writes them through
    // `applyFactPath`, which also fills each key's aliases.
    factPaths: pruneEmpty({
      'insurance.defendant_carrier': getImportField(row, [
        ...mapped('carrier'), 'carrier', 'insurance carrier', 'defendant carrier', 'adverse carrier', 'insurer',
        // Matches `insurance.company` on a nested export by its full path.
        // Its leaf, a bare `company`, is deliberately not a rule here: on a
        // flat spreadsheet that column is as likely to be the employer.
        'insurance company', 'insurance.company',
      ]),
      'insurance.claim_number': getImportField(row, [
        ...mapped('claimNumber'), 'claim number', 'claim no', 'claim #', 'claimnumber',
      ]),
      'insurance.defendant_coverage_limits': getImportField(row, [
        ...mapped('policyLimit'), 'policy limit', 'policy limits', 'coverage limit', 'bi limit',
      ]),
      'caseAcceleration.wageLoss.employerName': getImportField(row, [
        ...mapped('employer'), 'employer', 'employer name', 'place of employment',
      ]),
      'defendant.name': getImportField(row, [
        ...mapped('defendant'), 'defendant', 'defendant name', 'at-fault party', 'adverse party',
      ]),
      // The damages that actually move the number. Without medical specials
      // the underwriting engine has nothing to multiply, which is why every
      // imported case used to value at the per-injury floor regardless of how
      // complete the export was. `applyFactPath` mirrors each into the
      // `intake_*` key the recalculation reads.
      'damages.med_charges': getImportField(row, [
        ...mapped('medicalSpecials'), 'medical specials', 'medical bills', 'total medicals', 'total meds',
        'meds', 'medical charges', 'billed charges', 'specials',
      ]),
      'damages.med_paid': getImportField(row, [
        ...mapped('medicalPaid'), 'medical paid', 'meds paid', 'paid medicals', 'amount paid',
      ]),
      'damages.future_medical': getImportField(row, [
        ...mapped('futureMedical'), 'future medical', 'future medicals', 'future care', 'future treatment cost',
      ]),
      'damages.wage_loss': getImportField(row, [
        ...mapped('wageLoss'), 'wage loss', 'lost wages', 'lost income', 'lost earnings',
      ]),
      'damages.estimated_property_damage': getImportField(row, [
        ...mapped('propertyDamage'), 'property damage', 'vehicle damage', 'pd amount',
      ]),
    }),
    injuryDiagnoses: splitDiagnoses(
      getImportField(row, [
        ...mapped('injuries'), 'injury', 'injuries', 'diagnosis', 'diagnoses', 'body parts',
        'injury description', 'injured body parts', 'injuries reported', 'reported injuries',
      ]),
    ),
    negotiation: [
      importedNegotiationEvent('demand', row, {
        amount: [...mapped('demandAmount'), 'demand amount', 'demand', 'policy demand', 'demand sent'],
        date: ['demand date', 'date of demand', 'demand sent date'],
      }),
      importedNegotiationEvent('offer', row, {
        amount: [...mapped('offerAmount'), 'offer amount', 'last offer', 'current offer', 'offer', 'best offer'],
        date: ['offer date', 'date of offer', 'last offer date'],
      }),
    ].filter((event): event is ImportedNegotiationEvent => event !== null),
    raw: row,
  }
}
