import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock, summaryMock, findingsMock, timelineMock } = vi.hoisted(() => ({
  prismaMock: {
    evidenceFile: { findMany: vi.fn(), count: vi.fn() },
    damageItem: { findMany: vi.fn() },
  },
  summaryMock: vi.fn(),
  findingsMock: vi.fn(),
  timelineMock: vi.fn(),
}))
vi.mock('./prisma', () => ({ prisma: prismaMock }))
vi.mock('./case-insights', () => ({ buildMedicalChronologySummary: summaryMock }))
vi.mock('./document-findings', () => ({ listDocumentFindings: findingsMock }))
vi.mock('./medical-record', () => ({ getMedicalTimeline: timelineMock }))

import { buildMedicalOverview } from './medical-overview'

const event = (date: string, provider: string) => ({ id: date + provider, date, provider, label: 'Visit', source: 'medical_record' })

describe('buildMedicalOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.evidenceFile.count.mockResolvedValue(2)
    prismaMock.damageItem.findMany.mockResolvedValue([])
    prismaMock.evidenceFile.findMany.mockResolvedValue([
      { id: 'f1', originalName: '02_Medical_Bills.pdf', category: 'bills', ocrText: 'SYNTHETIC TEST DATA - NOT A REAL RECORD' },
      { id: 'f2', originalName: 'mri.pdf', category: 'medical_records', ocrText: 'Bay Area Imaging. MRI cervical spine.' },
    ])
    summaryMock.mockResolvedValue({
      providers: ['Harborview Demo Urgent Care', 'Cedar Demo Clinic'],
      billedTotal: 6280,
      timeline: [event('2026-10-12', 'Harborview Demo Urgent Care'), event('2026-10-14', 'Cedar Demo Clinic'), event('2026-12-01', 'Cedar Demo Clinic')],
    })
    timelineMock.mockResolvedValue({ entries: [] })
    findingsMock.mockResolvedValue([
      { kind: 'treatment_visit', status: 'proposed', data: { provider: 'Harborview Demo Urgent Care' } },
      { kind: 'treatment_visit', status: 'rejected', data: {} },
      { kind: 'medical_charge', status: 'proposed', data: { amount: 1850 } },
    ])
  })

  it('separates what was found from what is confirmed, and names what to resolve', async () => {
    const o = await buildMedicalOverview('a1')
    expect(o.visits).toEqual({ found: 3, pending: 1, confirmed: 0 })
    expect(o.charges).toEqual({ found: 6280, pendingCount: 1, confirmed: 0 })
    expect(o.providers.unconfirmed).toEqual(['Harborview Demo Urgent Care', 'Cedar Demo Clinic'])
    expect(o.testDocuments).toEqual([expect.objectContaining({ fileId: 'f1', markers: expect.arrayContaining(['synthetic test data']) })])
    expect(o.largestGapDays).toBe(48)
    expect(o.gaps.map((g) => g.key)).toEqual(
      expect.arrayContaining(['test_documents', 'pending_visits', 'pending_charges', 'providers_unverified', 'treatment_gap']),
    )
    expect(o.readiness).toMatchObject({ treatmentReconciled: 'needs_review', demandReady: 'needs_review' })
  })

  it('is ready for a demand once visits and charges are confirmed and nothing is open', async () => {
    prismaMock.evidenceFile.findMany.mockResolvedValue([])
    summaryMock.mockResolvedValue({ providers: ['Cedar Clinic'], billedTotal: 900, timeline: [event('2026-10-14', 'Cedar Clinic')] })
    timelineMock.mockResolvedValue({
      entries: [{ provider: 'Cedar Clinic', startDate: '2026-10-14T00:00:00.000Z', isFuture: false, diagnosis: 'Neck strain', diagnosisCodes: [] }],
    })
    findingsMock.mockResolvedValue([{ kind: 'treatment_visit', status: 'accepted', data: { provider: 'Cedar Clinic' } }])
    prismaMock.damageItem.findMany.mockResolvedValue([{ amount: 900 }])
    const o = await buildMedicalOverview('a1')
    expect(o.gaps).toEqual([])
    expect(o.readiness).toEqual({ evidenceExtracted: 'ready', treatmentReconciled: 'ready', providersVerified: 'ready', demandReady: 'ready' })
  })
})
