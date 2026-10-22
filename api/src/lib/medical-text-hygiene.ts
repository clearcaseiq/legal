/**
 * Cleans the text read out of uploaded medical records and bills before any of
 * it is treated as a medical fact.
 *
 * Record text carries a lot that is not about the patient's care: watermarks,
 * page furniture, disclaimers, and on QA fixtures, "SYNTHETIC TEST DATA"
 * banners. The upload pipeline used to take the first line naming a clinic as
 * the provider and the first two sentences as the summary, so a banner became
 * the provider, the diagnosis text and every timeline row. PDF text often comes
 * out as a single line, which made "first line" mean "the whole document".
 *
 * Everything here is deterministic and dependency-free so the upload pipeline
 * and the read-time chronology can share it (the chronology re-derives events
 * from stored OCR text, which cleans files uploaded before this existed).
 */

/** Words that mark a passage as about the document rather than the care. */
const BOILERPLATE_RE =
  /\b(fictional|fictitious|synthetic|simulated|not authentic|not a real|qa material|qa requirements?|qa extraction|test data|test inputs?|for testing|watermark|sample only|specimen|placeholder|not for insurance|legal submission|not evidence of|disclaimer|confidentiality notice|do not (?:characterize|copy|distribute|assert))\b/i

/** A run of three or more ALL-CAPS words, the shape of a banner or watermark. */
const CAPS_RUN_RE = /(?:\b[A-Z][A-Z0-9'&.,/()]*\b(?:\s+[-–—]\s+|\s+)){2,}\b[A-Z][A-Z0-9'&.,/()]*\b/g

const PAGE_FURNITURE_RE = [/--\s*\d+\s+of\s+\d+\s*--/gi, /\bPage\s+\d+(?:\s+of\s+\d+)?\b/g]

export function isBoilerplate(text: string | null | undefined): boolean {
  return Boolean(text) && BOILERPLATE_RE.test(String(text))
}

/** Remove page furniture and banner/watermark runs; keep everything else in place. */
export function stripBoilerplate(text: string | null | undefined): string {
  let out = String(text || '')
  for (const re of PAGE_FURNITURE_RE) out = out.replace(re, ' ')
  out = out.replace(CAPS_RUN_RE, (run) => (BOILERPLATE_RE.test(run) ? ' ' : run))
  return out.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim()
}

/** Sentences that say something about the care, for summaries. */
export function clinicalSentences(text: string | null | undefined): string[] {
  return stripBoilerplate(text)
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3 && !BOILERPLATE_RE.test(s))
}

export function summarizeClinicalText(text: string | null | undefined): string {
  return clinicalSentences(text).slice(0, 2).join(' ').slice(0, 500)
}

// ---- Synthetic / test document detection ------------------------------------

const STRONG_SYNTHETIC: Array<[RegExp, string]> = [
  [/synthetic (?:test )?data/i, 'synthetic test data'],
  [/not a real (?:record|document|patient|bill)/i, 'not a real record'],
  [/not authentic evidence/i, 'not authentic evidence'],
  [/\bqa material\b/i, 'QA material'],
  [/\bfictional\b/i, 'fictional'],
  [/\bfictitious\b/i, 'fictitious'],
  [/for testing purposes/i, 'for testing purposes'],
  [/\bspecimen (?:copy|document|record)\b/i, 'specimen'],
  [/\bsample (?:record|document|bill|report)s? only\b/i, 'sample only'],
]
const WEAK_SYNTHETIC: Array<[RegExp, string]> = [
  [/\bsimulated\b/i, 'simulated'],
  [/\bdemo\b/i, 'demo'],
  [/\btest data\b/i, 'test data'],
  [/\bplaceholder\b/i, 'placeholder'],
]

/**
 * The labels that mark a document as test or sample material, or [] for a
 * genuine record. One strong label is enough; weak ones ("demo", "simulated")
 * appear in real records too, so it takes two.
 */
export function detectSyntheticMarkers(text: string | null | undefined): string[] {
  const s = String(text || '')
  if (!s) return []
  const strong = STRONG_SYNTHETIC.filter(([re]) => re.test(s)).map(([, label]) => label)
  const weak = WEAK_SYNTHETIC.filter(([re]) => re.test(s)).map(([, label]) => label)
  if (strong.length === 0 && weak.length < 2) return []
  return [...strong, ...weak]
}

// ---- Providers ----------------------------------------------------------------

