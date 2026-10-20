/**
 * Demand Quality Audit: AI-assisted verification of the letter's semantic
 * claims against the case documents.
 *
 * The letter is split into atomic claims, each claim is checked against the
 * record pages most likely to bear on it, and every passage the model quotes
 * is matched against the page text before it counts. A claim the model calls
 * supported without a passage that is really on the page is unverifiable, not
 * supported: nothing passes on the model's word alone.
 */
import type { AuditEvidence, DraftFinding, SupportStatus } from './rules'
import { norm } from './text'

export const CLAIMS_PROMPT_VERSION = 'dqa-claims-1'

export interface SourcePage {
  fileId: string
  fileName: string
  exhibit: number | null
  page: number | null
  text: string
}

export interface ExhibitDigest {
  number: number
  label: string
  category: string
  text: string
}

/** One model round trip: system + user prompt in, JSON text out. */
export type Complete = (system: string, user: string) => Promise<string | null>

export const CLAIM_TYPES = [
  'police_citation',
  'witness',
  'mechanism',
  'liability_conclusion',
  'severity',
  'role',
  'diagnosis',
  'imaging',
  'treatment',
  'provider',
  'scheduled_care',
  'permanence_future_care',
  'causation',
  'symptoms',
  'damages_amount',
  'legal_authority',
  'settlement_terms',
  'other',
] as const
export type ClaimType = (typeof CLAIM_TYPES)[number]

export interface AtomicClaim {
  id: string
  sentence: string
  claim: string
  type: ClaimType
  material: boolean
  cites: Array<{ exhibit: number; page: number | null }>
}

export interface VerifiedClaim extends AtomicClaim {
  status: SupportStatus
  evidence: AuditEvidence[]
  explanation: string
  correction: string | null
}

export interface ClaimRunResult {
  status: 'ok' | 'timeout' | 'error'
  error?: string
  claims: VerifiedClaim[]
  findings: DraftFinding[]
}

/** Checked elsewhere: authority by the deterministic rules, terms by the settlement check. */
const NOT_VERIFIED_HERE = new Set<ClaimType>(['legal_authority', 'settlement_terms'])

const CONTRADICTED_RULE: Record<ClaimType, string> = {
  police_citation: 'DQA-101',
  witness: 'DQA-102',
  mechanism: 'DQA-103',
  liability_conclusion: 'DQA-108',
  severity: 'DQA-106',
  role: 'DQA-006',
  diagnosis: 'DQA-201',
  imaging: 'DQA-204',
  treatment: 'DQA-108',
  provider: 'DQA-203',
  scheduled_care: 'DQA-207',
  permanence_future_care: 'DQA-205',
  causation: 'DQA-206',
  symptoms: 'DQA-201',
  damages_amount: 'DQA-303',
  legal_authority: 'DQA-405',
  settlement_terms: 'DQA-406',
  other: 'DQA-108',
}

const UNSUPPORTED_RULE: Record<ClaimType, string> = {
  police_citation: 'DQA-101',
  witness: 'DQA-102',
  mechanism: 'DQA-103',
  liability_conclusion: 'DQA-104',
  severity: 'DQA-106',
  role: 'DQA-006',
  diagnosis: 'DQA-201',
  imaging: 'DQA-204',
  treatment: 'DQA-107',
  provider: 'DQA-203',
  scheduled_care: 'DQA-207',
  permanence_future_care: 'DQA-205',
  causation: 'DQA-206',
  symptoms: 'DQA-107',
  damages_amount: 'DQA-309',
  legal_authority: 'DQA-405',
  settlement_terms: 'DQA-406',
  other: 'DQA-107',
}

const STOP = new Set(
  'the a an and or of to in on at for with by from was were is are be been as that this which who whom his her their our your its it he she they we you mr mrs ms client claimant patient plaintiff defendant insured accident collision incident injury injuries'.split(
    ' ',
  ),
)

const PAGE_CHARS = 3000
const PAGES_PER_CLAIM = 3
const CLAIMS_PER_BATCH = 6
const MAX_CLAIMS = 60
const MIN_QUOTE_CHARS = 12

function tokens(text: string): string[] {
  return [...new Set(norm(text).split(' ').filter((t) => t.length >= 3 && !STOP.has(t)))]
}

