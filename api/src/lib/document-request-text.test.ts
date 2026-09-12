import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))
vi.mock('./sms', () => ({
  sendSms: vi.fn().mockResolvedValue(true),
  canReceiveInboundMedia: vi.fn().mockReturnValue(true),
}))
vi.mock('./sms-opt-out', async () => {
  const actual = await vi.importActual<typeof import('./sms-opt-out')>('./sms-opt-out')
  return { ...actual, isSmsSuppressed: vi.fn().mockResolvedValue(false) }
})
vi.mock('./case-phone-binding', () => ({
  bindCasePhone: vi.fn().mockResolvedValue({ id: 'bind-1', assessmentId: 'asm-1', phoneE164: '+15550102456' }),
  claimantPhoneForAssessment: vi.fn().mockResolvedValue('+15550102456'),
}))
vi.mock('./document-request-create', () => ({
  createAndNotifyPlaintiffDocumentRequest: vi.fn().mockResolvedValue({
    docRequest: {
      id: 'dr-1',
      secureToken: 'tok-1',
      // The emailed link, which the text must NOT use: it needs a session.
      uploadLink: 'https://app.test/evidence-upload/asm-1?token=tok-1',
    },
    created: true,
    docs: ['medical_records', 'police_report'],
    alreadyRequested: [],
  }),
}))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { canReceiveInboundMedia, sendSms } from './sms'
import { isSmsSuppressed } from './sms-opt-out'
import { bindCasePhone, claimantPhoneForAssessment } from './case-phone-binding'
import { createAndNotifyPlaintiffDocumentRequest } from './document-request-create'
import { claimantPortalUrl, documentRequestSmsBody, sendDocumentRequestText } from './document-request-text'

const REQUEST = {
  leadId: 'lead-1',
  assessmentId: 'asm-1',
  attorney: { id: 'att-1', name: 'Rama Reddy, Esq.', email: 'rama@firm.com' },
  requestedDocs: ['medical_records', 'police_report'],
  firmName: 'Reddy Law',
}

beforeEach(() => {
  resetUniversalPrismaMock()
  vi.clearAllMocks()
  vi.mocked(claimantPhoneForAssessment).mockResolvedValue('+15550102456')
  vi.mocked(isSmsSuppressed).mockResolvedValue(false)
  vi.mocked(canReceiveInboundMedia).mockReturnValue(true)
  vi.mocked(createAndNotifyPlaintiffDocumentRequest).mockResolvedValue({
    docRequest: {
      id: 'dr-1',
      secureToken: 'tok-1',
      uploadLink: 'https://app.test/evidence-upload/asm-1?token=tok-1',
    },
    created: true,
    docs: ['medical_records', 'police_report'],
    alreadyRequested: [],
  } as any)
  vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
    facts: JSON.stringify({ plaintiffContext: { firstName: 'Dana' } }),
    user: { firstName: 'Dana' },
  } as any)
})

describe('the message the client reads', () => {
  it('names the firm, not us', () => {
    const body = documentRequestSmsBody({ firstName: 'Dana', firmName: 'Reddy Law', docs: ['medical_records'] })

    expect(body).toContain('Reddy Law')
  })

  it('asks for a photo rather than a login', () => {
    const body = documentRequestSmsBody({ firstName: 'Dana', firmName: 'Reddy Law', docs: ['bills'] })

    // The whole premise is that this client will not log in and upload.
    expect(body).toMatch(/take a photo/i)
    expect(body).not.toMatch(/log in|upload link|portal/i)
  })

  it('carries the opt-out notice carriers require', () => {
    expect(documentRequestSmsBody({ docs: ['bills'] })).toContain('STOP')
  })

  it('summarises a long list instead of sending four texts', () => {
    const body = documentRequestSmsBody({
      docs: ['medical_records', 'bills', 'police_report', 'injury_photos', 'wage_loss', 'insurance'],
    })

    expect(body).toContain('and 2 more')
  })

  it('says something useful when no specific documents were picked', () => {
    expect(documentRequestSmsBody({ docs: [] })).toMatch(/any case documents/i)
  })

  it('drops the greeting rather than saying "Hi ,"', () => {
    expect(documentRequestSmsBody({ docs: ['bills'] })).not.toContain('Hi ,')
  })

  it('sends a link instead of asking for photos when replies cannot reach us', () => {
    const body = documentRequestSmsBody({
      docs: ['bills'],
      mode: 'upload_link',
      uploadLink: claimantPortalUrl('tok-1'),
    })

    // The instruction is the promise. Telling someone to text a photo back on a
    // channel that drops media is the one thing this must never do.
    expect(body).not.toMatch(/text it back/i)
    expect(body).toContain('/respond/documents/tok-1')
  })

  it('promises no login only alongside the link that can honour it', () => {
    const body = documentRequestSmsBody({
      docs: ['bills'],
      mode: 'upload_link',
      uploadLink: 'https://app.test/respond/documents/tok-1',
    })

    expect(body).toMatch(/no login/i)
    expect(body).toContain('https://app.test/respond/documents/tok-1')
  })

  // The regression that produced this test: link mode shipped pointing at
  // `/evidence-upload/:id`, which bounces a visitor with no session to sign in,
  // while the message told them no login was needed.
  it('never texts the signed-in upload route', () => {
    const body = documentRequestSmsBody({
      docs: ['bills'],
      mode: 'upload_link',
      uploadLink: claimantPortalUrl('tok-1'),
    })

    expect(body).not.toContain('/evidence-upload/')
  })
})