const FACILITY_WORD =
  '(?:Hospital|Clinic|Medical Center|Medical Group|Health(?:care)?|Urgent Care|Emergency(?: Department| Room)?|Imaging|Radiology|Physical Therapy|Therapy|Rehab(?:ilitation)?|Orthopa?edics?|Chiropractic|Pain (?:Management|Center)|Neurology|Lab(?:oratory|s)?|Pharmacy|Surgery Center|Associates)'

/** Column headers and labels that sit in front of a provider name in a table row. */
const LEADING_LABELS = new Set(
  [
    'date', 'dos', 'service', 'services', 'provider', 'providers', 'facility', 'cpt', 'hcpcs', 'icd', 'code', 'codes',
    'charge', 'charges', 'amount', 'description', 'billing', 'summary', 'itemized', 'units', 'fee', 'page', 'line',
    'item', 'total', 'visit', 'patient', 'account', 'statement', 'client', 'case', 'name', 'from', 'to', 'remit',
  ],
)

/**
 * A provider name fit to show an attorney, or null. Strips table labels from
 * the front, and refuses banners, disclaimers and anything sentence-length.
 */
export function cleanProviderName(raw: string | null | undefined): string | null {
  let tokens = String(raw || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
  while (tokens.length && LEADING_LABELS.has(tokens[0].toLowerCase().replace(/[^a-z]/g, ''))) tokens = tokens.slice(1)
  const name = tokens.join(' ').replace(/^[^A-Za-z]+|[^A-Za-z.)]+$/g, '')
  if (!name || name.length < 3 || name.length > 80 || tokens.length > 8) return null
  if (isBoilerplate(name)) return null
  // A banner is mostly capitals; a facility name is mixed case or short.
  const letters = name.replace(/[^A-Za-z]/g, '')
  if (letters.length > 24 && letters === letters.toUpperCase()) return null
  return name
}

const PROVIDER_PHRASE_RE = new RegExp(`((?:[A-Z][A-Za-z&'.\\-]*\\s+){0,5}${FACILITY_WORD})\\b`, 'g')
const DOCTOR_RE = /\b(?:Dr\.?|Doctor)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/

/** The most-mentioned facility (or doctor) in the cleaned text. */
export function extractProviderName(text: string | null | undefined): string | undefined {
  const clean = stripBoilerplate(text)
  const counts = new Map<string, number>()
  for (const m of clean.matchAll(PROVIDER_PHRASE_RE)) {
    const name = cleanProviderName(m[1])
    if (name) counts.set(name, (counts.get(name) || 0) + 1)
  }
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  if (best) return best
  const doctor = DOCTOR_RE.exec(clean)
  return doctor ? cleanProviderName(`Dr. ${doctor[1]}`) || undefined : undefined
}

// ---- Dates --------------------------------------------------------------------

const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const DATE_RE =
  /\b(\d{4})-(\d{2})-(\d{2})\b|\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})\b/gi

