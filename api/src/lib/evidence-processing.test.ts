import { describe, expect, it } from 'vitest'
import { buildStructuredMedicalEvents, shouldAutoProcessEvidence } from './evidence-processing'

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
