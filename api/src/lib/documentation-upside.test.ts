/**
 * Documentation raises the floor and never the ceiling.
 *
 * The plaintiff dashboard used to advertise 1.25x-1.8x the top of the band as
 * what a document was worth. The engine cannot produce that, so the promise was
 * unkeepable: a claimant could upload every record asked of them and watch the
 * top number stay exactly where it was. These pin the shape of the real upside
 * so a surface can state it without inventing one.
 */
import { describe, it, expect } from 'vitest'
import {
  calculateDocumentation,
  calculateSettlement,
  calculateLiability,
  calculateSeverity,
  calculateTreatmentQuality,
  documentationUpside,
} from './underwriting-engine'

/** The delayed-appendicitis case, with nothing uploaded. */
const input = {
  claimType: 'medmal',
  venueState: 'CA',
  venueCounty: 'Los Angeles',
  facts: {
    damages: { med_charges: 30000 },
    injuries: [{ description: 'moderate', bodyParts: [{ part: 'abdomen', severity: 'moderate' }] }],
    incident: { date: '2026-06-01' },
  },
  evidenceFiles: [],
} as any

function value(over: Record<string, any> = {}) {
  const merged = { ...input, facts: { ...input.facts, ...over } }
  const liability = calculateLiability(merged)
  const severity = calculateSeverity(merged)
  const treatment = calculateTreatmentQuality(merged)
  const documentation = calculateDocumentation(merged)
  const settlement = calculateSettlement(merged, liability, severity, treatment, documentation)
  return { documentation, settlement, upside: documentationUpside(settlement, documentation) }
}

describe('documentationUpside', () => {
  it('reports the unchanged ceiling as the ceiling', () => {
    const { settlement, upside } = value()

    expect(upside.ceiling).toBe(settlement.high)
  })

  it('never projects a floor above the ceiling', () => {
    const { upside } = value()

    for (const item of upside.items) {
      expect(item.projectedLow).toBeLessThanOrEqual(upside.ceiling)
    }
    expect(upside.fullyDocumentedLow).toBeLessThanOrEqual(upside.ceiling)
  })

  it('raises the floor for every gap, rather than raising the top', () => {
    const { upside } = value()

    expect(upside.items.length).toBeGreaterThan(0)
    for (const item of upside.items) {
      expect(item.projectedLow).toBeGreaterThan(upside.currentLow)
    }
  })

  it('weights a heavier document above a lighter one and never below it', () => {
    const { upside } = value()
    const daily = upside.items.find((i) => i.label === 'Daily impact statement')
    const photos = upside.items.find((i) => i.label === 'Photos')

    expect(daily!.points).toBeGreaterThan(photos!.points)
    // Only ever >=. Bands are rounded to the nearest $1,000, so on a case this
    // size a five-point difference is smaller than one step of the rounding —
    // which is itself a reason not to advertise per-document dollar jumps.
    expect(daily!.projectedLow).toBeGreaterThanOrEqual(photos!.projectedLow)
  })

  it('does separate the two on a case large enough for rounding to show it', () => {
    const { upside } = value({ damages: { med_charges: 400000 } })
    const daily = upside.items.find((i) => i.label === 'Daily impact statement')
    const photos = upside.items.find((i) => i.label === 'Photos')

    expect(daily!.projectedLow).toBeGreaterThan(photos!.projectedLow)
  })

  it('caps the whole upside well below the old 1.25x-of-ceiling promise', () => {
    const { upside } = value()

    // The floor tops out at the documented half-width; it cannot pass the top.
    expect(upside.fullyDocumentedLow).toBeLessThan(upside.ceiling)
  })

  it('offers no upside on a case already pinned to a policy limit', () => {
    const { upside } = value({ insurance: { policy_limit: 5000 } })

    expect(upside.currentLow).toBe(upside.ceiling)
    for (const item of upside.items) {
      expect(item.projectedLow).toBe(upside.ceiling)
    }
  })

  it('publishes gap weights so no client needs its own copy of the table', () => {
    const { documentation } = value()

    expect(documentation.gaps.map((g) => g.label)).toEqual(documentation.missing)
    for (const gap of documentation.gaps) {
      expect(gap.points).toBeGreaterThan(0)
    }
  })

  it('leaves no gaps, and so no upside, once everything is on file', () => {
    const { documentation, upside } = value({
      evidence: ['medical_records', 'medical_bills', 'police_report', 'photos'],
      damages: { med_charges: 30000, extracted_wage_loss: 4000, extracted_med_charges: 30000 },
      injuries: [
        {
          description: 'moderate',
          bodyParts: [{ part: 'abdomen', severity: 'moderate' }],
          lifestyleImpact: ['cannot lift'],
        },
      ],
    })

    expect(documentation.gaps).toHaveLength(0)
    expect(upside.items).toHaveLength(0)
    expect(upside.fullyDocumentedLow).toBe(upside.currentLow)
  })

  it('quotes a reachable floor, not the floor at a perfect score', () => {
    // A med-mal case can never file a police report, so the 20 points in that
    // category are unreachable and must not be priced into the promise.
    const { documentation, upside } = value()
    const closeable = documentation.gaps.reduce((sum, gap) => sum + gap.points, 0)

    expect(documentation.score + closeable).toBeLessThan(100)

    const best = upside.items.reduce((max, item) => Math.max(max, item.projectedLow), 0)
    expect(upside.fullyDocumentedLow).toBeGreaterThanOrEqual(best)
  })
})
