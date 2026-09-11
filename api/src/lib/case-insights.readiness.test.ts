import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { computeCasePreparation, UNDOCUMENTED_READINESS_CEILING } from './case-insights'

const daysAgo = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

const COMPLETED_INTAKE = {
  incident: { date: daysAgo(40), narrative: 'Stopped at a light and rear-ended. Police attended.' },
  injuries: [{ description: 'Neck and lower back pain since the collision' }],
  treatment: [
    { date: daysAgo(38), type: 'urgent_care' },
    { date: daysAgo(20), type: 'physical_therapy' },
    { date: daysAgo(8), type: 'physical_therapy' },
  ],
  damages: { med_charges: 20000, wage_loss: 3200 },
  consents: { hipaa: true },
}

const givenAssessment = (facts: Record<string, any>, evidenceCategories: string[] = []) => {
  vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
    claimType: 'auto',
    facts: JSON.stringify(facts),
    evidenceFiles: evidenceCategories.map((category) => ({ category })),
    predictions: [],
  } as any)
}

const factor = (result: Awaited<ReturnType<typeof computeCasePreparation>>, key: string) =>
  result.readinessFactors.find((item) => item.key === key)

describe('readiness credits what the claimant reported', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.clearAllMocks()
    givenAssessment(COMPLETED_INTAKE)
  })

  it('scores a completed intake with nothing uploaded', async () => {
    // Answering the intake is the information the valuation runs on, so the file
    // is not empty. It used to score 0 here, because liability and treatment
    // were hard-zeroed whenever no file had been uploaded.
    const result = await computeCasePreparation('asm-1')

    expect(factor(result, 'medical_records')?.points).toBe(10)
    expect(factor(result, 'bills')?.points).toBe(8)
    expect(factor(result, 'hipaa')?.points).toBe(10)
    expect(factor(result, 'liability')?.points).toBe(10)
    expect(factor(result, 'treatment')?.points).toBe(8)
    // Documents only — the claimant cannot answer their way to a complete checklist.
    expect(factor(result, 'checklist')?.points).toBe(0)
    expect(result.readinessScore).toBe(46)
  })

  it('marks every earned factor as self-reported rather than documented', async () => {
    // 46% carried entirely by the claimant's account has to read differently to
    // 46% backed by records, or the attorney cannot tell what they are looking at.
    const result = await computeCasePreparation('asm-1')
    const earned = result.readinessFactors.filter((item) => item.points > 0 && item.key !== 'hipaa')

    expect(earned.length).toBeGreaterThan(0)
    expect(earned.every((item) => item.basis === 'self_reported')).toBe(true)
  })

  it('keeps an undocumented file below the attorney-review band', async () => {
    const result = await computeCasePreparation('asm-1')
    expect(result.readinessScore).toBeLessThanOrEqual(UNDOCUMENTED_READINESS_CEILING)
    expect(result.readinessScore).toBeLessThan(65)
  })

  it('scores an empty file at zero', async () => {
    givenAssessment({})
    const result = await computeCasePreparation('asm-1')

    expect(result.readinessScore).toBe(0)
    expect(result.readinessFactors.every((item) => item.basis === 'missing')).toBe(true)
  })

  it('promotes the reported factors to documented once the records arrive', async () => {
    givenAssessment(COMPLETED_INTAKE, ['medical_records', 'bills'])
    const result = await computeCasePreparation('asm-1')

    expect(factor(result, 'medical_records')).toMatchObject({ points: 28, basis: 'documented' })
    expect(factor(result, 'bills')).toMatchObject({ points: 22, basis: 'documented' })
    expect(factor(result, 'treatment')).toMatchObject({ points: 12, basis: 'documented' })
    expect(result.readinessScore).toBeGreaterThan(UNDOCUMENTED_READINESS_CEILING)
  })
})

/**
 * The same file is stored under different category names depending on how it
 * was uploaded. Photos fulfilled from a document request land as
 * `injury_photos`, and the score only looked for `photos` — so those cases kept
 * an "Injury/damage photos" item that no upload could ever clear, and never
 * earned the checklist points.
 */
describe('evidence categories fold onto their canonical bucket', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.clearAllMocks()
  })

  it('accepts the synonyms each upload path writes', async () => {
    givenAssessment(COMPLETED_INTAKE, ['medical_record', 'medical_bills', 'injury_photos', 'police'])
    const result = await computeCasePreparation('asm-1')

    expect(result.missingDocs).toEqual([])
    expect(factor(result, 'medical_records')).toMatchObject({ basis: 'documented' })
    expect(factor(result, 'bills')).toMatchObject({ basis: 'documented' })
    expect(factor(result, 'checklist')).toMatchObject({ points: 12 })
  })

  it('still reports a genuinely absent category', async () => {
    givenAssessment(COMPLETED_INTAKE, ['medical_records', 'bills'])
    const result = await computeCasePreparation('asm-1')

    expect(result.missingDocs.map((item) => item.key)).toContain('photos')
  })
})

/**
 * Strengths and weaknesses are only reported once a case has been scored, and
 * the test for that is whether a prediction exists — not whether that
 * prediction filled in a viability figure. Reading it off the value instead
 * emptied both lists for every case whose prediction had not, which is a whole
 * panel quietly going blank rather than an obviously wrong number.
 */
describe('a scored case reports its strengths and weaknesses', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.clearAllMocks()
  })

  const withPrediction = (prediction: Record<string, any>) => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      claimType: 'auto',
      facts: JSON.stringify(COMPLETED_INTAKE),
      evidenceFiles: [],
      predictions: [prediction],
    } as any)
  }

  it('reports them for a prediction carrying no viability', async () => {
    withPrediction({ id: 'pred-1' })
    const result = await computeCasePreparation('asm-1')

    expect(result.strengths).toContain('Documented medical expenses')
    expect(result.strengths).toContain('Injuries documented')
    expect(result.weaknesses.join(' ')).toMatch(/missing document/)
  })

  it('reports them for a prediction that does carry one', async () => {
    withPrediction({ id: 'pred-1', viability: JSON.stringify({ liability: 0.9 }) })
    const result = await computeCasePreparation('asm-1')

    expect(result.strengths).toContain('Strong liability evidence')
  })

  /** Nothing has assessed the case yet, so there is no judgement to report. */
  it('withholds them until the case has been scored', async () => {
    givenAssessment(COMPLETED_INTAKE)
    const result = await computeCasePreparation('asm-1')

    expect(result.strengths).toEqual([])
    expect(result.weaknesses).toEqual([])
  })
})