function isoFromMatch(m: RegExpMatchArray): string | null {
  let y: number, mo: number, d: number
  if (m[1]) {
    y = Number(m[1]); mo = Number(m[2]); d = Number(m[3])
  } else if (m[4]) {
    y = Number(m[6].length === 2 ? `20${m[6]}` : m[6]); mo = Number(m[4]); d = Number(m[5])
  } else {
    y = Number(m[9]); mo = MONTH_NAMES.indexOf(m[7].slice(0, 3).toLowerCase()) + 1; d = Number(m[8])
  }
  if (!(mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= 2100)) return null
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Labels whose date is about the case or the document, not a date of care. */
const NON_CARE_DATE_LABEL =
  /(incident|accident|injury|date of loss|loss date|\bdol|\bdob|birth|born|printed|generated|run date|report date|statement date|case|claim)\s*(?:date)?\s*[:#-]?\s*$/i

/**
 * Dates of care in the text, as YYYY-MM-DD, in order of first appearance.
 * A date printed only after "Incident:", "DOB:", "Printed:" and the like is
 * left out; one that also appears unlabelled (e.g. in a bill line) is kept.
 */
export function careDates(text: string | null | undefined): string[] {
  const clean = stripBoilerplate(text)
  const kept: string[] = []
  for (const m of clean.matchAll(DATE_RE)) {
    const iso = isoFromMatch(m)
    if (!iso || kept.includes(iso)) continue
    const before = clean.slice(Math.max(0, (m.index ?? 0) - 30), m.index ?? 0)
    if (NON_CARE_DATE_LABEL.test(before)) continue
    kept.push(iso)
  }
  return kept
}

// ---- Bill and record line items -------------------------------------------------

export type MedicalLineItem = {
  date: string
  provider: string | null
  code: string | null
  amount: number
  /** The passage the item was read from, as printed. */
  quote: string
}

const LINE_DATE = '(?:\\d{4}-\\d{2}-\\d{2}|\\d{1,2}\\/\\d{1,2}\\/\\d{2,4})'
const LINE_ITEM_RE = new RegExp(
  `((?:[A-Z][A-Za-z&'.\\-]*\\s+){1,8}?)(${LINE_DATE})\\s+(?:([A-Z]\\d{4}|\\d{5})(?:-[A-Z0-9]{2})?\\s+)?(?:[A-Za-z][A-Za-z ,'/()-]{0,40}?\\s+)?\\$\\s?(\\d[\\d,]*(?:\\.\\d{2})?)`,
  'g',
)
const NOT_A_SERVICE = /\b(total|balance|payment|paid|adjust|write[- ]?off|credit|deductible|copay|insurance|refund)\b/i

/**
 * Rows of the shape "<provider> <date> [<CPT>] [description] $<amount>", which
 * is how itemized bills and ledgers print, whether or not the text kept its
 * line breaks. Totals, payments and adjustments are skipped.
 */
export function extractLineItems(text: string | null | undefined): MedicalLineItem[] {
  const clean = stripBoilerplate(text).replace(/\s+/g, ' ')
  const out: MedicalLineItem[] = []
  for (const m of clean.matchAll(LINE_ITEM_RE)) {
    const quote = m[0].trim()
    if (NOT_A_SERVICE.test(quote)) continue
    const dateMatch = [...m[2].matchAll(DATE_RE)][0]
    const date = dateMatch ? isoFromMatch(dateMatch) : null
    const amount = Number(m[4].replace(/,/g, ''))
    if (!date || !Number.isFinite(amount) || amount <= 0) continue
    out.push({ date, provider: cleanProviderName(m[1]), code: m[3] || null, amount, quote })
  }
  return out
}

export type CareVisitKind = 'er' | 'imaging' | 'therapy' | 'initial_eval' | 'follow_up' | 'procedure' | 'other'

/** Visit type from a provider name and CPT code, using the CPT range when the name says nothing. */
export function visitKindFor(provider: string | null, codes: string[]): CareVisitKind {
  const p = (provider || '').toLowerCase()
  const nums = codes.map((c) => Number(c)).filter((n) => Number.isFinite(n))
  if (/urgent care|emergency|\ber\b/.test(p) || nums.some((n) => n >= 99281 && n <= 99288)) return 'er'
  if (/imaging|radiology|mri|x-?ray/.test(p) || nums.some((n) => n >= 70010 && n <= 79999)) return 'imaging'
  if (/therapy|rehab|chiropract/.test(p) || nums.some((n) => n >= 97010 && n <= 97799)) return 'therapy'
  if (nums.some((n) => n >= 99202 && n <= 99205)) return 'initial_eval'
  if (nums.some((n) => n >= 99211 && n <= 99215)) return 'follow_up'
  if (nums.some((n) => n >= 10004 && n <= 69990)) return 'procedure'
  return 'other'
}

export const VISIT_KIND_LABELS: Record<CareVisitKind, string> = {
  er: 'Emergency or urgent care',
  imaging: 'Imaging',
  therapy: 'Physical therapy',
  initial_eval: 'Initial evaluation',
  follow_up: 'Office visit',
  procedure: 'Procedure',
  other: 'Medical service',
}

export type CareVisit = {
  date: string
  provider: string | null
  kind: CareVisitKind
  codes: string[]
  amount: number
  quotes: string[]
}

/** Line items folded into one visit per provider per day. */
export function visitsFromLineItems(items: MedicalLineItem[]): CareVisit[] {
  const byKey = new Map<string, CareVisit>()
  for (const item of items) {
    const key = `${item.date}|${(item.provider || '').toLowerCase()}`
    const visit = byKey.get(key) || { date: item.date, provider: item.provider, kind: 'other' as CareVisitKind, codes: [], amount: 0, quotes: [] }
    if (item.code && !visit.codes.includes(item.code)) visit.codes.push(item.code)
    visit.amount = Math.round((visit.amount + item.amount) * 100) / 100
    visit.quotes.push(item.quote)
    byKey.set(key, visit)
  }
  return [...byKey.values()]
    .map((v) => ({ ...v, kind: visitKindFor(v.provider, v.codes) }))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.provider || '').localeCompare(b.provider || ''))
}
