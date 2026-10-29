/**
 * Demand Quality Audit runner and release gate.
 *
 * An audit reads one version of a letter and the case behind it, records the
 * fingerprints of both, and stores its findings. Release (finalize, send,
 * email to a carrier) is decided here and nowhere else: the latest audit must
 * be complete, current for the draft and the sources, and have every finding
 * resolved. Anything less blocks: the audit fails closed.
 */
import crypto from 'crypto'
import { prisma } from '../prisma'
import { logger } from '../logger'
import { getLlmChatClient, LLM_CHAT_MODEL } from '../llm-client'
import { recordAiRun } from '../ai-run'
import { ensureLocalCopy } from '../object-storage'
import { resolveEvidencePath, readDocumentPages } from '../evidence-processing'
import { loadDemandAuditContext, parseAssessmentFacts } from '../demand-drafting'
import { enclosuresIn, planDemandExhibits } from '../demand-docx'
import { deriveSOLStatusFromFacts } from '../solRules'
import { runDeterministicRules, type AuditFile, type DeterministicInput } from './deterministic'
import { CLAIMS_PROMPT_VERSION, verifyDemandClaims, type ExhibitDigest, type SourcePage } from './claims'
import { DQA_RULES, DQA_RULE_VERSION, SEVERITY_ORDER, resolutionRefusal, severityOf, type DraftFinding, type Severity } from './rules'
import { withLlmSubject } from '../llm-deidentify'
import { loadLlmSubject } from '../llm-subject'

const RUNNING_TIMEOUT_MS = 15 * 60 * 1000
const AI_BUDGET_MS = Number(process.env.DEMAND_AUDIT_AI_BUDGET_MS) || 150_000
const MAX_SOURCE_FILES = 30
const MAX_SOURCE_PAGES = 400
const SOURCE_CATEGORIES = new Set(['police_report', 'witness_statements', 'medical_records', 'bills', 'wage_verification', 'photos', 'video', 'other'])

export function draftHashOf(content: string | null | undefined): string {
  return crypto.createHash('sha256').update(String(content || '').replace(/\r\n/g, '\n')).digest('hex')
}

type LetterRow = {
  id: string
  assessmentId: string
  content: string
  targetAmount: number
  currentVersion: number
  status: string
  demandStyleId: string | null
  approvedDemandAmount: number | null
}

const LETTER_SELECT = {
  id: true,
  assessmentId: true,
  content: true,
  targetAmount: true,
  currentVersion: true,
  status: true,
  demandStyleId: true,
  approvedDemandAmount: true,
} as const

async function loadLetter(letterId: string): Promise<LetterRow | null> {
  return (await prisma.demandLetter.findUnique({ where: { id: letterId }, select: LETTER_SELECT })) as LetterRow | null
}

interface Prepared {
  letter: LetterRow
  draftHash: string
  sourceHash: string
  evidenceCutoff: Date | null
  input: Omit<DeterministicInput, 'pageCounts'>
  assessment: any
}

