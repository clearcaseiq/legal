import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))
vi.mock('./case-insights', () => ({
  buildMedicalChronology: vi.fn(),
  computeCasePreparation: vi.fn(),
}))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { answerCommandCenterCopilot, buildCaseAwareMessageTemplates, buildCaseCommandCenter } from './case-command-center'
import { buildMedicalChronology, computeCasePreparation } from './case-insights'

describe('buildCaseCommandCenter', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.clearAllMocks()
  })

  it('builds a document-request action when high-impact documents are missing', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      id: 'asm-1',
      claimType: 'auto',
      venueState: 'CA',
      venueCounty: 'Los Angeles',
      facts: JSON.stringify({
        liability: {
          fault: 'rear_end',
          evidence: ['rear-end collision', 'plaintiff statement'],
        },
      }),
      createdAt: new Date(),
      leadSubmission: {
        id: 'lead-1',
        status: 'contacted',
        lifecycleState: 'attorney_matched',
        viabilityScore: 0.7,
        liabilityScore: 0.76,
        causationScore: 0.7,
        damagesScore: 0.71,
      },
      predictions: [
        {
          viability: JSON.stringify({ liability: 0.76, damages: 0.74 }),
          bands: JSON.stringify({ p25: 25000, median: 42000, p75: 65000 }),
        },
      ],
    } as any)
    vi.mocked(computeCasePreparation).mockResolvedValue({
      missingDocs: [
        { key: 'medical_records', label: 'Medical records', priority: 'high' },
        { key: 'police_report', label: 'Police report', priority: 'high' },
      ],
      treatmentGaps: [],
      strengths: ['Strong liability evidence'],
      weaknesses: ['2 missing document(s)'],
      readinessScore: 54,
    })
    vi.mocked(buildMedicalChronology).mockResolvedValue([
      { id: 'evt-1', date: '2026-03-01', label: 'ER visit', source: 'treatment' },
    ] as any)
    vi.mocked(prisma.evidenceFile.findMany).mockResolvedValue([
      { category: 'photos', originalName: 'vehicle.jpg', createdAt: new Date() },
    ] as any)
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.insuranceDetail.findMany).mockResolvedValue([{ policyLimit: 100000 }] as any)
    vi.mocked(prisma.negotiationEvent.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.leadContact.findFirst).mockResolvedValue(null as any)

    const summary = await buildCaseCommandCenter({ assessmentId: 'asm-1', leadId: 'lead-1' })

    expect(summary.stage.key).toBe('file_strengthening')
    expect(summary.nextBestAction.actionType).toBe('request_documents')
    expect(summary.suggestedDocumentRequest).toMatchObject({
      requestedDocs: ['medical_records', 'police_report'],
    })
    expect(summary.treatmentMonitor.status.toLowerCase()).toContain('thin')
    expect(summary.missingItems[0]).toMatchObject({
      key: 'medical_records',
      priority: 'high',
    })
  })

  it('moves negotiation-active files into negotiation stage and answers copilot questions from summary', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      id: 'asm-2',
      claimType: 'auto',
      venueState: 'CA',
      venueCounty: 'Orange',
      facts: JSON.stringify({
        liability: {
          comparativeNegligence: true,
        },
      }),
      createdAt: new Date(),
      leadSubmission: {
        id: 'lead-2',
        status: 'retained',
        lifecycleState: 'retained',
        viabilityScore: 0.8,
        liabilityScore: 0.61,
        causationScore: 0.75,
        damagesScore: 0.83,
      },
      predictions: [
        {
          viability: JSON.stringify({ liability: 0.61, damages: 0.83 }),
          bands: JSON.stringify({ p25: 80000, median: 120000, p75: 180000 }),
        },
      ],
    } as any)
    vi.mocked(computeCasePreparation).mockResolvedValue({
      missingDocs: [],
      treatmentGaps: [{ startDate: '2026-01-01', endDate: '2026-03-15', gapDays: 73 }],
      strengths: ['Documented medical expenses'],
      weaknesses: [],
      readinessScore: 82,
    })
    vi.mocked(buildMedicalChronology).mockResolvedValue([
      { id: 'evt-1', date: '2026-01-01', label: 'Urgent care', source: 'treatment' },
      { id: 'evt-2', date: '2026-02-01', label: 'PT', source: 'treatment' },
      { id: 'evt-3', date: '2026-03-20', label: 'MRI', source: 'treatment' },
    ] as any)
    vi.mocked(prisma.evidenceFile.findMany).mockResolvedValue([
      { category: 'medical_records', originalName: 'records.pdf', createdAt: new Date() },
      { category: 'police_report', originalName: 'report.pdf', createdAt: new Date() },
    ] as any)
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.insuranceDetail.findMany).mockResolvedValue([{ policyLimit: 250000 }] as any)
    vi.mocked(prisma.negotiationEvent.findMany).mockResolvedValue([
      { eventType: 'demand', amount: 300000, eventDate: new Date(), status: 'sent' },
    ] as any)
    vi.mocked(prisma.leadContact.findFirst).mockResolvedValue({
      createdAt: new Date(),
      contactType: 'call',
    } as any)

    const summary = await buildCaseCommandCenter({ assessmentId: 'asm-2', leadId: 'lead-2' })
    const copilot = answerCommandCenterCopilot(summary, 'What would the defense attack first?')

    expect(summary.stage.key).toBe('negotiation')
    expect(summary.nextBestAction.actionType).toBe('review_negotiation')
    expect(summary.coverageStory.label).toBe('Policy pressure')
    expect(summary.negotiationSummary.eventCount).toBe(1)
    expect(summary.negotiationSummary.recommendedMove.toLowerCase()).toContain('carrier')
    expect(summary.treatmentMonitor.largestGapDays).toBe(73)
    expect(summary.defenseRisks.some((item) => item.title.toLowerCase().includes('treatment gap'))).toBe(true)
    expect(copilot.answer.toLowerCase()).toContain('defense')
    expect(copilot.sources.length).toBeGreaterThan(0)
  })

  it('builds case-aware message templates from the shared summary', async () => {
    const templates = buildCaseAwareMessageTemplates({
      assessmentId: 'asm-3',
      leadId: 'lead-3',
      stage: {
        key: 'file_strengthening',
        title: 'File strengthening',
        detail: 'Attorney-facing detail',
        plaintiffTitle: 'We are strengthening your case file',
        plaintiffDetail: 'A few documents are still needed before the next major step.',
        progressPercent: 42,
      },
      readiness: {
        score: 55,
        label: 'Needs file strengthening',
        detail: 'detail',
      },
      valueStory: {
        median: 50000,
        low: 30000,
        high: 80000,
        detail: 'Value detail',
      },
      liabilityStory: {
        label: 'Mixed',
        detail: 'Liability detail',
      },
      coverageStory: {
        label: 'Coverage identified',
        detail: 'Coverage detail',
        policyLimit: 100000,
      },
      negotiationSummary: {
        eventCount: 1,
        latestEventType: 'demand',
        latestStatus: 'sent',
        latestEventDate: '2026-04-01T00:00:00.000Z',
        latestDemand: 75000,
        latestOffer: null,
        gapToDemand: null,
        posture: 'Demand package is out at $75,000.',
        recommendedMove: 'Track carrier response timing and make sure the package closes any remaining medical or coverage gaps.',
      },
      treatmentMonitor: {
        chronologyCount: 3,
        providerCount: 2,
        providers: ['ER', 'PT'],
        latestTreatmentDate: '2026-03-18',
        largestGapDays: 0,
        status: 'Treatment chronology is forming',
        recommendedAction: 'Round out remaining providers, records, and any recent follow-up visits.',
      },
      medicalCostBenchmark: {
        status: 'available',
        matchedEventCount: 3,
        totalChronologyEvents: 3,
        matchedCategories: [
          {
            categoryLabel: 'Emergency care',
            specialtyBucket: 'emergency_medicine',
            piCategory: 'er_eval',
            benchmarkCode: '99284',
            benchmarkDescription: 'Emergency department visit for problem of high severity',
            providerMonthRows: 1000,
            medianPaidPerPatient: 80,
            p90PaidPerPatient: 150,
            weightedPaidPerPatient: 100,
          },
        ],
        unmatchedLabels: [],
        benchmarkTypicalTotal: 300,
        benchmarkHighTotal: 450,
        medCharges: 5000,
        detail: 'We matched 3 treatment events to Medicaid trauma benchmark categories.',
        caution: 'Population-level benchmark only.',
      },
      strengths: [],
      weaknesses: [],
      defenseRisks: [],
      missingItems: [],
      nextBestAction: {
        actionType: 'request_documents',
        title: 'Request documents',
        detail: 'The file still needs records before it will read strongly.',
      },
      suggestedDocumentRequest: {
        requestedDocs: ['medical_records', 'police_report'],
        customMessage: 'These items help us strengthen your file.',
      },
      suggestedPlaintiffUpdate: 'The most helpful items right now are your medical records and police report.',
      copilot: {
        suggestedPrompts: [],
        evidenceContext: [],
      },
      sources: [],
    })

    expect(templates.map((item) => item.id)).toEqual([
      'case_stage_update',
      'next_case_step',
      'demand_readiness_status',
      'request_key_documents',
      'follow_up_reminder',
      'negotiation_status_update',
    ])
    expect(templates[3]?.text).toContain('medical records')
  })
})
