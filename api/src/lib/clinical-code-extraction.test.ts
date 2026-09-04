import { describe, expect, it } from 'vitest'
import { extractClinicalCodes } from './evidence-processing'
import { analyzeClinicalCodes } from './clinical-codes'

describe('extractClinicalCodes', () => {
  it('takes a labelled CPT code', () => {
    expect(extractClinicalCodes('CPT 64483 transforaminal injection').cptCodes).toEqual(['64483'])
    expect(extractClinicalCodes('Procedure Code: 20610').cptCodes).toEqual(['20610'])
    expect(extractClinicalCodes('HCPCS 72148 MRI lumbar').cptCodes).toEqual(['72148'])
    expect(extractClinicalCodes('CPT-4 Code 22551').cptCodes).toEqual(['22551'])
  })

  it('takes a code printed at the head of a billing row', () => {
    const bill = ['Description                  Charge', '64483 LT   $1,450.00', '20610-RT 1 175.00'].join('\n')
    expect(extractClinicalCodes(bill).cptCodes).toEqual(expect.arrayContaining(['64483', '20610']))
  })

  // The regression this exists for. A five-digit number is also the shape of a
  // ZIP code, and the CPT range the engine reads as surgery covers most eastern
  // and midwestern ZIPs, so a letterhead address used to read as a performed
  // surgery and add 30 points of severity.
  it('does not take a ZIP code out of a letterhead', () => {
    const letterhead = 'Midwest Orthopaedic Associates\n201 E Huron St, Chicago, IL 60601\nPhone (312) 555-0142'
    expect(extractClinicalCodes(letterhead).cptCodes).toEqual([])
  })

  it('does not take account, invoice or claim numbers', () => {
    const text = 'Invoice 48221\nAccount Number: 30119\nClaim # 55220\nPatient ID 61045'
    expect(extractClinicalCodes(text).cptCodes).toEqual([])
  })

  it('leaves a letterhead ZIP unable to manufacture a surgery', () => {
    const letterhead = 'Chicago, IL 60601'
    const { cptCodes } = extractClinicalCodes(letterhead)
    expect(analyzeClinicalCodes([], cptCodes).hasSurgery).toBe(false)
  })

  it('still reports a surgery when the code is genuinely labelled', () => {
    const { cptCodes } = extractClinicalCodes('CPT 22551 anterior cervical discectomy and fusion')
    expect(analyzeClinicalCodes([], cptCodes).hasSurgery).toBe(true)
  })

  it('takes ICD codes that carry an extension or a label', () => {
    expect(extractClinicalCodes('Dx: S13.4XXA cervical sprain').icdCodes).toEqual(expect.arrayContaining(['S13.4XXA']))
    expect(extractClinicalCodes('ICD-10 M54.16 radiculopathy').icdCodes).toEqual(expect.arrayContaining(['M54.16']))
  })

  it('does not take a bare letter-digit token as a diagnosis', () => {
    // Form field labels and box numbers share the shape of an unextended code.
    expect(extractClinicalCodes('Section S12 of the intake form; box M54').icdCodes).toEqual([])
  })

  it('returns empty for text with no codes at all', () => {
    expect(extractClinicalCodes('The claimant reported neck pain after the collision.')).toEqual({
      icdCodes: [],
      cptCodes: [],
    })
  })
})
