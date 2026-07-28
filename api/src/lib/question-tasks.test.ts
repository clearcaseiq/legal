import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))
vi.mock('./case-coach-loop', () => ({
  isCaseRetained: vi.fn(),
  resolveCaseAssignees: vi.fn(),
}))
vi.mock('./case-intelligence', () => ({ buildCaseIntelligence: vi.fn() }))
vi.mock('./intake-questions', () => ({ buildBaselineQuestions: vi.fn() }))
vi.mock('./task-review', () => ({
  isReviewGateEnabled: vi.fn(),
  notifyTaskReviewers: vi.fn(),
}))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { isCaseRetained, resolveCaseAssignees } from './case-coach-loop'
import { isReviewGateEnabled, notifyTaskReviewers } from './task-review'
import {
  QUESTION_GROUP_KEY,
  QUESTION_TASK_TYPE,
  syncQuestionTasks,
  syncSingleQuestionTask,
  type QuestionForTask,
} from './question-tasks'

function question(id: string, overrides: Partial<QuestionForTask> = {}): QuestionForTask {
  return {
    questionKey: `base:${id}`,
    text: `Question ${id}?`,
    section: 'Liability',
    source: 'baseline',
    answer: null,
    ...overrides,
  }
}

/** The `data` payload of the single caseTask.create call. */
function createdData() {
  return vi.mocked(prisma.caseTask.create).mock.calls[0]?.[0]?.data as any
}

/** The `data` payload of the single caseTask.update call. */
function updatedData() {
  return vi.mocked(prisma.caseTask.update).mock.calls[0]?.[0]?.data as any
}

