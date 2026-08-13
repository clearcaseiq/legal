import { describe, expect, it } from 'vitest'
import { buildCaseValueHistory, isMaterialValueChange } from './case-value-history'

function pred(median: number, reason: string | null, daysAgo: number) {
  const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString()
  return {
    bands: JSON.stringify({ p25: median * 0.7, median, p75: median * 1.3 }),
    explain: reason
      ? JSON.stringify({ reason, trigger: reason })
      : JSON.stringify({ explainability: [] }),
    createdAt,
  }
}

describe('isMaterialValueChange', () => {
  it('ignores tiny moves', () => {
    expect(isMaterialValueChange(30000, 30100)).toBe(false)
  })

  it('flags absolute or relative material moves', () => {
    expect(isMaterialValueChange(10000, 10600)).toBe(true)
    expect(isMaterialValueChange(30000, 32000)).toBe(true)
  })
})

describe('buildCaseValueHistory', () => {
  it('returns chronological material points with reason labels', () => {
    const history = buildCaseValueHistory([
      pred(40000, 'document_upload', 0),
      pred(20000, null, 10),
      pred(20100, 'evidence_processing', 8),
      pred(30000, 'document_upload', 3),
    ])

    expect(history.map((h) => h.shortLabel)).toEqual(['Initial', 'Docs', 'Current'])
    expect(history[0].value).toBe(20000)
    expect(history[1].reasonKey).toBe('document_upload')
    expect(history[1].value).toBe(30000)
    expect(history[2].value).toBe(40000)
    expect(history[2].reasonKey).toBe('current')
  })

  it('collapses non-material duplicates but keeps current tip', () => {
    const history = buildCaseValueHistory([
      pred(20000, null, 5),
      pred(20100, 'evidence_processing', 2),
      pred(20150, 'document_upload', 0),
    ])

    expect(history).toHaveLength(1)
    expect(history[0].shortLabel).toBe('Current')
    expect(history[0].value).toBe(20150)
  })

  it('labels a lone snapshot as current', () => {
    const history = buildCaseValueHistory([
      {
        bands: JSON.stringify({ p25: 10, median: 20, p75: 30 }),
        explain: JSON.stringify({ source: 'materialized_underwriting' }),
        createdAt: new Date().toISOString(),
      },
    ])
    expect(history).toHaveLength(1)
    expect(history[0].shortLabel).toBe('Current')
    expect(history[0].reasonKey).toBe('current')
  })
})
