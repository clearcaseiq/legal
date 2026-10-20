import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => {
  process.env.DEMAND_AUDIT_AI_BUDGET_MS = '200'
  return {
    letter: null as any,
    audits: [] as any[],
    findings: [] as any[],
    resolutions: [] as any[],
    ctx: null as any,
    files: [] as any[],
    model: 'ok' as 'ok' | 'hang',
    seq: 0,
  }
})

const pick = (row: any, select?: Record<string, boolean>) =>
  !select ? row : Object.fromEntries(Object.keys(select).map((k) => [k, row?.[k]]))
const matches = (row: any, where: any = {}) =>
  Object.entries(where).every(([k, v]: [string, any]) => (v && typeof v === 'object' && 'in' in v ? v.in.includes(row[k]) : row[k] === v))

vi.mock('../prisma', () => ({
  prisma: {
    demandLetter: {
      findUnique: vi.fn(async ({ select }: any) => (db.letter ? pick(db.letter, select) : null)),
    },
    demandAudit: {
      create: vi.fn(async ({ data }: any) => {
        const row = { id: `a${++db.seq}`, status: 'running', startedAt: new Date(Date.now() + db.seq), completedAt: null, ...data }
        db.audits.push(row)
        return row
      }),
      update: vi.fn(async ({ where, data }: any) => Object.assign(db.audits.find((a) => a.id === where.id), data)),
      findFirst: vi.fn(async ({ where }: any) =>
        db.audits.filter((a) => matches(a, where)).sort((a, b) => b.startedAt - a.startedAt)[0] ?? null,
      ),
    },
    demandAuditFinding: {
      createMany: vi.fn(async ({ data }: any) => {
        for (const d of data) db.findings.push({ id: `f${++db.seq}`, ...d })
        return { count: data.length }
      }),
      findMany: vi.fn(async ({ where }: any) => db.findings.filter((f) => matches(f, where))),
      findFirst: vi.fn(async ({ where }: any) => {
        const f = db.findings.find((x) => matches(x, where))
        return f ? { ...f, audit: db.audits.find((a) => a.id === f.auditId) } : null
      }),
      update: vi.fn(async ({ where, data }: any) => Object.assign(db.findings.find((f) => f.id === where.id), data)),
    },
    demandAuditResolution: {
      findMany: vi.fn(async ({ where }: any) => db.resolutions.filter((r) => matches(r, where)).slice().reverse()),
      create: vi.fn(async ({ data }: any) => {
        const row = { id: `r${++db.seq}`, createdAt: new Date(), ...data }
        db.resolutions.push(row)
        return row
      }),
    },
  },
}))
vi.mock('../demand-drafting', () => ({
  loadDemandAuditContext: vi.fn(async () => ({
    ctx: db.ctx,
    assessment: { evidenceFiles: db.files, facts: JSON.stringify(db.ctx.facts), claimType: 'auto', venueState: 'CA', venueCounty: null, referenceCode: 'CCIQ-BPX79C' },
  })),
  parseAssessmentFacts: (raw: string) => JSON.parse(raw),
}))
vi.mock('../demand-docx', () => ({ enclosuresIn: () => [], planDemandExhibits: async () => [] }))
vi.mock('../evidence-processing', () => ({ resolveEvidencePath: (p: string) => p, readDocumentPages: async () => [] }))
vi.mock('../object-storage', () => ({ ensureLocalCopy: async () => false }))
vi.mock('../ai-run', () => ({ recordAiRun: async () => null }))
vi.mock('../llm-prompt-sanitize', () => ({ llmAllowPhi: () => true }))
vi.mock('../solRules', () => ({ deriveSOLStatusFromFacts: () => ({ status: 'ok' }) }))
vi.mock('../llm-client', () => ({
  LLM_CHAT_MODEL: 'test-model',
  getLlmChatClient: () => ({
    chat: {
      completions: {
        create: async ({ messages }: any) => {
          if (db.model === 'hang') return new Promise(() => undefined)
          const user = messages[1].content as string
          const content = user.includes('Split the demand letter') ? { claims: [] } : user.includes('exhibits enclosed') ? { irrelevant: [] } : { results: [] }
          return { choices: [{ message: { content: JSON.stringify(content) } }] }
        },
      },
    },
  }),
}))

import { draftHashOf, latestAudit, releaseDecision, resolveFinding, startDemandAudit } from './service'
import { CLEAN_LETTER, baseContext, baseFiles } from './fixtures'

const fileRows = () => baseFiles().map((f) => ({ ...f, filePath: f.id, mimetype: 'application/pdf', aiSummary: null }))

async function audit() {
  const row = await startDemandAudit('d1', { id: 'u1', name: 'Pat Attorney' }, { wait: true })
  return db.audits.find((a) => a.id === row!.id)
}

beforeEach(() => {
  db.audits = []
  db.findings = []
  db.resolutions = []
  db.seq = 0
  db.model = 'ok'
  db.ctx = baseContext()
  db.files = fileRows()
  db.letter = {
    id: 'd1',
    assessmentId: 'as1',
    content: CLEAN_LETTER,
    targetAmount: 25000,
    currentVersion: 1,
    status: 'DRAFT',
    demandStyleId: null,
    approvedDemandAmount: 25000,
    approvedDraftHash: null,
    approvedSourceHash: null,
  }
})

