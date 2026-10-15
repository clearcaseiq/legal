import { beforeEach, describe, expect, it, vi } from 'vitest'

const sendReminder = vi.fn()
const notifyAttorneyInApp = vi.fn()
const deliverDirectNotification = vi.fn()

vi.mock('../prisma', () => ({
  prisma: {
    documentEnvelope: { findMany: vi.fn(), findUnique: vi.fn() },
    attorney: { findFirst: vi.fn() },
  },
}))
vi.mock('./index', () => ({
  getESignatureProvider: () => ({ id: 'dropbox_sign', label: 'Dropbox Sign', sendReminder }),
}))
vi.mock('./esign-service', () => ({ OPEN_ENVELOPE_STATUSES: ['draft', 'sent', 'viewed'] }))
vi.mock('../case-notifications', () => ({ notifyAttorneyInApp: (...a: unknown[]) => notifyAttorneyInApp(...a) }))
vi.mock('../platform-notifications', () => ({
  deliverDirectNotification: (...a: unknown[]) => deliverDirectNotification(...a),
}))
vi.mock('../app-url', () => ({ webUrl: (p: string) => `https://app.test${p}` }))

import { prisma } from '../prisma'
import {
  CountersignAccessError,
  listCountersignQueue,
  notifyCountersignerClientSigned,
  resendCountersignRequest,
} from './countersign'

const clientSignedAt = new Date('2026-10-14T16:00:00Z')

const envelope = {
  id: 'env-1',
  leadId: 'lead-1',
  attorneyId: 'att-sender',
  title: 'Retainer Agreement',
  documentType: 'retainer',
  signerName: 'Russell Crowe',
  status: 'sent',
  provider: 'dropbox_sign',
  externalEnvelopeId: 'ext-1',
  clientSignedAt,
  countersignerName: 'Alice Donald',
  countersignerEmail: 'alice@firm.com',
  countersignUrl: null,
  lead: { assessmentId: 'asm-1', assessment: { user: { firstName: 'Russell', lastName: 'Crowe' } } },
}

beforeEach(() => {
  vi.clearAllMocks()
  sendReminder.mockResolvedValue(undefined)
  notifyAttorneyInApp.mockResolvedValue(true)
  deliverDirectNotification.mockResolvedValue(undefined)
})

describe('listCountersignQueue', () => {
  it('lists open agreements the client signed that name this attorney as countersigner', async () => {
    vi.mocked(prisma.documentEnvelope.findMany).mockResolvedValue([envelope] as never)

    const items = await listCountersignQueue('Alice@Firm.com')

    const where = (vi.mocked(prisma.documentEnvelope.findMany).mock.calls[0][0] as any).where
    expect(where).toMatchObject({
      countersignerEmail: { equals: 'Alice@Firm.com', mode: 'insensitive' },
      clientSignedAt: { not: null },
      status: { in: ['draft', 'sent', 'viewed'] },
    })
    expect(items).toEqual([
      expect.objectContaining({
        id: 'env-1',
        clientName: 'Russell Crowe',
        clientSignedAt: clientSignedAt.toISOString(),
        caseLink: '/attorney-dashboard/cases/lead-1/documents?view=signatures',
      }),
    ])
  })
})

describe('resendCountersignRequest', () => {
  it('re-sends the signing email for the countersigner', async () => {
    vi.mocked(prisma.documentEnvelope.findUnique).mockResolvedValue(envelope as never)

    await resendCountersignRequest('env-1', { id: 'att-alice', email: 'ALICE@firm.com' })

    expect(sendReminder).toHaveBeenCalledWith('ext-1')
  })

  it('lets the sending attorney re-send it too', async () => {
    vi.mocked(prisma.documentEnvelope.findUnique).mockResolvedValue(envelope as never)

    await resendCountersignRequest('env-1', { id: 'att-sender', email: 'sender@firm.com' })

    expect(sendReminder).toHaveBeenCalled()
  })

  it('refuses anyone else', async () => {
    vi.mocked(prisma.documentEnvelope.findUnique).mockResolvedValue(envelope as never)

    await expect(resendCountersignRequest('env-1', { id: 'att-x', email: 'x@other.com' })).rejects.toBeInstanceOf(
      CountersignAccessError,
    )
    expect(sendReminder).not.toHaveBeenCalled()
  })

  it('refuses before the client has signed, when the email would go to the client', async () => {
    vi.mocked(prisma.documentEnvelope.findUnique).mockResolvedValue({ ...envelope, clientSignedAt: null } as never)

    await expect(resendCountersignRequest('env-1', { id: 'att-alice', email: 'alice@firm.com' })).rejects.toThrow(
      /not waiting on a countersignature/,
    )
    expect(sendReminder).not.toHaveBeenCalled()
  })
})

describe('notifyCountersignerClientSigned', () => {
  it('emails the countersigner and adds a bell entry pointing at the case', async () => {
    vi.mocked(prisma.documentEnvelope.findUnique).mockResolvedValue(envelope as never)
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue({ id: 'att-alice', name: 'Alice Donald' } as never)

    await notifyCountersignerClientSigned('env-1')

    expect(notifyAttorneyInApp).toHaveBeenCalledWith(
      expect.objectContaining({
        attorneyId: 'att-alice',
        eventType: 'attorney.countersign_needed',
        link: '/attorney-dashboard/cases/lead-1/documents?view=signatures',
      }),
    )
    expect(deliverDirectNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'email',
        recipient: 'alice@firm.com',
        subject: 'Russell Crowe signed: Retainer Agreement needs your countersignature',
        role: 'attorney',
      }),
    )
  })

  it('links straight to the signing page when the provider gave one', async () => {
    vi.mocked(prisma.documentEnvelope.findUnique).mockResolvedValue({
      ...envelope,
      countersignUrl: 'https://sign.test/alice',
    } as never)
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue({ id: 'att-alice', name: 'Alice Donald' } as never)

    await notifyCountersignerClientSigned('env-1')

    const cta = (deliverDirectNotification.mock.calls[0][0] as any).cta
    expect(cta[0]).toEqual({ label: 'Countersign now', url: 'https://sign.test/alice' })
  })

  it('does nothing for an agreement without a countersigner', async () => {
    vi.mocked(prisma.documentEnvelope.findUnique).mockResolvedValue({ ...envelope, countersignerEmail: null } as never)

    await notifyCountersignerClientSigned('env-1')

    expect(notifyAttorneyInApp).not.toHaveBeenCalled()
    expect(deliverDirectNotification).not.toHaveBeenCalled()
  })
})
