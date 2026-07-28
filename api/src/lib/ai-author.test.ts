import { describe, it, expect } from 'vitest'
import { AI_AUTHOR_NAME, isAiGeneratedTask, taskCreatorName } from './ai-author'

describe('isAiGeneratedTask', () => {
  it('recognises the two types the autonomous loop writes', () => {
    expect(isAiGeneratedTask('coach')).toBe(true)
    expect(isAiGeneratedTask('question')).toBe(true)
  })

  it('leaves human-created tasks alone', () => {
    // Every one-click "act on this suggestion" button writes 'general', so an
    // AI *suggestion* a person accepted stays attributed to that person.
    expect(isAiGeneratedTask('general')).toBe(false)
    expect(isAiGeneratedTask('mobile')).toBe(false)
    expect(isAiGeneratedTask('time_entry')).toBe(false)
  })

  it('treats a missing type as human', () => {
    expect(isAiGeneratedTask(null)).toBe(false)
    expect(isAiGeneratedTask(undefined)).toBe(false)
    expect(isAiGeneratedTask('')).toBe(false)
  })
})

describe('taskCreatorName', () => {
  it('credits Rose on a task the loop raised during the sweep', () => {
    // The sweep has no acting user, so the stored name is null and the task
    // used to display "Created By —".
    expect(taskCreatorName({ taskType: 'coach', createdByName: null })).toBe(AI_AUTHOR_NAME)
  })

  it('credits Rose even though an event trigger captured a person', () => {
    // The loop runs on document upload, so it captures the uploader. Showing
    // that name makes the task read as though they wrote it themselves.
    expect(taskCreatorName({ taskType: 'coach', createdByName: 'Dana Reyes' })).toBe(AI_AUTHOR_NAME)
  })

  it('credits Rose on the grouped plaintiff-questions task', () => {
    expect(taskCreatorName({ taskType: 'question', createdByName: 'Dana Reyes' })).toBe(AI_AUTHOR_NAME)
  })

  it('keeps the real author on a task a person created', () => {
    expect(taskCreatorName({ taskType: 'general', createdByName: 'Dana Reyes' })).toBe('Dana Reyes')
  })

  it('normalises an unknown human author to null', () => {
    expect(taskCreatorName({ taskType: 'general', createdByName: null })).toBeNull()
    expect(taskCreatorName({ taskType: 'general' })).toBeNull()
  })
})
