import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))
vi.mock('./case-owner', () => ({ ensureCaseOwnerUserId: vi.fn().mockResolvedValue('user-1') }))
vi.mock('./object-storage', () => ({ persistUpload: vi.fn().mockResolvedValue(undefined) }))
vi.mock('./evidence-processing', () => ({
  processEvidenceFileForExtraction: vi.fn().mockResolvedValue({}),
  shouldAutoProcessEvidence: vi.fn().mockReturnValue(true),
}))
vi.mock('./case-recalculation', () => ({ runCaseRecalculation: vi.fn().mockResolvedValue(undefined) }))
vi.mock('./case-coach-loop', () => ({ syncCaseCoachTasks: vi.fn().mockResolvedValue(undefined) }))
vi.mock('./document-request-status', () => ({
  syncPlaintiffDocumentRequestStatuses: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('./assistance-document-intake', () => ({
  recordAssistanceDocumentSubmission: vi.fn().mockResolvedValue(undefined),
}))

import fs from 'fs'
import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { confirmationMessage, ingestSmsMedia } from './sms-media-intake'

const MEDIA_URL = 'https://api.twilio.com/2010-04-01/Accounts/AC1/Messages/MM1/Media/ME1'

function boundToCase() {
  vi.mocked(prisma.casePhoneBinding.findFirst).mockResolvedValue({
    id: 'bind-1',
    assessmentId: 'asm-1',
    phoneE164: '+15550102456',
  } as any)
}

function respondWith(bytes: Buffer, contentType = 'image/jpeg') {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      headers: { get: () => contentType },
    }),
  )
}

function createdFile() {
  return vi.mocked(prisma.evidenceFile.create).mock.calls[0]?.[0].data as any
}

/**
 * `fs` is a Node built-in, so a spy on it lives on an object every other test
 * file shares. Per-file isolation replaces the module registry, not the
 * built-ins, and this suite runs single-forked — so these have to be handed
 * back, or every file that runs after this one inherits an `existsSync` that
 * always says yes and a `writeFile` that silently drops its bytes.
 */
const fsSpies: { mockRestore: () => void }[] = []

beforeEach(() => {
  resetUniversalPrismaMock()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  process.env.TWILIO_ACCOUNT_SID = 'AC1'
  process.env.TWILIO_AUTH_TOKEN = 'token'
  fsSpies.push(vi.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined as any))
  fsSpies.push(vi.spyOn(fs, 'existsSync').mockReturnValue(true))
})

afterEach(() => {
  // Restoring these by hand rather than with `vi.restoreAllMocks()`, which also
  // strips the implementations off the `vi.fn()`s in the module mocks above and
  // leaves the rest of this file asserting against undefined.
  while (fsSpies.length) fsSpies.pop()!.mockRestore()
  vi.unstubAllGlobals()
})