/** Everything an audit reads, and the fingerprint of it. */
async function prepare(letter: LetterRow, now = new Date()): Promise<Prepared | null> {
  const loaded = await loadDemandAuditContext(letter)
  if (!loaded) return null
  const { ctx, assessment } = loaded
  const files: AuditFile[] = (assessment.evidenceFiles || []).map((f: any) => ({
    id: f.id,
    originalName: f.originalName,
    category: f.category,
    identityCheck: f.identityCheck ?? null,
    contentHash: f.contentHash ?? null,
    createdAt: f.createdAt,
    ocrText: f.ocrText ?? null,
  }))
  const content = letter.content || ''
  const enclosures = enclosuresIn(content).length
    ? (await planDemandExhibits(letter.assessmentId, content)).map((e) => ({ number: e.number, label: e.label, fileId: e.file?.id ?? null }))
    : []
  const facts = parseAssessmentFacts(assessment.facts) as Record<string, unknown>
  const sol = deriveSOLStatusFromFacts({
    facts,
    claimType: assessment.claimType,
    venueState: assessment.venueState,
    venueCounty: assessment.venueCounty,
  })
  const sourceHash = crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        record: ctx.caseRecord,
        ledger: ctx.ledger.entries,
        incident: (facts as any)?.incident?.date ?? null,
        venue: [assessment.venueState, assessment.venueCounty, assessment.claimType],
        files: files.map((f) => [f.id, f.contentHash, f.category, f.identityCheck, (f.ocrText || '').length]).sort(),
        approvedDemandAmount: letter.approvedDemandAmount,
        targetAmount: letter.targetAmount,
      }),
    )
    .digest('hex')
  const evidenceCutoff = files.reduce<Date | null>((latest, f) => (!latest || f.createdAt > latest ? f.createdAt : latest), null)
  return {
    letter,
    draftHash: draftHashOf(content),
    sourceHash,
    evidenceCutoff,
    assessment,
    input: {
      content,
      targetAmount: letter.targetAmount,
      approvedDemandAmount: letter.approvedDemandAmount,
      ctx,
      files,
      enclosures,
      referenceCode: assessment.referenceCode ?? null,
      venueState: assessment.venueState ?? null,
      sol: { status: sol.status, expiresAt: sol.expiresAt ?? null },
      now,
    },
  }
}

/** Page text for the files the letter could draw on: the enclosed exhibits first. */
async function loadSourcePages(prepared: Prepared): Promise<{ pages: SourcePage[]; pageCounts: Map<string, number> }> {
  const exhibits = prepared.input.ctx.caseRecord.exhibits ?? []
  const exhibitOf = new Map(exhibits.filter((e) => e.fileId).map((e) => [e.fileId as string, e.number]))
  const rows = (prepared.assessment.evidenceFiles || []) as any[]
  const ordered = [
    ...rows.filter((f) => exhibitOf.has(f.id)),
    ...rows.filter((f) => !exhibitOf.has(f.id) && SOURCE_CATEGORIES.has(f.category)),
  ].slice(0, MAX_SOURCE_FILES)

  const pages: SourcePage[] = []
  const pageCounts = new Map<string, number>()
  for (const f of ordered) {
    if (pages.length >= MAX_SOURCE_PAGES) break
    let read: Array<{ page: number | null; text: string }> = []
    try {
      const resolved = resolveEvidencePath(f.filePath)
      if (await ensureLocalCopy(resolved).catch(() => false)) {
        read = await readDocumentPages(resolved, f.mimetype, { ocr: false })
      }
    } catch (error: any) {
      logger.warn('Demand audit could not read a source file', { fileId: f.id, error: error?.message })
    }
    if (read.some((p) => p.page != null)) pageCounts.set(f.id, Math.max(...read.map((p) => p.page ?? 0)))
    if (!read.length && f.ocrText?.trim()) {
      read = String(f.ocrText)
        .split('\f')
        .map((text: string, i: number, all: string[]) => ({ page: all.length > 1 ? i + 1 : null, text }))
        .filter((p: { text: string }) => p.text.trim())
    }
    for (const p of read) {
      pages.push({ fileId: f.id, fileName: f.originalName, exhibit: exhibitOf.get(f.id) ?? null, page: p.page, text: p.text })
    }
  }
  return { pages, pageCounts }
}

function exhibitDigests(prepared: Prepared, pages: SourcePage[]): ExhibitDigest[] {
  const rows = (prepared.assessment.evidenceFiles || []) as any[]
  return (prepared.input.ctx.caseRecord.exhibits ?? []).map((e) => {
    const file = rows.find((f) => f.id === e.fileId)
    const text =
      pages.filter((p) => p.fileId === e.fileId).map((p) => p.text).join('\n').slice(0, 700) ||
      [file?.aiSummary, file?.ocrText].filter(Boolean).join('\n').slice(0, 700)
    return { number: e.number, label: e.label, category: file?.category ?? e.section, text }
  })
}

function fingerprintOf(f: DraftFinding): string {
  return crypto.createHash('sha1').update(`${f.ruleId}|${f.key}`).digest('hex')
}

export interface AuditSummary {
  critical: number
  high: number
  medium: number
  low: number
  open: number
  resolved: number
  claims: number
  bySupport: Record<string, number>
  sourcePages: number
}

