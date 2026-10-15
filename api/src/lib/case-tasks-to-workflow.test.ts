import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => ({
  prisma: {
    caseWorkflow: { findUnique: vi.fn() },
    caseWorkflowItem: { create: vi.fn(), deleteMany: vi.fn() },
    caseTask: { findMany: vi.fn(), update: vi.fn() },
  },
}))

import { prisma } from './prisma'
import { addCaseTasksToWorkflow } from './case-tasks-to-workflow'
import { activeWorkflowSlot } from './workflow-step-tasks'

function step(id: string, title: string, stageName: string, stageOrder: number, sortOrder: number, extra = {}) {
  return {
    id,
    title,
    phaseName: 'Intake & Setup',
    phaseOrder: 0,
    stageName,
    stageOrder,
    sortOrder,
    stepType: 'task',
    status: 'pending',
    custom: false,
    sourceTaskId: null,
    blocksStage: true,
    ...extra,
  }
}

const STEPS = [
  step('wf-conflict', 'Open matter & run conflict check', 'Case Opening', 0, 0),
  step('wf-retainer', 'Send retainer to client', 'Case Opening', 0, 1),
  step('wf-police', 'Request police / incident report', 'Records & Claims', 1, 0),
]

function task(id: string, title: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    title,
    notes: 'Auto-created Day-1 case opening checklist item.',
    status: 'open',
    sourceTemplateStepId: null,
    completedAt: null,
    dueDate: new Date('2026-10-16T00:00:00Z'),
    priority: 'medium',
    assignedRole: 'paralegal',
    milestoneType: 'case_opening',
    checkpointType: null,
    taskType: 'milestone',
    deadlineType: null,
    workflowPhase: null,
    workflowStage: null,
    ...extra,
  }
}

function created() {
  return vi.mocked(prisma.caseWorkflowItem.create).mock.calls.map((call) => (call[0] as any).data)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.caseWorkflow.findUnique).mockResolvedValue({ id: 'cw-1', items: [...STEPS] } as never)
  vi.mocked(prisma.caseTask.update).mockResolvedValue({} as never)
  vi.mocked(prisma.caseWorkflowItem.deleteMany).mockResolvedValue({ count: 0 } as never)
  let n = 0
  vi.mocked(prisma.caseWorkflowItem.create).mockImplementation((async ({ data }: any) => ({ id: `new-${++n}`, ...data })) as never)
})

