import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import {
  buildPredictionRecord,
  ensureAssessmentPrediction,
  ensurePredictionsForAssessments,
  MATERIALIZED_PREDICTION_SOURCE,
} from './prediction-materializer'
import { underwriteCase } from './underwriting-engine'

const FACTS = {
  incident: { date: '2026-01-15', narrative: 'Rear-ended at a stoplight.' },
  injuries: [{ type: 'neck', description: 'disc herniation' }],
  treatment: [{ date: '2026-01-16', provider: 'ER', status: 'discharged' }],
  damages: { med_charges: 24_000, lostWages: 4_000 },
}

function assessmentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'asm-1',
    claimType: 'auto',
    venueState: 'CA',
    venueCounty: 'Los Angeles',
    facts: JSON.stringify(FACTS),
    evidenceFiles: [{ category: 'medical_records', originalName: 'records.pdf', aiClassification: null }],
    ...overrides,
  }
}

describe('buildPredictionRecord', () => {
  it('produces bands that match the underwriting engine', () => {
    const record = buildPredictionRecord(assessmentRow() as any)
    const underwriting = underwriteCase({
      id: 'asm-1',
      claimType: 'auto',
      venueState: 'CA',
      venueCounty: 'Los Angeles',
      facts: FACTS,
      evidenceFiles: [{ category: 'medical_records', originalName: 'records.pdf', aiClassification: null }],
    })

    expect(record).not.toBeNull()
    const bands = JSON.parse(record!.bands)
    expect(bands.median).toBe(underwriting.settlement.expected)
    expect(bands.p25).toBe(underwriting.settlement.low)
    expect(bands.p75).toBe(underwriting.settlement.high)
  })

  it('stores viability as 0-1 fractions, the shape every reader expects', () => {
    const viability = JSON.parse(buildPredictionRecord(assessmentRow() as any)!.viability)

    for (const key of ['overall', 'liability', 'damages', 'attorneyAcceptance']) {
      expect(viability[key]).toBeGreaterThanOrEqual(0)
      expect(viability[key]).toBeLessThanOrEqual(1)
    }
  })

  it('marks the row as materialized so it is distinguishable from a real prediction', () => {
    const explain = JSON.parse(buildPredictionRecord(assessmentRow() as any)!.explain)

    expect(explain.source).toBe(MATERIALIZED_PREDICTION_SOURCE)
    expect(explain.underwriting).toBeTruthy()
  })

  it('accepts facts that are already an object rather than a JSON string', () => {
    const record = buildPredictionRecord(assessmentRow({ facts: FACTS }) as any)

    expect(JSON.parse(record!.bands).median).toBeGreaterThan(0)
  })
})

describe('ensureAssessmentPrediction', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.clearAllMocks()
  })

  it('writes a valuation when the case has none', async () => {
    vi.mocked(prisma.prediction.count).mockResolvedValue(0 as any)
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(assessmentRow() as any)

    const created = await ensureAssessmentPrediction('asm-1')

    expect(created).toBe(true)
    expect(prisma.prediction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ assessmentId: 'asm-1' }) }),
    )
  })

  // Never replace a real prediction with a recomputed one.
  it('leaves an existing valuation alone', async () => {
    vi.mocked(prisma.prediction.count).mockResolvedValue(1 as any)

    const created = await ensureAssessmentPrediction('asm-1')

    expect(created).toBe(false)
    expect(prisma.prediction.create).not.toHaveBeenCalled()
  })

  // Two concurrent page loads must not both write.
  it('re-checks inside the transaction before writing', async () => {
    vi.mocked(prisma.prediction.count)
      .mockResolvedValueOnce(0 as any)
      .mockResolvedValueOnce(1 as any)
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(assessmentRow() as any)

    const created = await ensureAssessmentPrediction('asm-1')

    expect(created).toBe(false)
    expect(prisma.prediction.create).not.toHaveBeenCalled()
  })

  it('does nothing for an assessment that does not exist', async () => {
    vi.mocked(prisma.prediction.count).mockResolvedValue(0 as any)
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(null as any)

    expect(await ensureAssessmentPrediction('asm-missing')).toBe(false)
    expect(prisma.prediction.create).not.toHaveBeenCalled()
  })

  // This sits on a read path, so a failure here must not take a page down.
  it('swallows database failures rather than breaking the caller', async () => {
    vi.mocked(prisma.prediction.count).mockRejectedValue(new Error('connection reset') as any)

    await expect(ensureAssessmentPrediction('asm-1')).resolves.toBe(false)
  })

  it('ignores an empty assessment id', async () => {
    expect(await ensureAssessmentPrediction('')).toBe(false)
    expect(prisma.prediction.count).not.toHaveBeenCalled()
  })
})

describe('ensurePredictionsForAssessments', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.clearAllMocks()
  })

  it('only values the cases that are missing one', async () => {
    vi.mocked(prisma.prediction.findMany).mockResolvedValue([{ assessmentId: 'asm-1' }] as any)
    vi.mocked(prisma.prediction.count).mockResolvedValue(0 as any)
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(assessmentRow({ id: 'asm-2' }) as any)

    const created = await ensurePredictionsForAssessments(['asm-1', 'asm-2'])

    expect(created).toBe(1)
    expect(prisma.assessment.findUnique).toHaveBeenCalledTimes(1)
  })

  // A firm opening a large dashboard for the first time should not pay for the
  // whole book on one request.
  it('caps how many it repairs in a single pass', async () => {
    vi.mocked(prisma.prediction.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.prediction.count).mockResolvedValue(0 as any)
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(assessmentRow() as any)

    const ids = Array.from({ length: 40 }, (_, i) => `asm-${i}`)
    const created = await ensurePredictionsForAssessments(ids, { limit: 5 })

    expect(created).toBe(5)
  })

  it('does no work when every case is already valued', async () => {
    vi.mocked(prisma.prediction.findMany).mockResolvedValue([
      { assessmentId: 'asm-1' },
      { assessmentId: 'asm-2' },
    ] as any)

    expect(await ensurePredictionsForAssessments(['asm-1', 'asm-2'])).toBe(0)
    expect(prisma.assessment.findUnique).not.toHaveBeenCalled()
  })

  it('returns zero for an empty list without querying', async () => {
    expect(await ensurePredictionsForAssessments([])).toBe(0)
    expect(prisma.prediction.findMany).not.toHaveBeenCalled()
  })
})
