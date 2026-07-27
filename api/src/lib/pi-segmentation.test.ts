import { describe, expect, it } from 'vitest'
import {
  inheritFirmSegment,
  isEligibleForClaimantLeads,
  PI_SCORE_VERSION,
  scoreSegment,
  SIGNAL_WEIGHTS,
  type SegmentSignal,
} from './pi-segmentation'

const NOW = new Date('2026-07-27T00:00:00.000Z')

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000)
}

function yearsAgo(years: number): Date {
  return new Date(NOW.getTime() - years * 365.25 * 24 * 60 * 60 * 1000)
}

function filing(overrides: Partial<SegmentSignal> = {}): SegmentSignal {
  return {
    source: 'court_filing',
    kind: 'pi_complaint_filed',
    side: 'plaintiff',
    observedAt: daysAgo(30),
    ...overrides,
  }
}

describe('scoreSegment', () => {
  it('reports no evidence rather than a zero-confidence guess', () => {
    const result = scoreSegment([], NOW)
    expect(result.piScore).toBe(0)
    expect(result.side).toBe('unknown')
    expect(result.confidence).toBe('none')
    expect(result.rationale).toEqual(['No evidence on file.'])
    expect(result.scoreVersion).toBe(PI_SCORE_VERSION)
  })

  it('treats a single recent filing as suggestive, not conclusive', () => {
    const result = scoreSegment([filing()], NOW)
    expect(result.piScore).toBeGreaterThan(0.3)
    expect(result.piScore).toBeLessThan(0.6)
    expect(result.confidence).not.toBe('high')
  })

  it('rewards volume with diminishing returns', () => {
    const one = scoreSegment([filing({ count: 1 })], NOW).piScore
    const ten = scoreSegment([filing({ count: 10 })], NOW).piScore
    const hundred = scoreSegment([filing({ count: 100 })], NOW).piScore

    expect(ten).toBeGreaterThan(one)
    expect(hundred).toBeGreaterThan(ten)
    // Ten times the filings must not mean ten times the score.
    expect(ten).toBeLessThan(one * 10)
    // The step from 10 to 100 is smaller than the step from 1 to 10.
    expect(hundred - ten).toBeLessThan(ten - one)
  })

  it('discounts stale evidence toward unknown', () => {
    const fresh = scoreSegment([filing({ observedAt: daysAgo(10) })], NOW).piScore
    const threeYears = scoreSegment([filing({ observedAt: yearsAgo(3) })], NOW).piScore
    const twelveYears = scoreSegment([filing({ observedAt: yearsAgo(12) })], NOW).piScore

    expect(threeYears).toBeLessThan(fresh)
    expect(twelveYears).toBeLessThan(threeYears)
    // One half-life should roughly halve the contribution.
    expect(threeYears).toBeGreaterThan(fresh * 0.4)
    expect(threeYears).toBeLessThan(fresh * 0.65)
  })

  it('treats undated evidence as weaker than dated recent evidence', () => {
    const dated = scoreSegment([filing({ observedAt: daysAgo(1) })], NOW).piScore
    const undated = scoreSegment([filing({ observedAt: null })], NOW).piScore
    expect(undated).toBeLessThan(dated)
  })

  it('ranks behavioural evidence above self-description', () => {
    const fromFiling = scoreSegment([filing()], NOW).piScore
    const fromWebsite = scoreSegment(
      [{ source: 'website', kind: 'practice_area_page', side: 'plaintiff', observedAt: daysAgo(30) }],
      NOW
    ).piScore

    expect(fromFiling).toBeGreaterThan(fromWebsite)
    expect(SIGNAL_WEIGHTS.court_filing).toBeGreaterThan(SIGNAL_WEIGHTS.website)
  })

  it('surfaces the biggest contributors in the rationale', () => {
    const result = scoreSegment(
      [
        filing({ count: 25 }),
        { source: 'website', kind: 'practice_area_page', observedAt: daysAgo(5) },
      ],
      NOW
    )
    expect(result.rationale[0]).toContain('Court filings')
  })

  it('ranks subtypes by how much evidence supports them', () => {
    const result = scoreSegment(
      [
        filing({ subtype: 'vehicle', count: 50 }),
        filing({ subtype: 'slip_fall', count: 5 }),
        filing({ subtype: 'medmal', count: 1 }),
      ],
      NOW
    )
    expect(result.subtypes).toEqual(['vehicle', 'slip_fall', 'medmal'])
  })
})

