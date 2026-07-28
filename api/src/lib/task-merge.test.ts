import { describe, it, expect } from 'vitest'
import {
  buildMergedSurvivor,
  mergeNotes,
  mergeSubtasks,
  reminderMessagesFor,
  taskMergeRefusal,
  validateMerge,
  type MergeableTask,
} from './task-merge'

function task(overrides: Partial<MergeableTask> = {}): MergeableTask {
  return {
    id: 'task-1',
    assessmentId: 'asm-1',
    title: 'Obtain the police report',
    taskType: 'general',
    status: 'open',
    priority: 'medium',
    dueDate: null,
    notes: null,
    estimateMinutes: null,
    subtasks: [],
    mergedIntoId: null,
    ...overrides,
  }
}

describe('taskMergeRefusal', () => {
  it('refuses the grouped plaintiff-questions task', () => {
    // syncQuestionTasks rewrites its title, notes and subtasks on every run and
    // reopens it whenever a question is unanswered, so a merge cannot survive.
    expect(taskMergeRefusal(task({ taskType: 'question' }))?.code).toBe('question_task')
  })

  it('refuses a task that was already merged away', () => {
    expect(taskMergeRefusal(task({ mergedIntoId: 'task-9' }))?.code).toBe('already_merged')
  })

  it('allows an ordinary task and a coach task', () => {
    expect(taskMergeRefusal(task())).toBeNull()
    expect(taskMergeRefusal(task({ taskType: 'coach' }))).toBeNull()
  })
})

describe('validateMerge', () => {
  it('accepts a straightforward merge', () => {
    expect(validateMerge(task({ id: 'a' }), [task({ id: 'b' })])).toBeNull()
  })

  it('needs something to merge in', () => {
    expect(validateMerge(task({ id: 'a' }), [])?.code).toBe('nothing_to_merge')
  })

  it('refuses to merge a task into itself', () => {
    expect(validateMerge(task({ id: 'a' }), [task({ id: 'a' })])?.code).toBe('survivor_in_absorbed')
  })

  it('refuses to fold open work into a finished task', () => {
    // The survivor would sit in the completed list and the absorbed work would
    // disappear from view entirely.
    expect(validateMerge(task({ id: 'a', status: 'done' }), [task({ id: 'b' })])?.code).toBe('survivor_closed')
    expect(validateMerge(task({ id: 'a', status: 'completed' }), [task({ id: 'b' })])?.code).toBe('survivor_closed')
  })

  it('refuses to merge across cases', () => {
    // The cross-case queue interleaves clients, so this is easy to do by accident.
    const refusal = validateMerge(task({ id: 'a' }), [task({ id: 'b', assessmentId: 'asm-2' })])
    expect(refusal?.code).toBe('cross_case')
  })

  it('refuses when the questions task is on either side', () => {
    expect(validateMerge(task({ id: 'a', taskType: 'question' }), [task({ id: 'b' })])?.code).toBe('question_task')
    expect(validateMerge(task({ id: 'a' }), [task({ id: 'b', taskType: 'question' })])?.code).toBe('question_task')
  })
})

describe('mergeSubtasks', () => {
  it('keeps the survivor items first and appends the rest', () => {
    const result = mergeSubtasks(
      task({ subtasks: [{ id: 's1', title: 'Call the station', done: false }] }),
      [task({ id: 'b', subtasks: [{ id: 's2', title: 'Pay the records fee', done: false }] })],
    )
    expect(result.map((s) => s.title)).toEqual(['Call the station', 'Pay the records fee'])
  })

  it('collapses the same item written into both tasks', () => {
    const result = mergeSubtasks(
      task({ subtasks: [{ id: 's1', title: 'Call the station', done: false }] }),
      [task({ id: 'b', subtasks: [{ id: 's2', title: '  call the STATION  ', done: false }] })],
    )
    expect(result).toHaveLength(1)
  })

  it('keeps an item ticked if either copy was done', () => {
    // Losing a tick would resurrect work someone had already finished.
    const result = mergeSubtasks(
      task({ subtasks: [{ id: 's1', title: 'Call the station', done: false }] }),
      [task({ id: 'b', subtasks: [{ id: 's2', title: 'Call the station', done: true }] })],
    )
    expect(result[0]?.done).toBe(true)
  })

  it('drops a duplicate id so two items cannot collide', () => {
    // Template-derived tasks can carry identical generated ids; the server
    // reassigns any blanked id on save.
    const result = mergeSubtasks(
      task({ subtasks: [{ id: 'dup', title: 'First thing', done: false }] }),
      [task({ id: 'b', subtasks: [{ id: 'dup', title: 'Second thing', done: false }] })],
    )
    expect(result.map((s) => s.title)).toEqual(['First thing', 'Second thing'])
    expect(result[1]?.id).toBe('')
  })

  it('ignores blank titles', () => {
    const result = mergeSubtasks(task({ subtasks: [{ id: 's1', title: '   ', done: false }] }), [])
    expect(result).toEqual([])
  })
})

