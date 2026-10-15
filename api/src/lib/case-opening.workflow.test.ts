import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => ({
  prisma: {
    caseWorkflow: { findUnique: vi.fn() },
    caseWorkflowItem: { create: vi.fn() },
    caseTask: { findMany: vi.fn(), update: vi.fn() },
  },
}))

import { prisma } from './prisma'
import { addOpeningChecklistToWorkflow } from './case-opening'

function step(id: string, title: string, stageName: string, stageOrder: number, sortOrder: number) {
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
  }
}

const WORKFLOW = {
  id: 'cw-1',
  items: [
    step('wf-conflict', 'Open matter & run conflict check', 'Case Opening', 0, 0),
    step('wf-retainer', 'Send retainer to client', 'Case Opening', 0, 1),
    step('wf-police', 'Request police / incident report', 'Records & Claims', 1, 0),
  ],
}

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
    taskType: 'milestone',
    ...extra,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.caseWorkflow.findUnique).mockResolvedValue(WORKFLOW as never)
  vi.mocked(prisma.caseTask.update).mockResolvedValue({} as never)
  let n = 0
  vi.mocked(prisma.caseWorkflowItem.create).mockImplementation((async ({ data }: any) => ({ id: `new-${++n}`, ...data })) as never)
})

describe('addOpeningChecklistToWorkflow', () => {
  it('adds a checklist item the workflow lacks as a step in its stage and links the task to it', async () => {
    vi.mocked(prisma.caseTask.findMany).mockResolvedValue([task('t-contact', 'Verify client contact information')] as never)

    const added = await addOpeningChecklistToWorkflow('asm-1')

    expect(added).toBe(1)
    expect(prisma.caseWorkflowItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        caseWorkflowId: 'cw-1',
        title: 'Verify client contact information',
        stageName: 'Case Opening',
        stageOrder: 0,
        sortOrder: 2,
        assigneeRole: 'paralegal',
        status: 'pending',
        custom: true,
      }),
    })
    expect(prisma.caseTask.update).toHaveBeenCalledWith({
      where: { id: 't-contact' },
      data: { sourceTemplateStepId: 'wfitem:new-1' },
    })
  })

  it('files claims work under the records stage', async () => {
    vi.mocked(prisma.caseTask.findMany).mockResolvedValue([task('t-adjuster', 'Identify and log claims adjuster')] as never)

    await addOpeningChecklistToWorkflow('asm-1')

    expect(prisma.caseWorkflowItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ stageName: 'Records & Claims', stageOrder: 1, sortOrder: 1 }),
    })
  })

  it('leaves items the workflow already has a step for', async () => {
    vi.mocked(prisma.caseTask.findMany).mockResolvedValue([
      task('t-retainer', 'Send retainer to client'),
      task('t-police', 'Request police / incident report'),
    ] as never)

    const added = await addOpeningChecklistToWorkflow('asm-1')

    expect(added).toBe(0)
    expect(prisma.caseWorkflowItem.create).not.toHaveBeenCalled()
  })

  it('records an item already finished as a done step', async () => {
    const completedAt = new Date('2026-10-15T12:00:00Z')
    vi.mocked(prisma.caseTask.findMany).mockResolvedValue([
      task('t-scope', 'Confirm scope of representation', { status: 'done', completedAt }),
    ] as never)

    await addOpeningChecklistToWorkflow('asm-1')

    expect(prisma.caseWorkflowItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: 'done', completedAt }),
    })
  })

  it('does nothing for a case without a workflow', async () => {
    vi.mocked(prisma.caseWorkflow.findUnique).mockResolvedValue(null as never)

    expect(await addOpeningChecklistToWorkflow('asm-1')).toBe(0)
    expect(prisma.caseTask.findMany).not.toHaveBeenCalled()
  })
})
