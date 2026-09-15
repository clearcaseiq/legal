/**
 * What may and may not be read off an uploaded licence.
 *
 * The dangerous failure is not missing a number — that just leaves the attorney
 * where they already were. It is reading the *wrong* number, which resolves to
 * a real licence belonging to somebody else and then reports as a name
 * mismatch, sending the attorney hunting for a typo they never made. So most of
 * these assert that nothing is returned.
 */
import { describe, expect, it } from 'vitest'
import { readLicenseDocument } from './license-document'

describe('readLicenseDocument', () => {
  it('reads a labelled bar number off a licence card', () => {
    expect(readLicenseDocument('State Bar of California\nBar Number: 271370').barNumber).toBe('271370')
  })

  it('reads the abbreviations used on California pleadings', () => {
    expect(readLicenseDocument('Adam D. Link, SBN 271370').barNumber).toBe('271370')
    expect(readLicenseDocument('Bar No. 271370').barNumber).toBe('271370')
    expect(readLicenseDocument('State Bar #271370').barNumber).toBe('271370')
    expect(readLicenseDocument('Licensee Number 271370').barNumber).toBe('271370')
  })

  it('reads through the line breaks OCR inserts', () => {
    expect(readLicenseDocument('Bar Number:\n271370\nAdmitted 2018').barNumber).toBe('271370')
  })

  it('strips leading zeros so the number matches the bar\'s own form', () => {
    expect(readLicenseDocument('Bar Number: 0271370').barNumber).toBe('271370')
  })

  it('detects California so the lookup knows which bar to ask', () => {
    expect(readLicenseDocument('THE STATE BAR OF CALIFORNIA\nBar No. 271370').state).toBe('CA')
  })

  it('does not claim California for a document that never says so', () => {
    expect(readLicenseDocument('New York State Unified Court System\nBar Number: 4412345').state).toBeNull()
  })

  it('ignores the other numbers a licence card is covered in', () => {
    const card = [
      'THE STATE BAR OF CALIFORNIA',
      'Admitted June 15, 2018',
      '180 Howard Street, San Francisco, CA 94105',
      'Telephone 888-800-3400',
      'Bar Number: 271370',
    ].join('\n')

    expect(readLicenseDocument(card).barNumber).toBe('271370')
  })

  it('returns nothing for a bare number with no label', () => {
    const reading = readLicenseDocument('Certificate 271370 issued to Adam D. Link')
    expect(reading.barNumber).toBeNull()
    expect(reading.reason).toBe('no_labelled_number')
  })

  it('refuses a document listing two different bar numbers', () => {
    const printout = 'Bar Number: 271370\nBar Number: 123456'
    const reading = readLicenseDocument(printout)
    expect(reading.barNumber).toBeNull()
    expect(reading.reason).toBe('ambiguous')
  })

  it('accepts the same number appearing more than once', () => {
    expect(readLicenseDocument('Bar No. 271370\nState Bar Number: 271370').barNumber).toBe('271370')
  })

  it('rejects a labelled run of digits too long to be a bar number', () => {
    const reading = readLicenseDocument('Bar Number: 4012888888881881')
    expect(reading.barNumber).toBeNull()
  })

  it('rejects a single digit, which no bar number is', () => {
    const reading = readLicenseDocument('Bar Number: 7')
    expect(reading.barNumber).toBeNull()
    expect(reading.reason).toBe('implausible')
  })

  it('says when OCR produced nothing, which is not the same as finding nothing', () => {
    expect(readLicenseDocument('').reason).toBe('no_text')
    expect(readLicenseDocument('   \n  ').reason).toBe('no_text')
    expect(readLicenseDocument(null).reason).toBe('no_text')
  })

  it('does not mistake a ZIP or phone number for a licence', () => {
    const reading = readLicenseDocument('San Francisco, CA 94105\nTelephone 888-800-3400')
    expect(reading.barNumber).toBeNull()
  })
})
