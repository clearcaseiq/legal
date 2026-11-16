import { beforeEach, describe, expect, it, vi } from 'vitest'

const { predictViabilityMock } = vi.hoisted(() => ({
  predictViabilityMock: vi.fn(),
}))

vi.mock('./prisma', () => import('../test/universalPrismaMock'))
vi.mock('./prediction', async () => {
  const actual = await vi.importActual<any>('./prediction')
  return { ...actual, predictViability: predictViabilityMock }
})
vi.mock('./case-notifications', () => ({
  sendPlaintiffCaseValueUpdated: vi.fn().mockResolvedValue(false),
  sendAttorneyCaseMaterialUpdate: vi.fn().mockResolvedValue(0),
}))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { runCaseRecalculation } from './case-recalculation'

describe('recalculation prediction lineage', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.clearAllMocks()
    predictViabilityMock.mockResolvedValue({
      modelVersion: 'heuristic-v9',
      viability: { overall: 0.5, liability: 0.5, damages: 0.5, attorneyAcceptance: 0.5 },
      value_bands: { p25: 10_000, median: 20_000, p75: 30_000 },
      explainability: [],
    })
  })

  it('ties the stored prediction to the exact post-write revision, event, snapshot, and engine model', async () => {
    vi.mocked(prisma.assessment.findUnique)
      .mockResolvedValueOnce({
        id: 'asm-1',
        claimType: 'auto',
        venueState: 'CA',
        venueCounty: 'Los Angeles',
        facts: JSON.stringify({ incident: { narrative: 'Rear-end collision' } }),
        revision: 5,
        lawFirmId: 'firm-1',
        evidenceFiles: [],
        predictions: [],
        userId: null,
        user: null,
      } as any)
      .mockResolvedValueOnce({
        facts: JSON.stringify({ incident: { narrative: 'Rear-end collision' } }),
        revision: 5,
        lawFirmId: 'firm-1',
      } as any)
      .mockResolvedValueOnce({
        id: 'asm-1',
        claimType: 'auto',
        venueState: 'CA',
        venueCounty: 'Los Angeles',
        facts: JSON.stringify({ incident: { narrative: 'Rear-end collision' } }),
        revision: 6,
        liabilityRecord: null,
        evidenceFiles: [],
        insuranceDetails: [],
      } as any)
    vi.mocked(prisma.caseChangeEvent.create).mockResolvedValue({ id: 'event-6', seq: 6 } as any)
    vi.mocked(prisma.caseChangeEvent.findFirst).mockResolvedValue({ id: 'event-6' } as any)
    vi.mocked(prisma.prediction.create).mockImplementation(async (args: any) => ({
      id: 'pred-1',
      ...args.data,
    }))

    const result = await runCaseRecalculation('asm-1', 'case_fact_updated')

    expect(result?.predictionId).toBe('pred-1')
    const data = vi.mocked(prisma.prediction.create).mock.calls[0][0].data as any
    expect(data.assessmentRevision).toBe(6)
    expect(data.triggerEventId).toBe('event-6')
    expect(data.modelVersion).toMatch(/^ca-pi-underwriting-/)
    expect(data.inputHash).toMatch(/^[a-f0-9]{64}$/)
    const snapshot = JSON.parse(data.inputSnapshot)
    expect(snapshot.assessmentRevision).toBe(6)
    expect(snapshot.modelConfiguration.modelVersion).toBe(data.modelVersion)
    expect(snapshot.underwritingInput.facts.incident.narrative).toBe('Rear-end collision')
  })
})
