import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  liabilityEvidenceItem: { findFirst: vi.fn() },
  attorney: { findUnique: vi.fn() },
  assessment: { findUnique: vi.fn() },
  documentRequest: { create: vi.fn(), delete: vi.fn() },
}))
const sendEmail = vi.hoisted(() => vi.fn())
const sendSms = vi.hoisted(() => vi.fn())
const updateEvidenceItem = vi.hoisted(() => vi.fn())
const notifyInApp = vi.hoisted(() => vi.fn())

vi.mock('./prisma', () => ({ prisma: prismaMock }))
vi.mock('./claims', () => ({ sendTransactionalEmail: sendEmail }))
vi.mock('./sms', () => ({ sendSms }))
vi.mock('./liability-parties', () => ({ updateEvidenceItem }))
vi.mock('./case-notifications', () => ({ notifyAttorneyInApp: notifyInApp }))
vi.mock('./attorney-push', () => ({ notifyAttorneyByUserEmail: vi.fn().mockResolvedValue(undefined) }))
vi.mock('./case-recalculation', () => ({ runCaseRecalculation: vi.fn().mockResolvedValue(undefined) }))
vi.mock('./app-url', () => ({ webUrl: (p: string) => `https://app.test${p}` }))

import { recordWitnessUpload, sendWitnessUploadRequest, WitnessRequestError } from './witness-upload-request'

const actor = { actorId: 'u1', actorName: 'Ann Attorney' }
const base = { leadId: 'lead-1', assessmentId: 'a-1', attorneyId: 'att-1', itemId: 'item-1', actor }

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.liabilityEvidenceItem.findFirst.mockResolvedValue({
    id: 'item-1',
    type: 'witness_statement',
    status: 'needed',
    witnessName: 'Jane Ruiz',
    description: null,
  })
  prismaMock.attorney.findUnique.mockResolvedValue({ name: 'Ann Attorney', email: 'ann@firm.com', lawFirm: { name: 'Firm LLP' } })
  prismaMock.assessment.findUnique.mockResolvedValue({ user: { firstName: 'Sam', lastName: 'Client' } })
  prismaMock.documentRequest.create.mockResolvedValue({ id: 'req-1' })
  prismaMock.documentRequest.delete.mockResolvedValue({})
  sendEmail.mockResolvedValue(true)
  sendSms.mockResolvedValue(true)
})

describe('sendWitnessUploadRequest', () => {
  it('creates a witness request tied to the item, emails the link, and marks the item requested', async () => {
    const res = await sendWitnessUploadRequest({ ...base, body: { email: 'jane@example.com' } })

    expect(res).toMatchObject({ requestId: 'req-1', emailed: true, texted: false })
    const data = prismaMock.documentRequest.create.mock.calls[0][0].data
    expect(data).toMatchObject({
      targetType: 'opposing_party',
      recipientRole: 'witness',
      recipientName: 'Jane Ruiz',
      recipientEmail: 'jane@example.com',
      liabilityEvidenceItemId: 'item-1',
    })
    expect(JSON.parse(data.requestedDocs)).toEqual(['written_statement', 'photos', 'video_footage'])
    expect(sendEmail.mock.calls[0][0]).toMatchObject({
      to: 'jane@example.com',
      fromEmail: 'ann@firm.com',
      cta: { label: 'Upload photos or video', url: expect.stringContaining('/respond/documents/') },
    })
    expect(updateEvidenceItem).toHaveBeenCalledWith('a-1', 'item-1', { status: 'requested' }, actor)
  })

  it('needs an email or a mobile number', async () => {
    await expect(sendWitnessUploadRequest({ ...base, body: {} })).rejects.toBeInstanceOf(WitnessRequestError)
    expect(prismaMock.documentRequest.create).not.toHaveBeenCalled()
  })

  it('refuses evidence types a witness cannot send', async () => {
    prismaMock.liabilityEvidenceItem.findFirst.mockResolvedValue({ id: 'item-1', type: 'police_report', status: 'needed' })
    await expect(sendWitnessUploadRequest({ ...base, body: { email: 'jane@example.com' } })).rejects.toThrow(
      /witness statements, photos and video/,
    )
  })

  it('drops the request when neither email nor text went out', async () => {
    sendEmail.mockResolvedValue(false)
    await expect(sendWitnessUploadRequest({ ...base, body: { email: 'jane@example.com' } })).rejects.toThrow(
      /could not be sent/,
    )
    expect(prismaMock.documentRequest.delete).toHaveBeenCalledWith({ where: { id: 'req-1' } })
    expect(updateEvidenceItem).not.toHaveBeenCalled()
  })
})

describe('recordWitnessUpload', () => {
  const docRequest = {
    id: 'req-1',
    leadId: 'lead-1',
    attorneyId: 'att-1',
    liabilityEvidenceItemId: 'item-1',
    recipientName: 'Jane Ruiz',
  }

  it('links the first file, marks the item received, and notifies the attorney', async () => {
    prismaMock.liabilityEvidenceItem.findFirst.mockResolvedValue({ id: 'item-1', type: 'video', status: 'requested', evidenceFileId: null })
    await recordWitnessUpload({ docRequest, assessmentId: 'a-1', evidenceFileId: 'ev-9', originalName: 'clip.mov', uploadedByName: null })

    expect(updateEvidenceItem).toHaveBeenCalledWith(
      'a-1',
      'item-1',
      { status: 'received', evidenceFileId: 'ev-9' },
      { actorId: null, actorName: 'Jane Ruiz (upload link)' },
    )
    expect(notifyInApp.mock.calls[0][0]).toMatchObject({
      attorneyId: 'att-1',
      link: '/attorney-dashboard/cases/lead-1/liability',
    })
  })

  it('keeps an already linked document', async () => {
    prismaMock.liabilityEvidenceItem.findFirst.mockResolvedValue({ id: 'item-1', type: 'video', status: 'received', evidenceFileId: 'ev-1' })
    await recordWitnessUpload({ docRequest, assessmentId: 'a-1', evidenceFileId: 'ev-9', originalName: 'b.mov', uploadedByName: 'J' })
    expect(updateEvidenceItem).not.toHaveBeenCalled()
    expect(notifyInApp).toHaveBeenCalled()
  })
})
