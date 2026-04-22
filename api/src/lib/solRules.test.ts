import { describe, it, expect, vi } from 'vitest'
import { calculateSOL, deriveSOLStatus, getSOLStatus, normalizeClaimTypeForSOL, SOL_RULES } from './solRules'

describe('getSOLStatus', () => {
  it('returns safe when more than 365 days remain', () => {
    expect(getSOLStatus(400)).toBe('safe')
  })

  it('returns warning when between 91 and 365 days', () => {
    expect(getSOLStatus(200)).toBe('warning')
    expect(getSOLStatus(91)).toBe('warning')
  })

  it('returns critical when 90 or fewer days', () => {
    expect(getSOLStatus(90)).toBe('critical')
    expect(getSOLStatus(0)).toBe('critical')
    expect(getSOLStatus(-10)).toBe('critical')
  })
})

describe('calculateSOL', () => {
  it('returns rule and expiry for CA auto', () => {
    const r = calculateSOL('2020-06-15T12:00:00.000Z', { state: 'CA' }, 'auto')
    expect(r.rule.years).toBe(2)
    expect(r.expiresAt.getTime()).toBeGreaterThan(new Date('2020-06-15T12:00:00.000Z').getTime())
    expect(typeof r.daysRemaining).toBe('number')
  })

  it('throws when state or claim type is unknown', () => {
    expect(() => calculateSOL('2020-01-01', { state: 'ZZ' }, 'auto')).toThrow(/No SOL rule/)
    expect(() => calculateSOL('2020-01-01', { state: 'CA' }, 'unknown_claim_xyz')).toThrow(/No SOL rule/)
  })

  it('handles fractional-year rules for NY medmal', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'))

    const result = calculateSOL('2024-01-01T00:00:00.000Z', { state: 'NY' }, 'medmal')
    expect(result.expiresAt.toISOString()).toContain('2026-07-01')

    vi.useRealTimers()
  })
})

describe('normalizeClaimTypeForSOL', () => {
  it('normalizes aliases to supported claim types', () => {
    expect(normalizeClaimTypeForSOL('auto-accident')).toBe('auto')
    expect(normalizeClaimTypeForSOL('premises')).toBe('slip_and_fall')
  })
})

describe('deriveSOLStatus', () => {
  it('uses discovery date when rule supports it', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'))

    const result = deriveSOLStatus({
      incidentDate: '2024-04-01',
      discoveryDate: '2024-12-15',
      venue: { state: 'CA' },
      claimType: 'medmal'
    })

    expect(result.status).toBe('expiring_soon')
    expect(result.appliedDateType).toBe('discovery')

    vi.useRealTimers()
  })

  it('extends expiry for minors when tolling applies', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'))

    const result = deriveSOLStatus({
      incidentDate: '2024-01-01',
      birthDate: '2010-06-01',
      venue: { state: 'CA' },
      claimType: 'medmal'
    })

    expect(result.status).toBe('ok')
    expect(result.appliedDateType).toBe('minor_tolling')
    expect(result.expiresAt?.getUTCFullYear()).toBeGreaterThanOrEqual(2029)

    vi.useRealTimers()
  })
})

describe('SOL_RULES', () => {
  it('includes expected states', () => {
    expect(Object.keys(SOL_RULES).sort()).toEqual(['CA', 'FL', 'NY', 'TX'])
  })
})