describe('addCaseTasksToWorkflow', () => {
  it('adds a Day-1 item the workflow lacks as a step that holds Case Opening, linked both ways', async () => {
    vi.mocked(prisma.caseTask.findMany).mockResolvedValue([task('t-contact', 'Verify client contact information')] as never)

    expect(await addCaseTasksToWorkflow('asm-1')).toBe(1)

    expect(created()[0]).toMatchObject({
      title: 'Verify client contact information',
      stageName: 'Case Opening',
      sortOrder: 2,
      blocksStage: true,
      sourceTaskId: 't-contact',
      custom: true,
    })
    expect(prisma.caseTask.update).toHaveBeenCalledWith({
      where: { id: 't-contact' },
      data: { sourceTemplateStepId: 'wfitem:new-1' },
    })
  })

  it('keeps Rose and time entries out', async () => {
    vi.mocked(prisma.caseTask.findMany).mockResolvedValue([] as never)

    await addCaseTasksToWorkflow('asm-1')

    const where = (vi.mocked(prisma.caseTask.findMany).mock.calls[0][0] as any).where
    expect(where.taskType).toEqual({ notIn: ['coach', 'question', 'proposed', 'time_entry'] })
    expect(where.OR).toEqual([{ createdByName: null }, { createdByName: { not: 'Rose — AI Case Manager' } }])
  })

  it('adds the SOL deadline as a required deadline that does not hold its stage', async () => {
    vi.mocked(prisma.caseTask.findMany).mockResolvedValue([
      task('t-sol', 'Statute of limitations (CA • Assault or negligent security)', {
        milestoneType: null,
        taskType: 'statute',
        deadlineType: 'sol',
        priority: 'low',
      }),
    ] as never)

    await addCaseTasksToWorkflow('asm-1')

    expect(created()[0]).toMatchObject({ stageName: 'Case Opening', stepType: 'deadline', blocksStage: false, required: true })
  })

  it('adds an insurance follow-up without overwriting the key it is deduplicated by', async () => {
    vi.mocked(prisma.caseTask.findMany).mockResolvedValue([
      task('t-dec', 'Follow up with Geico: letter of representation unacknowledged (7 days)', {
        milestoneType: null,
        taskType: 'general',
        sourceTemplateStepId: 'insurance-followup:ins-1:lor',
        notes: null,
      }),
    ] as never)

    await addCaseTasksToWorkflow('asm-1')

    expect(created()[0]).toMatchObject({ stageName: 'Records & Claims', blocksStage: false, required: false, sourceTaskId: 't-dec' })
    expect(prisma.caseTask.update).not.toHaveBeenCalled()
  })

  it('puts a hand-made task under the heading picked when it was created', async () => {
    vi.mocked(prisma.caseTask.findMany).mockResolvedValue([
      task('t-hand', 'Call the client about their car', {
        milestoneType: null,
        taskType: 'general',
        notes: null,
        workflowPhase: 'Intake & Setup',
        workflowStage: 'Records & Claims',
      }),
    ] as never)

    await addCaseTasksToWorkflow('asm-1')

    expect(created()[0]).toMatchObject({ stageName: 'Records & Claims', stepType: 'task', blocksStage: false })
  })

  it('leaves tasks the workflow already has a step for', async () => {
    vi.mocked(prisma.caseTask.findMany).mockResolvedValue([
      task('t-retainer', 'Send retainer to client'),
      task('t-police', 'Request police / incident report'),
    ] as never)

    expect(await addCaseTasksToWorkflow('asm-1')).toBe(0)
  })

  it('does not add a second step for a task it already added', async () => {
    vi.mocked(prisma.caseWorkflow.findUnique).mockResolvedValue({
      id: 'cw-1',
      items: [...STEPS, step('wf-dec', 'Declarations page overdue', 'Records & Claims', 1, 1, { custom: true, sourceTaskId: 't-dec', blocksStage: false })],
    } as never)
    vi.mocked(prisma.caseTask.findMany)
      .mockResolvedValueOnce([{ id: 't-dec' }] as never)
      .mockResolvedValueOnce([
        task('t-dec', 'Declarations page from Geico is overdue (21 days)', {
          milestoneType: null,
          taskType: 'general',
          sourceTemplateStepId: 'insurance-followup:ins-1:dec_page',
        }),
      ] as never)

    expect(await addCaseTasksToWorkflow('asm-1')).toBe(0)
  })

  it('removes the step when its task is deleted', async () => {
    vi.mocked(prisma.caseWorkflow.findUnique).mockResolvedValue({
      id: 'cw-1',
      items: [...STEPS, step('wf-gone', 'Old follow-up', 'Records & Claims', 1, 1, { custom: true, sourceTaskId: 't-gone' })],
    } as never)
    vi.mocked(prisma.caseTask.findMany).mockResolvedValueOnce([] as never).mockResolvedValueOnce([] as never)

    await addCaseTasksToWorkflow('asm-1')

    expect(prisma.caseWorkflowItem.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['wf-gone'] } } })
  })

  it('does nothing for a case without a workflow', async () => {
    vi.mocked(prisma.caseWorkflow.findUnique).mockResolvedValue(null as never)

    expect(await addCaseTasksToWorkflow('asm-1')).toBe(0)
    expect(prisma.caseTask.findMany).not.toHaveBeenCalled()
  })
})

describe('a step that does not block its stage', () => {
  it('leaves the case on the next stage once the rest of Case Opening is done', () => {
    const slot = activeWorkflowSlot([
      { phaseName: 'Intake & Setup', phaseOrder: 0, stageName: 'Case Opening', stageOrder: 0, status: 'done', stepType: 'task' },
      { phaseName: 'Intake & Setup', phaseOrder: 0, stageName: 'Case Opening', stageOrder: 0, status: 'pending', stepType: 'deadline', blocksStage: false } as any,
      { phaseName: 'Intake & Setup', phaseOrder: 0, stageName: 'Records & Claims', stageOrder: 1, status: 'pending', stepType: 'task' },
    ])

    expect(slot?.stageName).toBe('Records & Claims')
  })
})
