import { describe, expect, it } from 'vitest'
import {
  buildAttorneyDedupeHash,
  extractFirmDomain,
  normalizeBarNumber,
  normalizeFirmName,
  normalizePersonName,
} from './attorney-identity'

describe('normalizeBarNumber', () => {
  it('reduces the ways a bar number is written to one key', () => {
    const expected = '123456'
    for (const input of ['123456', '#123456', 'SBN 123456', 'Bar No. 123456', ' 123456 ', '0123456']) {
      expect(normalizeBarNumber(input)).toBe(expected)
    }
  })

  it('rejects values that are not plausible bar numbers', () => {
    // Junk must not become a unique key that blocks the real attorney.
    expect(normalizeBarNumber(null)).toBeNull()
    expect(normalizeBarNumber('')).toBeNull()
    expect(normalizeBarNumber('N/A')).toBeNull()
    expect(normalizeBarNumber('pending')).toBeNull()
    expect(normalizeBarNumber('7')).toBeNull()
    expect(normalizeBarNumber('12345678')).toBeNull()
  })
})

describe('extractFirmDomain', () => {
  it('collapses URL and email spellings of the same firm', () => {
    const expected = 'smithlaw.com'
    for (const input of [
      'smithlaw.com',
      'www.smithlaw.com',
      'https://www.smithlaw.com',
      'https://smithlaw.com/contact-us?ref=x',
      'HTTPS://WWW.SmithLaw.com/',
      'intake@smithlaw.com',
      'mailto:intake@smithlaw.com',
      'smithlaw.com:443',
    ]) {
      expect(extractFirmDomain(input)).toBe(expected)
    }
  })

  it('keeps multi-part public suffixes intact', () => {
    expect(extractFirmDomain('https://www.smithlaw.co.uk')).toBe('smithlaw.co.uk')
  })

  it('refuses free mailbox providers so unrelated solos do not merge', () => {
    expect(extractFirmDomain('jane@gmail.com')).toBeNull()
    expect(extractFirmDomain('bob@yahoo.com')).toBeNull()
    expect(extractFirmDomain('sue@sbcglobal.net')).toBeNull()
  })

  it('returns null for values that are not domains', () => {
    expect(extractFirmDomain(null)).toBeNull()
    expect(extractFirmDomain('')).toBeNull()
    expect(extractFirmDomain('n/a')).toBeNull()
    expect(extractFirmDomain('localhost')).toBeNull()
  })
})

describe('normalizePersonName', () => {
  it('drops suffixes, honorifics, punctuation and diacritics', () => {
    expect(normalizePersonName('John A. Smith, Jr., Esq.')).toBe('john a smith')
    expect(normalizePersonName('Dr. José Peña')).toBe('jose pena')
    expect(normalizePersonName('  MARY   O\'BRIEN  ')).toBe('mary o brien')
  })

  it('returns an empty string for nothing usable', () => {
    expect(normalizePersonName(null)).toBe('')
    expect(normalizePersonName('Esq.')).toBe('')
  })
})

describe('normalizeFirmName', () => {
  it('treats entity-suffix and boilerplate variants as the same firm', () => {
    const expected = 'smith and jones'
    for (const input of [
      'Smith & Jones',
      'Smith and Jones, LLP',
      'The Law Offices of Smith & Jones',
      'SMITH & JONES, A Professional Corporation',
      'Smith & Jones, APC',
      'Law Firm of Smith and Jones, Inc.',
    ]) {
      expect(normalizeFirmName(input)).toBe(expected)
    }
  })

  it('keeps distinct firms distinct', () => {
    expect(normalizeFirmName('Smith & Jones')).not.toBe(normalizeFirmName('Smith & Jonas'))
  })
})

describe('buildAttorneyDedupeHash', () => {
  it('is stable on bar number regardless of how the rest of the row is formatted', () => {
    const a = buildAttorneyDedupeHash({
      barNumber: 'SBN 123456',
      name: 'John A. Smith Jr.',
      city: 'Los Angeles',
      state: 'CA',
    })
    const b = buildAttorneyDedupeHash({
      barNumber: '123456',
      name: 'Smith, John',
      city: 'LOS ANGELES',
      state: 'ca',
    })
    expect(a).toBe(b)
  })

  it('separates different attorneys who share a name and city', () => {
    const a = buildAttorneyDedupeHash({ barNumber: '111111', name: 'David Kim', city: 'Irvine' })
    const b = buildAttorneyDedupeHash({ barNumber: '222222', name: 'David Kim', city: 'Irvine' })
    expect(a).not.toBe(b)
  })

  it('falls back to profile URL, then to name and location', () => {
    const byUrl = buildAttorneyDedupeHash({ profileUrl: 'https://example.com/a/1', name: 'A B' })
    expect(byUrl).toBe(buildAttorneyDedupeHash({ profileUrl: 'https://example.com/a/1', name: 'Z' }))

    const byName = buildAttorneyDedupeHash({ name: 'John A. Smith, Esq.', city: 'Fresno', state: 'CA' })
    expect(byName).toBe(buildAttorneyDedupeHash({ name: 'john a smith', city: 'fresno', state: 'ca' }))
    expect(byName).not.toBe(byUrl)
  })
})
