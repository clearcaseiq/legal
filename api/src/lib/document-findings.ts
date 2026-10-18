/**
 * Document findings: visits, charges and wage figures read out of uploaded
 * records, each tied to the page and passage it came from, proposed to the
 * attorney for the Medical timeline and Damages ledger.
 *
 * Nothing read here reaches the case on its own. A finding becomes a timeline
 * entry or a ledger line only when an attorney accepts it, and the accepted row
 * keeps the file, page and quote so a demand can cite where each figure came from.
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
import { MEDICAL_BILLING_STATUSES, writeThroughDamages } from './damages-ledger'

export type FindingKind = 'treatment_visit' | 'medical_charge' | 'wage_loss'
export const FINDING_KINDS: FindingKind[] = ['treatment_visit', 'medical_charge', 'wage_loss']

/** Document categories read for findings. Photos and police reports carry no visits or charges. */
export const FINDING_CATEGORIES = new Set(['medical_records', 'bills', 'wage_verification'])

export type PageText = { page: number | null; text: string }

export interface FindingData {
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

function buildPrompt(chunk: PageText[], file: { category: string; originalName: string }): string {
  const body = chunk.map((p) => `=== PAGE ${p.page ?? 1} ===\n${p.text}`).join('\n\n')
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
  const [entries, items] = await Promise.all([
    (prisma as any).medicalTreatmentEntry
      .findMany({ where: { assessmentId }, select: { id: true, provider: true, startDate: true } })
      .catch(() => [] as any[]),
    (prisma as any).damageItem
      .findMany({ where: { assessmentId }, select: { id: true, amount: true, incurredAt: true, provider: true } })
      .catch(() => [] as any[]),
  ])
  for (const f of findings) {
    const providerKey = normalizeForMatch(f.data.provider || '').split(' ')[0]
    if (f.kind === 'treatment_visit') {
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
  const verified = raw.map((r) => verifyCandidate(r, pages)).filter((c): c is CandidateFinding => c !== null)

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
): Promise<{ finding: FindingView; entityType: 'medical_entry' | 'damage_item'; entityId: string }> {
  const row = await (prisma as any).documentFinding.findFirst({ where: { id: findingId, assessmentId } })
  if (!row) throw new FindingReviewError('Finding not found', 404)
  if (row.status !== 'proposed') throw new FindingReviewError('This finding has already been reviewed', 409)
  const original = parseData(row.data)
  const merged: FindingData = { ...original }
  for (const key of ['date', 'endDate', 'provider', 'specialty', 'visitType', 'diagnosis', 'billingStatus', 'description'] as const) {
    if (overrides[key] !== undefined) (merged as any)[key] = overrides[key] || null
  }
  if (overrides.amount !== undefined) {
    const n = Number(overrides.amount)
    merged.amount = overrides.amount === null || !Number.isFinite(n) ? null : n
  }

  const provenance = {
    sourceFileId: row.evidenceFileId as string,
    sourcePage: (row.pageNumber ?? null) as number | null,
    sourceQuote: row.sourceQuote as string,
    findingId: row.id as string,
  }

  let entityType: 'medical_entry' | 'damage_item'
  let entityId: string
  if (row.kind === 'treatment_visit') {
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
      select: { id: true },
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
