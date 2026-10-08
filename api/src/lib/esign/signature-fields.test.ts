import { describe, expect, it } from 'vitest'
import { parseStoredFields, requiresCountersign, textTag, toAbsoluteFields, validatePlacedFields, type PlacedField } from './signature-fields'

const field = (over: Partial<PlacedField> = {}): PlacedField => ({
  id: 'f1',
  page: 0,
  x: 0.1,
  y: 0.8,
  width: 0.3,
  height: 0.05,
  type: 'signature',
  signer: 'client',
  required: true,
  ...over,
})

describe('textTag', () => {
  it('numbers signers from 1 the way Dropbox Sign reads them', () => {
    expect(textTag('signature', 'client')).toBe('[sig|req|signer1]')
    expect(textTag('date_signed', 'attorney')).toBe('[date|req|signer2]')
  })

  it('adds the label and id for fill-in fields', () => {
    expect(textTag('text', 'client', { label: 'Date of birth', id: 'dob' })).toBe('[text|req|signer1|Date of birth|dob]')
  })
})

describe('requiresCountersign', () => {
  it('is true only for retainers and fee agreements', () => {
    expect(requiresCountersign('retainer')).toBe(true)
    expect(requiresCountersign('fee_agreement')).toBe(true)
    expect(requiresCountersign('hipaa_authorization')).toBe(false)
    expect(requiresCountersign(null)).toBe(false)
  })
})

describe('validatePlacedFields', () => {
  it('accepts an empty layout', () => {
    expect(validatePlacedFields([], { pageCount: 1, documentType: 'retainer' })).toEqual({ fields: [] })
  })

  it('requires a client signature', () => {
    const result = validatePlacedFields([field({ type: 'date_signed' })], { pageCount: 1, documentType: null })
    expect(result).toHaveProperty('error')
  })

  it('requires an attorney signature on a retainer', () => {
    const result = validatePlacedFields([field()], { pageCount: 1, documentType: 'retainer' })
    expect(result).toHaveProperty('error')
    const ok = validatePlacedFields([field(), field({ id: 'f2', signer: 'attorney' })], {
      pageCount: 1,
      documentType: 'retainer',
    })
    expect(ok).not.toHaveProperty('error')
  })

  it('rejects attorney fields on documents the attorney does not countersign', () => {
    const result = validatePlacedFields([field(), field({ id: 'f2', signer: 'attorney' })], {
      pageCount: 1,
      documentType: 'hipaa_authorization',
    })
    expect(result).toHaveProperty('error')
  })

  it('rejects fields past the last page or off the page edge', () => {
    expect(validatePlacedFields([field({ page: 2 })], { pageCount: 2, documentType: null })).toHaveProperty('error')
    expect(validatePlacedFields([field({ x: 0.9, width: 0.3 })], { pageCount: 1, documentType: null })).toHaveProperty('error')
  })

  it('rejects duplicate ids', () => {
    expect(validatePlacedFields([field(), field()], { pageCount: 1, documentType: null })).toHaveProperty('error')
  })
})

describe('parseStoredFields', () => {
  it('returns nothing for empty or corrupt values', () => {
    expect(parseStoredFields(null)).toEqual([])
    expect(parseStoredFields('not json')).toEqual([])
    expect(parseStoredFields(JSON.stringify([{ id: 'x' }]))).toEqual([])
  })

  it('round-trips a saved layout', () => {
    expect(parseStoredFields(JSON.stringify([field()]))).toEqual([field()])
  })
})

describe('toAbsoluteFields', () => {
  const letter = { width: 612, height: 792 }

  it('converts fractions to points with 1-based pages and 0-based signers', () => {
    const [abs] = toAbsoluteFields([field({ signer: 'attorney' })], [letter])
    expect(abs).toMatchObject({ page: 1, signer: 1, x: 61, y: 634, width: 184, height: 40, required: true })
  })

  it('shifts pages past a cover page put in front', () => {
    const [abs] = toAbsoluteFields([field({ page: 0 })], [letter, letter], 1)
    expect(abs.page).toBe(2)
  })

  it('drops fields on pages the sent PDF does not have', () => {
    expect(toAbsoluteFields([field({ page: 3 })], [letter])).toEqual([])
  })
})
