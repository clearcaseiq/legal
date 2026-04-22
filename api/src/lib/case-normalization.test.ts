import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))

import { normalizeCaseForRouting } from './case-normalization'
import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'

describe('normalizeCaseForRouting', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.mocked(prisma.evidenceFile.count).mockResolvedValue(0)
    vi.mocked(prisma.evidenceFile.findMany).mockResolvedValue([] as any)
  })

  it('maps assessment + facts to NormalizedCase', async () => {
    const assessment = {
      id: 'norm-1',
      claimType: 'auto',
      venueState: 'CA',
      venueCounty: 'Orange',
      facts: JSON.stringify({
        venue: { state: 'CA', county: 'Orange', city: 'Irvine' },
        incident: { date: '2025-06-01', narrative: 'Rear-end collision with ongoing treatment and medical care.' },
        injuries: [{ severity: 2 }],
        treatment: [{ status: 'ongoing', type: 'PT', date: '2025-07-01' }],
        damages: { med_charges: 5000, wage_loss: 2000 },
        consents: { tos: true, privacy: true, hipaa: true },
        plaintiffContext: { email: 'p@test.com', phone: '555' },
      }),
      predictions: [
        {
          viability: JSON.stringify({
            overall: 0.72,
            liability: 0.7,
            causation: 0.65,
            damages: 0.75,
          }),
          bands: JSON.stringify({ p25: 15000, median: 35000, p75: 65000 }),
        },
      ],
    }

    const n = await normalizeCaseForRouting(assessment as any)

    expect(n.case_id).toBe('norm-1')
    expect(n.claim_type).toBe('auto')
    expect(n.jurisdiction_state).toBe('CA')
    expect(n.jurisdiction_county).toBe('Orange')
    expect(n.injury_severity).toBe(2)
    expect(n.treatment_status).toBe('ongoing')
    expect(n.narrative_present).toBe(true)
    expect(n.plaintiff_contact_complete).toBe(true)
    expect(n.required_disclosures_accepted).toBe(true)
    expect(n.medical_record_present).toBe(false)
    expect(n.estimated_case_value_low).toBeDefined()
    expect(n.statute_of_limitations_status).toBe('ok')
  })

  it('handles invalid facts JSON gracefully', async () => {
    const assessment = {
      id: 'norm-2',
      claimType: 'slip_and_fall',
      venueState: 'TX',
      venueCounty: null,
      facts: 'not-json',
      predictions: [],
    }

    const n = await normalizeCaseForRouting(assessment as any)
    expect(n.case_id).toBe('norm-2')
    expect(n.jurisdiction_state).toBe('TX')
  })

  it('marks medical evidence when evidence files include medical_records', async () => {
    vi.mocked(prisma.evidenceFile.findMany).mockResolvedValue([{ category: 'medical_records' }] as any)

    const assessment = {
      id: 'norm-3',
      claimType: 'auto',
      venueState: 'FL',
      venueCounty: null,
      facts: JSON.stringify({
        consents: { tos: true, privacy: true, hipaa: true },
        incident: { narrative: 'Long narrative about slip and injury on premises for testing.' },
      }),
      predictions: [],
    }

    const n = await normalizeCaseForRouting(assessment as any)
    expect(n.medical_record_present).toBe(true)
  })

  it('flags expired cases via SOL derivation', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))

    const assessment = {
      id: 'norm-4',
      claimType: 'auto',
      venueState: 'CA',
      venueCounty: null,
      facts: JSON.stringify({
        incident: { date: '2020-01-01', narrative: 'Old collision with no filing yet.' },
        consents: { tos: true, privacy: true, hipaa: true },
      }),
      predictions: [],
    }

    const n = await normalizeCaseForRouting(assessment as any)
    expect(n.statute_of_limitations_status).toBe('expired')

    vi.useRealTimers()
  })
})
