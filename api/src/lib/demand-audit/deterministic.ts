/**
 * Demand Quality Audit: the checks that need no judgement. Dates, identity,
 * identifiers, money, duplicates, exhibits and legal-authority detection are
 * computed here from the letter text and the case record; semantic claims are
 * left to claim verification.
 */
import { isHardIdentityMismatch, parseIdentityCheck } from '../claimant-identity-check'
import {
  PLACEHOLDER_PATTERNS,
  diagnosesOf,
  incidentDateOf,
  pinpointCitations,
  totalsOf,
  treatmentGaps,
  treatmentVisits,
  type SuperDemandContext,
} from '../super-demand'
import type { AuditEvidence, DraftFinding } from './rules'
import {
  US_STATES,
  datesIn,
  dollarsIn,
  hasPhrase,
  isoDay,
  longDay,
  money,
  norm,
  sentenceAt,
  sentencesOf,
  snippet,
} from './text'

export interface AuditFile {
  id: string
  originalName: string
  category: string
  identityCheck: string | null
  contentHash: string | null
  createdAt: Date
  ocrText: string | null
}

export interface AuditEnclosure {
  number: string
  label: string
  fileId: string | null
}

export interface DeterministicInput {
  content: string
  targetAmount: number
  approvedDemandAmount: number | null
  ctx: SuperDemandContext
  files: AuditFile[]
  /** The letter's enclosure index as printed, matched to case files. */
  enclosures: AuditEnclosure[]
  referenceCode: string | null
  venueState: string | null
  sol: { status: 'ok' | 'expiring_soon' | 'expired' | 'unknown'; expiresAt?: Date | null }
  /** Pages per case file, where known. */
  pageCounts: Map<string, number>
  now: Date
}

const DAY = 24 * 60 * 60 * 1000
const INCIDENT_WORDS = /\b(accident|collision|crash|incident|wreck|date of loss|DOL|rear-?ended|struck)\b/i
const TREATMENT_WORDS = /\b(treat|visit|seen|presented|underwent|therapy|appointment|exam|admitted|discharged|follow-?up|imaging|mri|x-?ray|ct scan)\w*/i
const FUTURE_WORDS = /\b(schedul|upcoming|will\b|plann|future|anticipat|recommend|expect|pending|set for|due\b|projected|estimated)/i
const STOP_DX = new Set(['with', 'without', 'initial', 'encounter', 'unspecified', 'subsequent', 'sequela', 'other', 'region', 'level', 'site', 'part', 'and', 'the', 'left', 'right', 'acute'])

function exhibitOfFile(ctx: SuperDemandContext, fileId: string | null | undefined): number | null {
  if (!fileId) return null
  return ctx.caseRecord.exhibits?.find((e) => e.fileId === fileId)?.number ?? null
}

function evidenceFrom(
  ctx: SuperDemandContext,
  files: AuditFile[],
  role: AuditEvidence['role'],
  fileId: string | null | undefined,
  page: number | null | undefined,
  quote: string,
): AuditEvidence {
  const file = fileId ? files.find((f) => f.id === fileId) : undefined
  return {
    role,
    fileId: fileId ?? null,
    fileName: file?.originalName ?? null,
    exhibit: exhibitOfFile(ctx, fileId),
    page: page ?? null,
    quote,
  }
}

/** Files the letter puts in front of the adjuster: its exhibits, or files it names. */
function enclosedFiles(input: DeterministicInput): AuditFile[] {
  const ids = new Set<string>()
  for (const e of input.ctx.caseRecord.exhibits ?? []) if (e.fileId) ids.add(e.fileId)
  for (const e of input.enclosures) if (e.fileId) ids.add(e.fileId)
  return input.files.filter((f) => ids.has(f.id) || (f.originalName && input.content.includes(f.originalName)))
}

