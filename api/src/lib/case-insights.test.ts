import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))

import {
  buildMedicalChronology,
  buildPlaintiffMedicalReview,
  computeCasePreparation,
  getSettlementBenchmarks,
} from './case-insights'
import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'

describe('case-insights', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
  })

  it('buildMedicalChronology parses extracted medical dates stored as JSON strings', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      id: 'asm-case-insights-1',
      facts: JSON.stringify({
        incident: {
          date: '2025-01-10',
          timeline: [{ label: 'Collision', order: 1, approxDate: '2025-01-10' }],
        },
        treatment: [
          {
            provider: 'City Clinic',
            type: 'Initial evaluation',
            date: '2025-01-12',
            notes: 'ER follow-up',
          },
        ],
      }),
      evidenceFiles: [
        {
          id: 'file-1',
          category: 'medical_records',
          originalName: 'records.pdf',
          createdAt: new Date('2025-01-15T00:00:00Z'),
          aiSummary: null,
          extractedData: [
            {
              dates: JSON.stringify(['2025-01-15', '2025-01-20']),
              timeline: 'MRI and orthopedic follow-up',
              totalAmount: 4200,
            },
          ],
        },
      ],
    } as any)

    const chronology = await buildMedicalChronology('asm-case-insights-1')

    expect(chronology).toHaveLength(4)
    expect(chronology[0]).toMatchObject({
      source: 'incident',
      label: 'Collision',
      date: '2025-01-10',
    })
    expect(chronology[2]).toMatchObject({
      source: 'medical_record',
      label: 'records.pdf',
      date: '2025-01-15',
      amount: 4200,
    })
    expect(chronology[3]).toMatchObject({
      source: 'medical_record',
      date: '2025-01-20',
    })
  })

  it('computeCasePreparation flags missing documents and treatment gaps', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      id: 'asm-case-insights-2',
      claimType: 'auto',
      facts: JSON.stringify({
        consents: { hipaa: false },
        liability: { confidence: 4 },
        injuries: [{ bodyPart: 'neck' }],
        damages: { med_charges: 8000 },
        treatment: [
          { date: '2025-01-05' },
          { date: '2025-03-20' },
        ],
      }),
      evidenceFiles: [{ category: 'photos' }],
      predictions: [{ viability: JSON.stringify({ overall: 0.5 }) }],
    } as any)

    const preparation = await computeCasePreparation('asm-case-insights-2')

    expect(preparation.missingDocs.map((doc) => doc.key)).toEqual(
      expect.arrayContaining(['medical_records', 'bills', 'police_report', 'hipaa']),
    )
    expect(preparation.treatmentGaps).toEqual([
      { startDate: '2025-01-05', endDate: '2025-03-20', gapDays: 74 },
    ])
    expect(preparation.weaknesses).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/missing document/i),
        expect.stringMatching(/treatment gap/i),
        'Liability confidence is low',
      ]),
    )
  })

  it('getSettlementBenchmarks falls back to claim type records when venue match is empty', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      id: 'asm-case-insights-3',
      claimType: 'auto',
      venueState: 'CA',
      facts: JSON.stringify({
        damages: { med_charges: 15000 },
      }),
      predictions: [
        {
          explain: JSON.stringify({ injury_severity: '2' }),
          bands: JSON.stringify({ low: [25000, 40000] }),
        },
      ],
    } as any)

    vi.mocked(prisma.settlementRecord.findMany)
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce([
        { settlementAmount: 10000 },
        { settlementAmount: 20000 },
        { settlementAmount: 30000 },
        { settlementAmount: 50000 },
      ] as any)

    const benchmark = await getSettlementBenchmarks('asm-case-insights-3')

    expect(benchmark).toMatchObject({
      claimType: 'auto',
      venueState: 'CA',
      injurySeverity: 2,
      count: 4,
      p25: 20000,
      p50: 30000,
      p75: 50000,
      p90: 50000,
      yourCaseContext: {
        medCharges: 15000,
        predictedRange: [25000, 40000],
      },
    })
  })

  it('buildPlaintiffMedicalReview applies plaintiff edits and groups guidance gently', async () => {
    vi.mocked(prisma.assessment.findUnique)
      .mockResolvedValueOnce({
        id: 'asm-case-insights-4',
        facts: JSON.stringify({
          incident: {
            date: '2025-01-10',
            timeline: [{ label: 'Collision', order: 1, approxDate: '2025-01-10' }],
          },
          treatment: [
            {
              provider: 'City Clinic',
              type: 'Initial evaluation',
              date: '2025-01-12',
            },
            {
              provider: 'PT Center',
              type: 'Physical therapy',
              date: '2025-03-20',
            },
          ],
          consents: { hipaa: true },
          plaintiffMedicalReview: {
            status: 'pending',
            edits: [
              {
                eventId: 'treatment-0',
                correctedProvider: 'City Medical Clinic',
                plaintiffNote: 'This was my first follow-up visit.',
              },
            ],
          },
        }),
      } as any)
      .mockResolvedValueOnce({
        id: 'asm-case-insights-4',
        facts: JSON.stringify({
          incident: {
            date: '2025-01-10',
            timeline: [{ label: 'Collision', order: 1, approxDate: '2025-01-10' }],
          },
          treatment: [
            {
              provider: 'City Clinic',
              type: 'Initial evaluation',
              date: '2025-01-12',
            },
            {
              provider: 'PT Center',
              type: 'Physical therapy',
              date: '2025-03-20',
            },
          ],
          consents: { hipaa: true },
          plaintiffMedicalReview: {
            status: 'pending',
            edits: [
              {
                eventId: 'treatment-0',
                correctedProvider: 'City Medical Clinic',
                plaintiffNote: 'This was my first follow-up visit.',
              },
            ],
          },
        }),
        evidenceFiles: [],
      } as any)
      .mockResolvedValueOnce({
        id: 'asm-case-insights-4',
        facts: JSON.stringify({
          incident: {
            date: '2025-01-10',
            timeline: [{ label: 'Collision', order: 1, approxDate: '2025-01-10' }],
          },
          treatment: [
            {
              provider: 'City Clinic',
              type: 'Initial evaluation',
              date: '2025-01-12',
            },
            {
              provider: 'PT Center',
              type: 'Physical therapy',
              date: '2025-03-20',
            },
          ],
          consents: { hipaa: true },
          plaintiffMedicalReview: {
            status: 'pending',
            edits: [
              {
                eventId: 'treatment-0',
                correctedProvider: 'City Medical Clinic',
                plaintiffNote: 'This was my first follow-up visit.',
              },
            ],
          },
        }),
        evidenceFiles: [
          { category: 'medical_records' },
        ],
        claimType: 'auto',
        predictions: [],
      } as any)

    const review = await buildPlaintiffMedicalReview('asm-case-insights-4')

    expect(review.review.status).toBe('pending')
    expect(review.chronology).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'treatment-0',
          provider: 'City Medical Clinic',
          plaintiffNote: 'This was my first follow-up visit.',
        }),
      ]),
    )
    expect(review.missingItems.important).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'bills' }),
        expect.objectContaining({ key: 'police_report' }),
        expect.objectContaining({
          key: expect.stringMatching(/^treatment_gap_/),
        }),
      ]),
    )
    expect(review.missingItems.helpful).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'photos',
        }),
      ]),
    )
  })
})