describe('side classification', () => {
  it('calls plaintiff when the evidence is one-sided', () => {
    const result = scoreSegment([filing({ count: 30 })], NOW)
    expect(result.side).toBe('plaintiff')
    expect(result.sideConfidence).toBeGreaterThan(0.5)
  })

  it('calls defense when the evidence is one-sided the other way', () => {
    const result = scoreSegment(
      [filing({ side: 'defense', kind: 'pi_defense_appearance', count: 30 })],
      NOW
    )
    expect(result.side).toBe('defense')
  })

  it('refuses to pick a side on genuinely mixed evidence', () => {
    const result = scoreSegment(
      [filing({ count: 20 }), filing({ side: 'defense', kind: 'pi_defense_appearance', count: 18 })],
      NOW
    )
    // A firm doing real defense work is a conflict risk on claimant cases even
    // if it does more plaintiff work, so this must not collapse to 'plaintiff'.
    expect(result.side).toBe('both')
    expect(result.rationale.join(' ')).toContain('human review')
  })

  it('stays unknown when no evidence carries a side', () => {
    const result = scoreSegment(
      [
        { source: 'website', kind: 'practice_area_page', observedAt: daysAgo(5) },
        { source: 'gbp', kind: 'category_personal_injury', observedAt: daysAgo(5) },
      ],
      NOW
    )
    expect(result.side).toBe('unknown')
    expect(result.sideConfidence).toBe(0)
    expect(result.rationale.join(' ')).toContain('undetermined')
  })

  it('does not call a side on a trace of evidence', () => {
    const result = scoreSegment(
      [{ source: 'directory', kind: 'listing', side: 'plaintiff', observedAt: yearsAgo(9) }],
      NOW
    )
    expect(result.side).toBe('unknown')
  })
})

describe('confidence grading', () => {
  it('caps confidence when everything is self-reported', () => {
    // Website, three directories and ad spend all originate with the firm. That
    // is one claim repeated, not five pieces of evidence.
    const selfReported: SegmentSignal[] = [
      { source: 'website', kind: 'practice_area_page', side: 'plaintiff', observedAt: daysAgo(5) },
      { source: 'directory', kind: 'listing', side: 'plaintiff', observedAt: daysAgo(5), count: 3 },
      { source: 'paid_search', kind: 'pi_keyword_bid', side: 'plaintiff', observedAt: daysAgo(5) },
      { source: 'bar_record', kind: 'reported_practice_area', observedAt: daysAgo(5) },
    ]
    const result = scoreSegment(selfReported, NOW)

    expect(result.breakdown.independentSources).toBe(0)
    expect(result.confidence).not.toBe('high')
    expect(result.confidence).not.toBe('medium')
    expect(result.rationale.join(' ')).toContain('self-reported')
  })

  it('reaches high confidence on two independent corroborating sources', () => {
    const result = scoreSegment(
      [
        filing({ count: 20 }),
        { source: 'association', kind: 'caoc_member', side: 'plaintiff', observedAt: daysAgo(60) },
      ],
      NOW
    )
    expect(result.breakdown.independentSources).toBe(2)
    expect(result.confidence).toBe('high')
  })

  it('lets a human reviewer settle the question', () => {
    const result = scoreSegment(
      [{ source: 'manual', kind: 'reviewer_confirmed_pi', side: 'plaintiff', observedAt: daysAgo(1) }],
      NOW
    )
    expect(result.piScore).toBeGreaterThan(0.8)
    expect(result.side).toBe('plaintiff')
  })
})

