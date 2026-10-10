import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

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

vi.mock('./lib/case-notifications', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./lib/case-notifications')>()),
  notifyAttorneyInApp: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { notifyAttorneyInApp } from './lib/case-notifications'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'

const OWNED = {
  id: 'asm-1',
  userId: 'user-1',
  evidenceNotes: null,
  user: { email: 'plaintiff@example.com' },
  leadSubmission: { id: 'lead-1', assignedAttorneyId: 'att-1' },
}

describe('evidence category notes', () => {
  const app = buildApp()

  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.mocked(notifyAttorneyInApp).mockClear()
  })

  it('saves the owner\'s note keyed by category and tells the assigned attorney', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(OWNED as any)

    const res = await request(app)
      .put('/v1/assessments/asm-1/evidence-notes')
      .set('Authorization', 'Bearer plaintiff')
      .send({ category: 'photos', label: 'Injury photos', note: '  I did not take any photos.  ' })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ category: 'photos', note: 'I did not take any photos.' })
    const data = vi.mocked(prisma.assessment.update).mock.calls[0][0].data as any
    expect(data.evidenceNotes.photos).toMatchObject({ note: 'I did not take any photos.', label: 'Injury photos' })
    expect(notifyAttorneyInApp).toHaveBeenCalledWith(
      expect.objectContaining({ attorneyId: 'att-1', subject: 'Client note on Injury photos' }),
    )
  })

  it('clears the note when it is saved empty', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      ...OWNED,
      evidenceNotes: { photos: { note: 'old', label: 'Injury photos', updatedAt: '2026-10-01T00:00:00Z' } },
    } as any)

    const res = await request(app)
      .put('/v1/assessments/asm-1/evidence-notes')
      .set('Authorization', 'Bearer plaintiff')
      .send({ category: 'photos', note: '' })

    expect(res.status).toBe(200)
    expect(res.body.note).toBeNull()
    expect(notifyAttorneyInApp).not.toHaveBeenCalled()
  })

  it('refuses a signed-in user who does not own the case', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(OWNED as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ email: 'plaintiff@example.com' } as any)

    const res = await request(app)
      .put('/v1/assessments/asm-1/evidence-notes')
      .set('Authorization', 'Bearer stranger')
      .send({ category: 'photos', note: 'hi' })

    expect(res.status).toBe(403)
    expect(prisma.assessment.update).not.toHaveBeenCalled()
  })

  it('lets an anonymous visitor note a case that has no account yet', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({ ...OWNED, userId: null, leadSubmission: null } as any)

    const res = await request(app)
      .put('/v1/assessments/asm-1/evidence-notes')
      .send({ category: 'medical_records', label: 'Medical records', note: 'Still treating.' })

    expect(res.status).toBe(200)
    expect(notifyAttorneyInApp).not.toHaveBeenCalled()
  })

  it('rejects notes over 1000 characters', async () => {
    const res = await request(app)
      .put('/v1/assessments/asm-1/evidence-notes')
      .set('Authorization', 'Bearer plaintiff')
      .send({ category: 'photos', note: 'x'.repeat(1001) })

    expect(res.status).toBe(400)
  })
})
