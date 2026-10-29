import { describe, expect, it } from 'vitest'
import { base32Decode, base32Encode, generateTotpSecret, hotp, matchTotpStep, otpauthUri, totpAt, totpStep } from './totp'

// RFC 6238 Appendix B, SHA-1 column. The seed is the ASCII string below.
const RFC_SECRET = Buffer.from('12345678901234567890', 'ascii')
const RFC_VECTORS: Array<[number, string]> = [
  [59, '94287082'],
  [1111111109, '07081804'],
  [1111111111, '14050471'],
  [1234567890, '89005924'],
  [2000000000, '69279037'],
  [20000000000, '65353130'],
]

describe('totp', () => {
  it.each(RFC_VECTORS)('matches the RFC 6238 vector at T=%i', (seconds, expected) => {
    expect(hotp(RFC_SECRET, totpStep(seconds * 1000), 8)).toBe(expected)
  })

  it('round-trips base32', () => {
    const secret = generateTotpSecret()
    expect(secret).toMatch(/^[A-Z2-7]{32}$/)
    expect(base32Encode(base32Decode(secret))).toBe(secret)
    expect(base32Encode(RFC_SECRET)).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ')
  })

  it('accepts the current code and one step of drift either side, and nothing further', () => {
    const secret = generateTotpSecret()
    const now = Date.UTC(2026, 9, 29, 12, 0, 15)
    const step = totpStep(now)
    expect(matchTotpStep(secret, totpAt(secret, step), now)).toBe(step)
    expect(matchTotpStep(secret, totpAt(secret, step - 1), now)).toBe(step - 1)
    expect(matchTotpStep(secret, totpAt(secret, step + 1), now)).toBe(step + 1)
    expect(matchTotpStep(secret, totpAt(secret, step - 2), now)).toBeNull()
    expect(matchTotpStep(secret, 'abcdef', now)).toBeNull()
  })

  it('builds an otpauth URI authenticator apps accept', () => {
    const uri = otpauthUri({ secret: 'ABC', accountName: 'a@b.com', issuer: 'ClearCaseIQ' })
    expect(uri).toBe('otpauth://totp/ClearCaseIQ%3Aa%40b.com?secret=ABC&issuer=ClearCaseIQ&algorithm=SHA1&digits=6&period=30')
  })
})