describe('mergeNotes', () => {
  it('keeps the survivor notes and records what was folded in', () => {
    const result = mergeNotes(task({ notes: 'Requested on the 3rd.' }), [
      task({ id: 'b', title: 'Get police report', notes: 'Left a voicemail.' }),
    ])
    expect(result).toBe('Requested on the 3rd.\n\nMerged in:\n• Get police report\n  Left a voicemail.')
  })

  it('records the title even when the absorbed task had no notes', () => {
    // Absorbed rows are hidden from task lists, so this is the only visible
    // trace of what was merged.
    expect(mergeNotes(task({ notes: null }), [task({ id: 'b', title: 'Get police report' })])).toBe(
      'Merged in:\n• Get police report',
    )
  })

  it('returns null when there is nothing at all to record', () => {
    expect(mergeNotes(task({ notes: null }), [])).toBeNull()
  })
})

describe('buildMergedSurvivor', () => {
  it('takes the earliest due date', () => {
    // A merge must never make work look less urgent than one of its parts.
    const result = buildMergedSurvivor(task({ dueDate: new Date('2026-08-20T00:00:00Z') }), [
      task({ id: 'b', dueDate: new Date('2026-08-05T00:00:00Z') }),
    ])
    expect(result.dueDate?.toISOString()).toBe('2026-08-05T00:00:00.000Z')
  })

  it('keeps a due date when only the absorbed task had one', () => {
    const result = buildMergedSurvivor(task({ dueDate: null }), [
      task({ id: 'b', dueDate: new Date('2026-08-05T00:00:00Z') }),
    ])
    expect(result.dueDate?.toISOString()).toBe('2026-08-05T00:00:00.000Z')
  })

  it('takes the highest priority', () => {
    expect(buildMergedSurvivor(task({ priority: 'low' }), [task({ id: 'b', priority: 'critical' })]).priority).toBe(
      'critical',
    )
    expect(buildMergedSurvivor(task({ priority: 'high' }), [task({ id: 'b', priority: 'low' })]).priority).toBe('high')
  })

  it('sums estimates and leaves them null when nobody estimated', () => {
    expect(
      buildMergedSurvivor(task({ estimateMinutes: 30 }), [task({ id: 'b', estimateMinutes: 45 })]).estimateMinutes,
    ).toBe(75)
    expect(buildMergedSurvivor(task(), [task({ id: 'b' })]).estimateMinutes).toBeNull()
  })

  it('does not return a title', () => {
    // Renaming the survivor frees its old title for the coach to recreate, which
    // silently undoes the merge on the next sweep.
    expect('title' in buildMergedSurvivor(task(), [task({ id: 'b' })])).toBe(false)
  })
})

describe('reminderMessagesFor', () => {
  it('rebuilds the plain task reminder exactly', () => {
    // Reminders carry no task id, so cleanup depends on these strings matching
    // scheduleTaskReminder character for character.
    const due = new Date('2026-08-05T12:00:00Z')
    expect(reminderMessagesFor({ title: 'Get report', dueDate: due })).toEqual([
      `Task reminder: Get report due ${due.toDateString()}.`,
    ])
  })

  it('covers both escalation wordings when the task escalates', () => {
    const due = new Date('2026-08-05T12:00:00Z')
    const messages = reminderMessagesFor({ title: 'Get report', dueDate: due, escalationLevel: 'critical' })
    expect(messages).toContain(`Escalation: Get report is due ${due.toDateString()}.`)
    expect(messages).toContain(`Escalation: Task overdue — Get report was due ${due.toDateString()}.`)
  })

  it('skips escalation wordings when the task does not escalate', () => {
    const messages = reminderMessagesFor({
      title: 'Get report',
      dueDate: new Date('2026-08-05T12:00:00Z'),
      escalationLevel: 'none',
    })
    expect(messages).toHaveLength(1)
  })

  it('handles a task with no due date', () => {
    expect(reminderMessagesFor({ title: 'Get report', dueDate: null })).toEqual([
      'Task reminder: Get report due soon.',
    ])
  })
})
