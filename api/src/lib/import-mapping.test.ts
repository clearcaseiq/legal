/**
 * Reading a CMS export row.
 *
 * The header spellings below are the ones real Clio, Filevine, Needles and
 * Litify exports use, so these double as the record of what we claim to
 * support. The assertions split into two kinds: a column we can read lands in
 * the right canonical field, and a column we cannot read leaves the field
 * absent rather than defaulted.
 */
import { describe, expect, it } from 'vitest'

import {
  importableFactPaths,
  normalizeImportedCase,
  parseImportedMoney,
  splitDiagnoses,
} from './import-mapping'

/** The minimum a row needs to be importable at all. */
function row(extra: Record<string, string> = {}) {
  return {
    'Client Name': 'Dana Reyes',
    'Date of Loss': '2026-03-04',
    ...extra,
  }
}

function facts(extra: Record<string, string> = {}) {
  return normalizeImportedCase('spreadsheet', row(extra)).factPaths
}

describe('identity and venue', () => {
  it('splits a single client-name column into first and last', () => {
    const result = normalizeImportedCase('spreadsheet', row())
    expect(result.plaintiffFirstName).toBe('Dana')
    expect(result.plaintiffLastName).toBe('Reyes')
  })

  it('prefers explicit first/last columns over splitting the full name', () => {
    const result = normalizeImportedCase('spreadsheet', row({
      'First Name': 'Danielle',
      'Last Name': 'Reyes-Alvarez',
    }))
    expect(result.plaintiffFirstName).toBe('Danielle')
    expect(result.plaintiffLastName).toBe('Reyes-Alvarez')
  })

  it('matches headers regardless of case, spacing and punctuation', () => {
    const result = normalizeImportedCase('spreadsheet', {
      client_name: 'Dana Reyes',
      'DATE OF LOSS': '2026-03-04',
    })
    expect(result.plaintiffFirstName).toBe('Dana')
    expect(result.incidentDate).toBe('2026-03-04')
  })

  it('reads each source\u2019s own id column', () => {
    expect(normalizeImportedCase('clio', row({ 'Matter Number': '00123' })).externalId).toBe('00123')
    expect(normalizeImportedCase('filevine', row({ 'Project ID': '9001' })).externalId).toBe('9001')
    expect(normalizeImportedCase('needles', row({ 'Case Number': 'N-77' })).externalId).toBe('N-77')
    expect(normalizeImportedCase('litify', row({ 'Litify ID': 'L-5' })).externalId).toBe('L-5')
  })

  it('leaves the external id null when the export has none', () => {
    // Null rather than a generated key: an invented id would defeat the
    // dedupe index and duplicate the caseload on the next upload.
    expect(normalizeImportedCase('spreadsheet', row()).externalId).toBeNull()
  })

  it('honours an attorney-supplied mapping over auto-detection', () => {
    const result = normalizeImportedCase(
      'spreadsheet',
      row({ 'Our Internal Ref': 'X-9', 'Case ID': 'wrong' }),
      { externalId: 'Our Internal Ref' },
    )
    expect(result.externalId).toBe('X-9')
  })
})

describe('damages, which is what makes an imported case valuable', () => {
  it('reads medical specials under any of the usual header names', () => {
    for (const header of ['Medical Specials', 'Total Meds', 'Medical Bills', 'Billed Charges']) {
      expect(facts({ [header]: '48250' })['damages.med_charges']).toBe('48250')
    }
  })

  it('keeps currency formatting out of the stored value path', () => {
    // applyFactPath parses the number itself, but the raw string must still
    // be recognisable as one; '$48,250.00' is.
    expect(facts({ 'Medical Specials': '$48,250.00' })['damages.med_charges']).toBe('$48,250.00')
  })

  it('reads wage loss, future medical and property damage', () => {
    const mapped = facts({
      'Lost Wages': '9500',
      'Future Medical': '20000',
      'Property Damage': '7400',
    })
    expect(mapped['damages.wage_loss']).toBe('9500')
    expect(mapped['damages.future_medical']).toBe('20000')
    expect(mapped['damages.estimated_property_damage']).toBe('7400')
  })

  it('omits a damages key entirely when the column is blank', () => {
    // Not zero: a blank cell means unknown, and a stored 0 would tell the
    // valuation the client incurred no medical bills.
    const mapped = facts({ 'Medical Specials': '' })
    expect(mapped).not.toHaveProperty('damages.med_charges')
  })

  it('still reads carrier, claim number, policy limit and defendant', () => {
    const mapped = facts({
      Carrier: 'State Farm',
      'Claim Number': 'CLM-1',
      'Policy Limit': '100000',
      Employer: 'Northgate Logistics',
      Defendant: 'A. Alvarez',
    })
    expect(mapped['insurance.defendant_carrier']).toBe('State Farm')
    expect(mapped['insurance.claim_number']).toBe('CLM-1')
    expect(mapped['insurance.defendant_coverage_limits']).toBe('100000')
    expect(mapped['caseAcceleration.wageLoss.employerName']).toBe('Northgate Logistics')
    expect(mapped['defendant.name']).toBe('A. Alvarez')
  })
})