/** The pages most likely to prove or disprove `claim`, plus any page it cites. */
export function retrievePages(claim: AtomicClaim, pages: SourcePage[], limit = PAGES_PER_CLAIM): number[] {
  const want = tokens(`${claim.claim} ${claim.sentence}`)
  const df = new Map<string, number>()
  const normed = pages.map((p) => ` ${norm(p.text)} `)
  for (const t of want) df.set(t, normed.filter((n) => n.includes(` ${t} `)).length)
  const scored = normed
    .map((n, i) => ({
      i,
      score: want.reduce((s, t) => (n.includes(` ${t} `) ? s + Math.log(1 + pages.length / Math.max(1, df.get(t) || 1)) : s), 0),
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.i)
  const cited = claim.cites.flatMap((c) =>
    pages.map((p, i) => ({ p, i })).filter(({ p }) => p.exhibit === c.exhibit && (c.page == null || p.page === c.page)).slice(0, 2).map(({ i }) => i),
  )
  return [...new Set([...cited, ...scored])]
}

/** The quote, if it is really printed on `page`. */
export function quoteOnPage(quote: unknown, page: SourcePage | undefined): string | null {
  if (!page || typeof quote !== 'string') return null
  const q = norm(quote)
  if (q.length < MIN_QUOTE_CHARS) return null
  return ` ${norm(page.text)} `.includes(` ${q} `) ? quote.trim().slice(0, 400) : null
}

function parseJson(text: string | null): any {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    const m = /\{[\s\S]*\}/.exec(text)
    if (!m) return null
    try {
      return JSON.parse(m[0])
    } catch {
      return null
    }
  }
}

const SYSTEM =
  'You audit personal-injury demand letters for an attorney. You never invent facts, never assume a document says something it does not, and treat silence in the records as "unsupported", not as support. Always respond with valid JSON.'

function decomposePrompt(letter: string, today: string): string {
  return [
    `Today is ${today}. Split the demand letter below into atomic factual claims: one checkable proposition each.`,
    'Skip the letterhead, addresses, salutation, signature, enclosure index and pure argument with no factual content.',
    'For each claim give:',
    '- "sentence": the exact sentence from the letter it comes from (copied verbatim),',
    '- "claim": the single proposition, restated plainly,',
    `- "type": one of ${CLAIM_TYPES.join(', ')} ("scheduled_care" for any statement about care on a date after today; "role" for who drove, rode or was at fault; "liability_conclusion" for a categorical statement that the other party is liable),`,
    '- "material": true if an adjuster would rely on it,',
    '- "cites": exhibits the sentence cites, as [{"exhibit": 3, "page": 4}] (page null if none).',
    'Also list in "corrupt" any sentence that is garbled, nonsensical or placeholder text.',
    'Return {"claims": [...], "corrupt": ["..."]}.',
    '',
    'LETTER:',
    letter,
  ].join('\n')
}

function verifyPrompt(batch: AtomicClaim[], sources: Array<{ id: string; page: SourcePage }>, today: string): string {
  return [
    `Today is ${today}. Check each claim from a demand letter against the source passages. Use only these passages.`,
    'For each claim return:',
    '- "status": "supported" (a passage states it), "partially_supported" (part is stated, part is not), "contradicted" (a passage states otherwise), "unsupported" (the passages are silent), "unverifiable" (the passages are unreadable or ambiguous), or "not_applicable" (argument, not fact).',
    '- "support": [{"source": "S1", "quote": "exact words copied from that passage"}],',
    '- "conflict": [{"source": "S2", "quote": "exact words copied from that passage"}],',
    '- "explanation": one sentence,',
    '- "correction": how the letter should read instead, or null.',
    'Quotes must be copied character for character from the passage; a paraphrase will be discarded.',
    'A scheduled or future appointment described as completed is "contradicted". A billed charge described as paid is "contradicted".',
    'Return {"results": [{"id": "C1", ...}]}.',
    '',
    'SOURCES:',
    ...sources.map(({ id, page }) =>
      `[${id}] ${page.fileName}${page.exhibit != null ? ` (Exhibit ${page.exhibit})` : ''}${page.page != null ? `, page ${page.page}` : ''}\n${page.text.slice(0, PAGE_CHARS)}`,
    ),
    '',
    'CLAIMS:',
    ...batch.map((c) => `[${c.id}] (${c.type}) ${c.claim}\n    Sentence: ${c.sentence}`),
  ].join('\n')
}

function relevancePrompt(exhibits: ExhibitDigest[]): string {
  return [
    'These are the exhibits enclosed with a personal-injury demand letter. Identify any that do not belong in the demand:',
    'advertising or promotional material, a law-firm logo or marketing image, unrelated people or events, blank or duplicate pages, internal notes.',
    'Only flag an exhibit when its own text or label shows it is irrelevant. Return {"irrelevant": [{"exhibit": 2, "reason": "one sentence"}]}.',
    '',
    ...exhibits.map((e) => `Exhibit ${e.number} \u2014 ${e.label} [${e.category}]\n${e.text.slice(0, 700) || '(no readable text)'}`),
  ].join('\n')
}

function toClaims(raw: any, letter: string): AtomicClaim[] {
  const list = Array.isArray(raw?.claims) ? raw.claims : []
  const out: AtomicClaim[] = []
  for (const c of list) {
    const sentence = String(c?.sentence || '').trim()
    const claim = String(c?.claim || '').trim()
    if (!sentence || !claim) continue
    // A sentence the letter does not contain is the model's, not the letter's.
    if (!` ${norm(letter)} `.includes(` ${norm(sentence)} `)) continue
    const type = (CLAIM_TYPES as readonly string[]).includes(c?.type) ? (c.type as ClaimType) : 'other'
    const cites = (Array.isArray(c?.cites) ? c.cites : [])
      .map((x: any) => ({ exhibit: Number(x?.exhibit), page: x?.page == null ? null : Number(x.page) }))
      .filter((x: any) => Number.isFinite(x.exhibit))
    out.push({ id: `C${out.length + 1}`, sentence, claim, type, material: c?.material !== false, cites })
    if (out.length >= MAX_CLAIMS) break
  }
  return out
}

function evidenceOf(items: unknown, role: AuditEvidence['role'], sources: Map<string, SourcePage>): AuditEvidence[] {
  const out: AuditEvidence[] = []
  for (const item of Array.isArray(items) ? items : []) {
    const page = sources.get(String((item as any)?.source || ''))
    const quote = quoteOnPage((item as any)?.quote, page)
    if (!page || !quote) continue
    out.push({ role, fileId: page.fileId, fileName: page.fileName, exhibit: page.exhibit, page: page.page, quote })
  }
  return out
}

/** Downgrade any verdict the validated passages do not carry. */
export function settleStatus(claimed: unknown, evidence: AuditEvidence[]): SupportStatus {
  const status = String(claimed || '') as SupportStatus
  const support = evidence.some((e) => e.role === 'support')
  const conflict = evidence.some((e) => e.role === 'conflict')
  switch (status) {
    case 'supported':
    case 'partially_supported':
      return support ? status : 'unverifiable'
    case 'contradicted':
      return conflict ? 'contradicted' : 'unverifiable'
    case 'unsupported':
    case 'unverifiable':
    case 'not_applicable':
      return status
    default:
      return 'unverifiable'
  }
}

const STATUS_WORDS: Record<SupportStatus, string> = {
  supported: 'supported',
  partially_supported: 'only partly supported',
  contradicted: 'contradicted by the records',
  unsupported: 'not supported by any case document',
  unverifiable: 'not verifiable from the case documents',
  not_applicable: 'not a factual claim',
}

export function findingsForClaims(claims: VerifiedClaim[]): DraftFinding[] {
  const byKey = new Map<string, DraftFinding>()
  for (const c of claims) {
    if (NOT_VERIFIED_HERE.has(c.type)) continue
    if (c.status === 'supported' || c.status === 'not_applicable') continue
    if (!c.material && c.status !== 'contradicted') continue
    const ruleId =
      c.status === 'contradicted'
        ? CONTRADICTED_RULE[c.type]
        : c.status === 'partially_supported'
          ? 'DQA-107'
          : UNSUPPORTED_RULE[c.type]
    const key = `ai:${ruleId}:${norm(c.sentence).slice(0, 200)}`
    const existing = byKey.get(key)
    if (existing) {
      existing.detail += ` Also: "${c.claim}" is ${STATUS_WORDS[c.status]}.`
      existing.evidence = [...(existing.evidence ?? []), ...c.evidence]
      continue
    }
    byKey.set(key, {
      ruleId,
      key,
      source: 'ai',
      title: `"${c.claim}" is ${STATUS_WORDS[c.status]}`,
      detail: c.explanation || `The claim is ${STATUS_WORDS[c.status]}.`,
      claim: c.sentence,
      support: c.status,
      evidence: c.evidence,
      recommendation: c.correction || (c.status === 'contradicted' ? 'Correct the sentence to match the record.' : 'Cite the record that proves it, or remove it.'),
    })
  }
  return [...byKey.values()]
}

class Timeout extends Error {}

export async function verifyDemandClaims(args: {
  letter: string
  pages: SourcePage[]
  exhibits: ExhibitDigest[]
  today: string
  complete: Complete
  budgetMs: number
}): Promise<ClaimRunResult> {
  const deadline = Date.now() + args.budgetMs
  const call = async (user: string) => {
    const left = deadline - Date.now()
    if (left <= 0) throw new Timeout('Claim verification ran out of time')
    let timer: NodeJS.Timeout | undefined
    try {
      return await Promise.race([
        args.complete(SYSTEM, user),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Timeout('Claim verification ran out of time')), left)
        }),
      ])
    } finally {
      if (timer) clearTimeout(timer)
    }
  }

  const findings: DraftFinding[] = []
  const verified: VerifiedClaim[] = []
  try {
    const decomposed = parseJson(await call(decomposePrompt(args.letter, args.today)))
    if (!decomposed) throw new Error('The model did not return the letter\u2019s claims')
    const claims = toClaims(decomposed, args.letter)

    for (const sentence of Array.isArray(decomposed?.corrupt) ? decomposed.corrupt : []) {
      const s = String(sentence || '').trim()
      if (!s || !args.letter.includes(s)) continue
      findings.push({
        ruleId: 'DQA-407',
        key: `ai:corrupt:${norm(s).slice(0, 200)}`,
        source: 'ai',
        title: 'Garbled or placeholder text',
        detail: 'This sentence does not read as finished prose.',
        claim: s,
        recommendation: 'Rewrite or delete the sentence.',
      })
    }

    const toCheck = claims.filter((c) => !NOT_VERIFIED_HERE.has(c.type))
    for (let i = 0; i < toCheck.length; i += CLAIMS_PER_BATCH) {
      const batch = toCheck.slice(i, i + CLAIMS_PER_BATCH)
      const pageIdx = [...new Set(batch.flatMap((c) => retrievePages(c, args.pages)))]
      const sources = new Map(pageIdx.map((p, n) => [`S${n + 1}`, args.pages[p]]))
      if (!sources.size) {
        for (const c of batch) {
          verified.push({ ...c, status: 'unsupported', evidence: [], explanation: 'No case document mentions this.', correction: null })
        }
        continue
      }
      const parsed = parseJson(await call(verifyPrompt(batch, [...sources].map(([id, page]) => ({ id, page })), args.today)))
      const results = new Map<string, any>((Array.isArray(parsed?.results) ? parsed.results : []).map((r: any) => [String(r?.id), r]))
      for (const c of batch) {
        const r = results.get(c.id)
        const evidence = [...evidenceOf(r?.support, 'support', sources), ...evidenceOf(r?.conflict, 'conflict', sources)]
        verified.push({
          ...c,
          status: r ? settleStatus(r.status, evidence) : 'unverifiable',
          evidence,
          explanation: String(r?.explanation || (r ? '' : 'The model returned no verdict for this claim.')).slice(0, 600),
          correction: r?.correction ? String(r.correction).slice(0, 600) : null,
        })
      }
    }

    if (args.exhibits.length) {
      const parsed = parseJson(await call(relevancePrompt(args.exhibits)))
      const known = new Map(args.exhibits.map((e) => [e.number, e]))
      for (const item of Array.isArray(parsed?.irrelevant) ? parsed.irrelevant : []) {
        const ex = known.get(Number(item?.exhibit))
        if (!ex) continue
        findings.push({
          ruleId: 'DQA-401',
          key: `ai:irrelevant:${norm(ex.label)}`,
          source: 'ai',
          title: `Exhibit ${ex.number} does not belong in the demand`,
          detail: String(item?.reason || 'The exhibit does not support any claim in the letter.').slice(0, 400),
          claim: `Exhibit ${ex.number} \u2014 ${ex.label}`,
          recommendation: 'Remove the exhibit from the case or the package, then redraft the enclosure index.',
        })
      }
    }

    return { status: 'ok', claims: verified, findings: [...findings, ...findingsForClaims(verified)] }
  } catch (error: any) {
    const status = error instanceof Timeout ? 'timeout' : 'error'
    return { status, error: error?.message || String(error), claims: verified, findings: [...findings, ...findingsForClaims(verified)] }
  }
}
