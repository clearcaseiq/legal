import { beforeEach, describe, expect, it, vi } from 'vitest'

type Row = Record<string, any>
const db = vi.hoisted(() => ({ tasks: [] as Row[], seq: 0 }))
const tick = () => new Promise((r) => setTimeout(r, 1))

const matches = (row: Row, where: Row = {}) =>
  Object.entries(where).every(([k, v]) => {
    if (k === 'id' && v && typeof v === 'object' && 'in' in v) return (v.in as string[]).includes(row.id)
    return (row[k] ?? null) === v
  })

const prismaMock = vi.hoisted(() => ({
  caseWorkflow: { findUnique: vi.fn() },
  firmMember: { findUnique: vi.fn().mockResolvedValue(null) },
  caseTask: {
    findMany: vi.fn(async ({ where }: any) => {
      await tick()
      return db.tasks.filter((t) => matches(t, where))
    }),
    create: vi.fn(async ({ data }: any) => {
      await tick()
      const row = { id: `t${++db.seq}`, mergedIntoId: null, createdAt: new Date(Date.now() + db.seq), ...data }
      db.tasks.push(row)
      return row
    }),
    update: vi.fn(async ({ where, data }: any) => Object.assign(db.tasks.find((t) => t.id === where.id)!, data)),
    updateMany: vi.fn(async ({ where, data }: any) => {
      const rows = db.tasks.filter((t) => matches(t, where))
      rows.forEach((t) => Object.assign(t, data))
      return { count: rows.length }
    }),
  },
}))
vi.mock('./prisma', () => ({ prisma: prismaMock }))
vi.mock('./sole-firm-attorney', () => ({
  findSoleAttorneyForAssessment: vi.fn().mockResolvedValue(null),
  applySoleAttorneyAssignee: (a: any) => a,
}))

import { syncWorkflowStepTasks } from './workflow-step-tasks'

const step = {
  id: 'wi-1',
  title: 'Evaluate offer vs. case value',
  stepType: 'task',
  status: 'pending',
  stageOrder: 5,
  stageName: 'Negotiation',
  phaseName: 'Negotiation',
  assigneeRole: 'attorney',
  caseWorkflowId: 'cw-1',
}

describe('syncWorkflowStepTasks', () => {
  beforeEach(() => {
    db.tasks = []
    db.seq = 0
    vi.clearAllMocks()
    prismaMock.caseWorkflow.findUnique.mockResolvedValue({ id: 'cw-1', items: [step] })
  })

  it('creates one task when the tasks list and the workflow sync at the same time', async () => {
    await Promise.all([syncWorkflowStepTasks('a-1'), syncWorkflowStepTasks('a-1'), syncWorkflowStepTasks('a-1')])
    expect(db.tasks.filter((t) => t.mergedIntoId == null)).toHaveLength(1)
    expect(prismaMock.caseTask.create).toHaveBeenCalledTimes(1)
  })

  it('merges duplicates an earlier race left behind into the oldest task', async () => {
    const base = { assessmentId: 'a-1', sourceTemplateStepId: 'wfitem:wi-1', title: step.title, status: 'open', mergedIntoId: null }
    db.tasks.push(
      { ...base, id: 'old', createdAt: new Date('2026-10-01') },
      { ...base, id: 'dup', createdAt: new Date('2026-10-01T00:00:01Z') },
    )
    await syncWorkflowStepTasks('a-1')
    expect(db.tasks.find((t) => t.id === 'dup')).toMatchObject({ mergedIntoId: 'old', status: 'done' })
    expect(db.tasks.find((t) => t.id === 'old')).toMatchObject({ mergedIntoId: null, status: 'open' })
    expect(prismaMock.caseTask.create).not.toHaveBeenCalled()
  })
})
