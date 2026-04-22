import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'

describe('POST /v1/sms/webhook routing replies', () => {
  const app = buildApp()

  beforeEach(() => {
    resetUniversalPrismaMock()
  })

  it('ACCEPT updates introduction and returns TwiML', async () => {
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue({ id: 'att-sms-1', phone: '+15551234567' } as any)
    vi.mocked(prisma.introduction.findFirst).mockResolvedValue({
      id: 'intro-sms-1',
      assessmentId: 'asm-sms',
      attorneyId: 'att-sms-1',
      status: 'PENDING',
    } as any)
    vi.mocked(prisma.introduction.updateMany).mockResolvedValue({ count: 1 } as any)

    const res = await request(app)
      .post('/v1/sms/webhook')
      .type('form')
      .send({ MessageSid: 'SM-accept-1', From: '+1 (555) 123-4567', Body: 'ACCEPT' })

    expect(res.status).toBe(200)
    expect(res.text).toContain('Response')
    expect(prisma.smsWebhookReceipt.create).toHaveBeenCalled()
    expect(prisma.introduction.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'ACCEPTED' }),
      })
    )
  })

  it('DECLINE updates introduction to DECLINED', async () => {
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue({ id: 'att-sms-2', phone: '+15559876543' } as any)
    vi.mocked(prisma.introduction.findFirst).mockResolvedValue({
      id: 'intro-sms-2',
      assessmentId: 'asm-sms-2',
      attorneyId: 'att-sms-2',
      status: 'PENDING',
    } as any)
    vi.mocked(prisma.introduction.updateMany).mockResolvedValue({ count: 1 } as any)

    const res = await request(app)
      .post('/v1/sms/webhook')
      .type('form')
      .send({ MessageSid: 'SM-decline-1', From: '+15559876543', Body: 'decline' })

    expect(res.status).toBe(200)
    expect(prisma.introduction.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'DECLINED' }),
      })
    )
  })

  it('ACCEPT assigns the lead exclusively to the responding attorney', async () => {
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue({ id: 'att-sms-3', phone: '+15551112222' } as any)
    vi.mocked(prisma.introduction.findFirst).mockResolvedValue({
      id: 'intro-sms-3',
      assessmentId: 'asm-sms-3',
      attorneyId: 'att-sms-3',
      status: 'PENDING',
    } as any)
    vi.mocked(prisma.introduction.updateMany).mockResolvedValue({ count: 1 } as any)
    vi.mocked(prisma.leadSubmission.findUnique).mockResolvedValue({
      id: 'lead-sms-3',
      assignmentType: 'shared',
    } as any)

    const res = await request(app)
      .post('/v1/sms/webhook')
      .type('form')
      .send({ MessageSid: 'SM-accept-3', From: '+1 555 111 2222', Body: 'YES' })

    expect(res.status).toBe(200)
    expect(prisma.leadSubmission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'lead-sms-3' },
        data: expect.objectContaining({
          status: 'contacted',
          assignedAttorneyId: 'att-sms-3',
          assignmentType: 'exclusive',
        }),
      })
    )
  })

  it('unknown phone still 200 with guidance TwiML', async () => {
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue(null as any)

    const res = await request(app)
      .post('/v1/sms/webhook')
      .type('form')
      .send({ MessageSid: 'SM-unknown-1', From: '+15550999999', Body: 'YES' })

    expect(res.status).toBe(200)
    expect(res.text).toMatch(/not recognized|CaseIQ/i)
    expect(prisma.introduction.updateMany).not.toHaveBeenCalled()
  })

  it('recognized attorney with no pending intro gets expired guidance', async () => {
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue({ id: 'att-sms-4', phone: '+15550001111' } as any)
    vi.mocked(prisma.introduction.findFirst).mockResolvedValue(null as any)

    const res = await request(app)
      .post('/v1/sms/webhook')
      .type('form')
      .send({ MessageSid: 'SM-nopending-1', From: '+15550001111', Body: 'ACCEPT' })

    expect(res.status).toBe(200)
    expect(res.text).toMatch(/No pending case offer found|expired/i)
    expect(prisma.introduction.updateMany).not.toHaveBeenCalled()
  })

  it('duplicate MessageSid returns the existing receipt response without reprocessing', async () => {
    vi.mocked(prisma.smsWebhookReceipt.create).mockRejectedValue({ code: 'P2002' } as any)
    vi.mocked(prisma.smsWebhookReceipt.findUnique).mockResolvedValue({
      id: 'receipt-dup-1',
      messageSid: 'SM-dup-1',
      responseCode: 200,
      responseMessage: 'You have accepted this case. View details in CaseIQ.',
    } as any)

    const res = await request(app)
      .post('/v1/sms/webhook')
      .type('form')
      .send({ MessageSid: 'SM-dup-1', From: '+15551234567', Body: 'ACCEPT' })

    expect(res.status).toBe(200)
    expect(res.text).toMatch(/accepted this case/i)
    expect(prisma.attorney.findFirst).not.toHaveBeenCalled()
  })
})
