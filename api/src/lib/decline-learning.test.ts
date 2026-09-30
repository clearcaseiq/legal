import { describe, it, expect, vi, beforeEach } from 'vitest'

const { attorneyFindMany, introductionFindMany, assessmentFindUnique } = vi.hoisted(() => ({
  attorneyFindMany: vi.fn(),
  introductionFindMany: vi.fn(),
  assessmentFindUnique: vi.fn(),
}))

vi.mock('./prisma', () => ({
  prisma: {
    attorney: { findMany: attorneyFindMany },
    introduction: { findMany: introductionFindMany },
    assessment: { findUnique: assessmentFindUnique },
  },
}))

import {
  attorneysBlockedByDeclineLearning,
  declineAdjustmentFor,
  describeDeclineLearning,
  loadDeclineLearning,
  traitsFromAssessment,
} from './decline-learning'

const NOW = new Date('2026-09-30T12:00:00Z')
const DAY = 24 * 60 * 60 * 1000

function daysAgo(n: number) {
  return new Date(NOW.getTime() - n * DAY)
}

function decline(
  reason: string,
  ageDays: number,
  assessment: { claimType?: string; venueState?: string; venueCounty?: string; median?: number; liability?: number } = {},
) {
  return {
    attorneyId: 'att-1',
    declineReason: reason,
    respondedAt: daysAgo(ageDays),
    requestedAt: daysAgo(ageDays + 1),
    assessment: {
      claimType: assessment.claimType ?? 'auto',
      venueState: assessment.venueState ?? 'CA',
      venueCounty: assessment.venueCounty ?? 'Los Angeles',
      predictions: [
        {
          bands: JSON.stringify({ median: assessment.median ?? 50000 }),
          viability: JSON.stringify({ liability: assessment.liability ?? 0.7 }),
        },
      ],
    },
  }
}

const baseTraits = {
  claimType: 'auto',
  venueState: 'CA',
  venueCounty: 'Los Angeles',
  medianValue: 50000,
  liability: 0.7,
}

beforeEach(() => {
  attorneyFindMany.mockReset().mockResolvedValue([{ id: 'att-1', meta: null }])
  introductionFindMany.mockReset().mockResolvedValue([])
  assessmentFindUnique.mockReset()
})

