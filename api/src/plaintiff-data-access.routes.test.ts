/**
 * Authorization regressions for the routes that serve one claimant's case data.
 *
 * Each of these routes gated on a local check of the shape
 * `assessment.userId && userId && assessment.userId !== userId`, which only
 * fires when the caller is signed in as somebody else. An anonymous caller has
 * no id, so the condition was false and the read went through — a registered
 * plaintiff's medical chronology, evidence list, and case submission were all
 * reachable by anyone holding the assessment id.
 *
 * The pre-account funnel genuinely depends on id-only access, so every case here
 * asserts both halves: an owned case refuses the anonymous caller, and an
 * unowned (or guest-shadow) case still serves them.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

const { buildMedicalChronologyMock, buildMedicalChronologySummaryMock } = vi.hoisted(() => ({
  buildMedicalChronologyMock: vi.fn(),
  buildMedicalChronologySummaryMock: vi.fn(),
}))

vi.mock('./lib/case-insights', () => ({
  buildMedicalChronology: buildMedicalChronologyMock,
  buildMedicalChronologySummary: buildMedicalChronologySummaryMock,
  buildPlaintiffMedicalReview: vi.fn(),
  computeCasePreparation: vi.fn(),
  getSettlementBenchmarks: vi.fn(),
}))

vi.mock('./lib/auth', () => {
  const users: Record<string, any> = {
    plaintiff: { id: 'user-1', email: 'plaintiff@example.com', role: 'user', isActive: true },
    stranger: { id: 'user-2', email: 'stranger@example.com', role: 'user', isActive: true },
  }

  function resolveUser(req: any) {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) return null
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

/** An assessment owned by a real, registered account. */
const OWNED = {
  id: 'asm-owned',
  userId: 'user-1',
  facts: '{}',
  user: { email: 'plaintiff@example.com' },
}

/** Pre-account intake: the id is the only credential there is. */
const UNOWNED = { id: 'asm-open', userId: null, facts: '{}' }

/** Anonymous intake that uploaded a file, so a synthetic owner row exists. */
const GUEST_SHADOW = {
  id: 'asm-guest',
  userId: 'guest-user',
  facts: '{}',
  user: { email: 'guest+asm-guest@caseiq.local' },
}

