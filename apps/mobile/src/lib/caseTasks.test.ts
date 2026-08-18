import { describe, expect, it } from 'vitest'
import {
  bucketCaseTasks,
  describeStageUnlock,
  isOpenCaseTask,
  isTaskDone,
  subtaskProgress,
  toggleSubtaskDone,
} from './caseTasks'
import type { CaseTaskRow, TaskSubtask } from './api'

/** Local noon on 2026-07-28, so bucketing never straddles a UTC day boundary. */
const NOW = new Date(2026, 6, 28, 12, 0, 0)

function task(overrides: Partial<CaseTaskRow> & { id: string }): CaseTaskRow {
  return {
    assessmentId: 'asm-1',
    title: `Task ${overrides.id}`,
    taskType: 'manual',
    dueDate: null,
    status: 'open',
    priority: 'medium',
    ...overrides,
  }
}

/** Local midnight on the given day, matching how due dates land on the device. */
function dueOn(year: number, month: number, day: number): string {
  return new Date(year, month - 1, day, 9, 0, 0).toISOString()
}

describe('isOpenCaseTask', () => {
  it('keeps ordinary open tasks', () => {
    expect(isOpenCaseTask({ status: 'open', taskType: 'manual' })).toBe(true)
    expect(isOpenCaseTask({ status: 'in_progress', taskType: 'ai_suggested' })).toBe(true)
  })

  it('drops completed tasks under either spelling', () => {
    expect(isOpenCaseTask({ status: 'completed', taskType: 'manual' })).toBe(false)
    expect(isOpenCaseTask({ status: 'done', taskType: 'manual' })).toBe(false)
    expect(isOpenCaseTask({ status: 'DONE', taskType: 'manual' })).toBe(false)
  })

  it('drops time entries, which are logged as tasks but are not work items', () => {
    expect(isOpenCaseTask({ status: 'open', taskType: 'time_entry' })).toBe(false)
  })
})

describe('bucketCaseTasks', () => {
  it('splits tasks into overdue, today, upcoming and undated', () => {
    const rows = [
      task({ id: 'overdue', dueDate: dueOn(2026, 7, 20) }),
      task({ id: 'today', dueDate: dueOn(2026, 7, 28) }),
      task({ id: 'upcoming', dueDate: dueOn(2026, 8, 4) }),
      task({ id: 'undated' }),
    ]

    const buckets = bucketCaseTasks(rows, 'lead-1', NOW)

    expect(buckets.overdue.map((t) => t.id)).toEqual(['overdue'])
    expect(buckets.today.map((t) => t.id)).toEqual(['today'])
    expect(buckets.upcoming.map((t) => t.id)).toEqual(['upcoming'])
    expect(buckets.noDueDate.map((t) => t.id)).toEqual(['undated'])
  })

  it('treats a task due earlier today as due today, not overdue', () => {
    const rows = [task({ id: 'this-morning', dueDate: new Date(2026, 6, 28, 8, 0, 0).toISOString() })]

    const buckets = bucketCaseTasks(rows, 'lead-1', NOW)

    expect(buckets.today.map((t) => t.id)).toEqual(['this-morning'])
    expect(buckets.overdue).toEqual([])
  })

  it('excludes completed tasks and time entries', () => {
    const rows = [
      task({ id: 'open', dueDate: dueOn(2026, 7, 29) }),
      task({ id: 'done', dueDate: dueOn(2026, 7, 29), status: 'completed' }),
      task({ id: 'timer', dueDate: dueOn(2026, 7, 29), taskType: 'time_entry' }),
    ]

    const buckets = bucketCaseTasks(rows, 'lead-1', NOW)

    expect(buckets.upcoming.map((t) => t.id)).toEqual(['open'])
  })

  it('stamps every task with the case it was fetched for so rows link back correctly', () => {
    const rows = [task({ id: 'a', dueDate: dueOn(2026, 7, 29) }), task({ id: 'b' })]

    const buckets = bucketCaseTasks(rows, 'lead-42', NOW)

    expect([...buckets.upcoming, ...buckets.noDueDate].map((t) => t.leadId)).toEqual(['lead-42', 'lead-42'])
  })

  it('buckets an unparseable due date as undated rather than dropping the task', () => {
    const rows = [task({ id: 'garbled', dueDate: 'not-a-date' })]

    const buckets = bucketCaseTasks(rows, 'lead-1', NOW)

    expect(buckets.noDueDate.map((t) => t.id)).toEqual(['garbled'])
  })

  it('returns empty buckets for a case with no tasks', () => {
    expect(bucketCaseTasks([], 'lead-1', NOW)).toEqual({
      overdue: [],
      today: [],
      upcoming: [],
      noDueDate: [],
    })
  })
})

