/**
 * The case factory.
 *
 * Each assertion here corresponds to a record whose absence made an
 * attorney-created case invisible or wrong. They are written as "this row is
 * written, with these fields" rather than against behaviour further downstream,
 * because the downstream readers are 33 separate queries and the contract
 * between them is precisely this row shape.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))
vi.mock('./logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

const assignReferenceCode = vi.fn()
const ensureAssessmentPrediction = vi.fn()

vi.mock('./case-reference', () => ({ assignReferenceCode: () => assignReferenceCode() }))
vi.mock('./prediction-materializer', () => ({
  ensureAssessmentPrediction: (id: string) => ensureAssessmentPrediction(id),
}))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import {
  ATTORNEY_SELF_SOURCE,
  createAttorneyOwnedCase,
  isAttorneyOwnedCase,
} from './attorney-case-factory'

const INPUT = {
  claimType: 'auto',
  venueState: 'CA',
  incidentDate: '2026-03-04',
  narrative: 'Rear-ended at a stoplight.',
  plaintiffFirstName: 'Dana',
  plaintiffLastName: 'Reyes',
  plaintiffEmail: 'dana@example.com',
}

const OWNER = { attorneyId: 'att-1', lawFirmId: 'firm-1', createdByUserId: 'user-9' }

function leadCreateArg() {
  return vi.mocked(prisma.leadSubmission.create).mock.calls[0]?.[0] as any
}

function assessmentCreateArg() {
  return vi.mocked(prisma.assessment.create).mock.calls[0]?.[0] as any
}

beforeEach(() => {
  resetUniversalPrismaMock()
  vi.clearAllMocks()
  assignReferenceCode.mockResolvedValue('CCIQ-7Q2K9F')
  ensureAssessmentPrediction.mockResolvedValue(true)
  vi.mocked(prisma.assessment.create).mockResolvedValue({ id: 'asm-new' } as any)
  vi.mocked(prisma.user.create).mockResolvedValue({ id: 'shadow-1' } as any)
  // The universal mock returns the callback's own result for $transaction.
  vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => fn(prisma))
})

describe('createAttorneyOwnedCase', () => {
  /**
   * The defect the whole module exists for: every attorney read is rooted at
   * LeadSubmission, and the previous helper never wrote one.
   */
  it('writes the LeadSubmission that makes the case visible to its attorney', async () => {
    await createAttorneyOwnedCase(INPUT, OWNER, 'manual')

    expect(prisma.leadSubmission.create).toHaveBeenCalledOnce()
    expect(leadCreateArg().data).toMatchObject({
      assessmentId: 'asm-new',
      assignedAttorneyId: 'att-1',
      sourceType: ATTORNEY_SELF_SOURCE,
    })
  })

  /**
   * Without the ownership claim the routing engine treats the case as an
   * available marketplace lead — which would offer the attorney's own client
   * to a competing firm.
   */
  it('claims the case exclusively so it can never be routed', async () => {
    await createAttorneyOwnedCase(INPUT, OWNER, 'manual')

    expect(leadCreateArg().data).toMatchObject({
      assignmentType: 'exclusive',
      isExclusive: true,
      routingLocked: true,
      status: 'accepted',
      lifecycleState: 'attorney_engaged',
    })
  })

  it('completes the assessment rather than leaving it DRAFT', async () => {
    await createAttorneyOwnedCase(INPUT, OWNER, 'manual')

    // The admin routing queue, the ops inbox and every analytics aggregate
    // filter on COMPLETED, so DRAFT is invisible to operations too.
    expect(assessmentCreateArg().data).toMatchObject({ status: 'COMPLETED', lawFirmId: 'firm-1' })
  })

  it('gives the case an owner so documents have somewhere to attach', async () => {
    await createAttorneyOwnedCase(INPUT, OWNER, 'manual')

    // EvidenceFile.userId is non-nullable, so a case with no owner cannot hold
    // a single document.
    const userArg = vi.mocked(prisma.user.create).mock.calls[0]?.[0] as any
    expect(userArg.data.email).toBe('guest+asm-new@caseiq.local')
    expect(prisma.assessment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { userId: 'shadow-1' } }),
    )
  })

  it('records the incident date it was given rather than defaulting to today', async () => {
    await createAttorneyOwnedCase(INPUT, OWNER, 'manual')

    // The SOL clock runs from this date. The old helper defaulted it to today,
    // silently giving every imported case a deadline it has not got.
    expect(assessmentCreateArg().data.facts).toContain('2026-03-04')
  })

  it('scores an unassessed case at even odds, not at zero', async () => {
    await createAttorneyOwnedCase(INPUT, OWNER, 'manual')

    // Zero reads as "we evaluated this and it is worthless" everywhere the
    // number is displayed. These are priors, not findings.
    expect(leadCreateArg().data).toMatchObject({
      viabilityScore: 0.5,
      liabilityScore: 0.5,
      damagesScore: 0.5,
    })
  })

  it('values the case so money figures do not render as $0', async () => {
    await createAttorneyOwnedCase(INPUT, OWNER, 'manual')

    expect(ensureAssessmentPrediction).toHaveBeenCalledWith('asm-new')
  })

  it('mints a reference code support can quote', async () => {
    const result = await createAttorneyOwnedCase(INPUT, OWNER, 'manual')

    expect(result).toEqual({ assessmentId: 'asm-new', referenceCode: 'CCIQ-7Q2K9F' })
  })

  it('still returns the case when valuation fails', async () => {
    // The materializer sits outside the transaction precisely so this is
    // survivable; it retries on the next read.
    ensureAssessmentPrediction.mockRejectedValue(new Error('ml service down'))

    await expect(createAttorneyOwnedCase(INPUT, OWNER, 'manual')).resolves.toMatchObject({
      assessmentId: 'asm-new',
    })
  })

  it('marks provenance on the facts so consent gates can exempt the case', async () => {
    await createAttorneyOwnedCase(INPUT, OWNER, 'import')

    const facts = assessmentCreateArg().data.facts
    expect(facts).toContain(ATTORNEY_SELF_SOURCE)
    expect(facts).toContain('"origin":"import"')
  })

  it('records consents as false rather than implying an authorization', async () => {
    await createAttorneyOwnedCase(INPUT, OWNER, 'import')

    // The claimant has agreed to nothing with us and never will. The
    // provenance flag is what stops readers treating that as a defect; the
    // flags themselves must stay honest.
    expect(assessmentCreateArg().data.facts).toContain('"hipaa":false')
  })

  it('joins an ambient transaction when one is supplied', async () => {
    const tx = {
      assessment: { create: vi.fn().mockResolvedValue({ id: 'asm-tx' }), update: vi.fn() },
      user: { create: vi.fn().mockResolvedValue({ id: 'shadow-tx' }) },
      leadSubmission: { create: vi.fn() },
    } as any

    const result = await createAttorneyOwnedCase(INPUT, OWNER, 'import', tx)

    // A bulk import commits many cases as one unit; opening a nested
    // transaction per row would defeat that.
    expect(result.assessmentId).toBe('asm-tx')
    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(tx.leadSubmission.create).toHaveBeenCalledOnce()
  })
})

describe('isAttorneyOwnedCase', () => {
  it('recognises a case the attorney brought with them', () => {
    expect(isAttorneyOwnedCase({ origin: { kind: ATTORNEY_SELF_SOURCE } })).toBe(true)
  })

  it('does not claim an ordinary routed case', () => {
    expect(isAttorneyOwnedCase({ plaintiffContext: {} })).toBe(false)
    expect(isAttorneyOwnedCase({ origin: { kind: 'plaintiff' } })).toBe(false)
    expect(isAttorneyOwnedCase(null)).toBe(false)
    expect(isAttorneyOwnedCase('not an object')).toBe(false)
  })
})
