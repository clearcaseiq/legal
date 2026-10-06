import { describe, expect, it } from 'vitest'
import { buildStructuredMedicalEvents, extractPatientName, shouldAutoProcessEvidence } from './evidence-processing'

describe('extractPatientName on insurance cards', () => {
  it('reads a name on the line after its label', () => {
    expect(extractPatientName('STATE FARM\nNAMED INSURED\nJOHN A DOE\n123 MAIN ST')).toBe('JOHN DOE')
    expect(extractPatientName('Policyholder\nDoe, Jane')).toBe('Jane Doe')
  })

  it('reads card labels on the same line', () => {
    expect(extractPatientName('Policyholder: Maria Lopez')).toBe('Maria Lopez')
    expect(extractPatientName('Driver(s): JOHN DOE, JANE DOE')).toBe('JOHN DOE')
  })

  it('does not take card headings as a name', () => {
    expect(extractPatientName('NAMED INSURED\nAUTO INSURANCE CARD')).toBeNull()
    expect(extractPatientName('Insured Vehicle\n2019 Honda Civic')).toBeNull()
  })

  it('still reads the existing same-line formats', () => {
    expect(extractPatientName('Patient Name: John A. Doe')).toBe('John Doe')
    expect(extractPatientName('Patient: Doe, John')).toBe('John Doe')
  })

  it('finds the name when OCR emits every label before any value', () => {
    const columnOrder = [
      'DEMO AUTO INSURANCE',
      'FICTIONAL INSURANCE CARD',
      'Insured:',
      'Policy number:',
      'Effective date:',
      'Expiration date:',
      'Vehicle:',
      'Bodily injury liability',
      'Mike Misfit',
      'TEST-MM-000456',
      'October 1, 2026',
      '2021 Honda Accord',
    ].join('\n')
    expect(extractPatientName(columnOrder)).toBe('Mike Misfit')
  })

  it('skips a watermark line between the label and the name', () => {
    expect(extractPatientName('Insured:\nSAMPLE - NOT VALID\nAlex Morgan\nPolicy number:\nTEST-AUTO-000123')).toBe(
      'Alex Morgan',
    )
  })
})

describe('evidence-processing', () => {
  it('builds structured medical events from extracted dates and billing data', () => {
    const events = buildStructuredMedicalEvents({
      category: 'medical_records',
      originalName: 'records.pdf',
      ocrText: 'Westside Medical Center\nDate of Service 01/18/2025. MRI showed cervical strain. Balance $1,250.00',
      dates: ['01/18/2025'],
      totalAmount: 1250,
    })

    expect(events).toEqual([
      expect.objectContaining({
        date: '2025-01-18',
        provider: 'Westside Medical Center',
        visitType: 'Imaging',
        amount: 1250,
        confidence: 'documented',
        source: 'ocr',
      }),
    ])
  })

  it('creates a needs-review placeholder when medical dates are not readable', () => {
    const events = buildStructuredMedicalEvents({
      category: 'bills',
      originalName: 'billing-statement.pdf',
      ocrText: '',
      dates: [],
      totalAmount: 400,
    })

    expect(events).toEqual([
      expect.objectContaining({
        date: null,
        visitType: 'Medical bill',
        amount: 400,
        confidence: 'needs_review',
        source: 'upload_metadata',
      }),
    ])
  })

  it('auto-processes medical/bills categories and extractable mime types', () => {
    expect(shouldAutoProcessEvidence('medical_records')).toBe(true)
    expect(shouldAutoProcessEvidence('bills')).toBe(true)
    expect(shouldAutoProcessEvidence('police_report', 'application/pdf')).toBe(true)
    expect(shouldAutoProcessEvidence('other', 'application/pdf')).toBe(true)
    expect(shouldAutoProcessEvidence('photos')).toBe(false)
    expect(shouldAutoProcessEvidence('photos', 'image/jpeg')).toBe(true)
  })
})
