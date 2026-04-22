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

  it('marks strong retained files without a demand draft as demand-ready', async () => {
    vi.mocked(prisma.caseTask.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.documentRequest.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.leadContact.findMany).mockResolvedValue([
      { id: 'contact-1', leadId: 'lead-2', createdAt: new Date(), completedAt: new Date(), contactType: 'call' },
    ] as any)
    vi.mocked(prisma.demandLetter.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.negotiationEvent.findMany).mockResolvedValue([] as any)

    const result = await buildAttorneyWorkQueue({
      attorneyId: 'att-1',
      prisma,
      upcomingConsults: [],
      messagingByAssessmentId: {},
      leads: [
        {
          id: 'lead-2',
          assessmentId: 'asm-2',
          status: 'retained',
          assessment: {
            claimType: 'dog_bite',
            facts: JSON.stringify({
              treatment: [{ date: '2026-03-01' }, { date: '2026-03-10' }],
            }),
            evidenceFiles: [
              { category: 'medical_records' },
              { category: 'bills' },
              { category: 'injury_photos' },
            ],
            user: { firstName: 'Alex', lastName: 'Smith' },
          },
        },
      ],
    })

    expect(result.leadsWithReadiness[0]?.demandReadiness?.isDemandReady).toBe(true)
    expect(result.leadsWithReadiness[0]?.demandReadiness?.nextAction.actionType).toBe('open_demand')
    expect(result.needsActionToday[0]?.actionType).toBe('open_demand')
  })
})
