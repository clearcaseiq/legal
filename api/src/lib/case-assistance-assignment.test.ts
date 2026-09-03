/**
 * Assignment fairness, and the two states it has to survive: nobody hired yet,
 * and a case that already has an owner.
 *
 * Least-loaded-first is used instead of a stored rotation pointer because a
 * pointer gets it wrong exactly when the roster changes — after someone joins,
 * leaves, or comes back from a week off, the next several cases land on whoever
 * the pointer happens to be at.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))
vi.mock('./platform-notifications', () => ({ createNotificationEvent: vi.fn() }))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { createNotificationEvent } from './platform-notifications'
import { assignCaseAssistance, pickNextSpecialist } from './case-assistance-assignment'

function specialists(...ids: string[]) {
  prisma.user.findMany.mockResolvedValue(ids.map((id) => ({ id })))
}

/** `groupBy` is called twice: current load, then last-assigned time. */
function loads(byId: Record<string, number>, lastAssigned: Record<string, string> = {}) {
  prisma.caseAssistance.groupBy
    .mockResolvedValueOnce(
      Object.entries(byId).map(([assignedSpecialistId, count]) => ({
        assignedSpecialistId,
        _count: { _all: count },
      })),
    )
    .mockResolvedValueOnce(
      Object.entries(lastAssigned).map(([assignedSpecialistId, at]) => ({
        assignedSpecialistId,
        _max: { assignedAt: new Date(at) },
      })),
    )
}

beforeEach(() => {
  vi.clearAllMocks()
  resetUniversalPrismaMock()
})

describe('pickNextSpecialist', () => {
  it('returns null when nobody has the role yet', async () => {
    specialists()
    expect(await pickNextSpecialist()).toBeNull()
  })

  it('picks the specialist carrying the fewest active cases', async () => {
    specialists('a', 'b', 'c')
    loads({ a: 7, b: 2, c: 5 })
    expect(await pickNextSpecialist()).toBe('b')
  })

  it('puts someone with an empty queue first', async () => {
    // The case a rotation pointer gets wrong: a returning specialist has no
    // active cases and should be filled up, not skipped.
    specialists('busy', 'returning')
    loads({ busy: 3 }, { busy: '2026-09-01T10:00:00.000Z', returning: '2026-08-01T10:00:00.000Z' })
    expect(await pickNextSpecialist()).toBe('returning')
  })

  it('alternates between specialists on the same count', async () => {
    specialists('first', 'second')
    loads(
      { first: 2, second: 2 },
      { first: '2026-09-03T10:00:00.000Z', second: '2026-09-03T09:00:00.000Z' },
    )
    // `second` was assigned longer ago, so it is their turn. Without this
    // tiebreak one of the two would take every case.
    expect(await pickNextSpecialist()).toBe('second')
  })

  it('prefers a never-assigned specialist over one assigned a minute ago', async () => {
    specialists('newHire', 'veteran')
    loads({}, { veteran: '2026-09-03T10:00:00.000Z' })
    expect(await pickNextSpecialist()).toBe('newHire')
  })
})

describe('assignCaseAssistance', () => {
  it('creates the row and assigns it with an SLA', async () => {
    specialists('spec-1')
    loads({})
    prisma.caseAssistance.findUnique.mockResolvedValue(null)
    prisma.assessment.findUnique.mockResolvedValue({ caseName: 'Rivera', claimType: 'motor_vehicle' })

    await assignCaseAssistance('assess-1')

    const created = prisma.caseAssistance.create.mock.calls[0][0].data
    expect(created.assessmentId).toBe('assess-1')
    expect(created.assignedSpecialistId).toBe('spec-1')
    expect(created.status).toBe('needs_review')
    expect(created.assignedAt).toBeInstanceOf(Date)
    expect(created.reviewDueAt).toBeInstanceOf(Date)
    expect(created.reviewDueAt.getTime()).toBeGreaterThan(created.assignedAt.getTime())
  })

  it('still creates the row when no specialist is available', async () => {
    // Normal before the first hire. The case has to be visible in the unassigned
    // queue the moment someone exists, not invisible until then.
    specialists()
    prisma.caseAssistance.findUnique.mockResolvedValue(null)

    await assignCaseAssistance('assess-2')

    const created = prisma.caseAssistance.create.mock.calls[0][0].data
    expect(created.status).toBe('new_submission')
    expect(created.assignedSpecialistId).toBeUndefined()
    expect(createNotificationEvent).not.toHaveBeenCalled()
  })

  it('leaves an already-assigned case alone', async () => {
    // `/predict` can run more than once on a case; the specialist already
    // working it keeps it, and their review clock is not reset.
    prisma.caseAssistance.findUnique.mockResolvedValue({ id: 'ca-1', assignedSpecialistId: 'spec-9' })

    await assignCaseAssistance('assess-3')

    expect(prisma.caseAssistance.create).not.toHaveBeenCalled()
    expect(prisma.caseAssistance.update).not.toHaveBeenCalled()
  })

  it('assigns an existing unassigned row rather than creating a duplicate', async () => {
    specialists('spec-1')
    loads({})
    prisma.caseAssistance.findUnique.mockResolvedValue({ id: 'ca-2', assignedSpecialistId: null })
    prisma.caseAssistance.update.mockResolvedValue({ id: 'ca-2' })
    prisma.assessment.findUnique.mockResolvedValue({ caseName: 'Chen', claimType: 'slip_fall' })

    await assignCaseAssistance('assess-4')

    expect(prisma.caseAssistance.create).not.toHaveBeenCalled()
    expect(prisma.caseAssistance.update.mock.calls[0][0].where).toEqual({ id: 'ca-2' })
  })

  it('notifies the specialist through the shared event pipeline', async () => {
    specialists('spec-1')
    loads({})
    prisma.caseAssistance.findUnique.mockResolvedValue(null)
    prisma.assessment.findUnique.mockResolvedValue({ caseName: 'Rivera', claimType: 'motor_vehicle' })

    await assignCaseAssistance('assess-5')

    const [event] = vi.mocked(createNotificationEvent).mock.calls[0]
    expect(event.userId).toBe('spec-1')
    expect(event.assessmentId).toBe('assess-5')
    expect(event.eventType).toBe('specialist.case_assigned')
    // There is no `specialist` role on the event log; `admin` keeps these
    // visible in the admin communications log.
    expect(event.role).toBe('admin')
  })

  it('never throws, so a failure cannot cost the claimant their report', async () => {
    prisma.caseAssistance.findUnique.mockRejectedValue(new Error('db down'))
    await expect(assignCaseAssistance('assess-6')).resolves.toBeUndefined()
  })

  it('does not fail the assignment when the notification cannot be sent', async () => {
    specialists('spec-1')
    loads({})
    prisma.caseAssistance.findUnique.mockResolvedValue(null)
    prisma.assessment.findUnique.mockResolvedValue({ caseName: 'Rivera', claimType: 'motor_vehicle' })
    vi.mocked(createNotificationEvent).mockRejectedValue(new Error('smtp down'))

    await assignCaseAssistance('assess-7')

    expect(prisma.caseAssistance.create).toHaveBeenCalled()
  })
})