describe('plaintiff case-data authorization', () => {
  const app = buildApp()

  beforeEach(() => {
    resetUniversalPrismaMock()
    buildMedicalChronologyMock.mockReset()
    buildMedicalChronologyMock.mockResolvedValue({ events: [] })
    buildMedicalChronologySummaryMock.mockReset()
    buildMedicalChronologySummaryMock.mockResolvedValue({ totalVisits: 0 })
  })

  describe('medical chronology', () => {
    const url = (id: string) => `/v1/case-insights/assessments/${id}/medical-chronology`

    it('refuses an anonymous read of a registered claimant’s chronology', async () => {
      vi.mocked(prisma.assessment.findUnique).mockResolvedValue(OWNED as any)

      const res = await request(app).get(url('asm-owned')).expect(401)

      expect(res.body).toEqual({ error: 'Authentication required' })
      expect(buildMedicalChronologyMock).not.toHaveBeenCalled()
    })

    it('refuses a signed-in stranger', async () => {
      vi.mocked(prisma.assessment.findUnique).mockResolvedValue(OWNED as any)
      vi.mocked(prisma.attorney.findFirst).mockResolvedValue(null as any)
      vi.mocked(prisma.firmMember.findMany).mockResolvedValue([] as any)

      await request(app)
        .get(url('asm-owned'))
        .set('Authorization', 'Bearer stranger')
        .expect(403)

      expect(buildMedicalChronologyMock).not.toHaveBeenCalled()
    })

    it('serves the owner', async () => {
      vi.mocked(prisma.assessment.findUnique).mockResolvedValue(OWNED as any)

      await request(app)
        .get(url('asm-owned'))
        .set('Authorization', 'Bearer plaintiff')
        .expect(200)

      expect(buildMedicalChronologyMock).toHaveBeenCalledWith('asm-owned')
    })

    it('still serves pre-account intake by id alone', async () => {
      vi.mocked(prisma.assessment.findUnique).mockResolvedValue(UNOWNED as any)

      const res = await request(app).get(url('asm-open')).expect(200)

      expect(res.headers['x-robots-tag']).toContain('noindex')
      expect(buildMedicalChronologyMock).toHaveBeenCalledWith('asm-open')
    })

    it('still serves a guest-shadow case, so uploading a file does not lock the guest out', async () => {
      vi.mocked(prisma.assessment.findUnique).mockResolvedValue(GUEST_SHADOW as any)

      await request(app).get(url('asm-guest')).expect(200)

      expect(buildMedicalChronologyMock).toHaveBeenCalledWith('asm-guest')
    })
  })

  describe('evidence list', () => {
    it('refuses an anonymous list of an owned case', async () => {
      vi.mocked(prisma.assessment.findUnique).mockResolvedValue(OWNED as any)

      await request(app).get('/v1/evidence').query({ assessmentId: 'asm-owned' }).expect(401)

      expect(prisma.evidenceFile.findMany).not.toHaveBeenCalled()
    })

    it('still lists files for pre-account intake', async () => {
      vi.mocked(prisma.assessment.findUnique).mockResolvedValue(UNOWNED as any)
      vi.mocked(prisma.evidenceFile.findMany).mockResolvedValue([{ id: 'file-1' }] as any)

      const res = await request(app)
        .get('/v1/evidence')
        .query({ assessmentId: 'asm-open' })
        .expect(200)

      expect(res.body).toEqual([{ id: 'file-1' }])
    })

    it('caps the number of rows returned', async () => {
      vi.mocked(prisma.assessment.findUnique).mockResolvedValue(UNOWNED as any)
      vi.mocked(prisma.evidenceFile.findMany).mockResolvedValue([] as any)

      await request(app).get('/v1/evidence').query({ assessmentId: 'asm-open' }).expect(200)

      expect(prisma.evidenceFile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 200 }),
      )
    })
  })

  describe('submit for review', () => {
    const body = {
      firstName: 'Pat',
      email: 'pat@example.com',
      phone: '5105550123',
      attorneyShareAuthorized: true,
    }

    it('refuses to route a case the caller does not own', async () => {
      vi.mocked(prisma.assessment.findUnique).mockResolvedValue(OWNED as any)
      vi.mocked(prisma.attorney.findFirst).mockResolvedValue(null as any)
      vi.mocked(prisma.firmMember.findMany).mockResolvedValue([] as any)

      await request(app)
        .post('/v1/assessments/asm-owned/submit-for-review')
        .set('Authorization', 'Bearer stranger')
        .send(body)
        .expect(403)

      expect(prisma.leadSubmission.create).not.toHaveBeenCalled()
    })

    it('refuses an anonymous submission of an owned case', async () => {
      vi.mocked(prisma.assessment.findUnique).mockResolvedValue(OWNED as any)

      await request(app)
        .post('/v1/assessments/asm-owned/submit-for-review')
        .send(body)
        .expect(401)

      expect(prisma.leadSubmission.create).not.toHaveBeenCalled()
    })
  })

  describe('intake lead writes', () => {
    it('rejects a write once the resume window has closed', async () => {
      const stale = new Date(Date.now() - 96 * 60 * 60_000)
      vi.mocked(prisma.intakeLead.findUnique).mockResolvedValue({
        id: 'lead-1',
        updatedAt: stale,
        email: 'pat@example.com',
        phone: null,
        assessmentId: null,
        status: 'in_progress',
      } as any)

      await request(app)
        .patch('/v1/intake-leads/lead-1')
        .send({ currentStep: 'when' })
        .expect(410)

      expect(prisma.intakeLead.update).not.toHaveBeenCalled()
    })

    it('refuses to re-point an already linked assessment', async () => {
      vi.mocked(prisma.intakeLead.findUnique).mockResolvedValue({
        id: 'lead-1',
        updatedAt: new Date(),
        email: 'pat@example.com',
        phone: null,
        assessmentId: 'asm-open',
        status: 'in_progress',
      } as any)

      await request(app)
        .patch('/v1/intake-leads/lead-1')
        .send({ assessmentId: 'asm-owned' })
        .expect(409)

      expect(prisma.intakeLead.update).not.toHaveBeenCalled()
    })

    it('still accepts progress updates inside the window', async () => {
      vi.mocked(prisma.intakeLead.findUnique).mockResolvedValue({
        id: 'lead-1',
        updatedAt: new Date(),
        email: 'pat@example.com',
        phone: null,
        assessmentId: null,
        status: 'in_progress',
      } as any)
      vi.mocked(prisma.intakeLead.update).mockResolvedValue({
        id: 'lead-1',
        status: 'in_progress',
        email: 'pat@example.com',
        phone: null,
        assessmentId: null,
      } as any)

      await request(app)
        .patch('/v1/intake-leads/lead-1')
        .send({ currentStep: 'injury_severity' })
        .expect(200)

      expect(prisma.intakeLead.update).toHaveBeenCalled()
    })
  })
})
