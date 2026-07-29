import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { buildAttorneyWorkQueue } from './attorney-work-queue'

describe('buildAttorneyWorkQueue', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.clearAllMocks()
  })

  it('marks missing-doc files as request-docs work', async () => {
    vi.mocked(prisma.caseTask.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.documentRequest.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.leadContact.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.demandLetter.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.negotiationEvent.findMany).mockResolvedValue([] as any)

    const result = await buildAttorneyWorkQueue({
      attorneyId: 'att-1',
      prisma,
      upcomingConsults: [],
      messagingByAssessmentId: {},
      leads: [
        {
          id: 'lead-1',
          assessmentId: 'asm-1',
          status: 'submitted',
          assessment: {
            claimType: 'auto',
            facts: JSON.stringify({ treatment: [] }),
            evidenceFiles: [],
            user: { firstName: 'Jane', lastName: 'Doe' },
          },
        },
      ],
    })

    expect(result.leadsWithReadiness[0]?.demandReadiness?.nextAction.actionType).toBe('request_documents')
    expect(result.leadsWithReadiness[0]?.demandReadiness?.blockers.length).toBeGreaterThan(0)
    expect(result.needsActionToday[0]).toMatchObject({
      actionType: 'request_documents',
      leadId: 'lead-1',
    })
  })

  function daysAgo(days: number): string {
    return new Date(Date.now() - days * 86_400_000).toISOString()
  }

  function mockEmptyLookups() {
    vi.mocked(prisma.caseTask.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.documentRequest.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.leadContact.findMany).mockResolvedValue([
      { id: 'contact-1', leadId: 'lead-2', createdAt: new Date(), completedAt: new Date(), contactType: 'call' },
    ] as any)
    vi.mocked(prisma.demandLetter.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.negotiationEvent.findMany).mockResolvedValue([] as any)
  }

  function retainedLead(facts: Record<string, unknown>) {
    return {
      id: 'lead-2',
      assessmentId: 'asm-2',
      status: 'retained',
      assessment: {
        claimType: 'dog_bite',
        facts: JSON.stringify(facts),
        evidenceFiles: [
          { category: 'medical_records' },
          { category: 'bills' },
          { category: 'injury_photos' },
        ],
        user: { firstName: 'Alex', lastName: 'Smith' },
      },
    }
  }

  it('marks strong retained files without a demand draft as demand-ready', async () => {
    mockEmptyLookups()

    const result = await buildAttorneyWorkQueue({
      attorneyId: 'att-1',
      prisma,
      upcomingConsults: [],
      messagingByAssessmentId: {},
      leads: [
        retainedLead({
          treatment: [
            { date: daysAgo(40), status: 'completed' },
            { date: daysAgo(12), status: 'discharged' },
          ],
          damages: { med_charges: 24_000 },
        }),
      ],
    })

    expect(result.leadsWithReadiness[0]?.demandReadiness?.isDemandReady).toBe(true)
    expect(result.leadsWithReadiness[0]?.demandReadiness?.nextAction.actionType).toBe('open_demand')
    expect(result.needsActionToday[0]?.actionType).toBe('open_demand')
  })

  // Regression: the file is otherwise strong, but the client stopped treating
  // 255 days ago with no discharge note. The between-visit gap is small, so the
  // old check saw a healthy file and called it demand-ready.
  it('withholds demand-ready while the client may still be treating', async () => {
    mockEmptyLookups()

    const result = await buildAttorneyWorkQueue({
      attorneyId: 'att-1',
      prisma,
      upcomingConsults: [],
      messagingByAssessmentId: {},
      leads: [
        retainedLead({
          treatment: [{ date: daysAgo(262) }, { date: daysAgo(258) }, { date: daysAgo(255) }],
          damages: { med_charges: 24_000 },
        }),
      ],
    })

    const readiness = result.leadsWithReadiness[0]?.demandReadiness
    expect(readiness?.isDemandReady).toBe(false)
    expect(readiness?.nextAction.actionType).not.toBe('open_demand')
    expect(readiness?.blockers.map((b) => b.key)).toContain('treatment_gap')
  })
})
