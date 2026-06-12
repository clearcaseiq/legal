import { describe, it, expect } from 'vitest'
import { isValidPhone, normalizePhone, parsePhone, optionalPhone, requiredPhone } from './phone'

describe('parsePhone / isValidPhone', () => {
  it('accepts bare 10-digit US numbers and normalizes to E.164', () => {
    expect(isValidPhone('4155550100')).toBe(true)
    expect(normalizePhone('(415) 555-0100')).toBe('+14155550100')
    expect(parsePhone('415.555.0100').national).toBe('(415) 555-0100')
  })

  it('accepts 11-digit US numbers with a leading 1 / country code', () => {
    expect(isValidPhone('14155550100')).toBe(true)
    expect(normalizePhone('+1 415 555 0100')).toBe('+14155550100')
  })

  it('accepts international numbers in explicit E.164 form', () => {
    expect(isValidPhone('+442071838750')).toBe(true)
    expect(normalizePhone('+44 20 7183 8750')).toBe('+442071838750')
  })

  it('rejects malformed numbers', () => {
    expect(isValidPhone('')).toBe(false)
    expect(isValidPhone('123')).toBe(false)
    expect(isValidPhone('555-0100')).toBe(false)
    // Area code may not start with 0 or 1.
    expect(isValidPhone('1155550100')).toBe(false)
    expect(isValidPhone('0155550100')).toBe(false)
    // Too many / too few digits, no country code.
    expect(isValidPhone('415555010012')).toBe(false)
  })

  it('accepts placeholder/test exchanges (no strict exchange rule)', () => {
    // Exchange starting with 0/1 is allowed so common test numbers pass.
    expect(isValidPhone('(555) 123-4567')).toBe(true)
    expect(normalizePhone('(555) 123-4567')).toBe('+15551234567')
    expect(isValidPhone('4150550100')).toBe(true)
  })
})

describe('optionalPhone schema', () => {
  it('allows empty / missing and normalizes valid input', () => {
    expect(optionalPhone.parse(undefined)).toBeUndefined()
    expect(optionalPhone.parse('')).toBeUndefined()
    expect(optionalPhone.parse('   ')).toBeUndefined()
    expect(optionalPhone.parse('(415) 555-0100')).toBe('+14155550100')
  })

  it('rejects an invalid non-empty value', () => {
    expect(() => optionalPhone.parse('555')).toThrow()
  })
})

describe('requiredPhone schema', () => {
  it('requires a valid number', () => {
    expect(requiredPhone.parse('415-555-0100')).toBe('+14155550100')
    expect(() => requiredPhone.parse('')).toThrow()
    expect(() => requiredPhone.parse('abc')).toThrow()
  })
})
