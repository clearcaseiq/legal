import { describe, expect, it, vi } from 'vitest'

vi.mock('./http', () => ({ default: { post: vi.fn() } }))

import { chunkEvents, screenFromPath } from './attorneyActivity'

describe('screenFromPath', () => {
  it('maps case tabs to their canonical section and case', () => {
    expect(screenFromPath('/attorney-dashboard/cases/lead123/liability')).toEqual({ key: 'liability', leadId: 'lead123' })
    expect(screenFromPath('/attorney-dashboard/lead/lead123/info')).toEqual({ key: 'client-info', leadId: 'lead123' })
    expect(screenFromPath('/attorney-dashboard/cases/lead123')).toEqual({ key: 'overview', leadId: 'lead123' })
  })

  it('maps workspace pages and keeps match review in New Matches', () => {
    expect(screenFromPath('/attorney-dashboard/cases/tasks')).toEqual({ key: 'cases/tasks' })
    expect(screenFromPath('/attorney-dashboard/leadgen/matches/lead9/overview')).toEqual({ key: 'leadgen/matches' })
  })

  it('ignores pages outside the list', () => {
    expect(screenFromPath('/attorney-dashboard/guides/how-to')).toBeNull()
    expect(screenFromPath('/admin/cases')).toBeNull()
  })
})

describe('chunkEvents', () => {
  it('splits batches at 50 events and at 5 cases', () => {
    const many = Array.from({ length: 120 }, () => ({ type: 'heartbeat' as const }))
    expect(chunkEvents(many).map((c) => c.length)).toEqual([50, 50, 20])

    const cases = ['a', 'b', 'c', 'd', 'e', 'f', 'a'].map((leadId) => ({ type: 'screen' as const, key: 'medical', leadId }))
    const chunks = chunkEvents(cases)
    expect(chunks.map((c) => c.length)).toEqual([5, 2])
  })
})
