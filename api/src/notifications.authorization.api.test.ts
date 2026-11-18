import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

vi.mock('./lib/auth', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/, '')
    if (!token) return res.status(401).json({ error: 'No token provided' })
    req.user = token === 'admin'
      ? { id: 'admin-1', email: 'admin@example.com', role: 'admin' }
      : { id: 'user-1', email: 'user@example.com', role: 'user' }
    next()
  },
  optionalAuthMiddleware: (_req: any, _res: any, next: any) => next(),
  authMiddlewareAllowPendingMfa: (_req: any, _res: any, next: any) => next(),
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}))

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

import { buildApp } from './build-app'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'

describe('/v1/notify authorization', () => {
  const app = buildApp()

  beforeEach(() => {
    resetUniversalPrismaMock()
  })

  it('requires authentication', async () => {
    const res = await request(app).post('/v1/notify/send').send({})
    expect(res.status).toBe(401)
  })

  it('refuses authenticated non-admin users', async () => {
    const res = await request(app)
      .get('/v1/notify/notification-1')
      .set('Authorization', 'Bearer user')

    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/admin/i)
  })

  it('allows an admin through to request validation', async () => {
    const res = await request(app)
      .post('/v1/notify/send')
      .set('Authorization', 'Bearer admin')
      .send({})

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid input')
  })
})