describe('loadDeclineLearning', () => {
  it('learns nothing without reasoned declines', async () => {
    const learning = (await loadDeclineLearning(['att-1'], NOW)).get('att-1')!
    expect(declineAdjustmentFor(learning, baseTraits, NOW)).toEqual({ multiplier: 1, blockedReason: null, reasons: [] })
  })

  it('lowers the score for a claim type declined as outside practice area', async () => {
    introductionFindMany.mockResolvedValue([decline('outside_practice_area', 0, { claimType: 'dog_bite' })])
    const learning = (await loadDeclineLearning(['att-1'], NOW)).get('att-1')!
    const adj = declineAdjustmentFor(learning, { ...baseTraits, claimType: 'dog_bite' }, NOW)
    expect(adj.blockedReason).toBeNull()
    expect(adj.multiplier).toBeLessThan(1)
    expect(adj.reasons).toContain('claim_type_declined')
    expect(declineAdjustmentFor(learning, baseTraits, NOW).multiplier).toBe(1)
  })

  it('stops offering a claim type after repeated recent declines', async () => {
    introductionFindMany.mockResolvedValue([
      decline('outside_practice_area', 1, { claimType: 'dog_bite' }),
      decline('outside_practice_area', 2, { claimType: 'dog_bite' }),
      decline('outside_practice_area', 3, { claimType: 'dog_bite' }),
    ])
    const learning = (await loadDeclineLearning(['att-1'], NOW)).get('att-1')!
    expect(declineAdjustmentFor(learning, { ...baseTraits, claimType: 'dog_bite' }, NOW).blockedReason).toMatch(/dog_bite/)
  })

  it('does not block on three declines that have mostly faded', async () => {
    introductionFindMany.mockResolvedValue([
      decline('outside_practice_area', 80, { claimType: 'dog_bite' }),
      decline('outside_practice_area', 81, { claimType: 'dog_bite' }),
      decline('outside_practice_area', 82, { claimType: 'dog_bite' }),
    ])
    const learning = (await loadDeclineLearning(['att-1'], NOW)).get('att-1')!
    const adj = declineAdjustmentFor(learning, { ...baseTraits, claimType: 'dog_bite' }, NOW)
    expect(adj.blockedReason).toBeNull()
    expect(adj.multiplier).toBeGreaterThan(0.9)
  })

  it('blocks a county repeatedly declined as wrong jurisdiction', async () => {
    introductionFindMany.mockResolvedValue([
      decline('wrong_jurisdiction', 1, { venueCounty: 'Kern' }),
      decline('wrong_jurisdiction', 1, { venueCounty: 'kern' }),
      decline('wrong_jurisdiction', 2, { venueCounty: 'Kern' }),
    ])
    const learning = (await loadDeclineLearning(['att-1'], NOW)).get('att-1')!
    expect(declineAdjustmentFor(learning, { ...baseTraits, venueCounty: 'Kern' }, NOW).blockedReason).toMatch(/Kern/)
    expect(declineAdjustmentFor(learning, baseTraits, NOW).blockedReason).toBeNull()
  })

  it('pauses offers for three days after a too-busy decline', async () => {
    introductionFindMany.mockResolvedValue([decline('too_busy', 1)])
    const learning = (await loadDeclineLearning(['att-1'], NOW)).get('att-1')!
    expect(declineAdjustmentFor(learning, baseTraits, NOW).blockedReason).toMatch(/too busy/)
    expect(declineAdjustmentFor(learning, baseTraits, new Date(NOW.getTime() + 3 * DAY)).blockedReason).toBeNull()
  })

  it('ranks cases at or below a value called too low lower', async () => {
    introductionFindMany.mockResolvedValue([decline('low_value', 5, { median: 20000 })])
    const learning = (await loadDeclineLearning(['att-1'], NOW)).get('att-1')!
    expect(declineAdjustmentFor(learning, { ...baseTraits, medianValue: 15000 }, NOW).multiplier).toBeCloseTo(0.6)
    expect(declineAdjustmentFor(learning, { ...baseTraits, medianValue: 80000 }, NOW).multiplier).toBe(1)
  })

  it('ranks weak-liability cases lower after liability declines', async () => {
    introductionFindMany.mockResolvedValue([decline('liability_unclear', 0), decline('insufficient_evidence', 0)])
    const learning = (await loadDeclineLearning(['att-1'], NOW)).get('att-1')!
    expect(declineAdjustmentFor(learning, { ...baseTraits, liability: 0.3 }, NOW).multiplier).toBeLessThan(1)
    expect(declineAdjustmentFor(learning, { ...baseTraits, liability: 0.8 }, NOW).multiplier).toBe(1)
  })

  it('ignores conflict of interest and other', async () => {
    introductionFindMany.mockResolvedValue([decline('conflict_of_interest', 0), decline('other', 0)])
    const learning = (await loadDeclineLearning(['att-1'], NOW)).get('att-1')!
    expect(learning.declinesConsidered).toBe(0)
    expect(declineAdjustmentFor(learning, baseTraits, NOW).multiplier).toBe(1)
  })

  it('discards declines before a firm reset', async () => {
    attorneyFindMany.mockResolvedValue([
      { id: 'att-1', meta: JSON.stringify({ declineLearningResetAt: daysAgo(2).toISOString() }) },
    ])
    introductionFindMany.mockResolvedValue([decline('too_busy', 1), decline('outside_practice_area', 5)])
    const learning = (await loadDeclineLearning(['att-1'], NOW)).get('att-1')!
    expect(learning.claimTypes).toEqual({})
    expect(learning.pausedUntil).not.toBeNull()
  })
})

describe('attorneysBlockedByDeclineLearning', () => {
  it('returns only the attorneys a case must skip, with the reason', async () => {
    attorneyFindMany.mockResolvedValue([
      { id: 'att-1', meta: null },
      { id: 'att-2', meta: null },
    ])
    introductionFindMany.mockResolvedValue([decline('too_busy', 0)])
    assessmentFindUnique.mockResolvedValue({ claimType: 'auto', venueState: 'CA', venueCounty: 'Los Angeles', predictions: [] })
    const blocked = await attorneysBlockedByDeclineLearning('asm-1', ['att-1', 'att-2'])
    expect([...blocked.keys()]).toEqual(['att-1'])
  })
})

describe('helpers', () => {
  it('reads value and liability from the latest prediction', () => {
    expect(
      traitsFromAssessment({
        claimType: 'auto',
        venueState: 'CA',
        venueCounty: null,
        predictions: [{ bands: '{"median":42000}', viability: '{"liability":0.4}' }],
      }),
    ).toEqual({ claimType: 'auto', venueState: 'CA', venueCounty: null, medianValue: 42000, liability: 0.4 })
  })

  it('describes blocked claim types for the dashboard', async () => {
    introductionFindMany.mockResolvedValue([
      decline('outside_practice_area', 0, { claimType: 'dog_bite' }),
      decline('outside_practice_area', 0, { claimType: 'dog_bite' }),
      decline('outside_practice_area', 0, { claimType: 'dog_bite' }),
    ])
    const learning = (await loadDeclineLearning(['att-1'], NOW)).get('att-1')!
    expect(describeDeclineLearning(learning, NOW).claimTypes).toEqual([{ claimType: 'dog_bite', weight: 3, blocked: true }])
  })
})