describe('a number nobody invited', () => {
  it('files nothing', async () => {
    vi.mocked(prisma.casePhoneBinding.findFirst).mockResolvedValue(null)

    const result = await ingestSmsMedia({ fromPhone: '+15559999999', media: [{ url: MEDIA_URL }] })

    expect(result.outcome).toBe('no_binding')
    expect(prisma.evidenceFile.create).not.toHaveBeenCalled()
  })

  it('does not tell the sender whether a case exists', async () => {
    vi.mocked(prisma.casePhoneBinding.findFirst).mockResolvedValue(null)

    const result = await ingestSmsMedia({ fromPhone: '+15559999999', media: [{ url: MEDIA_URL }] })

    // Inbound medical records are worth being unhelpful about: confirming a
    // case exists for a number is itself a disclosure.
    expect(result.replyMessage).not.toMatch(/case #|found your case|asm-/i)
    expect(result.assessmentId).toBeNull()
  })

  it('never fetches the media', async () => {
    vi.mocked(prisma.casePhoneBinding.findFirst).mockResolvedValue(null)
    respondWith(Buffer.from('x'))

    await ingestSmsMedia({ fromPhone: '+15559999999', media: [{ url: MEDIA_URL }] })

    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('documents from an invited number', () => {
  beforeEach(() => {
    boundToCase()
    respondWith(Buffer.from('a bill'))
  })

  it('files them on the bound case', async () => {
    const result = await ingestSmsMedia({ fromPhone: '+15550102456', media: [{ url: MEDIA_URL }] })

    expect(result).toMatchObject({ outcome: 'filed', assessmentId: 'asm-1', filed: 1 })
    expect(createdFile()).toMatchObject({ assessmentId: 'asm-1', userId: 'user-1' })
  })

  it('marks them as having arrived by text', async () => {
    await ingestSmsMedia({ fromPhone: '+15550102456', media: [{ url: MEDIA_URL }] })

    // `uploadMethod` is what tells the inbox, the audit trail and the category
    // promotion that nobody chose a category for this file.
    expect(createdFile().uploadMethod).toBe('sms')
    expect(createdFile().category).toBe('other')
    expect(createdFile().accessLevel).toBe('private')
  })

  it('records where it came from', async () => {
    await ingestSmsMedia({ fromPhone: '+15550102456', media: [{ url: MEDIA_URL }], messageSid: 'MM1' })

    expect(createdFile().provenanceSource).toBe('sms:+15550102456')
    expect(createdFile().provenanceNotes).toContain('MM1')
  })

  it('names files so the classifier is not misled by the name', async () => {
    await ingestSmsMedia({ fromPhone: '+15550102456', media: [{ url: MEDIA_URL }] })

    // classifyEvidence matches on the filename as well as the OCR text, so a
    // name containing "photo" would push every texted bill into that bucket.
    expect(createdFile().originalName).not.toMatch(/photo|image/i)
  })

  it('queues extraction so the document is actually read', async () => {
    await ingestSmsMedia({ fromPhone: '+15550102456', media: [{ url: MEDIA_URL }] })

    expect(vi.mocked(prisma.evidenceProcessingJob.create).mock.calls[0][0].data).toMatchObject({
      jobType: 'full_processing',
      status: 'queued',
    })
  })

  it('stamps the binding as used', async () => {
    await ingestSmsMedia({ fromPhone: '+15550102456', media: [{ url: MEDIA_URL }] })

    expect(vi.mocked(prisma.casePhoneBinding.update).mock.calls[0][0]).toMatchObject({
      where: { id: 'bind-1' },
    })
  })
})

describe('the same photo sent twice', () => {
  it('is filed once', async () => {
    boundToCase()
    respondWith(Buffer.from('a bill'))
    vi.mocked(prisma.evidenceFile.findFirst).mockResolvedValue({ id: 'ev-1' } as any)

    const result = await ingestSmsMedia({ fromPhone: '+15550102456', media: [{ url: MEDIA_URL }] })

    // A text has no "already sent" state, so an unsure claimant re-sends. Filing
    // it again would count the same treatment twice in facts.damages.
    expect(result).toMatchObject({ outcome: 'nothing_usable', filed: 0, duplicates: 1 })
    expect(prisma.evidenceFile.create).not.toHaveBeenCalled()
  })

  it('looks the file up by its content, not its name', async () => {
    boundToCase()
    respondWith(Buffer.from('a bill'))

    await ingestSmsMedia({ fromPhone: '+15550102456', media: [{ url: MEDIA_URL }] })

    const where = vi.mocked(prisma.evidenceFile.findFirst).mock.calls[0][0].where as any
    expect(where.assessmentId).toBe('asm-1')
    expect(where.contentHash).toMatch(/^[a-f0-9]{64}$/)
  })
})

describe('media we will not fetch', () => {
  it('refuses a URL that is not Twilio', async () => {
    boundToCase()
    respondWith(Buffer.from('x'))

    const result = await ingestSmsMedia({
      fromPhone: '+15550102456',
      media: [{ url: 'https://evil.example.com/steal' }],
    })

    // The fetch carries our account credentials, so the host is pinned rather
    // than trusted even though the webhook body is signature-verified.
    expect(fetch).not.toHaveBeenCalled()
    expect(result).toMatchObject({ outcome: 'nothing_usable', rejected: 1 })
  })

  it('drops a file type the case file does not accept', async () => {
    boundToCase()
    respondWith(Buffer.from('MZ'), 'application/x-msdownload')

    const result = await ingestSmsMedia({ fromPhone: '+15550102456', media: [{ url: MEDIA_URL }] })

    expect(result).toMatchObject({ rejected: 1, filed: 0 })
    expect(prisma.evidenceFile.create).not.toHaveBeenCalled()
  })

  it('keeps going when one attachment fails', async () => {
    boundToCase()
    let call = 0
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => {
        call += 1
        if (call === 1) return { ok: false, status: 404, headers: { get: () => null } }
        const bytes = Buffer.from('second')
        return {
          ok: true,
          arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
          headers: { get: () => 'image/jpeg' },
        }
      }),
    )

    const result = await ingestSmsMedia({
      fromPhone: '+15550102456',
      media: [{ url: MEDIA_URL }, { url: MEDIA_URL }],
    })

    expect(result).toMatchObject({ filed: 1, rejected: 1 })
  })
})

describe('what the claimant is told', () => {
  it('confirms the count so they know it worked', () => {
    expect(confirmationMessage(3, 0, 0)).toContain('3 documents')
  })

  it('says nothing was lost when everything was a repeat', () => {
    expect(confirmationMessage(0, 2, 0)).toMatch(/already had/i)
  })

  it('asks for a resend only when something actually failed', () => {
    expect(confirmationMessage(2, 0, 1)).toMatch(/resend/i)
    expect(confirmationMessage(2, 0, 0)).not.toMatch(/resend/i)
  })

  it('does not claim success when nothing could be read', () => {
    expect(confirmationMessage(0, 0, 2)).toMatch(/could not read/i)
  })
})
