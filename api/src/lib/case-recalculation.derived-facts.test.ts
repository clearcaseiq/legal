import { describe, expect, it } from 'vitest'
import { mergeEvidenceIntoFacts } from './case-recalculation'

/**
 * Facts derived from uploads have to be reversible. Recalculation runs on every upload
 * and every deletion, so anything it derives must be re-derived from the files present
 * at that moment rather than accumulated. QA found the gap from the outside: a sweep
 * deleted every document from a case and the estimate came back higher than the case
 * had been worth before any document was ever attached.
 */
const medicalRecord = {
  id: 'file-records',
  originalName: 'er-records.pdf',
  category: 'medical_records',
  ocrText: 'Emergency department note. ICD-10: S13.4XXA cervical sprain.',
  extractedData: [{ icdCodes: '["S13.4XXA"]', dates: '["2026-01-04"]', totalAmount: 0 }],
}

describe('facts derived from uploads are reversible', () => {
  it('adds a diagnosis from an uploaded record', () => {
    const merged = mergeEvidenceIntoFacts({}, [medicalRecord]) as any

    expect(merged.treatment).toHaveLength(1)
    expect(merged.treatment[0]).toMatchObject({ diagnosis: 'S13.4XXA', provider: 'From uploaded records' })
  })

  it('takes the diagnosis back out when the record is deleted', () => {
    const afterUpload = mergeEvidenceIntoFacts({}, [medicalRecord])
    const afterDeletion = mergeEvidenceIntoFacts(afterUpload, []) as any

    expect(afterDeletion.treatment).toEqual([])
    expect(afterDeletion.clinical.icdCodes).toEqual([])
    expect(afterDeletion.evidence).toEqual([])
  })

  it('never accumulates duplicates when re-run against its own output', () => {
    const once = mergeEvidenceIntoFacts({}, [medicalRecord])
    const twice = mergeEvidenceIntoFacts(once, [medicalRecord])
    const thrice = mergeEvidenceIntoFacts(twice, [medicalRecord]) as any

    expect(thrice.treatment).toHaveLength(1)
  })

  it('leaves treatment the claimant reported themselves alone', () => {
    const selfReported = { treatment: [{ provider: 'Dr. Alvarez', treatment: 'Physical therapy' }] }
    const afterUpload = mergeEvidenceIntoFacts(selfReported, [medicalRecord])
    const afterDeletion = mergeEvidenceIntoFacts(afterUpload, []) as any

    expect(afterDeletion.treatment).toEqual([{ provider: 'Dr. Alvarez', treatment: 'Physical therapy' }])
  })

  it('returns a case to its starting point once every document is deleted', () => {
    // The row 6 scenario: upload, then delete everything, and land back where you began.
    const intake = { damages: { wage_loss: 1500, med_charges: 4000 }, treatment: [] }
    const wageDoc = {
      id: 'file-wage',
      originalName: 'wage-verification.pdf',
      category: 'wage_loss',
      ocrText: 'Employer letter. Total Lost Wages: $22,000.00.',
      extractedData: [{ totalAmount: 22000, dollarAmounts: '["22000"]' }],
    }

    const loaded = mergeEvidenceIntoFacts(intake, [medicalRecord, wageDoc]) as any
    expect(loaded.damages.wage_loss).toBe(22000)

    const emptied = mergeEvidenceIntoFacts(loaded, []) as any
    expect(emptied.damages.wage_loss).toBe(1500)
    expect(emptied.damages.med_charges).toBe(4000)
    expect(emptied.treatment).toEqual([])
  })
})
