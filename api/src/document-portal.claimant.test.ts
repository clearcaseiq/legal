/**
 * The no-login page a claimant reaches from the text their attorney sent.
 *
 * This exists because the first version of "Text request to client" texted
 * `/evidence-upload/:id`, which bounces a visitor with no session to a login
 * screen — under a message promising no login was needed, to people who mostly
 * have no account. The portal is the fix, so what is asserted here is the part
 * that made it a fix: the token opens without a session, the file becomes
 * ordinary case evidence, and the page shows the claimant nothing about the
 * case beyond the request they answered.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))
vi.mock('./lib/case-owner', () => ({ ensureCaseOwnerUserId: vi.fn(async () => 'user-1') }))
vi.mock('./lib/evidence-intake', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./lib/evidence-intake')>()),
  fileClaimantEvidence: vi.fn(async () => ({
    status: 'filed' as const,
    evidenceFileId: 'ev-1',
    filed: { originalName: 'bill.pdf', category: 'bills' },
  })),
  fanOutCaseUpdates: vi.fn(),
}))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'
import { fanOutCaseUpdates, fileClaimantEvidence } from './lib/evidence-intake'

const app = buildApp()

function claimantRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: 'dr-1',
    targetType: 'plaintiff',
    secureToken: 'tok-1',
    requestedDocs: JSON.stringify(['medical_records', 'injury_photos']),
    customMessage: 'Whenever you get a chance.',
    status: 'pending',
    externalUploads: [],
    attorney: { name: 'Rama Reddy, Esq.', lawFirm: { name: 'Reddy Law' } },
    lead: { assessmentId: 'asm-1' },
    documentEnvelope: null,
    ...overrides,
  }
}

beforeEach(() => {
  resetUniversalPrismaMock()
  vi.clearAllMocks()
  vi.mocked(prisma.documentRequest.findUnique).mockResolvedValue(claimantRequest() as any)
  vi.mocked(prisma.evidenceFile.findMany).mockResolvedValue([] as any)
})

describe('opening the texted link', () => {
  it('works with no session at all', async () => {
    const res = await request(app).get('/v1/public/document-requests/tok-1')

    expect(res.status).toBe(200)
    expect(res.body.mode).toBe('claimant')
    expect(res.body.requestedDocs.map((d: any) => d.label)).toEqual(['Medical records', 'Injury photos'])
  })

  it('shows the firm doing the asking, so the text is not mistaken for a scam', async () => {
    const res = await request(app).get('/v1/public/document-requests/tok-1')

    expect(res.body.firmName).toBe('Reddy Law')
    expect(res.body.customMessage).toBe('Whenever you get a chance.')
  })

  it('lists only what came through this request, never the rest of the case', async () => {
    await request(app).get('/v1/public/document-requests/tok-1')

    // The token travels by SMS to a phone that can be shared, borrowed or lost.
    // Querying the assessment without this filter would turn a forwarded text
    // into a window onto the whole file.
    expect(vi.mocked(prisma.evidenceFile.findMany).mock.calls[0][0]).toMatchObject({
      where: { assessmentId: 'asm-1', provenanceSource: 'portal:dr-1' },
    })
  })

  it('ticks off an item answered by a file stored under a different category', async () => {
    // A claimant answering `injury_photos` produces evidence filed as `photos`.
    // Comparing the two names directly leaves every item looking outstanding no
    // matter how much they sent.
    vi.mocked(prisma.evidenceFile.findMany).mockResolvedValue([
      { id: 'ev-1', originalName: 'knee.jpg', category: 'photos', createdAt: new Date() },
    ] as any)

    const res = await request(app).get('/v1/public/document-requests/tok-1')

    const photos = res.body.requestedDocs.find((d: any) => d.key === 'injury_photos')
    expect(photos.fulfilled).toBe(true)
  })

  it('still serves the opposing-party portal it was built for', async () => {
    vi.mocked(prisma.documentRequest.findUnique).mockResolvedValue(
      claimantRequest({ targetType: 'opposing_party', recipientName: 'ABC Insurance' }) as any,
    )

    const res = await request(app).get('/v1/public/document-requests/tok-1')

    expect(res.status).toBe(200)
    expect(res.body.mode).toBe('opposing')
    expect(res.body.recipientName).toBe('ABC Insurance')
  })
})

describe('sending a document through the link', () => {
  it('lands it as ordinary case evidence and runs the usual chain', async () => {
    const res = await request(app)
      .post('/v1/public/document-requests/tok-1/upload')
      .attach('file', Buffer.from('%PDF-1.4 fake'), 'bill.pdf')

    expect(res.status).toBe(200)
    // The whole point: nothing downstream should be able to tell this apart
    // from a document uploaded while signed in.
    expect(vi.mocked(fileClaimantEvidence).mock.calls[0][0]).toMatchObject({
      assessmentId: 'asm-1',
      ownerUserId: 'user-1',
      uploadMethod: 'upload_link',
      provenanceSource: 'portal:dr-1',
    })
    expect(fanOutCaseUpdates).toHaveBeenCalledWith('asm-1', [{ originalName: 'bill.pdf', category: 'bills' }])
  })

  it('files it under the category that satisfies the document asked for', async () => {
    await request(app)
      .post('/v1/public/document-requests/tok-1/upload')
      .field('docType', 'injury_photos')
      .attach('file', Buffer.from('jpegbytes'), 'knee.jpg')

    // Storing the request key verbatim would leave the file in a category
    // nothing reads, so the request it answered would stay pending forever.
    expect(vi.mocked(fileClaimantEvidence).mock.calls[0][0]).toMatchObject({ category: 'photos' })
  })

  it('ignores a document type the attorney never asked for', async () => {
    await request(app)
      .post('/v1/public/document-requests/tok-1/upload')
      .field('docType', 'something_invented')
      .attach('file', Buffer.from('%PDF-1.4 fake'), 'bill.pdf')

    // The value arrives in a public request body.
    expect(vi.mocked(fileClaimantEvidence).mock.calls[0][0].category).toBeUndefined()
  })

  it('treats a re-sent file as already received rather than an error', async () => {
    vi.mocked(fileClaimantEvidence).mockResolvedValue({ status: 'duplicate' } as any)

    const res = await request(app)
      .post('/v1/public/document-requests/tok-1/upload')
      .attach('file', Buffer.from('%PDF-1.4 fake'), 'bill.pdf')

    // People re-send when they are unsure the first one worked. Counting it
    // twice would bill the same treatment twice in the damages total.
    expect(res.status).toBe(200)
    expect(res.body.duplicate).toBe(true)
    expect(fanOutCaseUpdates).not.toHaveBeenCalled()
  })

  it('refuses a token that matches nothing', async () => {
    vi.mocked(prisma.documentRequest.findUnique).mockResolvedValue(null as any)

    const res = await request(app)
      .post('/v1/public/document-requests/nope/upload')
      .attach('file', Buffer.from('%PDF-1.4 fake'), 'bill.pdf')

    expect(res.status).toBe(404)
    expect(fileClaimantEvidence).not.toHaveBeenCalled()
  })
})