describe('isEligibleForClaimantLeads', () => {
  it('accepts a well-evidenced plaintiff practice', () => {
    const score = scoreSegment(
      [
        filing({ count: 30 }),
        { source: 'association', kind: 'caoc_member', side: 'plaintiff', observedAt: daysAgo(30) },
      ],
      NOW
    )
    const result = isEligibleForClaimantLeads(score)
    expect(result.eligible).toBe(true)
  })

  it('refuses a defense firm however strong its PI score', () => {
    const score = scoreSegment(
      [
        filing({ side: 'defense', kind: 'pi_defense_appearance', count: 200 }),
        { source: 'association', kind: 'ascdc_member', side: 'defense', observedAt: daysAgo(30) },
      ],
      NOW
    )
    // High PI score, and still must never receive a claimant.
    expect(score.piScore).toBeGreaterThan(0.8)
    const result = isEligibleForClaimantLeads(score)
    expect(result.eligible).toBe(false)
    expect(result.reason).toContain('conflict')
  })

  it('holds back a mixed practice for review unless explicitly allowed', () => {
    const score = scoreSegment(
      [filing({ count: 20 }), filing({ side: 'defense', kind: 'pi_defense_appearance', count: 18 })],
      NOW
    )
    expect(isEligibleForClaimantLeads(score).eligible).toBe(false)
    expect(isEligibleForClaimantLeads(score, { allowMixed: true }).eligible).toBe(true)
  })

  it('refuses when the side is undetermined', () => {
    const score = scoreSegment(
      [{ source: 'gbp', kind: 'category_personal_injury', observedAt: daysAgo(5), count: 5 }],
      NOW
    )
    expect(isEligibleForClaimantLeads(score).eligible).toBe(false)
    expect(isEligibleForClaimantLeads(score).reason).toContain('undetermined')
  })

  it('respects a caller-supplied threshold', () => {
    const score = scoreSegment(
      [
        filing({ count: 20 }),
        { source: 'association', kind: 'caoc_member', side: 'plaintiff', observedAt: daysAgo(30) },
      ],
      NOW
    )
    expect(isEligibleForClaimantLeads(score, { minScore: 0.99 }).eligible).toBe(false)
  })
})

describe('inheritFirmSegment', () => {
  const firmScore = scoreSegment(
    [
      filing({ count: 40 }),
      { source: 'association', kind: 'caoc_member', side: 'plaintiff', observedAt: daysAgo(30) },
    ],
    NOW
  )

  it('gives an associate with no evidence a discounted version of the firm score', () => {
    const attorney = scoreSegment([], NOW)
    const result = inheritFirmSegment(attorney, firmScore)

    expect(result.piScore).toBeGreaterThan(0)
    expect(result.piScore).toBeLessThan(firmScore.piScore)
    expect(result.side).toBe('plaintiff')
    expect(result.rationale.join(' ')).toContain('Inherited')
  })

  it('never grades inherited evidence above low confidence', () => {
    const attorney = scoreSegment([], NOW)
    const result = inheritFirmSegment(attorney, firmScore)
    // The evidence is about the firm, not this person.
    expect(result.confidence).toBe('low')
    expect(isEligibleForClaimantLeads(result).eligible).toBe(false)
  })

  it('leaves an attorney with their own solid evidence alone', () => {
    const attorney = scoreSegment(
      [
        filing({ count: 15 }),
        { source: 'association', kind: 'caala_member', side: 'plaintiff', observedAt: daysAgo(10) },
      ],
      NOW
    )
    expect(inheritFirmSegment(attorney, firmScore)).toEqual(attorney)
  })

  it('does not drag an attorney down when the firm scores lower', () => {
    const attorney = scoreSegment([filing({ count: 5 })], NOW)
    const weakFirm = scoreSegment(
      [{ source: 'website', kind: 'practice_area_page', observedAt: yearsAgo(6) }],
      NOW
    )
    expect(inheritFirmSegment(attorney, weakFirm).piScore).toBe(attorney.piScore)
  })
})
