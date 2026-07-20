import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))
vi.mock('./case-notifications', () => ({
  notifyAttorneyInApp: vi.fn().mockResolvedValue(true),
}))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { notifyAttorneyInApp } from './case-notifications'
import { runCaseReminderSweep } from './case-reminder-sweep'

const notifyMock = vi.mocked(notifyAttorneyInApp)

function reminder(overrides: Partial<any> = {}) {
  return {
    id: 'rem-1',
    assessmentId: 'assess-1',
    channel: 'email',
    message: 'Task reminder: Follow up due soon.',
    dueAt: new Date(Date.now() - 60_000),
    status: 'scheduled',
    deliveryStatus: 'pending',
    attempts: 0,
    ...overrides,
  }
}

describe('runCaseReminderSweep', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    notifyMock.mockReset()
    notifyMock.mockResolvedValue(true)
    delete process.env.CASE_REMINDER_SWEEP_ENABLED
  })

  it('delivers a due reminder to the assigned attorney and marks it sent', async () => {
    vi.mocked(prisma.caseReminder.findMany).mockResolvedValue([reminder()] as any)
    vi.mocked(prisma.leadSubmission.findMany).mockResolvedValue([
      { id: 'lead-1', assessmentId: 'assess-1', assignedAttorneyId: 'att-1' },
    ] as any)

    const result = await runCaseReminderSweep()

    expect(result).toMatchObject({ scanned: 1, sent: 1, failed: 0, skipped: 0 })
    expect(notifyMock).toHaveBeenCalledWith(
      expect.objectContaining({ attorneyId: 'att-1', leadId: 'lead-1' }),
    )
    expect(vi.mocked(prisma.caseReminder.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'rem-1' },
        data: expect.objectContaining({ status: 'sent', deliveryStatus: 'delivered' }),
      }),
    )
  })

  it('classifies a statute-of-limitations reminder as a high-priority SOL alert', async () => {
    vi.mocked(prisma.caseReminder.findMany).mockResolvedValue([
      reminder({ message: 'Escalation: Statute of limitations deadline approaching.' }),
    ] as any)
    vi.mocked(prisma.leadSubmission.findMany).mockResolvedValue([
      { id: 'lead-1', assessmentId: 'assess-1', assignedAttorneyId: 'att-1' },
    ] as any)

    await runCaseReminderSweep()

    expect(notifyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Statute of limitations deadline',
        payload: expect.objectContaining({ kind: 'sol', priority: 'high' }),
      }),
    )
  })

  it('skips (does not fire) reminders whose case has no assigned attorney yet', async () => {
    vi.mocked(prisma.caseReminder.findMany).mockResolvedValue([reminder()] as any)
    vi.mocked(prisma.leadSubmission.findMany).mockResolvedValue([
      { id: 'lead-1', assessmentId: 'assess-1', assignedAttorneyId: null },
    ] as any)

    const result = await runCaseReminderSweep()

    expect(result).toMatchObject({ scanned: 1, sent: 0, skipped: 1 })
    expect(notifyMock).not.toHaveBeenCalled()
    expect(vi.mocked(prisma.caseReminder.update)).not.toHaveBeenCalled()
  })

  it('retries (keeps scheduled) when delivery fails before attempts are exhausted', async () => {
    notifyMock.mockResolvedValue(false)
    vi.mocked(prisma.caseReminder.findMany).mockResolvedValue([reminder({ attempts: 1 })] as any)
    vi.mocked(prisma.leadSubmission.findMany).mockResolvedValue([
      { id: 'lead-1', assessmentId: 'assess-1', assignedAttorneyId: 'att-1' },
    ] as any)

    const result = await runCaseReminderSweep()

    expect(result).toMatchObject({ scanned: 1, sent: 0, failed: 0 })
    expect(vi.mocked(prisma.caseReminder.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'scheduled', deliveryStatus: 'failed', attempts: 2 }),
      }),
    )
  })

  it('marks the reminder failed once max delivery attempts are reached', async () => {
    notifyMock.mockResolvedValue(false)
    vi.mocked(prisma.caseReminder.findMany).mockResolvedValue([reminder({ attempts: 4 })] as any)
    vi.mocked(prisma.leadSubmission.findMany).mockResolvedValue([
      { id: 'lead-1', assessmentId: 'assess-1', assignedAttorneyId: 'att-1' },
    ] as any)

    const result = await runCaseReminderSweep()

    expect(result).toMatchObject({ scanned: 1, sent: 0, failed: 1 })
    expect(vi.mocked(prisma.caseReminder.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'failed', attempts: 5 }),
      }),
    )
  })

  it('no-ops with an empty result when nothing is due', async () => {
    vi.mocked(prisma.caseReminder.findMany).mockResolvedValue([] as any)

    const result = await runCaseReminderSweep()

    expect(result).toEqual({ scanned: 0, sent: 0, failed: 0, skipped: 0 })
    expect(notifyMock).not.toHaveBeenCalled()
  })

  it('is disabled via CASE_REMINDER_SWEEP_ENABLED=false', async () => {
    process.env.CASE_REMINDER_SWEEP_ENABLED = 'false'
    const result = await runCaseReminderSweep()
    expect(result.skippedReason).toBe('Disabled by env')
    expect(vi.mocked(prisma.caseReminder.findMany)).not.toHaveBeenCalled()
  })
})