async function persistFindings(auditId: string, letterId: string, findings: DraftFinding[]) {
  const unique = new Map<string, DraftFinding>()
  for (const f of findings) unique.set(fingerprintOf(f), f)
  const prints = [...unique.keys()]
  const resolutions = prints.length
    ? await prisma.demandAuditResolution.findMany({
        where: { demandLetterId: letterId, fingerprint: { in: prints } },
        orderBy: { createdAt: 'desc' },
      })
    : []
  const latest = new Map<string, (typeof resolutions)[number]>()
  for (const r of resolutions) if (!latest.has(r.fingerprint)) latest.set(r.fingerprint, r)

  const rows = [...unique].map(([fingerprint, f]) => {
    const r = latest.get(fingerprint)
    // A resolution only carries if the rule still allows it for whoever made it.
    const carries = r && !resolutionRefusal(f.ruleId, r.disposition, r.reason, { isAttorney: r.actorIsAttorney })
    return {
      auditId,
      ruleId: f.ruleId,
      severity: severityOf(f.ruleId),
      source: f.source,
      title: f.title.slice(0, 500),
      detail: f.detail,
      claim: f.claim ?? null,
      support: f.support ?? null,
      evidence: f.evidence?.length ? JSON.stringify(f.evidence.slice(0, 8)) : null,
      recommendation: f.recommendation ?? null,
      fingerprint,
      status: carries ? 'resolved' : 'open',
      resolutionId: carries ? r!.id : null,
    }
  })
  if (rows.length) await prisma.demandAuditFinding.createMany({ data: rows })
  return rows
}

function summarize(rows: Array<{ severity: string; status: string; support?: string | null }>, extra: Partial<AuditSummary> = {}): AuditSummary {
  const s: AuditSummary = { critical: 0, high: 0, medium: 0, low: 0, open: 0, resolved: 0, claims: 0, bySupport: {}, sourcePages: 0, ...extra }
  for (const r of rows) {
    if (r.status === 'open') {
      s.open += 1
      if ((SEVERITY_ORDER as string[]).includes(r.severity)) s[r.severity as Severity] += 1
    } else s.resolved += 1
  }
  return s
}

async function executeAudit(auditId: string, prepared: Prepared) {
  const started = Date.now()
  try {
    const { pages, pageCounts } = await loadSourcePages(prepared)
    const findings = runDeterministicRules({ ...prepared.input, pageCounts })

    const client = getLlmChatClient()
    let aiStatus: 'ok' | 'skipped' | 'timeout' | 'error' = 'skipped'
    let aiError: string | null = null
    const bySupport: Record<string, number> = {}
    let claimCount = 0
    if (client) {
      const subject = await loadLlmSubject(prepared.letter.assessmentId)
      const run = await verifyDemandClaims({
        letter: prepared.input.content,
        pages,
        exhibits: exhibitDigests(prepared, pages),
        today: prepared.input.now.toISOString().slice(0, 10),
        budgetMs: AI_BUDGET_MS,
        complete: async (system, user) => {
          const completion = await client.chat.completions.create(withLlmSubject({
            model: LLM_CHAT_MODEL,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
            temperature: 0,
            max_tokens: 4000,
            response_format: { type: 'json_object' },
          }, subject))
          return completion.choices[0]?.message?.content ?? null
        },
      })
      aiStatus = run.status
      aiError = run.error ?? null
      findings.push(...run.findings)
      claimCount = run.claims.length
      for (const c of run.claims) bySupport[c.status] = (bySupport[c.status] || 0) + 1
      void recordAiRun({
        kind: 'demand_quality_audit',
        assessmentId: prepared.letter.assessmentId,
        provider: 'openai',
        model: LLM_CHAT_MODEL,
        status: run.status === 'ok' ? 'ok' : 'error',
        error: run.error,
        inputSummary: { auditId, sourcePages: pages.length, letterChars: prepared.input.content.length },
        outputSummary: { claims: run.claims.length, findings: run.findings.length, bySupport },
        latencyMs: Date.now() - started,
      })
    } else {
      aiError = client ? 'Sending case documents to the model is turned off for this deployment.' : 'No model is configured.'
    }

    if (aiStatus !== 'ok') {
      findings.push({
        ruleId: 'DQA-900',
        key: `ai-incomplete:${prepared.draftHash.slice(0, 16)}`,
        source: 'deterministic',
        title:
          aiStatus === 'timeout'
            ? 'Claim verification timed out'
            : aiStatus === 'skipped'
              ? 'Claim verification did not run'
              : 'Claim verification failed',
        detail: `${aiError || 'The letter\u2019s factual claims were not checked against the records.'} Unverified claims never count as passing.`,
        recommendation: 'Rerun the audit. If it cannot complete, an attorney must check every factual claim against the records and record that here.',
      })
    }

    const rows = await persistFindings(auditId, prepared.letter.id, findings)
    const summary = summarize(rows, { claims: claimCount, bySupport, sourcePages: pages.length })
    await prisma.demandAudit.update({
      where: { id: auditId },
      data: {
        status: 'complete',
        aiStatus,
        aiError,
        modelVersion: aiStatus === 'skipped' ? null : LLM_CHAT_MODEL,
        summary: JSON.stringify(summary),
        completedAt: new Date(),
      },
    })
    logger.info('Demand quality audit complete', { auditId, letterId: prepared.letter.id, aiStatus, open: summary.open })
  } catch (error: any) {
    logger.error('Demand quality audit failed', { auditId, error: error?.message })
    await prisma.demandAudit
      .update({ where: { id: auditId }, data: { status: 'failed', aiError: error?.message || String(error), completedAt: new Date() } })
      .catch(() => null)
  }
}

