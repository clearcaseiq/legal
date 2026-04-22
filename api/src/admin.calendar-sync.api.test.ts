import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'
import { generateToken } from './lib/auth'

const app = buildApp()

const adminUser = {
  id: 'user-admin-1',
  email: 'admin@caseiq.com',
  firstName: 'Admin',
  lastName: 'User',
  isActive: true,
}

function authHeader(userId: string) {
  return { Authorization: `Bearer ${generateToken(userId)}` }
}

describe('GET /v1/admin/calendar-sync/health', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(adminUser as any)
    vi.mocked(prisma.attorneyCalendarConnection.findMany).mockResolvedValue([
      {
        id: 'conn-1',
        provider: 'google',
        externalAccountEmail: 'lawyer@example.com',
        syncStatus: 'connected',
        lastSyncedAt: new Date('2026-04-12T12:00:00.000Z'),
        lastSyncError: null,
        webhookExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        lastWebhookAt: new Date('2026-04-12T12:05:00.000Z'),
        refreshToken: 'refresh',
        accessToken: 'access',
        attorney: {
          id: 'att-1',
          name: 'Avery Law',
          email: 'attorney@test.local',
        },
      },
      {
        id: 'conn-2',
        provider: 'microsoft',
        externalAccountEmail: 'lawyer@outlook.com',
        syncStatus: 'sync_error',
        lastSyncedAt: new Date('2026-04-12T11:00:00.000Z'),
        lastSyncError: 'Token expired',
        webhookExpiresAt: null,
        lastWebhookAt: null,
        refreshToken: 'refresh',
        accessToken: 'access',
        attorney: {
          id: 'att-2',
          name: 'Taylor Counsel',
          email: 'taylor@test.local',
        },
      },
    ] as any)
    vi.mocked(prisma.attorneyCalendarBusyBlock.groupBy).mockResolvedValue([
      { connectionId: 'conn-1', _count: { id: 5 } },
      { connectionId: 'conn-2', _count: { id: 1 } },
    ] as any)
  })

  it('returns summary counts and connection diagnostics', async () => {
    const res = await request(app)
      .get('/v1/admin/calendar-sync/health')
      .set(authHeader(adminUser.id))

    expect(res.status).toBe(200)
    expect(res.body.summary.totalConnections).toBe(2)
    expect(res.body.summary.errorCount).toBe(1)
    expect(res.body.connections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: 'google',
          health: expect.objectContaining({ status: 'healthy', busyBlockCount: 5 }),
        }),
        expect.objectContaining({
          provider: 'microsoft',
          health: expect.objectContaining({ status: 'error', busyBlockCount: 1 }),
        }),
      ])
    )
  })
})