describe('the medical checkbox', () => {
  const mapped = {
    'damages.med_charges': '48250',
    'damages.med_paid': '12000',
    'damages.future_medical': '20000',
    'damages.wage_loss': '9500',
    'insurance.defendant_carrier': 'State Farm',
  }

  it('writes everything when it is checked', () => {
    expect(importableFactPaths(mapped, true)).toEqual(mapped)
  })

  it('drops only the medical figures when it is not', () => {
    const result = importableFactPaths(mapped, false)
    expect(result).not.toHaveProperty('damages.med_charges')
    expect(result).not.toHaveProperty('damages.med_paid')
    expect(result).not.toHaveProperty('damages.future_medical')
    // Wage loss is an economic damage, not a medical record, so a checkbox
    // labelled "Medical specials" must not silently discard it.
    expect(result['damages.wage_loss']).toBe('9500')
    expect(result['insurance.defendant_carrier']).toBe('State Farm')
  })
})

describe('injuries, which set the severity tier', () => {
  it('splits a multi-injury cell on the separators exports actually use', () => {
    expect(splitDiagnoses('Cervical strain; L4-L5 herniation, concussion'))
      .toEqual(['Cervical strain', 'L4-L5 herniation', 'concussion'])
  })

  it('splits on a written "and" as well as punctuation', () => {
    expect(splitDiagnoses('Broken wrist and torn rotator cuff'))
      .toEqual(['Broken wrist', 'torn rotator cuff'])
  })

  it('returns an empty list for a blank cell rather than one empty string', () => {
    // A [''] would read as "one diagnosis, unnamed" and give the case
    // documentation credit it has not earned.
    expect(splitDiagnoses('   ')).toEqual([])
  })

  it('caps a runaway cell', () => {
    const many = Array.from({ length: 30 }, (_, i) => `injury ${i}`).join(', ')
    expect(splitDiagnoses(many)).toHaveLength(12)
  })

  it('reads the injury column into the normalized case', () => {
    const result = normalizeImportedCase('spreadsheet', row({ Injuries: 'Concussion, whiplash' }))
    expect(result.injuryDiagnoses).toEqual(['Concussion', 'whiplash'])
  })
})

describe('negotiation history', () => {
  it('records a prior demand and offer with their dates', () => {
    const result = normalizeImportedCase('spreadsheet', row({
      'Demand Amount': '$250,000',
      'Demand Date': '2026-06-01',
      'Last Offer': '$45,000',
      'Offer Date': '2026-07-15',
    }))

    expect(result.negotiation).toEqual([
      { eventType: 'demand', amount: 250000, eventDate: new Date('2026-06-01') },
      { eventType: 'offer', amount: 45000, eventDate: new Date('2026-07-15') },
    ])
  })

  it('keeps an offer that has an amount but no date', () => {
    const result = normalizeImportedCase('spreadsheet', row({ 'Last Offer': '45000' }))
    expect(result.negotiation).toEqual([
      { eventType: 'offer', amount: 45000, eventDate: null },
    ])
  })

  it('treats a zero offer as no offer', () => {
    // A "$0" in a last-offer column means the carrier has not offered.
    // Recording it would show a negotiation that never happened.
    expect(normalizeImportedCase('spreadsheet', row({ 'Last Offer': '$0' })).negotiation).toEqual([])
  })

  it('ignores a column that is not a number', () => {
    expect(normalizeImportedCase('spreadsheet', row({ 'Last Offer': 'pending' })).negotiation).toEqual([])
  })

  it('returns nothing when the export has no negotiation columns', () => {
    expect(normalizeImportedCase('spreadsheet', row()).negotiation).toEqual([])
  })
})

describe('parseImportedMoney', () => {
  it.each([
    ['48250', 48250],
    ['$48,250', 48250],
    ['$ 48,250.75', 48250.75],
  ])('reads %s as %s', (input, expected) => {
    expect(parseImportedMoney(input)).toBe(expected)
  })

  it.each(['', '  ', '0', '$0.00', 'n/a', '-500'])('reads %s as nothing', (input) => {
    expect(parseImportedMoney(input)).toBeNull()
  })
})

describe('incident date', () => {
  it.each(['Date of Loss', 'DOL', 'Incident Date', 'Accident Date'])('reads the %s column', (header) => {
    expect(normalizeImportedCase('spreadsheet', { 'Client Name': 'D R', [header]: '2026-03-04' }).incidentDate)
      .toBe('2026-03-04')
  })

  it('leaves the date undefined when it cannot be parsed', () => {
    // The import endpoint skips these rows. Guessing would fabricate an SOL
    // deadline, which is the one number nobody should invent.
    expect(normalizeImportedCase('spreadsheet', { 'Client Name': 'D R', 'Date of Loss': 'last spring' }).incidentDate)
      .toBeUndefined()
  })
})