describe('sending the request', () => {
  it('opens the channel before the invite goes out', async () => {
    const result = await sendDocumentRequestText(REQUEST)

    // A client who replies instantly must already be recognised; binding after
    // the send leaves a window where their first photo is refused.
    expect(vi.mocked(bindCasePhone).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(sendSms).mock.invocationCallOrder[0],
    )
    expect(result.outcome).toBe('sent')
  })

  it('creates the same document request the email flow creates', async () => {
    await sendDocumentRequestText(REQUEST)

    // Texted photos have to settle the request the attorney actually made,
    // rather than landing in a parallel silo the portal never reconciles.
    expect(createAndNotifyPlaintiffDocumentRequest).toHaveBeenCalledWith(
      expect.objectContaining({ leadId: 'lead-1', assessmentId: 'asm-1' }),
    )
  })

  it('does not also email and in-app them about it', async () => {
    await sendDocumentRequestText(REQUEST)

    expect(vi.mocked(createAndNotifyPlaintiffDocumentRequest).mock.calls[0][0].notify).toBe(false)
  })

  it('returns only the last four digits', async () => {
    const result = await sendDocumentRequestText(REQUEST)

    expect(result.phoneLast4).toBe('2456')
  })
})

describe('when the provider cannot receive photos', () => {
  beforeEach(() => {
    vi.mocked(canReceiveInboundMedia).mockReturnValue(false)
  })

  it('sends the upload link rather than asking for a reply', async () => {
    const result = await sendDocumentRequestText(REQUEST)

    expect(result.mode).toBe('upload_link')
    expect(vi.mocked(sendSms).mock.calls[0][1]).toContain('/respond/documents/tok-1')
  })

  // `docRequest.uploadLink` is the emailed link and points at the signed-in
  // dashboard. Texting it sent claimants — who mostly have no account — to a
  // login page under a message promising they would not need one.
  it('texts the tokenised portal, never the emailed signed-in link', async () => {
    await sendDocumentRequestText(REQUEST)

    expect(vi.mocked(sendSms).mock.calls[0][1]).not.toContain('/evidence-upload/')
  })

  it('opens no phone binding', async () => {
    await sendDocumentRequestText(REQUEST)

    // A binding here is a standing permission for documents that can never
    // arrive, and it would make the case look reachable by text everywhere
    // that reads the table.
    expect(bindCasePhone).not.toHaveBeenCalled()
  })

  it('still creates the document request, so the ask is tracked either way', async () => {
    const result = await sendDocumentRequestText(REQUEST)

    expect(createAndNotifyPlaintiffDocumentRequest).toHaveBeenCalled()
    expect(result.outcome).toBe('sent')
  })
})

describe('when the provider can receive photos', () => {
  it('asks for a reply and opens the binding', async () => {
    const result = await sendDocumentRequestText(REQUEST)

    expect(result.mode).toBe('photo_reply')
    expect(bindCasePhone).toHaveBeenCalled()
    expect(vi.mocked(sendSms).mock.calls[0][1]).toMatch(/text it back/i)
  })
})

describe('when we cannot text', () => {
  it('stops before creating a request if there is no number', async () => {
    vi.mocked(claimantPhoneForAssessment).mockResolvedValue(null)

    const result = await sendDocumentRequestText(REQUEST)

    expect(result.outcome).toBe('no_phone')
    expect(createAndNotifyPlaintiffDocumentRequest).not.toHaveBeenCalled()
  })

  it('refuses outright when the client texted STOP', async () => {
    vi.mocked(isSmsSuppressed).mockResolvedValue(true)

    const result = await sendDocumentRequestText(REQUEST)

    expect(result.outcome).toBe('opted_out')
    expect(sendSms).not.toHaveBeenCalled()
    expect(bindCasePhone).not.toHaveBeenCalled()
  })

  it('tells the attorney when the carrier dropped it', async () => {
    vi.mocked(sendSms).mockResolvedValue(false)

    const result = await sendDocumentRequestText(REQUEST)

    // The request exists either way — the attorney needs to know the client
    // was never actually asked.
    expect(result.outcome).toBe('send_failed')
    expect(result.documentRequestId).toBe('dr-1')
  })

  it('does not re-ask for documents already outstanding', async () => {
    vi.mocked(createAndNotifyPlaintiffDocumentRequest).mockResolvedValue({
      docRequest: { id: 'dr-0' },
      created: false,
      docs: [],
      alreadyRequested: ['medical_records'],
    } as any)

    const result = await sendDocumentRequestText(REQUEST)

    expect(result.outcome).toBe('already_requested')
    expect(sendSms).not.toHaveBeenCalled()
  })
})