export async function startDemandAudit(letterId: string, actor: { id?: string | null; name?: string | null }, options: { wait?: boolean } = {}) {
  const letter = await loadLetter(letterId)
  if (!letter) return null
  const prepared = await prepare(letter)
  if (!prepared) return null
  const audit = await prisma.demandAudit.create({
    data: {
      demandLetterId: letter.id,
      assessmentId: letter.assessmentId,
      letterVersion: letter.currentVersion,
      draftHash: prepared.draftHash,
      sourceHash: prepared.sourceHash,
      evidenceCutoff: prepared.evidenceCutoff,
      ruleVersion: DQA_RULE_VERSION,
      promptVersion: CLAIMS_PROMPT_VERSION,
      requestedById: actor.id ?? null,
      requestedByName: actor.name ?? null,
    },
  })
  const run = executeAudit(audit.id, prepared)
  if (options.wait) await run
  else void run
  return audit
}

/** The newest audit of a letter, with a run that died mid-way marked failed. */
export async function latestAudit(letterId: string) {
  const audit = await prisma.demandAudit.findFirst({ where: { demandLetterId: letterId }, orderBy: { startedAt: 'desc' } })
  if (audit?.status === 'running' && Date.now() - audit.startedAt.getTime() > RUNNING_TIMEOUT_MS) {
    return prisma.demandAudit.update({
      where: { id: audit.id },
      data: { status: 'failed', aiError: 'The audit did not finish. Run it again.', completedAt: new Date() },
    })
  }
  return audit
}

export async function runningAudit(letterId: string) {
  const audit = await latestAudit(letterId)
  return audit?.status === 'running' ? audit : null
}

export interface ReleaseDecision {
  ok: boolean
  reasons: string[]
  auditId: string | null
  stale: { draft: boolean; sources: boolean; version: boolean }
  draftHash: string
  sourceHash: string | null
  openBySeverity: Record<Severity, number>
}

/** Current fingerprints of a letter and its case. */
export async function currentHashes(letterId: string) {
  const letter = await loadLetter(letterId)
  if (!letter) return null
  const prepared = await prepare(letter)
  return { letter, draftHash: draftHashOf(letter.content), sourceHash: prepared?.sourceHash ?? null }
}

