import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  impactStatement: { findUnique: vi.fn(), upsert: vi.fn() },
  caseTask: { findMany: vi.fn(), update: vi.fn() },
  assessment: { findUnique: vi.fn() },
}))
vi.mock('./prisma', () => ({ prisma: prismaMock }))
vi.mock('./workflow-step-tasks', () => ({ syncWorkflowItemFromTask: vi.fn().mockResolvedValue(undefined) }))

import { buildImpactDraft, ImpactStatementError, saveImpactStatement } from './impact-statement'

const entries = [
  { date: '2026-03-01', level: 4, note: 'Could not lift my daughter.' },
  { date: '2026-03-02', level: 8, note: 'Woke up three times from back pain.', days: 1 },
  { date: '2026-03-05', level: 9, note: 'Missed my sister’s wedding.', days: 2 },
  { date: '2026-03-08', level: 6, note: 'Short walk only.' },
]

describe('buildImpactDraft', () => {
  it('summarises pain, quotes the worst days in order, and totals missed work', () => {
    const draft = buildImpactDraft({ clientName: 'Jane Ruiz', entries, interviewNotes: 'She gave up her weekly soccer league.' })!
    expect(draft).toContain('Our client, Jane Ruiz, kept a daily journal')
    expect(draft).toContain('average of 6.8 out of 10, reaching 9 out of 10')
    const quotes = draft.split('\n').filter((l) => l.startsWith('- '))
    expect(quotes).toHaveLength(3)
    expect(quotes[0]).toContain('March 2, 2026 (pain 8/10)')
    expect(quotes[2]).toContain('March 8, 2026 (pain 6/10)')
    expect(draft).toContain('kept Jane from work for 3 days')
    expect(draft.endsWith('She gave up her weekly soccer league.')).toBe(true)
  })

  it('returns null with nothing to draft from', () => {
    expect(buildImpactDraft({ clientName: 'Jane Ruiz', entries: [], interviewNotes: '  ' })).toBeNull()
  })

  it('drafts from interview notes alone', () => {
    expect(buildImpactDraft({ clientName: null, entries: [], interviewNotes: 'Cannot drive.' })).toBe('Cannot drive.')
  })
})

describe('saveImpactStatement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.impactStatement.findUnique.mockResolvedValue(null)
    prismaMock.impactStatement.upsert.mockImplementation(async ({ create }: any) => ({ ...create, updatedAt: new Date() }))
    prismaMock.caseTask.findMany.mockResolvedValue([
      { id: 't1', title: 'Prepare daily-impact statement', notes: null },
      { id: 't2', title: 'Schedule Client Interview for Daily Impact Statement', notes: null },
      { id: 't3', title: 'Request police report', notes: null },
      { id: 't4', title: 'Draft pain and suffering narrative', notes: null },
    ])
    prismaMock.caseTask.update.mockImplementation(async ({ where }: any) => ({ id: where.id }))
  })

  it('approving completes the prepare task, and first interview notes complete the interview task', async () => {
    const res = await saveImpactStatement('a-1', { statement: 'Text', interviewNotes: 'Notes', approved: true }, 'Ann')
    expect(res.statement?.status).toBe('approved')
    expect(res.statement?.approvedByName).toBe('Ann')
    expect(prismaMock.caseTask.update.mock.calls.map((c: any) => c[0].where.id).sort()).toEqual(['t1', 't2', 't4'])
    expect(res.tasksCompleted).toBe(3)
  })

  it('a draft completes nothing without notes', async () => {
    const res = await saveImpactStatement('a-1', { statement: 'Text' }, 'Ann')
    expect(res.statement?.status).toBe('draft')
    expect(prismaMock.caseTask.update).not.toHaveBeenCalled()
  })

  it('will not approve an empty statement', async () => {
    await expect(saveImpactStatement('a-1', { statement: '  ', approved: true }, 'Ann')).rejects.toBeInstanceOf(
      ImpactStatementError,
    )
  })
})