describe('syncQuestionTasks', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.clearAllMocks()
    vi.mocked(isCaseRetained).mockResolvedValue(true)
    vi.mocked(resolveCaseAssignees).mockResolvedValue({
      lawFirmId: 'firm-1',
      paralegalUserId: 'user-para',
      paralegalName: 'Pat Paralegal',
      attorneyUserId: 'user-att',
      attorneyName: 'Ari Attorney',
    } as any)
    vi.mocked(isReviewGateEnabled).mockReturnValue(false)
    vi.mocked(notifyTaskReviewers).mockResolvedValue(undefined as any)
    vi.mocked(prisma.caseTask.create).mockResolvedValue({ id: 'task-1' } as any)
  })

  it('creates one grouped task holding every question as a subtask', async () => {
    await syncQuestionTasks('asm-1', [question('a'), question('b'), question('c')])

    expect(prisma.caseTask.create).toHaveBeenCalledTimes(1)
    const data = createdData()
    expect(data.taskType).toBe(QUESTION_TASK_TYPE)
    expect(data.sourceTemplateStepId).toBe(QUESTION_GROUP_KEY)
    expect(data.title).toBe('Questions for the plaintiff (0 of 3 answered)')
    expect(JSON.parse(data.subtasks)).toEqual([
      { id: 'base:a', title: 'Question a?', done: false },
      { id: 'base:b', title: 'Question b?', done: false },
      { id: 'base:c', title: 'Question c?', done: false },
    ])
  })

  it('leaves AI questions out of the checklist, since their keys churn', async () => {
    await syncQuestionTasks('asm-1', [
      question('a'),
      { questionKey: 'ai:abc123', text: 'AI question?', source: 'ai', answer: null },
    ])

    expect(JSON.parse(createdData().subtasks)).toEqual([{ id: 'base:a', title: 'Question a?', done: false }])
  })

  it('ticks off questions that already have an answer', async () => {
    await syncQuestionTasks('asm-1', [question('a', { answer: 'Rear-ended at a light' }), question('b')])

    const data = createdData()
    expect(data.title).toBe('Questions for the plaintiff (1 of 2 answered)')
    expect(JSON.parse(data.subtasks).map((s: any) => s.done)).toEqual([true, false])
    expect(data.status).toBe('open')
  })

  it('creates the task already closed when every question is answered', async () => {
    await syncQuestionTasks('asm-1', [question('a', { answer: 'Yes' })])

    const data = createdData()
    expect(data.status).toBe('done')
    expect(data.completedAt).toBeInstanceOf(Date)
  })

  it('updates the existing group instead of creating a second one', async () => {
    vi.mocked(prisma.caseTask.findMany).mockResolvedValue([
      {
        id: 'task-1',
        sourceTemplateStepId: QUESTION_GROUP_KEY,
        status: 'open',
        subtasks: JSON.stringify([{ id: 'base:a', title: 'Question a?', done: false }]),
      },
    ] as any)

    await syncQuestionTasks('asm-1', [question('a'), question('b')])

    expect(prisma.caseTask.create).not.toHaveBeenCalled()
    expect(prisma.caseTask.update).toHaveBeenCalledTimes(1)
    expect(JSON.parse(updatedData().subtasks)).toHaveLength(2)
  })

  it('drops questions that no longer apply instead of stranding them', async () => {
    vi.mocked(prisma.caseTask.findMany).mockResolvedValue([
      {
        id: 'task-1',
        sourceTemplateStepId: QUESTION_GROUP_KEY,
        status: 'open',
        subtasks: JSON.stringify([
          { id: 'base:a', title: 'Question a?', done: false },
          { id: 'base:gone', title: 'No longer relevant?', done: false },
        ]),
      },
    ] as any)

    await syncQuestionTasks('asm-1', [question('a')])

    expect(JSON.parse(updatedData().subtasks)).toEqual([{ id: 'base:a', title: 'Question a?', done: false }])
  })

  it('skips the write when the checklist has not moved', async () => {
    vi.mocked(prisma.caseTask.findMany).mockResolvedValue([
      {
        id: 'task-1',
        sourceTemplateStepId: QUESTION_GROUP_KEY,
        status: 'open',
        subtasks: JSON.stringify([{ id: 'base:a', title: 'Question a?', done: false }]),
      },
    ] as any)

    await syncQuestionTasks('asm-1', [question('a')])

    expect(prisma.caseTask.update).not.toHaveBeenCalled()
  })

  it('keeps a checklist item ticked when someone checked it off by hand', async () => {
    vi.mocked(prisma.caseTask.findMany).mockResolvedValue([
      {
        id: 'task-1',
        sourceTemplateStepId: QUESTION_GROUP_KEY,
        status: 'open',
        subtasks: JSON.stringify([{ id: 'base:a', title: 'Question a?', done: true }]),
      },
    ] as any)

    await syncQuestionTasks('asm-1', [question('a')])

    expect(JSON.parse(updatedData().subtasks)[0].done).toBe(true)
  })

  it('closes the group once the last question is answered', async () => {
    vi.mocked(prisma.caseTask.findMany).mockResolvedValue([
      {
        id: 'task-1',
        sourceTemplateStepId: QUESTION_GROUP_KEY,
        status: 'open',
        subtasks: JSON.stringify([{ id: 'base:a', title: 'Question a?', done: false }]),
      },
    ] as any)

    await syncQuestionTasks('asm-1', [question('a', { answer: 'Yes' })])

    expect(updatedData()).toMatchObject({ status: 'done' })
  })

  it('reopens a closed group when a new question appears', async () => {
    vi.mocked(prisma.caseTask.findMany).mockResolvedValue([
      {
        id: 'task-1',
        sourceTemplateStepId: QUESTION_GROUP_KEY,
        status: 'done',
        subtasks: JSON.stringify([{ id: 'base:a', title: 'Question a?', done: true }]),
      },
    ] as any)

    await syncQuestionTasks('asm-1', [question('a', { answer: 'Yes' }), question('b')])

    expect(updatedData()).toMatchObject({ status: 'open', completedAt: null })
  })

  it('deletes the old one-task-per-question rows', async () => {
    vi.mocked(prisma.caseTask.findMany).mockResolvedValue([
      { id: 'legacy-1', sourceTemplateStepId: 'base:a', status: 'open', subtasks: null },
      { id: 'legacy-2', sourceTemplateStepId: 'base:b', status: 'open', subtasks: null },
    ] as any)

    await syncQuestionTasks('asm-1', [question('a')])

    expect(prisma.caseTask.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['legacy-1', 'legacy-2'] } },
    })
    expect(prisma.caseTask.create).toHaveBeenCalledTimes(1)
  })

  it('closes rather than deletes a legacy row that has time logged against it', async () => {
    vi.mocked(prisma.caseTask.findMany).mockResolvedValue([
      { id: 'legacy-1', sourceTemplateStepId: 'base:a', status: 'open', subtasks: null },
      { id: 'legacy-2', sourceTemplateStepId: 'base:b', status: 'open', subtasks: null },
    ] as any)
    vi.mocked(prisma.timeEntry.findMany).mockResolvedValue([{ caseTaskId: 'legacy-1' }] as any)

    await syncQuestionTasks('asm-1', [question('a')])

    expect(prisma.caseTask.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['legacy-2'] } } })
    expect(prisma.caseTask.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['legacy-1'] } },
      data: { status: 'done', completedAt: expect.any(Date) },
    })
  })

  it('holds the task for review as a single item when the gate is on', async () => {
    vi.mocked(isReviewGateEnabled).mockReturnValue(true)

    const pending = await syncQuestionTasks('asm-1', [question('a'), question('b'), question('c')])

    expect(pending).toEqual(['Questions for the plaintiff (0 of 3 answered)'])
    const data = createdData()
    expect(data.reviewStatus).toBe('pending')
    expect(data.assignedUserId).toBeNull()
    expect(notifyTaskReviewers).toHaveBeenCalledTimes(1)
  })

  it('lets the coach loop aggregate the reviewer notification', async () => {
    vi.mocked(isReviewGateEnabled).mockReturnValue(true)

    const pending = await syncQuestionTasks('asm-1', [question('a')], { deferNotify: true })

    expect(pending).toHaveLength(1)
    expect(notifyTaskReviewers).not.toHaveBeenCalled()
  })

  it('creates nothing before the case is retained', async () => {
    vi.mocked(isCaseRetained).mockResolvedValue(false)

    await syncQuestionTasks('asm-1', [question('a')])

    expect(prisma.caseTask.create).not.toHaveBeenCalled()
  })
})