export async function releaseDecision(letterId: string, action: 'finalize' | 'send' | 'view' = 'view'): Promise<ReleaseDecision> {
  const current = await currentHashes(letterId)
  const audit = await latestAudit(letterId)
  const open: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 }
  const decision: ReleaseDecision = {
    ok: false,
    reasons: [],
    auditId: audit?.id ?? null,
    stale: { draft: false, sources: false, version: false },
    draftHash: current?.draftHash ?? '',
    sourceHash: current?.sourceHash ?? null,
    openBySeverity: open,
  }
  if (!current) {
    decision.reasons.push('The letter or its case could not be loaded.')
    return decision
  }
  if (!audit) {
    decision.reasons.push('Run the Demand Quality Audit on this letter first.')
    return decision
  }
  if (audit.status === 'running') {
    decision.reasons.push('The Demand Quality Audit is still running.')
    return decision
  }
  if (audit.status !== 'complete') {
    decision.reasons.push('The last Demand Quality Audit did not finish. Run it again.')
    return decision
  }
  decision.stale = {
    version: audit.letterVersion !== current.letter.currentVersion,
    draft: audit.draftHash !== current.draftHash,
    sources: !current.sourceHash || audit.sourceHash !== current.sourceHash,
  }
  if (decision.stale.version || decision.stale.draft) decision.reasons.push('The letter changed after the last audit. Run the audit again.')
  else if (decision.stale.sources) decision.reasons.push('Case evidence or figures changed after the last audit. Run the audit again.')

  const findings = await prisma.demandAuditFinding.findMany({ where: { auditId: audit.id, status: 'open' }, select: { severity: true } })
  for (const f of findings) if (f.severity in open) open[f.severity as Severity] += 1
  const blocking = SEVERITY_ORDER.filter((s) => open[s] > 0).map((s) => `${open[s]} ${s}`)
  if (blocking.length) decision.reasons.push(`Resolve the open audit findings first (${blocking.join(', ')}).`)

  if (action === 'send') {
    const letter = await prisma.demandLetter.findUnique({
      where: { id: letterId },
      select: { status: true, approvedDraftHash: true, approvedSourceHash: true },
    })
    if (letter?.status === 'DRAFT') decision.reasons.push('Approve and finalize the letter before sending it.')
    else if (!letter?.approvedDraftHash) decision.reasons.push('An attorney has not approved this letter against a passing audit.')
    else if (letter.approvedDraftHash !== current.draftHash || letter.approvedSourceHash !== current.sourceHash) {
      decision.reasons.push('The case changed after the attorney approved this letter. Rerun the audit and approve it again.')
    }
  }
  decision.ok = decision.reasons.length === 0
  return decision
}