function identityRules(input: DeterministicInput, out: DraftFinding[]) {
  const { content, ctx } = input
  const client = (ctx.caseRecord.clientName || '').trim()
  const last = client.split(/\s+/).filter(Boolean).pop()
  if (last && !new RegExp(`\\b${last.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(content)) {
    out.push({
      ruleId: 'DQA-001',
      key: 'client-not-named',
      source: 'deterministic',
      title: 'The letter never names the client',
      detail: `The case is for ${client}, but that name does not appear anywhere in the letter.`,
      recommendation: `Confirm the letter is for ${client} and correct the claimant name.`,
    })
  }
  for (const f of input.files) {
    if (!isHardIdentityMismatch(f.category, parseIdentityCheck(f.identityCheck))) continue
    if (!f.originalName || !content.includes(f.originalName)) continue
    out.push({
      ruleId: 'DQA-001',
      key: `identity:${f.id}`,
      source: 'deterministic',
      title: `${f.originalName} names someone other than the client`,
      detail: 'The identity check found a different person on this document, and the letter still encloses or cites it.',
      evidence: [evidenceFrom(ctx, input.files, 'conflict', f.id, null, f.originalName)],
      recommendation: 'Remove the document from the demand, or confirm on the Documents tab that it belongs to the client.',
    })
  }

  if (input.referenceCode) {
    const own = input.referenceCode.toUpperCase()
    for (const f of enclosedFiles(input)) {
      const text = f.ocrText || ''
      for (const m of text.matchAll(/\bCCIQ-[A-Z0-9]{4,8}\b/gi)) {
        const code = m[0].toUpperCase()
        if (code === own) continue
        out.push({
          ruleId: 'DQA-002',
          key: `case-id:${f.id}:${code}`,
          source: 'deterministic',
          title: `${f.originalName} belongs to case ${code}`,
          detail: `This file is printed with case ID ${code}; this case is ${own}.`,
          evidence: [evidenceFrom(ctx, input.files, 'conflict', f.id, null, snippet(text, m.index ?? 0))],
          recommendation: 'Remove the file from this case and the demand, and check where it came from.',
        })
        break
      }
    }
  }
}

function chronologyRules(input: DeterministicInput, out: DraftFinding[]) {
  const { content, ctx, now } = input
  const incident = incidentDateOf(ctx)
  const incidentIso = isoDay(incident)
  if (!incidentIso) {
    out.push({
      ruleId: 'DQA-003',
      key: 'no-incident-date',
      source: 'deterministic',
      title: 'No accident date on the case',
      detail: 'The case has no date of loss, so no date in the letter or the records can be checked against it.',
      recommendation: 'Enter the date of loss on the case, then rerun the audit.',
    })
  } else {
    const seen = new Set<string>()
    for (const s of sentencesOf(content)) {
      if (!INCIDENT_WORDS.test(s.text) || TREATMENT_WORDS.test(s.text)) continue
      for (const d of datesIn(s.text)) {
        if (d.iso === incidentIso || seen.has(d.iso)) continue
        if (Math.abs(new Date(d.iso).getTime() - new Date(incidentIso).getTime()) > 366 * DAY) continue
        seen.add(d.iso)
        out.push({
          ruleId: 'DQA-003',
          key: `letter-date:${d.iso}`,
          source: 'deterministic',
          title: `The letter dates the accident ${longDay(d.iso)}`,
          detail: `The case date of loss is ${longDay(incidentIso)}.`,
          claim: s.text,
          recommendation: 'Correct the date in the letter, or correct the case if the letter is right.',
        })
      }
    }
    const recordDate = /(?:date\s+of\s+(?:loss|accident|incident|injury|collision)|(?:accident|incident|collision|loss)\s+date|\bD\.?O\.?L\.?\b)\s*[:\-]?\s*/gi
    for (const f of input.files) {
      const text = f.ocrText || ''
      for (const m of text.matchAll(recordDate)) {
        const after = text.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 40)
        const d = datesIn(after)[0]
        if (!d || d.index > 2 || d.iso === incidentIso || seen.has(`${f.id}:${d.iso}`)) continue
        seen.add(`${f.id}:${d.iso}`)
        out.push({
          ruleId: 'DQA-003',
          key: `record-date:${f.id}:${d.iso}`,
          source: 'deterministic',
          title: `${f.originalName} gives the accident date as ${longDay(d.iso)}`,
          detail: `The case date of loss is ${longDay(incidentIso)}. Both are kept until a reviewer decides which is right.`,
          evidence: [evidenceFrom(ctx, input.files, 'conflict', f.id, null, snippet(text, m.index ?? 0))],
          recommendation: 'Check the source. Correct the case or the letter, or record why this document is wrong.',
        })
      }
    }
  }

  const today = isoDay(now) as string
  const entries = ctx.caseRecord.medical?.entries ?? []
  for (const e of entries) {
    const iso = isoDay(e.startDate)
    if (!iso) continue
    if (incidentIso && !e.isFuture && new Date(iso).getTime() < new Date(incidentIso).getTime() - DAY) {
      out.push({
        ruleId: 'DQA-004',
        key: `predates:${norm(e.provider)}:${iso}`,
        source: 'deterministic',
        title: `${e.provider} visit on ${longDay(iso)} is before the accident`,
        detail: `The date of loss is ${longDay(incidentIso)}. Treatment before it is not caused by this accident unless explained.`,
        evidence: e.sourceQuote ? [evidenceFrom(ctx, input.files, 'conflict', e.sourceFileId, e.sourcePage, e.sourceQuote)] : [],
        recommendation: 'Correct the visit date, remove the visit, or explain it (for example, prior treatment of the same area).',
      })
    }
    if (!e.isFuture && iso > today) {
      out.push({
        ruleId: 'DQA-005',
        key: `future-entry:${norm(e.provider)}:${iso}`,
        source: 'deterministic',
        title: `${e.provider} on ${longDay(iso)} is recorded as completed`,
        detail: `That date is after today (${longDay(today)}), so the visit cannot have happened yet.`,
        recommendation: 'Mark the visit as scheduled future care, or correct its date.',
      })
    }
  }
  const seenFuture = new Set<string>()
  for (const s of sentencesOf(content)) {
    if (FUTURE_WORDS.test(s.text)) continue
    for (const d of datesIn(s.text)) {
      if (d.iso <= today || seenFuture.has(d.iso)) continue
      if (/\b(within|no later than|by|before|deadline|respond|expire|expires|statute)\b/i.test(s.text)) continue
      seenFuture.add(d.iso)
      out.push({
        ruleId: 'DQA-005',
        key: `future-text:${d.iso}`,
        source: 'deterministic',
        title: `The letter describes ${longDay(d.iso)} as past`,
        detail: `That date is after today (${longDay(today)}). Care on that date is scheduled, not completed.`,
        claim: s.text,
        recommendation: 'Describe it as scheduled or recommended care, or remove it.',
      })
    }
  }

  const byVisit = new Map<string, number>()
  for (const e of entries) {
    const iso = isoDay(e.startDate)
    if (!iso || e.isFuture) continue
    const key = `${norm(e.provider)}|${iso}|${e.visitType}`
    byVisit.set(key, (byVisit.get(key) || 0) + 1)
  }
  for (const [key, n] of byVisit) {
    if (n < 2) continue
    const [provider, iso] = key.split('|')
    out.push({
      ruleId: 'DQA-010',
      key: `dup-visit:${key}`,
      source: 'deterministic',
      title: `The same visit is recorded ${n} times`,
      detail: `${provider} on ${longDay(iso)} appears ${n} times in the treatment timeline.`,
      recommendation: 'Delete the duplicate visits so the encounter is counted once.',
    })
  }
  const byHash = new Map<string, AuditFile[]>()
  for (const f of enclosedFiles(input)) {
    if (!f.contentHash) continue
    byHash.set(f.contentHash, [...(byHash.get(f.contentHash) || []), f])
  }
  for (const [hash, group] of byHash) {
    if (group.length < 2) continue
    out.push({
      ruleId: 'DQA-010',
      key: `dup-file:${hash}`,
      source: 'deterministic',
      title: 'The same document is enclosed twice',
      detail: `${group.map((f) => f.originalName).join(' and ')} are the same file.`,
      recommendation: 'Remove the duplicate upload so its charges are counted once.',
    })
  }
}

function identifierRules(input: DeterministicInput, out: DraftFinding[]) {
  const { content, ctx } = input
  const claim = ctx.caseRecord.claim
  const docs = norm(input.files.map((f) => f.ocrText || '').join(' ')).replace(/ /g, '')
  const clean = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const check = (kind: 'claim' | 'policy', recorded: string | null | undefined) => {
    const re = new RegExp(`\\b${kind}\\s*(?:no\\.?|number|#)\\s*[:#]?\\s*([A-Z0-9][A-Z0-9-]{3,})`, 'gi')
    const printed = [...content.matchAll(re)].map((m) => m[1])
    for (const p of new Set(printed)) {
      if (recorded && clean(p) === clean(recorded)) continue
      out.push({
        ruleId: 'DQA-007',
        key: `${kind}-mismatch:${clean(p)}`,
        source: 'deterministic',
        title: `The ${kind} number ${p} is not the one on the case`,
        detail: recorded ? `The case records ${kind} number ${recorded}.` : `The case has no ${kind} number recorded.`,
        claim: sentenceAt(content, content.indexOf(p)),
        recommendation: `Use the ${kind} number from the carrier's correspondence.`,
      })
    }
    if (recorded && printed.length && !docs.includes(clean(recorded).toLowerCase())) {
      out.push({
        ruleId: 'DQA-007',
        key: `${kind}-unverified:${clean(recorded)}`,
        source: 'deterministic',
        title: `The ${kind} number ${recorded} is not in any case document`,
        detail: 'No uploaded record or carrier letter shows this number, so it cannot be checked.',
        recommendation: `Upload the carrier letter that shows the ${kind} number, or record how it was confirmed.`,
      })
    }
  }
  check('claim', claim?.claimNumber)
  check('policy', claim?.policyNumber)

  const venue = (input.venueState || '').toUpperCase()
  if (!venue || !US_STATES[venue]) {
    out.push({
      ruleId: 'DQA-008',
      key: 'no-venue',
      source: 'deterministic',
      title: 'No jurisdiction on the case',
      detail: 'The case has no venue state, so the governing law and deadline cannot be checked.',
      recommendation: 'Set the venue state on the case.',
    })
  } else {
    for (const [code, name] of Object.entries(US_STATES)) {
      if (code === venue || code === 'DC') continue
      const re = new RegExp(`\\b(?:under|of)\\s+${name}\\s+law\\b|\\b${name}\\s+(?:Civil|Vehicle|Penal|Insurance|Revised)\\s+(?:Code|Statutes?)\\b|\\blaws of (?:the State of )?${name}\\b`, 'i')
      const m = re.exec(content)
      if (!m) continue
      out.push({
        ruleId: 'DQA-008',
        key: `foreign-law:${code}`,
        source: 'deterministic',
        title: `The letter relies on ${name} law`,
        detail: `The case venue is ${US_STATES[venue]}.`,
        claim: sentenceAt(content, m.index),
        recommendation: `Cite ${US_STATES[venue]} law, or correct the venue on the case.`,
      })
    }
  }

  if (input.sol.status === 'unknown') {
    out.push({
      ruleId: 'DQA-009',
      key: 'sol-unknown',
      source: 'deterministic',
      title: 'The limitations deadline is not verified',
      detail: 'No statute-of-limitations deadline could be computed for this case type and venue.',
      recommendation: 'Confirm the deadline and record it on the case.',
    })
  } else if (input.sol.status === 'expired') {
    out.push({
      ruleId: 'DQA-009',
      key: 'sol-expired',
      source: 'deterministic',
      title: 'The computed limitations deadline has passed',
      detail: input.sol.expiresAt ? `The computed deadline was ${longDay(isoDay(input.sol.expiresAt) as string)}.` : 'The computed deadline has passed.',
      recommendation: 'Confirm whether suit was filed or a tolling rule applies before sending a demand.',
    })
  }
}

function liabilityRules(input: DeterministicInput, out: DraftFinding[]) {
  const { content, ctx } = input
  const liability = ctx.caseRecord.liability
  const police = input.files.filter((f) => f.category === 'police_report')
  const policeText = police.map((f) => f.ocrText || '').join('\n')

  const citeSentences = sentencesOf(content).filter((s) => /\b(cited|citation|ticketed|ticket)\b/i.test(s.text) && !/\b(Ex\.|Exhibit)\s*\d+\s*$/.test(s.text))
  if (citeSentences.length) {
    const denial = /\bno\s+citations?\b|\bcitations?\s*(?:issued)?\s*[:\-]\s*(?:none|no|n\/a)\b|\bnot\s+cited\b|\bno\s+(?:tickets?|violations?)\s+(?:were\s+)?issued\b/i.exec(policeText)
    if (denial) {
      const file = police.find((f) => (f.ocrText || '').includes(denial[0]))
      out.push({
        ruleId: 'DQA-101',
        key: 'citation-contradicted',
        source: 'deterministic',
        title: 'The letter says a citation was issued; the police report says none was',
        detail: 'The police report records no citation.',
        claim: citeSentences[0].text,
        support: 'contradicted',
        evidence: [evidenceFrom(ctx, input.files, 'conflict', file?.id, null, snippet(file?.ocrText || policeText, (file?.ocrText || policeText).indexOf(denial[0])))],
        recommendation: 'Remove the citation from the letter.',
      })
    } else if (!liability?.citationIssuedTo && !/\b(cited|citation issued|ticket(?:ed)? for)\b/i.test(policeText)) {
      out.push({
        ruleId: 'DQA-101',
        key: 'citation-unsupported',
        source: 'deterministic',
        title: 'The citation in the letter has no source',
        detail: police.length ? 'The police report on file does not mention a citation.' : 'There is no police report on the case, and no citation is recorded.',
        claim: citeSentences[0].text,
        support: 'unsupported',
        recommendation: 'Upload the report that shows the citation, or remove it from the letter.',
      })
    }
  }

  const witnessSentence = sentencesOf(content).find((s) => /\b(eye-?)?witness(es)?\b/i.test(s.text) && !/\bno (eye-?)?witness/i.test(s.text))
  if (witnessSentence) {
    const hasWitness =
      (liability?.witnessStatements?.length ?? 0) > 0 ||
      (liability?.witnessCount ?? 0) > 0 ||
      liability?.hasWitnesses === true ||
      input.files.some((f) => f.category === 'witness_statements') ||
      /\bwitness(?:es)?\s*(?:name|statement|:)/i.test(policeText)
    if (!hasWitness) {
      out.push({
        ruleId: 'DQA-102',
        key: 'witness-unsupported',
        source: 'deterministic',
        title: 'The letter cites a witness the record does not have',
        detail: 'No witness statement, witness count or police-report witness entry is on the case.',
        claim: witnessSentence.text,
        support: 'unsupported',
        recommendation: 'Upload the witness statement, or remove the witness from the letter.',
      })
    }
  }

  const pct = Number(liability?.comparativeNegPct) || 0
  const disputed = /comparative|shared|disputed|contested/i.test(String(liability?.faultPosture || ''))
  if ((pct > 0 || disputed) && !/\b(comparative|shared fault|contributory|apportion|percent(age)? of fault)\b/i.test(content)) {
    out.push({
      ruleId: 'DQA-105',
      key: 'comparative-omitted',
      source: 'deterministic',
      title: 'Comparative fault is not addressed',
      detail: pct > 0 ? `The case records ${pct}% comparative fault, and the letter does not address it.` : 'Fault is recorded as disputed, and the letter does not address it.',
      recommendation: 'Address the comparative-fault argument in the liability section.',
    })
  }
}

function medicalRules(input: DeterministicInput, out: DraftFinding[]) {
  const { content, ctx } = input
  const letter = norm(content)
  const entries = (ctx.caseRecord.medical?.entries ?? []).filter((e) => !e.isFuture)
  const providers = new Map<string, string>()
  for (const e of entries) {
    const key = norm(e.provider).split(' ').filter((t) => t.length > 2).slice(0, 2).join(' ')
    if (key && !providers.has(key)) providers.set(key, e.provider)
  }
  for (const [key, name] of providers) {
    if (hasPhrase(letter, key)) continue
    out.push({
      ruleId: 'DQA-202',
      key: `encounter:${key}`,
      source: 'deterministic',
      title: `Treatment at ${name} is not in the letter`,
      detail: 'This provider is on the treatment timeline but the letter never mentions it.',
      recommendation: 'Add the visits to the treatment chronology, or remove them from the timeline if they are unrelated.',
    })
  }

  const gaps = treatmentGaps(treatmentVisits(ctx))
  if (gaps.length && !/\b(gap|break in (care|treatment)|paus|interruption)\b/i.test(content)) {
    out.push({
      ruleId: 'DQA-209',
      key: 'gaps',
      source: 'deterministic',
      title: `${gaps.length} treatment gap${gaps.length === 1 ? '' : 's'} not explained`,
      detail: gaps.map((g) => `${g.days} days between ${longDay(isoDay(g.from) as string)} and ${longDay(isoDay(g.to) as string)}`).join('; '),
      recommendation: 'Explain the gap (scheduling, insurance, home care) before the adjuster raises it.',
    })
  }

  for (const dx of diagnosesOf(ctx)) {
    const words = norm(dx.replace(/\([^)]*\)/g, ''))
      .split(' ')
      .filter((t) => t.length >= 4 && !STOP_DX.has(t))
    if (!words.length || words.every((w) => hasPhrase(letter, w))) continue
    out.push({
      ruleId: 'DQA-210',
      key: `dx:${words.join(' ')}`,
      source: 'deterministic',
      title: `Documented diagnosis missing: ${dx}`,
      detail: 'The records document this diagnosis, but the letter does not state it.',
      recommendation: 'Name the diagnosis in the injuries section with its record citation.',
    })
  }
  for (const symptom of ctx.caseRecord.medical?.status?.symptoms ?? []) {
    const words = norm(symptom).split(' ').filter((t) => t.length >= 4)
    if (!words.length || words.every((w) => hasPhrase(letter, w))) continue
    out.push({
      ruleId: 'DQA-210',
      key: `symptom:${norm(symptom)}`,
      source: 'deterministic',
      title: `Symptom missing: ${symptom}`,
      detail: 'This symptom is recorded on the case but not described in the letter.',
      recommendation: 'Describe the symptom and how it limits the client.',
    })
  }
}

/**
 * Blocks of lines that each carry one dollar figure. A "total" line must equal
 * the lines above it since the previous total, or the subtotals above it.
 */
function tableTotals(content: string): Array<{ total: number; sum: number; line: string; medical: boolean }> {
  const out: Array<{ total: number; sum: number; line: string; medical: boolean }> = []
  const lines = content.split('\n')
  let items: number[] = []
  let subtotals: number[] = []
  const flush = () => {
    items = []
    subtotals = []
  }
  for (const raw of lines) {
    const line = raw.trim()
    const amounts = dollarsIn(line)
    if (amounts.length !== 1 || line.length > 180) {
      flush()
      continue
    }
    const value = amounts[0].value
    if (/\b(sub)?total\b/i.test(line)) {
      const sum = items.reduce((s, n) => s + n, 0)
      const viaSubtotals = subtotals.reduce((s, n) => s + n, 0) + sum
      if (items.length + subtotals.length >= 2 && Math.abs(sum - value) > 1 && Math.abs(viaSubtotals - value) > 1) {
        out.push({ total: value, sum: subtotals.length ? viaSubtotals : sum, line, medical: /medical|bill|charge|provider|special/i.test(line) })
      }
      subtotals.push(value)
      items = []
    } else {
      items.push(value)
    }
  }
  return out
}

function damagesRules(input: DeterministicInput, out: DraftFinding[]) {
  const { content, ctx } = input
  const record = ctx.caseRecord
  const totals = totalsOf(ctx)
  const items = record.damageItems ?? []

  if (items.length) {
    const sum = items.reduce((s, i) => s + (Number(i.amount) || 0), 0)
    const accounted = totals.medical + totals.futureMedical + totals.lostWages + totals.otherEconomic
    if (Math.abs(sum - accounted) > 1) {
      out.push({
        ruleId: 'DQA-301',
        key: 'record-sum',
        source: 'deterministic',
        title: 'The itemized damages do not add up to the letter totals',
        detail: `Itemized damages total ${money(sum)}; the letter accounts for ${money(accounted)}.`,
        recommendation: 'Redraft from the damages ledger so every total is computed from its line items.',
      })
    }
  }
  for (const t of tableTotals(content)) {
    out.push({
      ruleId: t.medical ? 'DQA-301' : 'DQA-305',
      key: `table:${Math.round(t.total)}:${Math.round(t.sum)}`,
      source: 'deterministic',
      title: t.medical ? 'A medical total does not equal its lines' : 'The damages categories do not add up to the total',
      detail: `The lines above "${t.line}" add up to ${money(t.sum)}, not ${money(t.total)}.`,
      claim: t.line,
      recommendation: 'Correct the figures so the total equals its parts.',
    })
  }

  const providerTotals = new Map<string, { name: string; amount: number }>()
  for (const i of items) {
    if (i.category !== 'medical' || !i.provider) continue
    const key = norm(i.provider).split(' ').filter((t) => t.length > 2).slice(0, 2).join(' ')
    if (!key) continue
    const row = providerTotals.get(key) || { name: i.provider, amount: 0 }
    row.amount += Number(i.amount) || 0
    providerTotals.set(key, row)
  }
  const letterNorm = norm(content)
  for (const [key, row] of providerTotals) {
    if (row.amount <= 0 || hasPhrase(letterNorm, key)) continue
    out.push({
      ruleId: 'DQA-302',
      key: `charges:${key}`,
      source: 'deterministic',
      title: `${money(row.amount)} in charges from ${row.name} left out`,
      detail: 'These charges are on the damages ledger but the provider is not in the letter.',
      recommendation: 'Add the provider and charges to the medical specials, or remove them from the ledger if unrelated.',
    })
  }

  const billedFigures = new Set<number>()
  for (const i of items) {
    if (i.category === 'medical' && i.billed != null) billedFigures.add(Math.round(i.billed))
  }
  if (ctx.ledger.totalBilled > 0) billedFigures.add(Math.round(ctx.ledger.totalBilled))
  const billedSum = items.filter((i) => i.category === 'medical').reduce((s, i) => s + (i.billed ?? (Number(i.amount) || 0)), 0)
  if (billedSum > 0) billedFigures.add(Math.round(billedSum))
  const hasPaymentEvidence = items.some((i) => i.paidOrOwed != null)
  for (const s of sentencesOf(content)) {
    const paid = /\b(paid|payments? of|reimbursed)\b/i.test(s.text) && !/\b(billed|charged|charges|incurred)\b/i.test(s.text)
    if (!paid) continue
    const hit = dollarsIn(s.text).find((d) => billedFigures.has(Math.round(d.value)))
    if (!hit || hasPaymentEvidence) continue
    out.push({
      ruleId: 'DQA-303',
      key: `paid-as-billed:${Math.round(hit.value)}`,
      source: 'deterministic',
      title: `${money(hit.value)} is billed charges, described as paid`,
      detail: 'The record shows this figure as billed. No payment record supports describing it as paid.',
      claim: s.text,
      support: 'contradicted',
      recommendation: 'Describe the figure as billed charges, or upload the payment records.',
    })
  }

  if (totals.lostWages > 0) {
    const sourced = input.files.some((f) => f.category === 'wage_verification') || items.some((i) => /wage|income|earn/i.test(i.category) && i.sourceFileId)
    if (!sourced) {
      out.push({
        ruleId: 'DQA-304',
        key: 'wages-unsupported',
        source: 'deterministic',
        title: `${money(totals.lostWages)} in lost wages has no payroll evidence`,
        detail: 'No wage verification, pay stub or employer letter is on the case.',
        support: 'unsupported',
        recommendation: 'Upload wage documentation, or remove the wage claim.',
      })
    }
  }

  const approved = input.approvedDemandAmount
  if (approved == null) {
    out.push({
      ruleId: 'DQA-306',
      key: 'demand-unapproved',
      source: 'deterministic',
      title: 'No attorney has approved the demand amount',
      detail: `The letter demands ${money(input.targetAmount)}. A demand amount must be set by an attorney, not taken from a modeled range.`,
      recommendation: 'Approve the demand amount, with its rationale.',
    })
  } else if (Math.round(approved) !== Math.round(input.targetAmount)) {
    out.push({
      ruleId: 'DQA-306',
      key: `demand-mismatch:${Math.round(approved)}:${Math.round(input.targetAmount)}`,
      source: 'deterministic',
      title: 'The demand differs from the approved amount',
      detail: `The letter demands ${money(input.targetAmount)}; the attorney approved ${money(approved)}.`,
      recommendation: 'Redraft with the approved amount, or approve the new amount.',
    })
  } else if (!dollarsIn(content).some((d) => Math.round(d.value) === Math.round(approved))) {
    out.push({
      ruleId: 'DQA-306',
      key: `demand-not-printed:${Math.round(approved)}`,
      source: 'deterministic',
      title: 'The approved demand amount is not in the letter',
      detail: `The attorney approved ${money(approved)}, but that figure does not appear in the letter text.`,
      recommendation: 'Redraft so the settlement demand states the approved amount.',
    })
  }

  if (totals.futureMedical > 0) {
    const sourced =
      (record.medical?.entries ?? []).some((e) => e.isFuture && e.sourceFileId) ||
      items.some((i) => /future/i.test(i.category) && i.sourceFileId)
    if (!sourced) {
      out.push({
        ruleId: 'DQA-307',
        key: 'future-unsupported',
        source: 'deterministic',
        title: `${money(totals.futureMedical)} in future care has no medical source`,
        detail: 'No provider recommendation or cost estimate in the records supports the future-care figure.',
        support: 'unsupported',
        recommendation: 'Upload the treatment plan or estimate that recommends the care, or remove the figure.',
      })
    }
  }

  const seen = new Map<string, number>()
  for (const i of items) {
    const when = isoDay(i.incurredAt as any) || ''
    const key = `${i.category}|${norm(i.provider || '')}|${when}|${Math.round(Number(i.amount) || 0)}`
    seen.set(key, (seen.get(key) || 0) + 1)
  }
  for (const [key, n] of seen) {
    if (n < 2) continue
    const [, provider, when, amount] = key.split('|')
    out.push({
      ruleId: 'DQA-308',
      key: `dup-charge:${key}`,
      source: 'deterministic',
      title: `A ${money(Number(amount))} charge is counted ${n} times`,
      detail: `${provider || 'A charge'}${when ? ` on ${longDay(when)}` : ''} appears ${n} times on the damages ledger.`,
      recommendation: 'Delete the duplicate ledger lines.',
    })
  }

  const allowed = new Set<number>()
  const add = (n: number | null | undefined) => {
    if (n && n > 0) allowed.add(Math.round(n))
  }
  for (const n of [
    totals.medical, totals.futureMedical, totals.lostWages, totals.earningCapacity, totals.otherEconomic,
    totals.specials, totals.general, totals.demand, ctx.ledger.totalBilled, input.targetAmount, input.approvedDemandAmount,
  ]) add(n)
  for (const i of items) {
    add(Number(i.amount))
    add(i.billed)
    add(i.paidOrOwed)
  }
  for (const e of record.medical?.entries ?? []) add(e.billedAmount)
  for (const e of ctx.ledger.entries) add(Number(e.billedAmount))
  add(billedSum)
  for (const cat of new Set(items.map((i) => i.category))) add(items.filter((i) => i.category === cat).reduce((s, i) => s + (Number(i.amount) || 0), 0))
  const flagged = new Set<number>()
  for (const d of dollarsIn(content)) {
    const v = Math.round(d.value)
    if (allowed.has(v) || flagged.has(v) || v === 0) continue
    flagged.add(v)
    out.push({
      ruleId: 'DQA-309',
      key: `amount:${v}`,
      source: 'deterministic',
      title: `${money(v)} does not trace to the case record`,
      detail: 'No ledger line, total, bill or approved figure on the case equals this amount.',
      claim: sentenceAt(content, d.index),
      recommendation: 'Tie the figure to a ledger line or remove it.',
    })
  }
}

function exhibitRules(input: DeterministicInput, out: DraftFinding[]) {
  const { content, ctx } = input
  const exhibits = ctx.caseRecord.exhibits ?? []
  const enclosed = new Set<string>([...exhibits.map((e) => String(e.number)), ...input.enclosures.filter((e) => e.fileId).map((e) => e.number)])
  const cited = new Set<string>()
  for (const m of content.matchAll(/See Exhibits? ([\d,\s\u2013-]+)/g)) {
    for (const part of m[1].split(',')) {
      const [a, b] = part.trim().split(/[\u2013-]/).map((x) => Number(x))
      if (!Number.isFinite(a)) continue
      for (let n = a; n <= (Number.isFinite(b) ? b : a); n += 1) cited.add(String(n))
    }
  }
  const pinpoints = pinpointCitations(content)
  for (const p of pinpoints) cited.add(String(p.exhibit))

  for (const n of cited) {
    if (enclosed.has(n)) continue
    out.push({
      ruleId: 'DQA-402',
      key: `cited-missing:${n}`,
      source: 'deterministic',
      title: `Exhibit ${n} is cited but not enclosed`,
      detail: 'The letter points the adjuster to an exhibit the package does not contain.',
      recommendation: 'Enclose the exhibit, or correct the citation.',
    })
  }
  for (const e of input.enclosures) {
    if (e.fileId) continue
    out.push({
      ruleId: 'DQA-402',
      key: `enclosure-missing:${e.label}`,
      source: 'deterministic',
      title: `Exhibit ${e.number} is no longer on the case`,
      detail: `The enclosure index lists "${e.label}", but no case file matches it.`,
      recommendation: 'Upload the file again, or redraft so the index matches the case files.',
    })
  }

  const fileOf = new Map(exhibits.filter((e) => e.fileId).map((e) => [e.number, e.fileId as string]))
  for (const p of pinpoints) {
    if (p.page == null) continue
    const fileId = fileOf.get(p.exhibit)
    const pages = fileId ? input.pageCounts.get(fileId) : undefined
    if (!pages || p.page <= pages) continue
    out.push({
      ruleId: 'DQA-403',
      key: `page-range:${p.exhibit}:${p.page}`,
      source: 'deterministic',
      title: `${p.text} points past the end of the document`,
      detail: `Exhibit ${p.exhibit} has ${pages} page${pages === 1 ? '' : 's'}.`,
      claim: sentenceAt(content, content.indexOf(p.text)),
      recommendation: 'Correct the page citation.',
    })
  }

  for (const n of enclosed) {
    if (cited.has(n)) continue
    out.push({
      ruleId: 'DQA-404',
      key: `uncited:${n}`,
      source: 'deterministic',
      title: `Exhibit ${n} is enclosed but never cited`,
      detail: 'An enclosure the letter never refers to leaves the adjuster to guess why it is there.',
      recommendation: 'Cite the exhibit where it supports the letter, or remove it.',
    })
  }
  if (input.enclosures.length) {
    const listed = new Set(input.enclosures.map((e) => e.fileId).filter(Boolean))
    for (const e of exhibits) {
      if (!e.fileId || listed.has(e.fileId)) continue
      out.push({
        ruleId: 'DQA-404',
        key: `unlisted:${e.fileId}`,
        source: 'deterministic',
        title: `${e.label} is not in the enclosure index`,
        detail: 'The case has this exhibit, but the letter was written before it was added.',
        recommendation: 'Redraft so the index lists the current exhibits, or leave it out deliberately.',
      })
    }
  }
}

const CASE_NAME = /\b([A-Z][A-Za-z'&.-]+(?:\s+[A-Z][A-Za-z'&.-]+){0,4}\s+v\.\s+[A-Z][A-Za-z'&.-]+(?:\s+(?:[A-Z][A-Za-z'&.-]+|of|the|and|&)){0,5})(,?\s*\(?\d{1,4}\s+[A-Z][A-Za-z.\s]{1,25}?(?:\s?\d(?:d|th|nd|rd))?\s+\d{1,5}\b(?:,\s*\d{1,5})?(?:\s*\([^)]{0,30}\d{4}\))?)?/g
const REPORTER = /\b\d{1,4}\s+(?:U\.S\.|S\.\s?Ct\.|L\.\s?Ed\.(?:\s?2d)?|F\.(?:\s?Supp\.)?(?:\s?(?:2d|3d|4th))?|Cal\.(?:\s?App\.)?(?:\s?(?:2d|3d|4th|5th))?|Cal\.\s?Rptr\.(?:\s?(?:2d|3d))?|N\.[EWY]\.(?:\s?(?:2d|3d))?|So\.(?:\s?(?:2d|3d))?|P\.(?:\s?(?:2d|3d))?|A\.(?:\s?(?:2d|3d))?|S\.[EW]\.(?:\s?2d)?)\s+\d{1,5}\b/g
const STATUTE = /\b(?:(?:[A-Z][a-z]*\.|Vehicle|Civil|Penal|Insurance|Government|Health|Safety|Evidence|Business|Labor|Procedure|Revised|Transportation|Traffic|and|&)\s+){0,5}(?:Code|Stat(?:utes)?\.?|U\.S\.C\.|C\.F\.R\.|Rev\.\s?Stat\.)\s*(?:Ann\.\s*)?(?:§+|sec(?:tion)?\.?)\s*[\d][\d.:()a-z-]*/gi