describe('syncSingleQuestionTask', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.clearAllMocks()
  })

  function groupTask(subtasks: Array<{ id: string; title: string; done: boolean }>, status = 'open') {
    vi.mocked(prisma.caseTask.findFirst).mockResolvedValue({
      id: 'task-1',
      status,
      subtasks: JSON.stringify(subtasks),
    } as any)
  }

  it('ticks one item without closing a group that still has open questions', async () => {
    groupTask([
      { id: 'base:a', title: 'Question a?', done: false },
      { id: 'base:b', title: 'Question b?', done: false },
    ])

    await syncSingleQuestionTask('asm-1', 'base:a', true)

    const data = updatedData()
    expect(JSON.parse(data.subtasks).map((s: any) => s.done)).toEqual([true, false])
    expect(data.title).toBe('Questions for the plaintiff (1 of 2 answered)')
    expect(data.status).toBeUndefined()
  })

  it('closes the group when the last item is ticked', async () => {
    groupTask([{ id: 'base:a', title: 'Question a?', done: false }])

    await syncSingleQuestionTask('asm-1', 'base:a', true)

    expect(updatedData()).toMatchObject({ status: 'done' })
  })

  it('reopens the group when a cleared answer un-ticks an item', async () => {
    groupTask([{ id: 'base:a', title: 'Question a?', done: true }], 'done')

    await syncSingleQuestionTask('asm-1', 'base:a', false)

    expect(updatedData()).toMatchObject({ status: 'open', completedAt: null })
  })

  it('does nothing when the item is already in the requested state', async () => {
    groupTask([{ id: 'base:a', title: 'Question a?', done: true }])

    await syncSingleQuestionTask('asm-1', 'base:a', true)

    expect(prisma.caseTask.update).not.toHaveBeenCalled()
  })

  it('ignores AI question keys, which are never materialized', async () => {
    await syncSingleQuestionTask('asm-1', 'ai:abc123', true)

    expect(prisma.caseTask.findFirst).not.toHaveBeenCalled()
  })
})