describe('Demand Quality Audit release gate', () => {
  it('AT-030: a clean letter with a passing audit may be finalized, then sent once approved', async () => {
    const a = await audit()
    expect(a).toMatchObject({ status: 'complete', aiStatus: 'ok', draftHash: draftHashOf(CLEAN_LETTER) })
    const finalize = await releaseDecision('d1', 'finalize')
    expect(finalize).toMatchObject({ ok: true, reasons: [], auditId: a.id })

    expect((await releaseDecision('d1', 'send')).ok).toBe(false)
    Object.assign(db.letter, { status: 'FINAL', approvedDraftHash: finalize.draftHash, approvedSourceHash: finalize.sourceHash })
    expect((await releaseDecision('d1', 'send')).ok).toBe(true)
  })

  it('blocks release until an audit has run', async () => {
    expect((await releaseDecision('d1', 'finalize')).reasons).toEqual(['Run the Demand Quality Audit on this letter first.'])
  })

  it('AT-022: an edit after the audit invalidates it', async () => {
    await audit()
    Object.assign(db.letter, { content: `${CLEAN_LETTER}\nP.S.`, currentVersion: 2 })
    const decision = await releaseDecision('d1', 'finalize')
    expect(decision.ok).toBe(false)
    expect(decision.stale).toMatchObject({ draft: true, version: true })
  })

  it('AT-026: new evidence after the audit marks it stale', async () => {
    await audit()
    db.files.push({ ...fileRows()[1], id: 'f-new', originalName: 'New_Record.pdf', contentHash: 'h-new' })
    const decision = await releaseDecision('d1', 'finalize')
    expect(decision.stale.sources).toBe(true)
    expect(decision.reasons[0]).toMatch(/evidence or figures changed/)
  })

  it('AT-026: new evidence after approval blocks sending until re-approved', async () => {
    await audit()
    const finalize = await releaseDecision('d1', 'finalize')
    Object.assign(db.letter, { status: 'FINAL', approvedDraftHash: finalize.draftHash, approvedSourceHash: finalize.sourceHash })
    db.files.push({ ...fileRows()[1], id: 'f-new', originalName: 'New_Record.pdf', contentHash: 'h-new' })
    await audit()
    const send = await releaseDecision('d1', 'send')
    expect(send.ok).toBe(false)
    expect(send.reasons).toContain('The case changed after the attorney approved this letter. Rerun the audit and approve it again.')
  })

  it('AT-027: an older audit cannot release a newer draft', async () => {
    const first = await audit()
    Object.assign(db.letter, { content: CLEAN_LETTER.replace('30 days', '21 days'), currentVersion: 2 })
    await startDemandAudit('d1', { id: 'u1' })
    const running = await latestAudit('d1')
    expect(running?.id).not.toBe(first.id)
    const decision = await releaseDecision('d1', 'finalize')
    expect(decision.ok).toBe(false)
    expect(decision.auditId).toBe(running?.id)
  })

  it('AT-024: claim verification that times out fails closed until an attorney verifies manually', async () => {
    db.model = 'hang'
    const a = await audit()
    expect(a.aiStatus).toBe('timeout')
    const f = db.findings.find((x) => x.ruleId === 'DQA-900')
    expect(f).toMatchObject({ severity: 'high', status: 'open' })
    expect((await releaseDecision('d1', 'finalize')).ok).toBe(false)

    const refused = await resolveFinding({
      auditId: a.id,
      findingId: f.id,
      disposition: 'manual_verification',
      reason: 'Checked every claim against the records.',
      actor: { id: 'u2', name: 'Sam Paralegal', isAttorney: false },
    })
    expect(refused).toMatchObject({ status: 400, error: 'Only an attorney can resolve this finding.' })

    const ok = await resolveFinding({
      auditId: a.id,
      findingId: f.id,
      disposition: 'manual_verification',
      reason: 'Checked every claim in the letter against Exhibits 1 to 3 page by page.',
      actor: { id: 'u1', name: 'Pat Attorney', isAttorney: true },
    })
    expect(ok).toMatchObject({ ok: true })
    expect((await releaseDecision('d1', 'finalize')).ok).toBe(true)
  })

  it('AT-023: a documented resolution re-evaluates the finding and carries to the next audit', async () => {
    db.letter.content = CLEAN_LETTER.replace('Please respond', 'Smith v. Jones, 123 Cal. App. 4th 456 (2004). Please respond')
    const a = await audit()
    const f = db.findings.find((x) => x.auditId === a.id && x.ruleId === 'DQA-405')
    expect((await releaseDecision('d1', 'finalize')).openBySeverity.critical).toBe(1)

    await resolveFinding({
      auditId: a.id,
      findingId: f.id,
      disposition: 'verified_authority',
      reason: 'Pulled on Westlaw; good law, and it holds what the letter says.',
      actor: { id: 'u1', name: 'Pat Attorney', isAttorney: true },
    })
    expect(db.resolutions).toHaveLength(1)
    expect((await releaseDecision('d1', 'finalize')).ok).toBe(true)

    const b = await audit()
    expect(db.findings.find((x) => x.auditId === b.id && x.ruleId === 'DQA-405')).toMatchObject({ status: 'resolved', resolutionId: db.resolutions[0].id })
  })

  it('refuses a resolution on a superseded audit', async () => {
    db.letter.approvedDemandAmount = null
    const a = await audit()
    await audit()
    const old = db.findings.find((x) => x.auditId === a.id)
    const result = await resolveFinding({
      auditId: a.id,
      findingId: old.id,
      disposition: 'attorney_judgment',
      reason: 'x'.repeat(30),
      actor: { isAttorney: true },
    })
    expect(result).toMatchObject({ status: 409 })
  })
})