export function parseSummary(raw: string | null | undefined): AuditSummary | null {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function evidenceOf(f: { evidence: string | null }): Array<Record<string, any>> {
  try {
    return f.evidence ? JSON.parse(f.evidence) : []
  } catch {
    return []
  }
}

/** Where each cited file can be opened, so the source viewer can jump to the page. */
export async function fileUrlsFor(findings: Array<{ evidence: string | null }>): Promise<Map<string, string>> {
  const ids = [...new Set(findings.flatMap((f) => evidenceOf(f).map((e) => e.fileId)).filter((id): id is string => Boolean(id)))]
  if (!ids.length) return new Map()
  const rows = await prisma.evidenceFile.findMany({ where: { id: { in: ids } }, select: { id: true, fileUrl: true } })
  return new Map(rows.map((r) => [r.id, r.fileUrl]))
}

export function serializeFinding(f: any, resolution?: any, fileUrls?: Map<string, string>) {
  const evidence = evidenceOf(f).map((e) => ({ ...e, fileUrl: (e.fileId && fileUrls?.get(e.fileId)) || null }))
  const rule = DQA_RULES[f.ruleId]
  return {
    id: f.id,
    ruleId: f.ruleId,
    ruleTitle: rule?.title ?? f.ruleId,
    group: rule?.group ?? 'process',
    resolve: rule?.resolve ?? 'fix',
    severity: f.severity,
    source: f.source,
    title: f.title,
    detail: f.detail,
    claim: f.claim,
    support: f.support,
    evidence,
    recommendation: f.recommendation,
    status: f.status,
    resolution: resolution
      ? {
          id: resolution.id,
          disposition: resolution.disposition,
          reason: resolution.reason,
          actorName: resolution.actorName,
          actorIsAttorney: resolution.actorIsAttorney,
          createdAt: resolution.createdAt,
        }
      : null,
  }
}

export async function auditView(audit: any, filters: { severity?: string; status?: string; ruleId?: string } = {}) {
  const findings = await prisma.demandAuditFinding.findMany({ where: { auditId: audit.id } })
  const resIds = findings.map((f) => f.resolutionId).filter((id): id is string => Boolean(id))
  const resolutions = resIds.length ? await prisma.demandAuditResolution.findMany({ where: { id: { in: resIds } } }) : []
  const resById = new Map(resolutions.map((r) => [r.id, r]))
  const rank = (s: string) => SEVERITY_ORDER.indexOf(s as Severity)
  const shown = findings
    .filter((f) => (!filters.severity || f.severity === filters.severity) && (!filters.status || f.status === filters.status) && (!filters.ruleId || f.ruleId === filters.ruleId))
    .sort((a, b) => (a.status === b.status ? 0 : a.status === 'open' ? -1 : 1) || rank(a.severity) - rank(b.severity) || a.ruleId.localeCompare(b.ruleId))
  const release = await releaseDecision(audit.demandLetterId)
  const fileUrls = await fileUrlsFor(shown)
  return {
    audit: {
      id: audit.id,
      demandLetterId: audit.demandLetterId,
      letterVersion: audit.letterVersion,
      status: audit.status,
      aiStatus: audit.aiStatus,
      aiError: audit.aiError,
      ruleVersion: audit.ruleVersion,
      modelVersion: audit.modelVersion,
      promptVersion: audit.promptVersion,
      draftHash: audit.draftHash,
      sourceHash: audit.sourceHash,
      evidenceCutoff: audit.evidenceCutoff,
      requestedByName: audit.requestedByName,
      startedAt: audit.startedAt,
      completedAt: audit.completedAt,
      summary: audit.status === 'complete' ? summarize(findings, parseSummary(audit.summary) ?? {}) : parseSummary(audit.summary),
    },
    findings: shown.map((f) => serializeFinding(f, f.resolutionId ? resById.get(f.resolutionId) : undefined, fileUrls)),
    release,
  }
}

/** Record a reviewer's disposition of one finding on the letter's latest audit. */
export async function resolveFinding(args: {
  auditId: string
  findingId: string
  disposition: string
  reason: string
  actor: { id?: string | null; name?: string | null; isAttorney: boolean }
}): Promise<{ error: string; status: number } | { ok: true; resolutionId: string }> {
  const finding = await prisma.demandAuditFinding.findFirst({
    where: { id: args.findingId, auditId: args.auditId },
    include: { audit: { select: { id: true, demandLetterId: true, letterVersion: true } } },
  })
  if (!finding) return { error: 'Finding not found', status: 404 }
  const latest = await latestAudit(finding.audit.demandLetterId)
  if (latest?.id !== finding.auditId) return { error: 'A newer audit has run. Resolve the finding on the latest audit.', status: 409 }
  if (finding.status === 'resolved') return { error: 'This finding is already resolved.', status: 409 }
  const refusal = resolutionRefusal(finding.ruleId, args.disposition, args.reason, { isAttorney: args.actor.isAttorney })
  if (refusal) return { error: refusal, status: 400 }

  const resolution = await prisma.demandAuditResolution.create({
    data: {
      demandLetterId: finding.audit.demandLetterId,
      fingerprint: finding.fingerprint,
      ruleId: finding.ruleId,
      disposition: args.disposition,
      reason: args.reason.trim().slice(0, 4000) || 'Acknowledged.',
      actorId: args.actor.id ?? null,
      actorName: args.actor.name ?? null,
      actorIsAttorney: args.actor.isAttorney,
      letterVersion: finding.audit.letterVersion,
      auditId: finding.auditId,
    },
  })
  await prisma.demandAuditFinding.update({ where: { id: finding.id }, data: { status: 'resolved', resolutionId: resolution.id } })
  return { ok: true, resolutionId: resolution.id }
}
