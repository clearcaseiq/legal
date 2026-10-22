import { describe, expect, it } from 'vitest'
import {
  careDates,
  cleanProviderName,
  detectSyntheticMarkers,
  extractLineItems,
  extractProviderName,
  stripBoilerplate,
  summarizeClinicalText,
  visitsFromLineItems,
} from './medical-text-hygiene'

// Text exactly as production OCR stored it for a QA fixture: one line, banner first.
const SYNTHETIC_BILL =
  'FICTIONAL CLEARCASEIQ QA MATERIAL - NOT AUTHENTIC EVIDENCE Page 1 SIMULATED ITEMIZED MEDICAL BILLS SYNTHETIC TEST DATA - NOT A REAL RECORD - NOT FOR INSURANCE OR LEGAL SUBMISSION Client: Morgan Ellis | Case: CCIQ-DEMO-2026-0042 | Incident: October 12, 2026 Billing summary Provider (fictional) Date CPT Charge Harborview Demo Urgent Care 2026-10-12 99284 $1,850.00 Harborview Demo Imaging 2026-10-12 72040 $480.00 Cedar Demo Clinic 2026-10-14 99213 $310.00 Westside Demo Physical Therapy 2026-10-19 97161 $425.00 Westside Demo Physical Therapy 2026-10-19 97110 $185.00 Westside Demo Physical Therapy 2026-10-20 97110 $185.00 Westside Demo Physical Therapy 2026-10-20 97140 $225.00 Cedar Demo Clinic 2026-10-20 99214 $620.00 Harborview Demo Lab 2026-10-12 80053 $2,000.00 Reconciliation Total billed: $6,280.00. Simulated payments: $1,500.00. Simulated adjustments: $600.00. Simulated balance: $4,180.00. The listed CPT codes and services are fictitious test inputs and not evidence of actual care. -- 1 of 1 --'

const SYNTHETIC_PRIOR =
  'FICTIONAL CLEARCASEIQ QA MATERIAL - NOT AUTHENTIC EVIDENCE Page 1 SIMULATED PRIOR TREATMENT HISTORY SYNTHETIC TEST DATA - NOT A REAL RECORD - NOT FOR INSURANCE OR LEGAL SUBMISSION Client: Morgan Ellis | Case: CCIQ-DEMO-2026-0042 | Incident: October 12, 2026 Patient-reported background Morgan Ellis reports occasional pre-incident neck stiffness after desk work in 2025, without a verified prior diagnosis. No prior medical chart is supplied. -- 1 of 1 --'

const REAL_NOTE = `Bay Area Orthopedics
123 Main St, Oakland CA 94612
Office visit 03/14/2026
Patient seen for neck pain following motor vehicle collision. Cervical strain diagnosed.
Printed: 04/01/2026`

describe('stripBoilerplate', () => {
  it('removes the banner and page furniture but keeps the bill rows', () => {
    const out = stripBoilerplate(SYNTHETIC_BILL)
    expect(out).not.toMatch(/FICTIONAL|SYNTHETIC TEST DATA|NOT A REAL RECORD|Page 1|1 of 1/)
    expect(out).toContain('Harborview Demo Urgent Care 2026-10-12 99284 $1,850.00')
  })
})

describe('detectSyntheticMarkers', () => {
  it('flags QA fixtures', () => {
    expect(detectSyntheticMarkers(SYNTHETIC_BILL)).toEqual(expect.arrayContaining(['synthetic test data', 'fictional']))
  })
  it('does not flag a genuine record', () => {
    expect(detectSyntheticMarkers(REAL_NOTE)).toEqual([])
    expect(detectSyntheticMarkers('Blood sample drawn. Demo of home exercises given.')).toEqual([])
  })
})

describe('providers', () => {
  it('never returns a banner as the provider', () => {
    expect(cleanProviderName('FICTIONAL CLEARCASEIQ QA MATERIAL - NOT AUTHENTIC EVIDENCE Page 1 SIMULATED')).toBeNull()
    expect(extractProviderName(SYNTHETIC_PRIOR)).toBeUndefined()
  })
  it('reads the facility from a real letterhead', () => {
    expect(extractProviderName(REAL_NOTE)).toBe('Bay Area Orthopedics')
  })
  it('strips table headers from the front of a name', () => {
    expect(cleanProviderName('Date CPT Charge Harborview Demo Urgent Care')).toBe('Harborview Demo Urgent Care')
  })
})

describe('careDates', () => {
  it('leaves out incident, DOB and printed dates', () => {
    expect(careDates(SYNTHETIC_PRIOR)).toEqual([])
    expect(careDates(REAL_NOTE)).toEqual(['2026-03-14'])
  })
  it('keeps a labelled date that is also a date of service', () => {
    expect(careDates(SYNTHETIC_BILL)).toContain('2026-10-12')
  })
})

describe('extractLineItems', () => {
  it('reads every service row of a single-line bill and nothing else', () => {
    const items = extractLineItems(SYNTHETIC_BILL)
    expect(items).toHaveLength(9)
    expect(items.reduce((s, i) => s + i.amount, 0)).toBe(6280)
    expect(items[0]).toMatchObject({ date: '2026-10-12', provider: 'Harborview Demo Urgent Care', code: '99284', amount: 1850 })
    expect(items.every((i) => SYNTHETIC_BILL.includes(i.quote))).toBe(true)
  })
  it('folds rows into one visit per provider per day', () => {
    const visits = visitsFromLineItems(extractLineItems(SYNTHETIC_BILL))
    expect(visits).toHaveLength(7)
    const pt = visits.find((v) => v.date === '2026-10-19')
    expect(pt).toMatchObject({ provider: 'Westside Demo Physical Therapy', kind: 'therapy', amount: 610 })
    expect(visits.find((v) => v.provider === 'Harborview Demo Urgent Care')?.kind).toBe('er')
  })
})

describe('summarizeClinicalText', () => {
  it('skips disclaimer sentences', () => {
    expect(summarizeClinicalText(SYNTHETIC_PRIOR)).not.toMatch(/FICTIONAL|SYNTHETIC/)
    expect(summarizeClinicalText(REAL_NOTE)).toMatch(/neck pain/)
  })
})
