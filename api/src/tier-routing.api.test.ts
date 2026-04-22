/**
 * Tier routing HTTP endpoints with mocked tier engines + prisma.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('./lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./lib/auth')>()
  const users: Record<string, any> = {
    admin: {
      id: 'admin-1',
      email: 'admin@caseiq.com',
      role: 'admin',
      isActive: true,
    },
    attorney: {
      id: 'attorney-user-1',
      email: 'attorney@example.com',
      role: 'attorney',
      isActive: true,
    },
  }

  return {
    ...actual,
    authMiddleware: (req: any, res: any, next: any) => {
      const header = req.headers.authorization
      if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' })
      }
      const user = users[header.substring(7)]
      if (!user) {
        return res.status(401).json({ error: 'Invalid token' })
      }
      req.user = user
      next()
    },
    requireRole: (roles: string[]) => (req: any, res: any, next: any) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient privileges' })
      }
      next()
    },
  }
})

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

vi.mock('./lib/tier1-routing', () => ({
  routeTier1Case: vi.fn().mockResolvedValue({
    routed: true,
    routedToFirmId: 'firm-1',
    introductionId: 'intro-1',
    method: 'subscription',
    attempts: { subscription: 1, fixedPrice: 0 },
  }),
}))

vi.mock('./lib/tier2-routing', () => ({
  routeTier2Case: vi.fn().mockResolvedValue({
    routed: true,
    routedToFirmId: 'firm-2',
    introductionId: 'intro-2',
    method: 'auction',
    attempts: { subscription: 0, fixedPrice: 1 },
  }),
}))

vi.mock('./lib/tier3-routing', () => ({
  routeTier3Case: vi.fn().mockResolvedValue({
    routed: true,
    routedToFirmId: 'firm-3',
    introductionId: 'intro-3',
    method: 'fixed_price',
    attempts: { subscription: 0, fixedPrice: 1 },
    price: 250,
  }),
}))

vi.mock('./lib/tier4-routing', () => ({
  routeTier4Case: vi.fn().mockResolvedValue({
    routed: true,
    routedToFirmId: 'firm-4',
    introductionId: 'intro-4',
    method: 'auction',
    attempts: { subscription: 0, fixedPrice: 2 },
    price: 500,
  }),
}))

vi.mock('./lib/case-tier-classifier', () => ({
  assignCaseTier: vi.fn().mockResolvedValue(undefined),
}))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'
import { routeTier1Case } from './lib/tier1-routing'
import { routeTier2Case } from './lib/tier2-routing'
import { assignCaseTier } from './lib/case-tier-classifier'

describe('POST /v1/tier-routing', () => {
  const app = buildApp()

  beforeEach(() => {
    resetUniversalPrismaMock()
  })

  it('rejects anonymous requests', async () => {
    const res = await request(app).post('/v1/tier-routing/tier1/case-tier-1')
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'No token provided' })
  })

  it('rejects non-admin users', async () => {
    const res = await request(app)
      .post('/v1/tier-routing/tier1/case-tier-1')
      .set('Authorization', 'Bearer attorney')
    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: 'Insufficient privileges' })
  })

  it('tier1 returns engine payload', async () => {
    const res = await request(app)
      .post('/v1/tier-routing/tier1/case-tier-1')
      .set('Authorization', 'Bearer admin')
    expect(res.status).toBe(200)
    expect(res.body.routed).toBe(true)
    expect(res.body.caseId).toBe('case-tier-1')
    expect(routeTier1Case).toHaveBeenCalledWith('case-tier-1')
  })

  it('tier2 returns engine payload', async () => {
    const res = await request(app)
      .post('/v1/tier-routing/tier2/case-b')
      .set('Authorization', 'Bearer admin')
    expect(res.status).toBe(200)
    expect(res.body.routed).toBe(true)
    expect(routeTier2Case).toHaveBeenCalled()
  })

  it('tier3 includes price when routed', async () => {
    const res = await request(app)
      .post('/v1/tier-routing/tier3/case-c')
      .set('Authorization', 'Bearer admin')
    expect(res.status).toBe(200)
    expect(res.body.routed).toBe(true)
    expect(res.body.price).toBe(250)
  })

  it('tier4 includes price field', async () => {
    const res = await request(app)
      .post('/v1/tier-routing/tier4/case-d')
      .set('Authorization', 'Bearer admin')
    expect(res.status).toBe(200)
    expect(res.body.routed).toBe(true)
    expect(res.body.price).toBe(500)
  })

  it('auto returns 404 when case missing', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(null as any)
    const res = await request(app)
      .post('/v1/tier-routing/auto/missing')
      .set('Authorization', 'Bearer admin')
    expect(res.status).toBe(404)
  })

  it('auto routes tier 1 when case already has tier', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      id: 'c1',
      caseTier: { tierNumber: 1 },
    } as any)

    const res = await request(app)
      .post('/v1/tier-routing/auto/c1')
      .set('Authorization', 'Bearer admin')
    expect(res.status).toBe(200)
    expect(res.body.tier).toBe(1)
    expect(res.body.routed).toBe(true)
  })

  it('auto assigns tier and routes tier 2 when no tier initially', async () => {
    vi.mocked(prisma.assessment.findUnique)
      .mockResolvedValueOnce({ id: 'c2', caseTier: null } as any)
      .mockResolvedValueOnce({ id: 'c2', caseTier: { tierNumber: 2 } } as any)

    const res = await request(app)
      .post('/v1/tier-routing/auto/c2')
      .set('Authorization', 'Bearer admin')
    expect(res.status).toBe(200)
    expect(assignCaseTier).toHaveBeenCalledWith('c2')
    expect(res.body.tier).toBe(2)
  })

  it('auto assigns tier but returns 500 if tier still missing after classify', async () => {
    vi.mocked(prisma.assessment.findUnique)
      .mockResolvedValueOnce({ id: 'c3', caseTier: null } as any)
      .mockResolvedValueOnce({ id: 'c3', caseTier: null } as any)

    const res = await request(app)
      .post('/v1/tier-routing/auto/c3')
      .set('Authorization', 'Bearer admin')
    expect(res.status).toBe(500)
  })

  it('auto returns not implemented for unknown tier number', async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      id: 'c9',
      caseTier: { tierNumber: 99 },
    } as any)

    const res = await request(app)
      .post('/v1/tier-routing/auto/c9')
      .set('Authorization', 'Bearer admin')
    expect(res.status).toBe(200)
    expect(res.body.routed).toBe(false)
    expect(res.body.error).toMatch(/not yet implemented/)
  })
})
