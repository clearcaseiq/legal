import { describe, expect, it } from 'vitest'
import { formatFromAddress, resolveFromAddress } from './claims'

const PLATFORM = 'no-reply@clearcaseiq.com'

describe('formatFromAddress', () => {
  it('wraps a bare address with the display name', () => {
    expect(formatFromAddress(PLATFORM, 'Sri Reddy')).toBe(`"Sri Reddy" <${PLATFORM}>`)
  })

  it('does not nest a configured sender that already has a display name', () => {
    // The documented production value carries its own name, and nesting the two
    // produced an address SES rejects.
    expect(formatFromAddress('ClearCaseIQ <noreply@clearcaseiq.com>', 'Sri Reddy')).toBe(
      '"Sri Reddy" <noreply@clearcaseiq.com>',
    )
  })

  it('names the platform when the caller supplies no display name', () => {
    // System mail passes no name, and a bare From renders in an inbox as a raw
    // address with nothing beside it — which reads as spam.
    expect(formatFromAddress(PLATFORM)).toBe(`"ClearCaseIQ" <${PLATFORM}>`)
    expect(formatFromAddress(PLATFORM, '  ')).toBe(`"ClearCaseIQ" <${PLATFORM}>`)
  })

  it('keeps a configured display name rather than replacing it with the default', () => {
    expect(formatFromAddress('ClearCaseIQ Support <noreply@clearcaseiq.com>')).toBe(
      'ClearCaseIQ Support <noreply@clearcaseiq.com>',
    )
  })

  it('strips characters that would break the header', () => {
    expect(formatFromAddress(PLATFORM, 'Sri "The Closer" Reddy\r\nBcc: evil@example.com')).toBe(
      `"Sri The Closer ReddyBcc: evil@example.com" <${PLATFORM}>`,
    )
  })
})

describe('resolveFromAddress', () => {
  it('sends as the staff member when they are on the verified domain', () => {
    expect(resolveFromAddress(PLATFORM, 'sri@clearcaseiq.com')).toBe('sri@clearcaseiq.com')
  })

  it('keeps the platform address for a sender on any other domain', () => {
    // SES would reject an unverified From outright and the claimant would get
    // nothing, so this has to degrade rather than attempt the send.
    expect(resolveFromAddress(PLATFORM, 'sri.reddy@gmail.com')).toBe(PLATFORM)
    expect(resolveFromAddress(PLATFORM, 'agent@clearcaseiq.com.evil.net')).toBe(PLATFORM)
  })

  it('falls back when no sender is given', () => {
    expect(resolveFromAddress(PLATFORM)).toBe(PLATFORM)
    expect(resolveFromAddress(PLATFORM, null)).toBe(PLATFORM)
    expect(resolveFromAddress(PLATFORM, '   ')).toBe(PLATFORM)
  })

  it('compares domains case-insensitively and ignores surrounding space', () => {
    expect(resolveFromAddress(PLATFORM, '  Sri@ClearCaseIQ.com ')).toBe('sri@clearcaseiq.com')
    expect(resolveFromAddress('No-Reply@ClearCaseIQ.com', 'sri@clearcaseiq.com')).toBe(
      'sri@clearcaseiq.com',
    )
  })

  it('reads the domain out of a configured address in display-name form', () => {
    const configured = '"ClearCaseIQ" <no-reply@clearcaseiq.com>'
    expect(resolveFromAddress(configured, 'sri@clearcaseiq.com')).toBe('sri@clearcaseiq.com')
    expect(resolveFromAddress(configured, 'sri@gmail.com')).toBe(configured)
  })

  it('refuses a value that is not an address at all', () => {
    expect(resolveFromAddress(PLATFORM, 'sri reddy')).toBe(PLATFORM)
    expect(resolveFromAddress(PLATFORM, 'sri@')).toBe(PLATFORM)
  })
})
