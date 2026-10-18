/**
 * Document findings: visits, charges and wage figures read out of uploaded
 * records, and the facts of police reports and insurance documents, each tied
 * to the page and passage it came from, proposed to the attorney for the
 * Medical timeline, Damages ledger, Liability tab and Insurance tab.
 *
 * Nothing read here reaches the case on its own. A finding becomes a timeline
 * entry, ledger line, police report or policy only when an attorney accepts it,
 * and the accepted row keeps the file, page and quote so a demand can cite
 * where each figure came from.
 *
 * The model is not trusted to have read correctly. `verifyCandidate` checks
 * every finding against the page text before it is stored: a quote that is not
 * on the page drops the finding, and a date, amount or code that is not on the
 * page is cleared rather than kept. A model that "summarises" a bill into a
 * figure it never printed produces nothing.
 */
import crypto from 'crypto'
import { prisma } from './prisma'
import { logger } from './logger'
import { getLlmChatClient, LLM_CHAT_MODEL } from './llm-client'
import { llmAllowPhi } from './llm-prompt-sanitize'
import { recordAiRun } from './ai-run'
import { isHardIdentityMismatch, parseIdentityCheck } from './claimant-identity-check'
import { createMedicalEntry, VISIT_TYPES } from './medical-record'
import { MEDICAL_BILLING_STATUSES, recordDamageItemChanges, writeThroughDamages } from './damages-ledger'
import { createDefendant, createEvidenceItem, listLiabilityParties, updateEvidenceItem } from './liability-parties'
import { getLiabilityRecord, upsertLiabilityRecord } from './liability-record'

export type FindingKind = 'treatment_visit' | 'medical_charge' | 'wage_loss' | 'incident_report' | 'insurance_policy'
export const FINDING_KINDS: FindingKind[] = ['treatment_visit', 'medical_charge', 'wage_loss', 'incident_report', 'insurance_policy']

/** Kinds read from records covered by the client's medical-sharing authorization. */
export const MEDICAL_FINDING_KINDS: FindingKind[] = ['treatment_visit', 'medical_charge', 'wage_loss']

type CategoryGroup = 'medical' | 'police' | 'insurance'

/** Upload categories by what is read from them. Insurance spellings follow DOCUMENT_REQUEST_CATEGORY_MAP. */
const CATEGORY_GROUPS: Record<CategoryGroup, string[]> = {
  medical: ['medical_records', 'bills', 'wage_verification'],
  police: ['police_report', 'police'],
  insurance: ['insurance', 'insurance_letters', 'insurance_card', 'insurance_info', 'insurance_policy', 'dec_page', 'declarations'],
}

const GROUP_KINDS: Record<CategoryGroup, FindingKind[]> = {
  medical: MEDICAL_FINDING_KINDS,
  police: ['incident_report'],
  insurance: ['insurance_policy'],
}

/** Document categories read for findings. Photos carry nothing to read. */
export const FINDING_CATEGORIES = new Set(Object.values(CATEGORY_GROUPS).flat())

function groupOf(category: string): CategoryGroup | null {
  for (const g of Object.keys(CATEGORY_GROUPS) as CategoryGroup[]) {
    if (CATEGORY_GROUPS[g].includes(category)) return g
  }
  return null
}

/** The upload categories that produce these kinds; every category when no kinds are given. */
export function categoriesForKinds(kinds?: FindingKind[]): string[] {
  if (!kinds?.length) return [...FINDING_CATEGORIES]
  return (Object.keys(CATEGORY_GROUPS) as CategoryGroup[])
    .filter((g) => GROUP_KINDS[g].some((k) => kinds.includes(k)))
    .flatMap((g) => CATEGORY_GROUPS[g])
}

export const CITATION_TARGETS = ['none', 'defendant', 'plaintiff', 'both'] as const
export const INSURED_PARTIES = ['defendant', 'client'] as const
export const COVERAGE_TYPES = ['liability', 'um', 'uim', 'medpay', 'other'] as const

export type PageText = { page: number | null; text: string }

export interface FindingData {
  // Police / incident report
  time?: string | null
  location?: string | null
  reportNumber?: string | null
  agency?: string | null
  officer?: string | null
  citationIssuedTo?: string | null
  defendantName?: string | null
  defendantInsurer?: string | null
  defendantPolicyNumber?: string | null
  witnessCount?: number | null
  // Insurance policy
  carrierName?: string | null
  policyNumber?: string | null
  claimNumber?: string | null
  insuredName?: string | null
  insuredParty?: string | null
  coverageType?: string | null
  policyLimit?: number | null
  perAccidentLimit?: number | null
  adjusterName?: string | null
  adjusterEmail?: string | null
  adjusterPhone?: string | null
  // Visits, charges, wages
  date?: string | null
  endDate?: string | null
  provider?: string | null
  specialty?: string | null
  visitType?: string | null
  diagnosis?: string | null
  icdCodes?: string[]
  cptCodes?: string[]
  amount?: number | null
  billingStatus?: string | null
  description?: string | null
  /** What survived verification against the page. */
  checks?: { date: boolean; amount: boolean }
  /** An existing timeline entry or ledger line that looks like the same thing. */
  possibleDuplicateOf?: string | null
}

export interface CandidateFinding {
  kind: FindingKind
  page: number | null
  quote: string
  confidence: number
  data: FindingData
}

const MAX_CHUNK_CHARS = 24_000
const MAX_CHUNKS_PER_FILE = 12
const MAX_QUOTE_CHARS = 400