describe('isTaskDone', () => {
  it('accepts both spellings the server uses, in any case', () => {
    expect(isTaskDone('done')).toBe(true)
    expect(isTaskDone('completed')).toBe(true)
    expect(isTaskDone('Done')).toBe(true)
  })

  it('treats open, in-progress and missing statuses as not done', () => {
    expect(isTaskDone('open')).toBe(false)
    expect(isTaskDone('in_progress')).toBe(false)
    expect(isTaskDone(null)).toBe(false)
    expect(isTaskDone(undefined)).toBe(false)
  })
})

describe('subtaskProgress', () => {
  const subtasks: TaskSubtask[] = [
    { id: 'a', title: 'Ask about prior injuries', done: true },
    { id: 'b', title: 'Confirm employer', done: false },
    { id: 'c', title: 'Get policy limits', done: false },
  ]

  it('counts done and remaining items', () => {
    expect(subtaskProgress(subtasks)).toEqual({ done: 1, total: 3, remaining: 2 })
  })

  it('reports nothing for a task with no checklist', () => {
    expect(subtaskProgress(undefined)).toEqual({ done: 0, total: 0, remaining: 0 })
    expect(subtaskProgress([])).toEqual({ done: 0, total: 0, remaining: 0 })
  })
})

describe('toggleSubtaskDone', () => {
  const subtasks: TaskSubtask[] = [
    { id: 'a', title: 'Ask about prior injuries', done: false },
    { id: 'b', title: 'Confirm employer', done: true },
  ]

  it('flips only the item that was tapped', () => {
    expect(toggleSubtaskDone(subtasks, 'a')).toEqual([
      { id: 'a', title: 'Ask about prior injuries', done: true },
      { id: 'b', title: 'Confirm employer', done: true },
    ])
  })

  it('unticks an item that was already done', () => {
    expect(toggleSubtaskDone(subtasks, 'b')[1].done).toBe(false)
  })

  // The whole array is PATCHed back, so mutating in place would leave the list
  // on screen and the list being sent silently out of step.
  it('does not mutate the array it was given', () => {
    const next = toggleSubtaskDone(subtasks, 'a')

    expect(next).not.toBe(subtasks)
    expect(subtasks[0].done).toBe(false)
  })

  it('is a no-op when the id is not in the checklist', () => {
    expect(toggleSubtaskDone(subtasks, 'missing')).toEqual(subtasks)
  })

  it('handles a task that has no checklist at all', () => {
    expect(toggleSubtaskDone(undefined, 'a')).toEqual([])
  })
})

describe('describeStageUnlock', () => {
  it('says how many tasks a finished stage added', () => {
    expect(describeStageUnlock({ newTasks: 4, stageOrder: 2 })).toBe(
      'That finished the stage. 4 new tasks were added.'
    )
  })

  it('reads naturally for a single task', () => {
    expect(describeStageUnlock({ newTasks: 1, stageOrder: 2 })).toBe(
      'That finished the stage. 1 new task was added.'
    )
  })

  // The server sends the stage back whenever one closes, including when the
  // next stage happens to have no template steps. Announcing "0 new tasks" then
  // would be worse than saying nothing.
  it('stays quiet when no stage closed or nothing new was written', () => {
    expect(describeStageUnlock(null)).toBeNull()
    expect(describeStageUnlock(undefined)).toBeNull()
    expect(describeStageUnlock({ newTasks: 0, stageOrder: 2 })).toBeNull()
  })
})
