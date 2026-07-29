import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

vi.mock('./lib/auth', () => {
  const users: Record<string, any> = {
    plaintiff: {
      id: 'plaintiff-user-1',
      email: 'plaintiff@example.com',
      role: 'plaintiff',
      isActive: true,
    },
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
    AuthRequest: {},
  }
})

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'

const row = (overrides: Partial<any> = {}) => ({
  id: 'notif-1',
  type: 'plaintiff.consult_cancelled',
  subject: 'Your consultation was cancelled',
  message: 'Ari Attorney cancelled your consultation on Aug 1, 2026 at 2:00 PM PDT.',
  metadata: JSON.stringify({ link: '/dashboard', assessmentId: 'assess-1' }),
  readAt: null,
  createdAt: new Date('2026-07-29T12:00:00Z'),
  ...overrides,
})

describe('GET /v1/plaintiff/notifications', () => {
  const app = buildApp()

  beforeEach(() => {
    resetUniversalPrismaMock()
  })

  it('requires authentication', async () => {
    const res = await request(app).get('/v1/plaintiff/notifications')
    expect(res.status).toBe(401)
  })

  it('returns the plaintiff feed with the link lifted out of metadata', async () => {
    vi.mocked(prisma.notification.findMany).mockResolvedValue([row()] as any)
    vi.mocked(prisma.notification.count).mockResolvedValue(1 as any)

    const res = await request(app)
      .get('/v1/plaintiff/notifications')
      .set('Authorization', 'Bearer plaintiff')

    expect(res.status).toBe(200)
    expect(res.body.unreadCount).toBe(1)
    expect(res.body.notifications).toHaveLength(1)
    expect(res.body.notifications[0]).toMatchObject({
      id: 'notif-1',
      type: 'plaintiff.consult_cancelled',
      title: 'Your consultation was cancelled',
      link: '/dashboard',
      assessmentId: 'assess-1',
      read: false,
    })
  })

  it('reads only this user rows carrying the plaintiff type prefix', async () => {
    vi.mocked(prisma.notification.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.notification.count).mockResolvedValue(0 as any)

    await request(app).get('/v1/plaintiff/notifications').set('Authorization', 'Bearer plaintiff')

    // The prefix is the whole visibility contract: an in-app row written
    // without it is one no endpoint returns, which is exactly how consult
    // cancellations went unseen.
    expect(vi.mocked(prisma.notification.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'plaintiff-user-1', type: { startsWith: 'plaintiff.' } },
      })
    )
  })

  it('survives a notification whose metadata is not valid JSON', async () => {
    vi.mocked(prisma.notification.findMany).mockResolvedValue([row({ metadata: 'not json' })] as any)
    vi.mocked(prisma.notification.count).mockResolvedValue(1 as any)

    const res = await request(app)
      .get('/v1/plaintiff/notifications')
      .set('Authorization', 'Bearer plaintiff')

    expect(res.status).toBe(200)
    expect(res.body.notifications[0].link).toBeNull()
    expect(res.body.notifications[0].title).toBe('Your consultation was cancelled')
  })
})

describe('POST /v1/plaintiff/notifications/read-all', () => {
  const app = buildApp()

  beforeEach(() => {
    resetUniversalPrismaMock()
  })

  it('marks only the caller unread plaintiff rows as read', async () => {
    vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 3 } as any)

    const res = await request(app)
      .post('/v1/plaintiff/notifications/read-all')
      .set('Authorization', 'Bearer plaintiff')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ updated: 3, unreadCount: 0 })
    expect(vi.mocked(prisma.notification.updateMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'plaintiff-user-1',
          type: { startsWith: 'plaintiff.' },
          readAt: null,
        },
      })
    )
  })
})