/** Lowercase letters and digits only, so OCR spacing and punctuation cannot defeat a match. */
export function normalizeForMatch(text: string): string {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']

/** The ways a date is printed on records, normalised the same way as page text. */
export function dateSpellings(iso: string): string[] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return []
  const [, y, mm, dd] = m
  const month = Number(mm)
  const day = Number(dd)
  if (month < 1 || month > 12 || day < 1 || day > 31) return []
  const yy = y.slice(2)
  const name = MONTHS[month - 1]
  const forms = [
    `${mm}/${dd}/${y}`,
    `${month}/${day}/${y}`,
    `${mm}/${dd}/${yy}`,
    `${month}/${day}/${yy}`,
    `${y}-${mm}-${dd}`,
    `${name} ${day} ${y}`,
    `${name.slice(0, 3)} ${day} ${y}`,
    `${day} ${name} ${y}`,
    `${day} ${name.slice(0, 3)} ${y}`,
  ]
  return [...new Set(forms.map(normalizeForMatch))]
}

function containsPhrase(haystackNormalized: string, needleNormalized: string): boolean {
  if (!needleNormalized) return false
  return ` ${haystackNormalized} `.includes(` ${needleNormalized} `)
}

/** Every number printed on the page, so a claimed amount can be checked against it. */
function numbersOn(text: string): number[] {
  const out: number[] = []
  for (const m of String(text || '').matchAll(/\d[\d,]*(?:\.\d{1,2})?/g)) {
    const n = Number(m[0].replace(/,/g, ''))
    if (Number.isFinite(n)) out.push(n)
  }
  return out
}

