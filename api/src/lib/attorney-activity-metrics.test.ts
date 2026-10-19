import { describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => ({ prisma: {} }))

import {
  countStaleCases,
  hoursSaved,
  leadResponseStats,
  median,
  mergeTimeline,
  sumCounts,
  timelineToCsv,
  type TimelineEntry,
} from './attorney-activity-metrics'

const at = (iso: string) => new Date(iso)

describe('lead response', () => {
  it('takes the median of answered leads and counts pending ones', () => {
    const stats = leadResponseStats([
      { requestedAt: at('2026-10-01T00:00:00Z'), respondedAt: at('2026-10-01T02:00:00Z'), status: 'ACCEPTED' },
      { requestedAt: at('2026-10-02T00:00:00Z'), respondedAt: at('2026-10-02T06:00:00Z'), status: 'DECLINED' },
      { requestedAt: at('2026-10-03T00:00:00Z'), respondedAt: at('2026-10-03T01:00:00Z'), status: 'ACCEPTED' },
      { requestedAt: at('2026-10-04T00:00:00Z'), respondedAt: null, status: 'PENDING' },
    ])
    expect(stats).toEqual({ received: 4, pending: 1, medianHours: 2 })
  })

  it('has no median without answers', () => {
    expect(leadResponseStats([]).medianHours).toBeNull()
    expect(median([4, 1])).toBe(2.5)
  })
})

describe('stale cases', () => {
  const now = at('2026-10-18T00:00:00Z')

  it('counts open cases with no change in 14 days, but not brand-new ones', () => {
    const cases = [
      { assessmentId: 'touched', since: at('2026-01-01T00:00:00Z') },
      { assessmentId: 'neglected', since: at('2026-01-01T00:00:00Z') },
      { assessmentId: 'never-touched-old', since: at('2026-09-01T00:00:00Z') },
      { assessmentId: 'never-touched-new', since: at('2026-10-15T00:00:00Z') },
    ]
    const last = new Map([
      ['touched', at('2026-10-10T00:00:00Z')],
      ['neglected', at('2026-09-20T00:00:00Z')],
    ])
    expect(countStaleCases(cases, last, now)).toBe(2)
  })
})

describe('hours saved', () => {
  it('weights each action by its minutes', () => {
    expect(
      hoursSaved({ demandsGenerated: 1, packagesBuilt: 1, packagesEmailed: 0, tasksCompleted: 12, aiSuggestionsAccepted: 0 }),
    ).toBe(4)
  })
})

describe('sumCounts', () => {
  it('adds JSON count maps and skips bad rows', () => {
    expect(sumCounts(['{"a":1,"b":2}', '{"a":3}', null, 'oops'])).toEqual({ a: 4, b: 2 })
  })
})

describe('timeline', () => {
  const entry = (id: string, iso: string): TimelineEntry => ({
    id,
    at: iso,
    kind: 'activity',
    action: 'login',
    detail: null,
    assessmentId: null,
  })

  it('merges sources newest first and pages with a cursor', () => {
    const page = mergeTimeline(
      [
        [entry('a1', '2026-10-18T10:00:00.000Z'), entry('a2', '2026-10-18T07:00:00.000Z')],
        [entry('b1', '2026-10-18T09:00:00.000Z'), entry('b2', '2026-10-18T06:00:00.000Z')],
      ],
      3,
    )
    expect(page.entries.map((e) => e.id)).toEqual(['a1', 'b1', 'a2'])
    expect(page.nextBefore).toBe('2026-10-18T07:00:00.000Z')
  })

  it('has no cursor on the last page', () => {
    expect(mergeTimeline([[entry('a', '2026-10-18T00:00:00.000Z')]], 5).nextBefore).toBeNull()
  })

  it('quotes CSV cells and neutralises spreadsheet formulas', () => {
    const csv = timelineToCsv([{ ...entry('x', '2026-10-18T00:00:00.000Z'), detail: '=HYPERLINK("evil")' }])
    expect(csv.split('\n')[1]).toContain(`"'=HYPERLINK(""evil"")"`)
  })
})
