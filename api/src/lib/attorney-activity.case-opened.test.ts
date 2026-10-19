import { describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => ({ prisma: {} }))

import { CASE_OPEN_DEDUPE_MS, recordCaseOpened } from './attorney-activity'

describe('recordCaseOpened', () => {
  const visit = (userId: string, assessmentId: string) => ({ assessmentId, actor: { id: userId, role: 'attorney' } })

  it('counts repeat opens within 15 minutes as one visit', () => {
    const t = 5_000_000
    expect(recordCaseOpened(visit('u1', 'a1'), t)).toBe(true)
    expect(recordCaseOpened(visit('u1', 'a1'), t + 30_000)).toBe(false)
    expect(recordCaseOpened(visit('u1', 'a1'), t + CASE_OPEN_DEDUPE_MS)).toBe(true)
  })

  it('keeps people and cases apart', () => {
    const t = 9_000_000
    expect(recordCaseOpened(visit('u2', 'a2'), t)).toBe(true)
    expect(recordCaseOpened(visit('u3', 'a2'), t)).toBe(true)
    expect(recordCaseOpened(visit('u2', 'a3'), t)).toBe(true)
  })

  it('needs both a user and a case', () => {
    expect(recordCaseOpened({ assessmentId: 'a1', actor: null })).toBe(false)
    expect(recordCaseOpened({ actor: { id: 'u1' } })).toBe(false)
  })
})