function isoDate(value: unknown): string | null {
  const s = String(value ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const d = new Date(`${s}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? null : s
}

function cleanText(value: unknown, max = 200): string | null {
  const s = String(value ?? '').replace(/\s+/g, ' ').trim()
  return s ? s.slice(0, max) : null
}

function codeList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map((v) => String(v || '').trim().toUpperCase()).filter((v) => /^[A-Z0-9][A-Z0-9.]{2,9}$/.test(v)))]
}

const NAME_FILLER = new Set(['the', 'of', 'and', 'insurance', 'company', 'co', 'inc', 'llc', 'corp', 'corporation', 'group', 'mutual'])

/** A name the page prints, in any order ("SMITH, JOHN" for "John Smith"). Filler words in carrier names are ignored. */
function nameOnPage(name: string | null, pageNorm: string): string | null {
  if (!name) return null
  const tokens = normalizeForMatch(name).split(' ').filter((t) => t.length > 1 && !NAME_FILLER.has(t))
  if (!tokens.length) return null
  return tokens.every((t) => containsPhrase(pageNorm, t)) ? name : null
}

/** A report, policy or claim number the page prints. */
function referenceOnPage(value: unknown, pageNorm: string): string | null {
  const s = cleanText(value, 60)
  if (!s || !/\d/.test(s)) return null
  return containsPhrase(pageNorm, normalizeForMatch(s)) ? s : null
}

function amountOnPage(value: unknown, pageText: string): number | null {
  const n = Number(value)
  if (value == null || value === '' || !Number.isFinite(n) || n <= 0) return null
  return numbersOn(pageText).some((m) => Math.abs(m - n) < 0.005) ? Math.round(n * 100) / 100 : null
}

function verifyIncidentReport(raw: any, pageText: string, pageNorm: string): FindingData {
  const citation = String(raw?.citationIssuedTo || '')
  const witnesses = Number(raw?.witnessCount)
  return {
    time: cleanText(raw?.time, 20),
    location: cleanText(raw?.location, 200),
    reportNumber: referenceOnPage(raw?.reportNumber, pageNorm),
    agency: cleanText(raw?.agency, 120),
    officer: nameOnPage(cleanText(raw?.officer, 120), pageNorm),
    citationIssuedTo: (CITATION_TARGETS as readonly string[]).includes(citation) ? citation : null,
    defendantName: nameOnPage(cleanText(raw?.defendantName, 120), pageNorm),
    defendantInsurer: nameOnPage(cleanText(raw?.defendantInsurer, 120), pageNorm),
    defendantPolicyNumber: referenceOnPage(raw?.defendantPolicyNumber, pageNorm),
    witnessCount: Number.isInteger(witnesses) && witnesses >= 0 && witnesses <= 50 ? witnesses : null,
    description: cleanText(raw?.description, 300),
  }
}

function verifyInsurancePolicy(raw: any, pageText: string, pageNorm: string): FindingData {
  const insuredParty = String(raw?.insuredParty || '')
  const coverageType = String(raw?.coverageType || '')
  const email = cleanText(raw?.adjusterEmail, 120)?.toLowerCase() || null
  const phoneDigits = String(raw?.adjusterPhone || '').replace(/\D/g, '')
  const pageDigits = pageText.replace(/\D/g, '')
  return {
    carrierName: nameOnPage(cleanText(raw?.carrierName, 120), pageNorm),
    policyNumber: referenceOnPage(raw?.policyNumber, pageNorm),
    claimNumber: referenceOnPage(raw?.claimNumber, pageNorm),
    insuredName: nameOnPage(cleanText(raw?.insuredName, 120), pageNorm),
    insuredParty: (INSURED_PARTIES as readonly string[]).includes(insuredParty) ? insuredParty : null,
    coverageType: (COVERAGE_TYPES as readonly string[]).includes(coverageType) ? coverageType : null,
    policyLimit: amountOnPage(raw?.policyLimit, pageText),
    perAccidentLimit: amountOnPage(raw?.perAccidentLimit, pageText),
    adjusterName: nameOnPage(cleanText(raw?.adjusterName, 120), pageNorm),
    adjusterEmail: email && pageText.toLowerCase().includes(email) ? email : null,
    adjusterPhone: phoneDigits.length >= 10 && pageDigits.includes(phoneDigits.slice(-10)) ? cleanText(raw?.adjusterPhone, 30) : null,
  }
}

/**
 * Check a candidate against the page it claims to come from. Returns null when
 * the passage is not on any page; otherwise the candidate with every field the
 * page does not show cleared, and the page corrected if the quote was found on
 * a different one.
 */
export function verifyCandidate(raw: any, pages: PageText[]): CandidateFinding | null {
  const kind = String(raw?.kind || '') as FindingKind
  if (!FINDING_KINDS.includes(kind)) return null
  const quote = cleanText(raw?.quote, MAX_QUOTE_CHARS)
  const quoteNorm = normalizeForMatch(quote || '')
  if (!quote || quoteNorm.length < 12) return null

  const claimedPage = Number.isFinite(Number(raw?.page)) ? Number(raw.page) : null
  const ordered = [
    ...pages.filter((p) => p.page === claimedPage),
    ...pages.filter((p) => p.page !== claimedPage),
  ]
  const source = ordered.find((p) => containsPhrase(normalizeForMatch(p.text), quoteNorm))
  if (!source) return null
  const pageNorm = normalizeForMatch(source.text)

  const date = isoDate(raw?.date)
  const dateOnPage = date ? dateSpellings(date).some((form) => containsPhrase(pageNorm, form)) : false

  if (kind === 'incident_report' || kind === 'insurance_policy') {
    const fields =
      kind === 'incident_report'
        ? verifyIncidentReport(raw, source.text, pageNorm)
        : verifyInsurancePolicy(raw, source.text, pageNorm)
    // A report with no date, number or party, or a policy with no carrier, gives the attorney nothing to check.
    if (kind === 'incident_report' && !dateOnPage && !fields.reportNumber && !fields.defendantName) return null
    if (kind === 'insurance_policy' && !fields.carrierName) return null
    let conf = Number(raw?.confidence)
    if (!Number.isFinite(conf)) conf = 0.6
    conf = Math.max(0, Math.min(1, conf))
    if (date && !dateOnPage) conf = Math.min(conf, 0.4)
    return {
      kind,
      page: source.page,
      quote,
      confidence: conf,
      data: { ...fields, date: dateOnPage ? date : null, checks: { date: dateOnPage, amount: false } },
    }
  }

  const endDate = isoDate(raw?.endDate)
  const endDateOnPage = endDate ? dateSpellings(endDate).some((form) => containsPhrase(pageNorm, form)) : false

  const rawAmount = Number(raw?.amount)
  const amountGiven = raw?.amount != null && raw?.amount !== '' && Number.isFinite(rawAmount) && rawAmount > 0
  const amountOnPage = amountGiven && numbersOn(source.text).some((n) => Math.abs(n - rawAmount) < 0.005)
  if ((kind === 'medical_charge' || kind === 'wage_loss') && !amountOnPage) return null

  const pageUpper = source.text.toUpperCase()
  const onPage = (code: string) => pageUpper.includes(code)
  const visitType = String(raw?.visitType || '')
  const billingStatus = String(raw?.billingStatus || '')

  const data: FindingData = {
    date: dateOnPage ? date : null,
    endDate: endDateOnPage ? endDate : null,
    provider: cleanText(raw?.provider, 160),
    specialty: cleanText(raw?.specialty, 80),
    diagnosis: cleanText(raw?.diagnosis, 300),
    icdCodes: codeList(raw?.icdCodes).filter(onPage),
    cptCodes: codeList(raw?.cptCodes).filter(onPage),
    description: cleanText(raw?.description, 200),
    checks: { date: dateOnPage, amount: Boolean(amountOnPage) },
  }
  if (kind === 'treatment_visit') {
    data.visitType = (VISIT_TYPES as readonly string[]).includes(visitType) ? visitType : 'other'
  }
  if (amountOnPage) data.amount = Math.round(rawAmount * 100) / 100
  if (kind === 'medical_charge') {
    data.billingStatus = (MEDICAL_BILLING_STATUSES as readonly string[]).includes(billingStatus) ? billingStatus : 'billed'
  }

  let confidence = Number(raw?.confidence)
  if (!Number.isFinite(confidence)) confidence = 0.6
  confidence = Math.max(0, Math.min(1, confidence))
  // A visit whose date is not on the page is still worth proposing, but it is
  // the attorney who has to supply the date.
  if (date && !dateOnPage) confidence = Math.min(confidence, 0.4)
  if (kind === 'treatment_visit' && !data.date) confidence = Math.min(confidence, 0.5)

  return { kind, page: source.page, quote, confidence, data }
}

/** Same visit or charge read twice produces the same key. */
export function findingFingerprint(c: Pick<CandidateFinding, 'kind' | 'data'>): string {
  const key = (v?: string | null) => normalizeForMatch(v || '')
  if (c.kind === 'incident_report') {
    const parts = [c.kind, c.data.date || '', key(c.data.reportNumber), key(c.data.defendantName)]
    return crypto.createHash('sha1').update(parts.join('|')).digest('hex')
  }
  if (c.kind === 'insurance_policy') {
    const carrier = key(c.data.carrierName).split(' ')[0] || ''
    const parts = [c.kind, carrier, key(c.data.policyNumber), key(c.data.claimNumber)]
    return crypto.createHash('sha1').update(parts.join('|')).digest('hex')
  }
  const providerKey = normalizeForMatch(c.data.provider || '').split(' ').slice(0, 3).join(' ')
  const parts = [
    c.kind,
    c.data.date || '',
    providerKey,
    c.data.amount != null ? c.data.amount.toFixed(2) : '',
    [...(c.data.cptCodes || [])].sort().join(','),
    c.data.date ? '' : normalizeForMatch(c.data.description || c.data.diagnosis || '').slice(0, 60),
  ]
  return crypto.createHash('sha1').update(parts.join('|')).digest('hex')
}

/** Split pages into prompt-sized chunks without cutting a page in half. */
export function chunkPages(pages: PageText[], maxChars = MAX_CHUNK_CHARS): PageText[][] {
  const chunks: PageText[][] = []
  let current: PageText[] = []
  let size = 0
  for (const p of pages) {
    const text = p.text.length > maxChars ? p.text.slice(0, maxChars) : p.text
    if (size + text.length > maxChars && current.length) {
      chunks.push(current)
      current = []
      size = 0
    }
    current.push({ page: p.page, text })
    size += text.length
  }
  if (current.length) chunks.push(current)
  return chunks
}

const SHARED_FIELDS = `- "page": the page number the quote is on.
- "quote": a passage copied exactly, character for character, from that page that shows the fact. At most 300 characters.`

function buildPoliceReportPrompt(body: string, file: { category: string; originalName: string }): string {
  return `Document category: ${file.category}. File name: ${file.originalName}.

Read this police or incident report and record what it states about the incident.

Return JSON: {"findings": [ ... ]}, normally one finding for the report. Each finding has:
- "kind": "incident_report".
${SHARED_FIELDS} Prefer the passage that prints the report number, date or the parties.
- "date": date of the incident as YYYY-MM-DD, "time" as printed, "location" as printed,
  "reportNumber": the report / case / incident number exactly as printed, "agency", "officer",
  "citationIssuedTo": "defendant" if the other party was cited, "plaintiff" if our client was, "both", or "none" when the report says no citation was issued,
  "defendantName": the other party (driver, owner) as printed, "defendantInsurer" and "defendantPolicyNumber" as printed,
  "witnessCount": the number of independent witnesses listed, "description": one sentence summarising how the report says it happened, "confidence": 0 to 1.

Our client is the claimant named in the case; the defendant is the other party. Only report what the page prints. Leave out a field the page does not show. Return {"findings": []} if this is not an incident report.

${body}`
}

function buildInsurancePrompt(body: string, file: { category: string; originalName: string }): string {
  return `Document category: ${file.category}. File name: ${file.originalName}.

Read these insurance documents (cards, declarations pages, claim letters) and record each insurance policy they describe.

Return JSON: {"findings": [ ... ]}, one finding per policy. Each finding has:
- "kind": "insurance_policy".
${SHARED_FIELDS} Prefer the passage that prints the carrier with the policy or claim number.
- "carrierName", "policyNumber", "claimNumber", "insuredName" exactly as printed,
  "insuredParty": "client" when the policy is our client's own, "defendant" when it is the other party's,
  "coverageType": liability, um, uim, medpay or other,
  "policyLimit": the per-person bodily injury limit in dollars as printed, "perAccidentLimit": the per-accident limit,
  "adjusterName", "adjusterEmail", "adjusterPhone" as printed, "confidence": 0 to 1.

Only report what the page prints. Do not convert "25/50" into dollars unless the page prints the dollar figures. Return {"findings": []} if no policy is described.

${body}`
}

function buildPrompt(chunk: PageText[], file: { category: string; originalName: string }): string {
  const body = chunk.map((p) => `=== PAGE ${p.page ?? 1} ===\n${p.text}`).join('\n\n')
  const group = groupOf(file.category)
  if (group === 'police') return buildPoliceReportPrompt(body, file)
  if (group === 'insurance') return buildInsurancePrompt(body, file)
  return `Document category: ${file.category}. File name: ${file.originalName}.

Read the pages below and list what they document about the patient's injury treatment and losses.

Return JSON: {"findings": [ ... ]}. Each finding has:
- "kind": "treatment_visit" for one encounter (office visit, ER visit, imaging study, therapy session, procedure, surgery); "medical_charge" for one billed charge, preferring one per date of service and never listing both a total and the line items it adds up; "wage_loss" for a stated amount of lost wages or pay.
- "page": the page number the quote is on.
- "quote": a passage copied exactly, character for character, from that page that shows the fact. Include the date and the amount when the page prints them. At most 300 characters.
- "date": date of service as YYYY-MM-DD, "endDate" for a course of care, "provider", "specialty",
  "visitType": one of initial_eval, follow_up, procedure, surgery, imaging, therapy, er, other,
  "diagnosis": the diagnosis in plain words, "icdCodes": ICD-10 codes printed on the page, "cptCodes": CPT/HCPCS codes printed on the page,
  "amount": the dollar figure exactly as printed, "billingStatus": billed, paid, outstanding, reduced or written_off,
  "description": a few words naming the service, "confidence": 0 to 1.

Rules: only report what the page prints. Do not calculate, total, estimate or infer. Leave out a field the page does not show. Skip pages about anyone other than the patient, and skip insurance correspondence that documents no treatment or charge. Return {"findings": []} if nothing qualifies.

${body}`
}

async function extractWithModel(
  pages: PageText[],
  file: { id: string; assessmentId: string; category: string; originalName: string },
): Promise<{ candidates: unknown[]; chunks: number }> {
  const client = getLlmChatClient()
  if (!client) return { candidates: [], chunks: 0 }
  const chunks = chunkPages(pages).slice(0, MAX_CHUNKS_PER_FILE)
  const candidates: unknown[] = []
  for (const chunk of chunks) {
    const completion = await client.chat.completions.create({
      model: LLM_CHAT_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You extract facts from personal-injury case documents for attorney review. Report only what is printed. Never invent, calculate or infer. Always respond with valid JSON.',
        },
        { role: 'user', content: buildPrompt(chunk, file) },
      ],
      temperature: 0,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    })
    const text = completion.choices[0]?.message?.content
    if (!text) continue
    try {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed?.findings)) candidates.push(...parsed.findings)
    } catch {
      logger.warn('Document findings: unparseable model response', { fileId: file.id })
    }
  }
  return { candidates, chunks: chunks.length }
}

const DATE_IN_LINE =
  /\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b|\b(\d{4})-(\d{2})-(\d{2})\b/
const MONEY_IN_LINE = /\$\s?(\d[\d,]*(?:\.\d{2})?)/
const NOT_A_CHARGE = /\b(total|balance|payment|paid|adjust|write[- ]?off|credit|deductible|copay|insurance)\b/i

/**
 * Without a model, read only what needs no judgement: bill lines that print a
 * date of service and a charge on the same line. Totals, payments and
 * adjustments are skipped so a statement's lines are not double counted.
 */
export function extractChargeLines(pages: PageText[]): unknown[] {
  const out: unknown[] = []
  for (const p of pages) {
    for (const rawLine of p.text.split(/\r?\n/)) {
      const line = rawLine.replace(/\s+/g, ' ').trim()
      if (line.length < 12 || NOT_A_CHARGE.test(line)) continue
      const d = DATE_IN_LINE.exec(line)
      const money = MONEY_IN_LINE.exec(line)
      if (!d || !money) continue
      let iso: string | null = null
      if (d[4]) iso = `${d[4]}-${d[5]}-${d[6]}`
      else {
        const year = d[3].length === 2 ? `20${d[3]}` : d[3]
        iso = `${year}-${d[1].padStart(2, '0')}-${d[2].padStart(2, '0')}`
      }
      const description = line.replace(d[0], '').replace(money[0], '').replace(/\s+/g, ' ').trim()
      out.push({
        kind: 'medical_charge',
        page: p.page,
        quote: line,
        date: iso,
        amount: Number(money[1].replace(/,/g, '')),
        description: description.slice(0, 120) || 'Medical charge',
        billingStatus: 'billed',
        confidence: 0.5,
      })
    }
  }
  return out
}

function sameDay(a: Date | string | null | undefined, iso: string | null | undefined): boolean {
  if (!a || !iso) return false
  const d = new Date(a)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso
}

/** Point at an entry the attorney already has that looks like this finding, so it is not counted twice. */
async function flagLikelyDuplicates(assessmentId: string, findings: CandidateFinding[]) {
  if (!findings.length) return
  const [entries, items, reports, policies] = await Promise.all([
    (prisma as any).medicalTreatmentEntry
      .findMany({ where: { assessmentId }, select: { id: true, provider: true, startDate: true } })
      .catch(() => [] as any[]),
    (prisma as any).damageItem
      .findMany({ where: { assessmentId }, select: { id: true, amount: true, incurredAt: true, provider: true } })
      .catch(() => [] as any[]),
    (prisma as any).liabilityEvidenceItem
      .findMany({ where: { assessmentId, type: 'police_report' }, select: { id: true, referenceNumber: true } })
      .catch(() => [] as any[]),
    (prisma as any).insuranceDetail
      .findMany({ where: { assessmentId }, select: { id: true, policyNumber: true, claimNumber: true } })
      .catch(() => [] as any[]),
  ])
  for (const f of findings) {
    const providerKey = normalizeForMatch(f.data.provider || '').split(' ')[0]
    if (f.kind === 'incident_report') {
      const hit = (reports as any[]).find((r) => sameReference(r.referenceNumber, f.data.reportNumber))
      if (hit) f.data.possibleDuplicateOf = hit.id
    } else if (f.kind === 'insurance_policy') {
      const hit = (policies as any[]).find(
        (p) => sameReference(p.policyNumber, f.data.policyNumber) || sameReference(p.claimNumber, f.data.claimNumber),
      )
      if (hit) f.data.possibleDuplicateOf = hit.id
    } else if (f.kind === 'treatment_visit') {
      const hit = (entries as any[]).find(
        (e) =>
          sameDay(e.startDate, f.data.date) &&
          (!providerKey || normalizeForMatch(e.provider || '').includes(providerKey)),
      )
      if (hit) f.data.possibleDuplicateOf = hit.id
    } else if (f.data.amount != null) {
      const hit = (items as any[]).find(
        (i) =>
          Math.abs(Number(i.amount) - (f.data.amount as number)) < 0.5 &&
          (sameDay(i.incurredAt, f.data.date) ||
            (providerKey && normalizeForMatch(i.provider || '').includes(providerKey))),
      )
      if (hit) f.data.possibleDuplicateOf = hit.id
    }
  }
}

export interface GenerateResult {
  status: 'ok' | 'skipped'
  reason?: string
  proposed: number
  extractor?: 'ai' | 'rules'
}

/**
 * Read one file's pages and replace its open proposals with what they show.
 * Accepted and rejected findings are kept, and their fingerprints stop the same
 * visit or charge from being proposed again.
 */
export async function generateDocumentFindings(fileId: string, pages: PageText[]): Promise<GenerateResult> {
  const file = await prisma.evidenceFile.findUnique({
    where: { id: fileId },
    select: { id: true, assessmentId: true, category: true, originalName: true, identityCheck: true },
  })
  if (!file?.assessmentId) return { status: 'skipped', reason: 'not_on_a_case', proposed: 0 }
  if (!FINDING_CATEGORIES.has(file.category)) return { status: 'skipped', reason: 'category', proposed: 0 }
  if (isHardIdentityMismatch(file.category, parseIdentityCheck(file.identityCheck ?? null))) {
    return { status: 'skipped', reason: 'names_someone_else', proposed: 0 }
  }
  if (!pages.length) return { status: 'skipped', reason: 'no_text', proposed: 0 }

  const assessmentId = file.assessmentId
  const target = { id: file.id, assessmentId, category: file.category, originalName: file.originalName }
  const useModel = Boolean(getLlmChatClient()) && llmAllowPhi()
  const started = Date.now()
  let raw: unknown[] = []
  let chunks = 0
  try {
    if (useModel) {
      ;({ candidates: raw, chunks } = await extractWithModel(pages, target))
    } else if (file.category === 'bills') {
      raw = extractChargeLines(pages)
    }
  } catch (error: any) {
    await recordAiRun({
      kind: 'document_findings',
      assessmentId,
      provider: 'openai',
      model: LLM_CHAT_MODEL,
      status: 'error',
      error: error?.message || String(error),
      latencyMs: Date.now() - started,
    })
    throw error
  }

  const extractor: 'ai' | 'rules' = useModel ? 'ai' : 'rules'
  const allowedKinds = GROUP_KINDS[groupOf(file.category) || 'medical']
  const verified = raw
    .map((r) => verifyCandidate(r, pages))
    .filter((c): c is CandidateFinding => c !== null && allowedKinds.includes(c.kind))

  const kept = await (prisma as any).documentFinding.findMany({
    where: { assessmentId, NOT: { evidenceFileId: fileId, status: 'proposed' } },
    select: { fingerprint: true },
  })
  const seen = new Set<string>((kept as any[]).map((k) => k.fingerprint))
  const fresh: Array<CandidateFinding & { fingerprint: string }> = []
  for (const c of verified) {
    const fingerprint = findingFingerprint(c)
    if (seen.has(fingerprint)) continue
    seen.add(fingerprint)
    fresh.push({ ...c, fingerprint })
  }
  await flagLikelyDuplicates(assessmentId, fresh)

  await prisma.$transaction([
    (prisma as any).documentFinding.deleteMany({ where: { evidenceFileId: fileId, status: 'proposed' } }),
    ...(fresh.length
      ? [
          (prisma as any).documentFinding.createMany({
            data: fresh.map((f) => ({
              assessmentId,
              evidenceFileId: fileId,
              kind: f.kind,
              data: JSON.stringify(f.data),
              pageNumber: f.page,
              sourceQuote: f.quote,
              confidence: f.confidence,
              fingerprint: f.fingerprint,
              extractor,
            })),
          }),
        ]
      : []),
  ])

  if (useModel) {
    await recordAiRun({
      kind: 'document_findings',
      assessmentId,
      provider: 'openai',
      model: LLM_CHAT_MODEL,
      status: 'ok',
      inputSummary: { fileId, category: file.category, pages: pages.length, chunks },
      outputSummary: { returned: raw.length, verified: verified.length, proposed: fresh.length },
      latencyMs: Date.now() - started,
    })
  }
  logger.info('Document findings generated', {
    fileId,
    assessmentId,
    extractor,
    returned: raw.length,
    verified: verified.length,
    proposed: fresh.length,
  })
  return { status: 'ok', proposed: fresh.length, extractor }
}

export interface FindingView {
  id: string
  kind: FindingKind
  status: string
  data: FindingData
  pageNumber: number | null
  sourceQuote: string
  confidence: number
  extractor: string
  evidenceFileId: string
  fileName: string
  fileUrl: string
  acceptedEntityType: string | null
  acceptedEntityId: string | null
  reviewedByName: string | null
  reviewedAt: string | null
  createdAt: string
  /** Where this record disagrees with what the case already says. */
  conflicts?: string[]
}

function parseData(raw: unknown): FindingData {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return parsed && typeof parsed === 'object' ? (parsed as FindingData) : {}
  } catch {
    return {}
  }
}

function toView(row: any): FindingView {
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    data: parseData(row.data),
    pageNumber: row.pageNumber ?? null,
    sourceQuote: row.sourceQuote,
    confidence: row.confidence,
    extractor: row.extractor,
    evidenceFileId: row.evidenceFileId,
    fileName: row.evidenceFile?.originalName || 'Document',
    fileUrl: row.evidenceFile?.fileUrl || '',
    acceptedEntityType: row.acceptedEntityType ?? null,
    acceptedEntityId: row.acceptedEntityId ?? null,
    reviewedByName: row.reviewedByName ?? null,
    reviewedAt: row.reviewedAt ? new Date(row.reviewedAt).toISOString() : null,
    createdAt: new Date(row.createdAt).toISOString(),
  }
}

export async function listDocumentFindings(
  assessmentId: string,
  opts?: { status?: string; kinds?: FindingKind[] },
): Promise<FindingView[]> {
  const rows = await (prisma as any).documentFinding.findMany({
    where: {
      assessmentId,
      ...(opts?.status ? { status: opts.status } : {}),
      ...(opts?.kinds?.length ? { kind: { in: opts.kinds } } : {}),
    },
    include: { evidenceFile: { select: { originalName: true, fileUrl: true } } },
    orderBy: [{ createdAt: 'desc' }],
    take: 500,
  })
  const views = (rows as any[]).map(toView)
  // Chronological within the list, undated last.
  return views.sort((a, b) => (a.data.date || '9999').localeCompare(b.data.date || '9999'))
}

export class FindingReviewError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

type Actor = { actorId: string | null; actorName: string | null }

export type AcceptedEntityType = 'medical_entry' | 'damage_item' | 'liability_evidence' | 'insurance_detail'

const OVERRIDE_TEXT_KEYS = [
  'date', 'endDate', 'provider', 'specialty', 'visitType', 'diagnosis', 'billingStatus', 'description',
  'time', 'location', 'reportNumber', 'agency', 'officer', 'citationIssuedTo', 'defendantName', 'defendantInsurer',
  'defendantPolicyNumber', 'carrierName', 'policyNumber', 'claimNumber', 'insuredName', 'insuredParty', 'coverageType',
  'adjusterName', 'adjusterEmail', 'adjusterPhone',
] as const
const OVERRIDE_NUMBER_KEYS = ['amount', 'witnessCount', 'policyLimit', 'perAccidentLimit'] as const

/** Two names for the same person or company: they share a word of three or more letters, filler aside. */
export function namesMatch(a?: string | null, b?: string | null): boolean {
  const words = (v?: string | null) =>
    new Set(normalizeForMatch(v || '').split(' ').filter((t) => t.length >= 3 && !NAME_FILLER.has(t)))
  const left = words(a)
  for (const t of words(b)) if (left.has(t)) return true
  return false
}

export function sameReference(a?: string | null, b?: string | null): boolean {
  return Boolean(a && b && normalizeForMatch(a).replace(/ /g, '') === normalizeForMatch(b).replace(/ /g, ''))
}

/**
 * Record a police report on the Liability tab. Fills only what the tab is
 * missing: a report number, citation or defendant the attorney already entered
 * is kept, and a disagreement shows up as a conflict instead.
 */
async function acceptIncidentReport(assessmentId: string, d: FindingData, fileId: string, actor: Actor): Promise<string> {
  const parties = await listLiabilityParties(assessmentId)
  const report =
    parties.evidence.find((e) => e.type === 'police_report' && e.evidenceFileId === fileId) ||
    parties.evidence.find((e) => e.type === 'police_report' && (!e.referenceNumber || sameReference(e.referenceNumber, d.reportNumber)))
  let reportId: string
  if (report) {
    await updateEvidenceItem(
      assessmentId,
      report.id,
      {
        status: 'received',
        ...(report.referenceNumber ? {} : { referenceNumber: d.reportNumber }),
        ...(report.date ? {} : { date: d.date }),
        ...(report.evidenceFileId ? {} : { evidenceFileId: fileId }),
        ...(report.description ? {} : { description: d.description || d.agency }),
      },
      actor,
    )
    reportId = report.id
  } else {
    await createEvidenceItem(
      assessmentId,
      {
        type: 'police_report',
        status: 'received',
        referenceNumber: d.reportNumber,
        date: d.date,
        evidenceFileId: fileId,
        description: d.description || d.agency,
      },
      actor,
    )
    const created = await (prisma as any).liabilityEvidenceItem.findFirst({
      where: { assessmentId, type: 'police_report', evidenceFileId: fileId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    })
    reportId = created?.id
  }

  if (d.defendantName && !parties.defendants.some((p) => namesMatch(p.name, d.defendantName))) {
    await createDefendant(assessmentId, { name: d.defendantName, role: 'driver', insurerName: d.defendantInsurer }, actor)
  }

  const record = await getLiabilityRecord(assessmentId)
  const patch: Record<string, unknown> = {}
  if (d.citationIssuedTo && (!record.citationIssuedTo || record.citationIssuedTo === 'none')) {
    patch.citationIssuedTo = d.citationIssuedTo
  }
  if (d.witnessCount != null && d.witnessCount > (record.witnessCount || 0)) {
    patch.witnessCount = d.witnessCount
    patch.hasWitnesses = d.witnessCount > 0
  }
  if (Object.keys(patch).length) await upsertLiabilityRecord(assessmentId, patch, { source: 'attorney', ...actor })
  return reportId
}

/** The policy on the case this finding describes: same policy or claim number, else same carrier with no number yet. */
export function matchPolicy<T extends { carrierName: string; policyNumber?: string | null; claimNumber?: string | null }>(
  policies: T[],
  d: FindingData,
): T | null {
  return (
    policies.find((p) => sameReference(p.policyNumber, d.policyNumber) || sameReference(p.claimNumber, d.claimNumber)) ||
    policies.find((p) => namesMatch(p.carrierName, d.carrierName)) ||
    null
  )
}

/** Record a policy on the Insurance tab, or fill in the blanks of the matching one. */
async function acceptInsurancePolicy(assessmentId: string, d: FindingData, fileId: string): Promise<string> {
  const policies = await prisma.insuranceDetail.findMany({ where: { assessmentId }, orderBy: { createdAt: 'asc' } })
  const match = matchPolicy(policies as any[], d)
  const fields = {
    policyNumber: d.policyNumber,
    claimNumber: d.claimNumber,
    policyLimit: d.policyLimit,
    adjusterName: d.adjusterName,
    adjusterEmail: d.adjusterEmail,
    adjusterPhone: d.adjusterPhone,
    insuredParty: d.insuredParty,
    coverageType: d.coverageType,
  }
  if (match) {
    const data: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(fields)) {
      if (v != null && v !== '' && (match as any)[k] == null) data[k] = v
    }
    if (data.claimNumber) data.claimNumberAt = new Date()
    if (!match.sourceEvidenceFileId) data.sourceEvidenceFileId = fileId
    if (Object.keys(data).length) await prisma.insuranceDetail.update({ where: { id: match.id }, data })
    return match.id
  }
  if (!d.carrierName) throw new FindingReviewError('Enter the carrier before accepting this policy')
  const created = await prisma.insuranceDetail.create({
    data: {
      assessmentId,
      carrierName: d.carrierName,
      ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v != null && v !== '')),
      ...(d.claimNumber ? { claimNumberAt: new Date() } : {}),
      sourceEvidenceFileId: fileId,
    },
    select: { id: true },
  })
  return created.id
}

/**
 * Accept a finding into the timeline or ledger, applying any corrections the
 * attorney made first. The printed amount is kept beside the accepted one so a
 * reduction stays visible against the source.
 */
export async function acceptDocumentFinding(
  assessmentId: string,
  findingId: string,
  overrides: Partial<FindingData> & { category?: string },
  actor: Actor,
): Promise<{ finding: FindingView; entityType: AcceptedEntityType; entityId: string }> {
  const row = await (prisma as any).documentFinding.findFirst({ where: { id: findingId, assessmentId } })
  if (!row) throw new FindingReviewError('Finding not found', 404)
  if (row.status !== 'proposed') throw new FindingReviewError('This finding has already been reviewed', 409)
  const original = parseData(row.data)
  const merged: FindingData = { ...original }
  for (const key of OVERRIDE_TEXT_KEYS) {
    if (overrides[key] !== undefined) (merged as any)[key] = cleanText(overrides[key], 300)
  }
  for (const key of OVERRIDE_NUMBER_KEYS) {
    if (overrides[key] === undefined) continue
    const n = Number(overrides[key])
    ;(merged as any)[key] = overrides[key] === null || (overrides[key] as unknown) === '' || !Number.isFinite(n) ? null : n
  }

  const provenance = {
    sourceFileId: row.evidenceFileId as string,
    sourcePage: (row.pageNumber ?? null) as number | null,
    sourceQuote: row.sourceQuote as string,
    findingId: row.id as string,
  }

  let entityType: AcceptedEntityType
  let entityId: string
  if (row.kind === 'incident_report') {
    entityType = 'liability_evidence'
    entityId = await acceptIncidentReport(assessmentId, merged, row.evidenceFileId, actor)
  } else if (row.kind === 'insurance_policy') {
    entityType = 'insurance_detail'
    entityId = await acceptInsurancePolicy(assessmentId, merged, row.evidenceFileId)
  } else if (row.kind === 'treatment_visit') {
    if (!merged.provider) throw new FindingReviewError('Enter the provider before accepting this visit')
    await createMedicalEntry(
      assessmentId,
      {
        provider: merged.provider,
        specialty: merged.specialty,
        visitType: merged.visitType,
        startDate: merged.date,
        endDate: merged.endDate,
        status: 'completed',
        diagnosis: merged.diagnosis,
        billedAmount: merged.amount ?? null,
      },
      {
        actorId: actor.actorId,
        actorName: actor.actorName,
        provenance: { ...provenance, diagnosisCodes: original.icdCodes, procedureCodes: original.cptCodes },
      },
    )
    const created = await (prisma as any).medicalTreatmentEntry.findFirst({
      where: { assessmentId, findingId: row.id },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    })
    entityType = 'medical_entry'
    entityId = created?.id
  } else {
    if (merged.amount == null || !(merged.amount > 0)) throw new FindingReviewError('Enter an amount before accepting this charge')
    const isWage = row.kind === 'wage_loss'
    const category = isWage ? 'lost_wages' : overrides.category === 'future_medical' ? 'future_medical' : 'medical'
    const description =
      merged.description ||
      (isWage ? 'Lost wages' : [merged.provider, merged.cptCodes?.join(', ')].filter(Boolean).join(' · ') || 'Medical charge')
    const item = await (prisma as any).damageItem.create({
      data: {
        assessmentId,
        category,
        description,
        amount: merged.amount,
        billingStatus: category === 'medical' ? merged.billingStatus || 'billed' : null,
        provider: merged.provider || null,
        incurredAt: merged.date ? new Date(`${merged.date}T00:00:00Z`) : null,
        isFuture: category === 'future_medical',
        source: 'evidence',
        ...provenance,
        documentedAmount: original.amount ?? null,
        createdById: actor.actorId,
        createdByName: actor.actorName,
      },
      select: { id: true, amount: true, billingStatus: true },
    })
    const printed = original.amount != null ? `$${original.amount.toFixed(2)}` : 'no amount'
    await recordDamageItemChanges(null, item, {
      damageItemId: item.id,
      assessmentId,
      reason: `Accepted from the record (page ${row.pageNumber ?? '?'}, printed ${printed})`,
      ...actor,
    })
    await writeThroughDamages(assessmentId, { source: 'attorney', actorId: actor.actorId })
    entityType = 'damage_item'
    entityId = item.id
  }

  const updated = await (prisma as any).documentFinding.update({
    where: { id: row.id },
    data: {
      status: 'accepted',
      data: JSON.stringify(merged),
      acceptedEntityType: entityType,
      acceptedEntityId: entityId ?? null,
      reviewedById: actor.actorId,
      reviewedByName: actor.actorName,
      reviewedAt: new Date(),
    },
    include: { evidenceFile: { select: { originalName: true, fileUrl: true } } },
  })
  return { finding: toView(updated), entityType, entityId }
}

export async function rejectDocumentFinding(assessmentId: string, findingId: string, actor: Actor): Promise<FindingView> {
  const row = await (prisma as any).documentFinding.findFirst({ where: { id: findingId, assessmentId } })
  if (!row) throw new FindingReviewError('Finding not found', 404)
  if (row.status !== 'proposed') throw new FindingReviewError('This finding has already been reviewed', 409)
  const updated = await (prisma as any).documentFinding.update({
    where: { id: row.id },
    data: { status: 'rejected', reviewedById: actor.actorId, reviewedByName: actor.actorName, reviewedAt: new Date() },
    include: { evidenceFile: { select: { originalName: true, fileUrl: true } } },
  })
  return toView(updated)
}

/** Whether the model may read records on this deployment, for the panel's empty state. */
export function documentReadingMode(): 'ai' | 'rules' {
  return getLlmChatClient() && llmAllowPhi() ? 'ai' : 'rules'
}
