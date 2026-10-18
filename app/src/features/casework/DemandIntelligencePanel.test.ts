import { describe, expect, it } from 'vitest'
import { sourcesCitedOn } from './DemandIntelligencePanel'
import type { DemandSource } from '../../lib/api'

const src = (over: Partial<DemandSource>): DemandSource => ({
  ref: 'Exhibit 1',
  exhibit: 1,
  page: null,
  fileId: 'f1',
  fileUrl: '/uploads/a.pdf',
  label: 'Medical records (a.pdf)',
  quote: null,
  kind: 'exhibit',
  ...over,
})

const sources = [
  src({ ref: 'Ex. 2, p. 4', exhibit: 2, page: 4, kind: 'charge', label: 'City ER — ER visit: $4,000', quote: 'ER visit $4,000.00' }),
  src({ ref: 'Exhibit 1', exhibit: 1 }),
  src({ ref: 'Exhibit 2', exhibit: 2 }),
  src({ ref: 'Exhibit 3', exhibit: 3 }),
]

describe('sourcesCitedOn', () => {
  it('finds the record line behind a page citation', () => {
    const hits = sourcesCitedOn('- City ER — ER visit (Mar 3, 2026): $4,000 (Ex. 2, p. 4)', sources)
    expect(hits.map((h) => h.ref)).toEqual(['Ex. 2, p. 4'])
  })

  it('falls back to the exhibit when no reviewed line is on that page', () => {
    expect(sourcesCitedOn('The MRI (Ex. 2, p. 9) shows', sources).map((h) => h.ref)).toEqual(['Exhibit 2'])
  })

  it('expands exhibit ranges', () => {
    expect(sourcesCitedOn('See Exhibits 1\u20133.', sources).map((h) => h.ref)).toEqual(['Exhibit 1', 'Exhibit 2', 'Exhibit 3'])
  })

  it('returns nothing for a line without citations', () => {
    expect(sourcesCitedOn('Our client was rear-ended.', sources)).toEqual([])
  })
})
