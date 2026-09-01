/**
 * Finishing the assessment and submitting the case are separate events that
 * each sent their own email, so anyone who did both in one sitting got two
 * messages a minute apart. The report email is now held so a submission can
 * supersede it. These cases pin both halves of that: the submitter gets one
 * email, and the person who finishes and walks away still gets their link.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))
vi.mock('./claims', () => ({ sendClaimEmail: vi.fn().mockResolvedValue(undefined) }))
vi.mock('./sms', () => ({ sendSms: vi.fn().mockResolvedValue(undefined) }))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { sendClaimEmail } from './claims'
import { sendSms } from './sms'
import {
  REPORT_READY_DELAY_MS,
  cancelReportReadyForAssessment,
  runReportReadySweep,
  scheduleReportReady,
} from './report-ready'

function givenDue(
  leads: Array<{ id: string; email?: string | null; phone?: string | null; assessmentId?: string | null }>
) {
  vi.mocked(prisma.intakeLead.findMany).mockResolvedValue(
    // Defaults fill in only what a case did not name; an explicit null is a
    // deliberate absence and has to survive.
    leads.map((lead) => ({
      id: lead.id,
      email: lead.email === undefined ? 'claimant@example.com' : lead.email,
      phone: lead.phone === undefined ? null : lead.phone,
      assessmentId: lead.assessmentId === undefined ? `asm-${lead.id}` : lead.assessmentId,
    })) as any
  )
}

/** Stand in for a case that reached the attorney network. */
function givenSubmitted() {
  vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({ id: 'lead-submission-1' } as any)
}

const updateFor = (leadId: string) =>
  vi.mocked(prisma.intakeLead.update).mock.calls.find((call) => (call[0] as any).where.id === leadId)?.[0] as any

describe('runReportReadySweep', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.mocked(sendClaimEmail).mockClear()
    vi.mocked(sendSms).mockClear()
  })

  it('sends the report link when the case was never submitted', async () => {
    givenDue([{ id: 'lead-1', assessmentId: 'asm-1' }])

    const result = await runReportReadySweep()

    expect(result).toEqual({ due: 1, sent: 1, superseded: 0 })
    expect(sendClaimEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'claimant@example.com',
        subject: 'Your ClearCaseIQ case report is ready',
        // The link is the button now, not prose in the body.
        cta: expect.objectContaining({ url: expect.stringContaining('/results/asm-1') }),
      })
    )
  })

  it('stays quiet when the case was submitted, because the receipt carried the link', async () => {
    givenDue([{ id: 'lead-1' }])
    givenSubmitted()

    const result = await runReportReadySweep()

    expect(result).toEqual({ due: 1, sent: 0, superseded: 1 })
    expect(sendClaimEmail).not.toHaveBeenCalled()
    expect(sendSms).not.toHaveBeenCalled()
  })

  it('clears the due time so a sent email is never sent again', async () => {
    givenDue([{ id: 'lead-1' }])

    await runReportReadySweep()

    expect(updateFor('lead-1').data).toEqual({
      reportReadyDueAt: null,
      reportReadySentAt: expect.any(Date),
    })
  })

  it('clears a superseded email without marking it sent', async () => {
    givenDue([{ id: 'lead-1' }])
    givenSubmitted()

    await runReportReadySweep()

    expect(updateFor('lead-1').data).toEqual({ reportReadyDueAt: null })
  })

  it('texts the link too when a phone number was captured', async () => {
    givenDue([{ id: 'lead-1', phone: '+15551234567', assessmentId: 'asm-1' }])

    await runReportReadySweep()

    expect(sendSms).toHaveBeenCalledWith('+15551234567', expect.stringContaining('/results/asm-1'))
  })

  it('drops a queued email whose lead never got an assessment', async () => {
    givenDue([{ id: 'lead-1', assessmentId: null }])

    const result = await runReportReadySweep()

    expect(result).toEqual({ due: 1, sent: 0, superseded: 0 })
    expect(sendClaimEmail).not.toHaveBeenCalled()
    expect(updateFor('lead-1').data).toEqual({ reportReadyDueAt: null })
  })

  it('keeps going when one lead fails, so a single bad row cannot block the queue', async () => {
    givenDue([{ id: 'lead-1' }, { id: 'lead-2' }])
    vi.mocked(prisma.intakeLead.update).mockRejectedValueOnce(new Error('write conflict'))

    const result = await runReportReadySweep()

    expect(result.sent).toBe(1)
    expect(sendClaimEmail).toHaveBeenCalledTimes(2)
  })

  it('only looks at leads that are due and not already sent', async () => {
    givenDue([])

    await runReportReadySweep()

    expect(vi.mocked(prisma.intakeLead.findMany).mock.calls[0][0]).toMatchObject({
      where: {
        reportReadyDueAt: { not: null, lte: expect.any(Date) },
        reportReadySentAt: null,
      },
    })
  })
})

describe('scheduleReportReady', () => {
  beforeEach(() => resetUniversalPrismaMock())

  it('queues the email for after the window rather than sending it now', async () => {
    const before = Date.now()

    await scheduleReportReady('lead-1')

    const due = (vi.mocked(prisma.intakeLead.update).mock.calls[0][0] as any).data.reportReadyDueAt as Date
    expect(due.getTime()).toBeGreaterThanOrEqual(before + REPORT_READY_DELAY_MS)
  })

  it('swallows a write failure, since completing the assessment must still succeed', async () => {
    vi.mocked(prisma.intakeLead.update).mockRejectedValue(new Error('db down'))

    await expect(scheduleReportReady('lead-1')).resolves.toBeUndefined()
  })
})

describe('cancelReportReadyForAssessment', () => {
  beforeEach(() => resetUniversalPrismaMock())

  it('cancels only an email that has not gone out yet', async () => {
    await cancelReportReadyForAssessment('asm-1')

    expect(prisma.intakeLead.updateMany).toHaveBeenCalledWith({
      where: { assessmentId: 'asm-1', reportReadySentAt: null },
      data: { reportReadyDueAt: null },
    })
  })

  it('swallows a write failure, since submission must still succeed', async () => {
    vi.mocked(prisma.intakeLead.updateMany).mockRejectedValue(new Error('db down'))

    await expect(cancelReportReadyForAssessment('asm-1')).resolves.toBeUndefined()
  })
})
