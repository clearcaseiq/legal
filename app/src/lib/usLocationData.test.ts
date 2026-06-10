import { describe, it, expect } from 'vitest'
import { getCountiesForState } from './usLocationData'

describe('getCountiesForState', () => {
  it('returns counties for California and Colorado', () => {
    expect(getCountiesForState('CA')).toContain('Los Angeles')
    expect(getCountiesForState('CO')).toContain('Denver')
    expect(getCountiesForState('CO').length).toBeGreaterThan(50)
  })

  it('normalizes state codes', () => {
    expect(getCountiesForState(' co ')).toContain('Denver')
  })
})
