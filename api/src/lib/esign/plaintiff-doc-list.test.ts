import { describe, expect, it } from 'vitest'
import { plaintiffSignatureDocList } from './plaintiff-doc-list'

describe('plaintiffSignatureDocList', () => {
  it('drops the client-name suffix and joins two documents with "and"', () => {
    expect(plaintiffSignatureDocList(['HIPAA authorization — stest34', 'Retainer agreement — stest34'])).toBe(
      'HIPAA authorization and retainer agreement',
    )
  })

  it('keeps a single title as-is (minus the suffix)', () => {
    expect(plaintiffSignatureDocList(['Retainer agreement — Jane Doe'])).toBe('Retainer agreement')
  })

  it('lists three or more with commas, keeps acronyms, and de-duplicates', () => {
    expect(
      plaintiffSignatureDocList(['Retainer agreement — J', 'HIPAA authorization — J', 'Police report authorization', 'Retainer agreement']),
    ).toBe('Retainer agreement, HIPAA authorization, and police report authorization')
  })

  it('falls back when titles are empty', () => {
    expect(plaintiffSignatureDocList([null, ''])).toBe('documents')
  })
})
