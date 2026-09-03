/**
 * The claimant-facing half of on-behalf editing.
 *
 * The authorization that matters here does not exist in the library layer: a
 * proposal id is a bare cuid, and the confirmation route is reached with both an
 * assessment id and a proposal id. Without a check that the two belong together,
 * a claimant authorized for their own case could confirm a write onto somebody
 * else's.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

const { approveMock, rejectMock, listMock } = vi.hoisted(() => ({
  approveMock: vi.fn(),
  rejectMock: vi.fn(),
  listMock: vi.fn(),
}))

vi.mock('./lib/case-reconciliation', () => ({
  approveExternalWriteProposal: approveMock,
  rejectExternalWriteProposal: rejectMock,
  listClaimantFactProposals: listMock,
}))

vi.mock('./lib/case-insights', () => ({
  buildMedicalChronology: vi.fn(),
  buildMedicalChronologySummary: vi.fn(),
  buildPlaintiffMedicalReview: vi.fn(),
  computeCasePreparation: vi.fn(),
  getSettlementBenchmarks: vi.fn(),
}))

vi.mock('./lib/auth', () => {
  const users: Record<string, any> = {
    plaintiff: { id: 'user-1', email: 'plaintiff@example.com', role: 'user', isActive: true },
  }
  const resolveUser = (req: any) => {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) return null
    return users[header.substring(7)] ?? null
  }
  return {
    authMiddleware: (req: any, res: any, next: any) => {
      const user = resolveUser(req)
      if (!user) return res.status(401).json({ error: 'No token provided' })
      req.user = user
      next()
    },
    optionalAuthMiddleware: (req: any, _res: any, next: any) => {
      const user = resolveUser(req)
      if (user) req.user = user
      next()
    },
    requireRole: () => (_req: any, _res: any, next: any) => next(),
    generateToken: vi.fn(),
    verifyToken: vi.fn(),
  }
})

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'

const OWNED = { id: 'asm-owned', userId: 'user-1', facts: '{}', user: { email: 'plaintiff@example.com' } }

const url = (assessmentId: string, proposalId: string) =>
  `/v1/case-insights/assessments/${assessmentId}/fact-confirmations/${proposalId}`

describe('claimant fact confirmations', () => {
  const app = buildApp()

  beforeEach(() => {
    resetUniversalPrismaMock()
    approveMock.mockReset().mockResolvedValue({ ok: true, proposal: { id: 'p-1' } })
    rejectMock.mockReset().mockResolvedValue({ ok: true, proposal: { id: 'p-1' } })
    listMock.mockReset().mockResolvedValue([])
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(OWNED as any)
  })

  it('confirms a proposal that belongs to the case', async () => {
    vi.mocked(prisma.externalWriteProposal.findUnique).mockResolvedValue({ assessmentId: 'asm-owned' } as any)

    await request(app)
      .post(url('asm-owned', 'p-1'))
      .set('Authorization', 'Bearer plaintiff')
      .send({ decision: 'confirm' })
      .expect(200)

    // Standing declared explicitly, so the library can refuse a proposal the
    // claimant has no business approving.
    expect(approveMock).toHaveBeenCalledWith('p-1', expect.objectContaining({ as: 'claimant', userId: 'user-1' }))
  })

  it('refuses a proposal id belonging to another case', async () => {
    vi.mocked(prisma.externalWriteProposal.findUnique).mockResolvedValue({ assessmentId: 'asm-someone-else' } as any)

    const res = await request(app)
      .post(url('asm-owned', 'p-other'))
      .set('Authorization', 'Bearer plaintiff')
      .send({ decision: 'confirm' })
      .expect(404)

    expect(res.body).toEqual({ error: 'Confirmation not found' })
    expect(approveMock).not.toHaveBeenCalled()
  })

  it('declining keeps the claimant\u2019s existing answer', async () => {
    vi.mocked(prisma.externalWriteProposal.findUnique).mockResolvedValue({ assessmentId: 'asm-owned' } as any)

    await request(app)
      .post(url('asm-owned', 'p-1'))
      .set('Authorization', 'Bearer plaintiff')
      .send({ decision: 'decline', note: 'It was three weeks, not three months' })
      .expect(200)

    expect(rejectMock).toHaveBeenCalledWith(
      'p-1',
      expect.objectContaining({ as: 'claimant' }),
      'It was three weeks, not three months',
    )
    expect(approveMock).not.toHaveBeenCalled()
  })

  it('rejects a decision it does not recognise', async () => {
    await request(app)
      .post(url('asm-owned', 'p-1'))
      .set('Authorization', 'Bearer plaintiff')
      .send({ decision: 'maybe' })
      .expect(400)

    expect(approveMock).not.toHaveBeenCalled()
    expect(rejectMock).not.toHaveBeenCalled()
  })

  it('refuses an anonymous caller on a registered claimant\u2019s case', async () => {
    await request(app).post(url('asm-owned', 'p-1')).send({ decision: 'confirm' }).expect(401)
    expect(approveMock).not.toHaveBeenCalled()
  })

  it('surfaces a conflict from the library rather than reporting success', async () => {
    // A proposal already confirmed on another device, or one the claimant has no
    // standing over.
    vi.mocked(prisma.externalWriteProposal.findUnique).mockResolvedValue({ assessmentId: 'asm-owned' } as any)
    approveMock.mockResolvedValue({ ok: false, reason: 'not_pending' })

    const res = await request(app)
      .post(url('asm-owned', 'p-1'))
      .set('Authorization', 'Bearer plaintiff')
      .send({ decision: 'confirm' })
      .expect(409)

    expect(res.body).toEqual({ error: 'not_pending' })
  })
})
