import { describe, it, expect } from 'vitest'
import {
  toCents,
  fromCents,
  toStripeMetadataValue,
  parseJsonMaybe,
  webUrl,
} from './stripe'

describe('toCents / fromCents', () => {
  it('converts dollars to integer cents, rounding half-cent amounts', () => {
    expect(toCents(0)).toBe(0)
    expect(toCents(1)).toBe(100)
    expect(toCents(19.99)).toBe(1999)
    expect(toCents(0.1 + 0.2)).toBe(30) // guards against float drift (0.30000000000000004)
  })

  it('converts cents back to dollars and preserves null/undefined', () => {
    expect(fromCents(0)).toBe(0)
    expect(fromCents(1999)).toBe(19.99)
    expect(fromCents(null)).toBeNull()
    expect(fromCents(undefined)).toBeNull()
  })

  it('round-trips a range of dollar amounts', () => {
    for (const dollars of [0, 5, 99, 199.5, 999.99]) {
      expect(fromCents(toCents(dollars))).toBeCloseTo(dollars, 2)
    }
  })
})

describe('toStripeMetadataValue', () => {
  it('stringifies values and maps null/undefined to empty string', () => {
    expect(toStripeMetadataValue('abc')).toBe('abc')
    expect(toStripeMetadataValue(42)).toBe('42')
    expect(toStripeMetadataValue(0)).toBe('0')
    expect(toStripeMetadataValue(false)).toBe('false')
    expect(toStripeMetadataValue(null)).toBe('')
    expect(toStripeMetadataValue(undefined)).toBe('')
  })
})

describe('parseJsonMaybe', () => {
  it('parses valid JSON strings', () => {
    expect(parseJsonMaybe('{"a":1}')).toEqual({ a: 1 })
    expect(parseJsonMaybe('[1,2,3]')).toEqual([1, 2, 3])
  })

  it('returns null for malformed JSON strings', () => {
    expect(parseJsonMaybe('{not json}')).toBeNull()
  })

  it('passes through non-string values unchanged', () => {
    const obj = { already: 'parsed' }
    expect(parseJsonMaybe(obj)).toBe(obj)
    expect(parseJsonMaybe(null)).toBeNull()
    expect(parseJsonMaybe(undefined)).toBeUndefined()
  })
})

describe('webUrl', () => {
  it('joins a path onto the web origin without a double slash', () => {
    const url = webUrl('/payment/success')
    expect(url.endsWith('/payment/success')).toBe(true)
    expect(url).not.toContain('//payment')
  })
})
