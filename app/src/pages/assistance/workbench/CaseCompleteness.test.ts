import { describe, expect, it } from 'vitest'
import { summarizeDomains } from './CaseCompleteness'
import type { AssistanceGap } from '../../../lib/api'

function gap(overrides: Partial<AssistanceGap> & { key: string; category: string }): AssistanceGap {
  return {
    label: overrides.key,
    severity: 3,
    valueImpact: 'medium',
    rationale: '',
    ...overrides,
  }
}

describe('summarizeDomains', () => {
  it('scores a domain as resolved over total', () => {
    const { scored } = summarizeDomains([
      gap({ key: 'a', category: 'insurance', resolved: true }),
      gap({ key: 'b', category: 'insurance' }),
      gap({ key: 'c', category: 'insurance' }),
    ])
    expect(scored).toHaveLength(1)
    expect(scored[0]).toMatchObject({ key: 'insurance', resolved: 1, total: 3, percent: 33 })
  })

  // The generator only emits a gap when something triggers it, so an absent
  // domain means "never flagged", not "finished". Showing it as a full bar would
  // tell a specialist a section is done when nothing ever checked it.
  it('separates never-flagged domains from complete ones', () => {
    const { scored, unflagged } = summarizeDomains([gap({ key: 'a', category: 'medical', resolved: true })])
    expect(scored).toEqual([
      expect.objectContaining({ key: 'medical', resolved: 1, total: 1, percent: 100 }),
    ])
    expect(unflagged).toEqual(['Liability', 'Damages', 'Insurance', 'Evidence', 'Case strategy'])
  })

  it('counts open critical items without counting resolved ones', () => {
    const { scored } = summarizeDomains([
      gap({ key: 'a', category: 'liability', severity: 5 }),
      gap({ key: 'b', category: 'liability', severity: 4 }),
      gap({ key: 'c', category: 'liability', severity: 5, resolved: true }),
      gap({ key: 'd', category: 'liability', severity: 2 }),
    ])
    expect(scored[0].openCritical).toBe(2)
  })

  it('holds a stable domain order regardless of gap order', () => {
    const { scored } = summarizeDomains([
      gap({ key: 'a', category: 'evidence' }),
      gap({ key: 'b', category: 'liability' }),
      gap({ key: 'c', category: 'damages' }),
    ])
    expect(scored.map((domain) => domain.key)).toEqual(['liability', 'damages', 'evidence'])
  })

  it('reports every domain as unflagged when there are no gaps', () => {
    const { scored, unflagged } = summarizeDomains([])
    expect(scored).toEqual([])
    expect(unflagged).toHaveLength(6)
  })
})