/** Case names, reporter citations and statutes the letter relies on. */
export function legalAuthoritiesIn(content: string): Array<{ text: string; index: number }> {
  const found: Array<{ text: string; index: number }> = []
  const add = (text: string, index: number) => {
    const t = text.trim().replace(/[,;.]$/, '')
    if (t.length < 6) return
    if (found.some((f) => index >= f.index && index < f.index + f.text.length)) return
    found.push({ text: t, index })
  }
  for (const m of content.matchAll(CASE_NAME)) add(m[0], m.index ?? 0)
  for (const m of content.matchAll(REPORTER)) add(m[0], m.index ?? 0)
  for (const m of content.matchAll(STATUTE)) add(m[0], m.index ?? 0)
  return found.sort((a, b) => a.index - b.index)
}

function textRules(input: DeterministicInput, out: DraftFinding[]) {
  const { content } = input
  for (const a of legalAuthoritiesIn(content)) {
    out.push({
      ruleId: 'DQA-405',
      key: `authority:${norm(a.text)}`,
      source: 'deterministic',
      title: `Verify the authority: ${a.text}`,
      detail: 'Every case, statute or code section must be checked against the official source before the demand goes out.',
      claim: sentenceAt(content, a.index),
      support: 'unverifiable',
      recommendation: 'Check the citation and the proposition it is cited for in an official reporter or code, then record where.',
    })
  }

  const deadline =
    /\b(within|no later than|by)\s+(?:\d+|ten|fourteen|fifteen|twenty|twenty-one|thirty|forty-five|sixty|ninety)\s*(?:\(\d+\)\s*)?(?:calendar\s+|business\s+)?days\b/i.test(content) ||
    /\b(?:by|before|no later than)\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}/i.test(content)
  if (!deadline) {
    out.push({
      ruleId: 'DQA-406',
      key: 'no-deadline',
      source: 'deterministic',
      title: 'No response deadline for the offer',
      detail: 'The settlement demand does not say when the carrier must respond.',
      recommendation: 'State the response deadline in the settlement demand.',
    })
  }

  const placeholders: Array<{ text: string; index: number }> = []
  for (const p of PLACEHOLDER_PATTERNS) {
    const m = p.exec(content)
    if (m) placeholders.push({ text: m[0], index: m.index })
  }
  for (const m of content.matchAll(/\[(?!sic\])[^\]\n]{1,40}\]|\b(?:TBD|TBA|XX+|lorem ipsum|INSERT [A-Z ]+)\b|\uFFFD/gi)) {
    placeholders.push({ text: m[0], index: m.index ?? 0 })
  }
  for (const p of placeholders) {
    out.push({
      ruleId: 'DQA-407',
      key: `placeholder:${norm(p.text) || 'replacement-char'}`,
      source: 'deterministic',
      title: `Placeholder text: "${p.text}"`,
      detail: 'Unfinished text cannot go to a carrier.',
      claim: sentenceAt(content, p.index),
      recommendation: 'Replace the placeholder with the real content.',
    })
  }
  for (const line of content.split('\n')) {
    const words = line.match(/\b[a-z]{4,}\b/gi) || []
    const odd = words.filter((w) => !/[aeiouy]/i.test(w) || /[bcdfghjklmnpqrstvwxz]{5,}/i.test(w))
    if (odd.length >= 2 && odd.length / Math.max(words.length, 1) >= 0.25) {
      out.push({
        ruleId: 'DQA-407',
        key: `corrupt:${norm(odd.slice(0, 3).join(' '))}`,
        source: 'deterministic',
        title: 'Garbled text in the letter',
        detail: `This line contains strings that are not words: ${odd.slice(0, 4).join(', ')}.`,
        claim: line.trim(),
        recommendation: 'Rewrite or delete the garbled text.',
      })
    }
  }
}

export function runDeterministicRules(input: DeterministicInput): DraftFinding[] {
  const out: DraftFinding[] = []
  identityRules(input, out)
  chronologyRules(input, out)
  identifierRules(input, out)
  liabilityRules(input, out)
  medicalRules(input, out)
  damagesRules(input, out)
  exhibitRules(input, out)
  textRules(input, out)
  return out
}
