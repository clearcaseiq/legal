import { describe, expect, it } from 'vitest'
import { computeCaliforniaSol, formatDisplayDate } from './publicCaSol'

describe('publicCaSol', () => {
  it('computes a two-year CA auto deadline from the incident date', () => {
    const result = computeCaliforniaSol({
      incidentDate: '2024-01-15',
      claimType: 'auto',
      againstGovernment: false,
    })
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.years).toBe(2)
    expect(formatDisplayDate(result.filingDeadline)).toContain('2026')
    expect(result.governmentDeadline).toBeNull()
  })

  it('adds a six-month government presentation clock when requested', () => {
    const result = computeCaliforniaSol({
      incidentDate: '2024-01-15',
      claimType: 'auto',
      againstGovernment: true,
    })
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.governmentDeadline).not.toBeNull()
    expect(formatDisplayDate(result.governmentDeadline!)).toContain('2024')
  })

  it('rejects future incident dates', () => {
    const result = computeCaliforniaSol({
      incidentDate: '2099-01-01',
      claimType: 'auto',
      againstGovernment: false,
    })
    expect(result).toEqual({ error: 'Incident date cannot be in the future.' })
  })
})
