import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

import { buildApp } from './build-app'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'
import { generateToken } from './lib/auth'

const app = buildApp()
const attorneyUser = {
  id: 'user-att-1',
  email: 'attorney@test.local',
  firstName: 'Avery',
  lastName: 'Law',
  isActive: true,
}

function authHeader(userId: string) {
  return { Authorization: `Bearer ${generateToken(userId)}` }
}

describe('Attorney calendar webhooks', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.unstubAllGlobals()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(attorneyUser as any)
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue({
      id: 'att-1',
      email: attorneyUser.email,
      name: 'Avery Law',
    } as any)
  })

  it('returns the Microsoft validation token in plain text', async () => {
    const res = await request(app)
      .post('/v1/attorney-calendar/webhooks/microsoft?validationToken=test-token-123')
      .send({})

    expect(res.status).toBe(200)
    expect(res.text).toBe('test-token-123')
    expect(res.headers['content-type']).toMatch(/text\/plain/)
  })

  it('accepts a Google webhook notification and refreshes busy blocks', async () => {
    vi.mocked(prisma.attorneyCalendarConnection.findFirst).mockResolvedValue({ id: 'conn-google-1' } as any)
    vi.mocked(prisma.attorneyCalendarConnection.findUnique).mockResolvedValue({
      id: 'conn-google-1',
      attorneyId: 'att-1',
      provider: 'google',
      accessToken: 'token-1',
      refreshToken: 'refresh-1',
      tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      calendarId: 'primary',
      calendarName: 'Primary',
      timezone: 'UTC',
      webhookChannelId: 'channel-1',
      webhookResourceId: 'resource-1',
      webhookToken: 'token-abc',
      webhookExpiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    } as any)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        calendars: {
          primary: {
            busy: [{ start: '2026-04-21T16:00:00.000Z', end: '2026-04-21T16:30:00.000Z' }],
          },
        },
      }),
    }))

    const res = await request(app)
      .post('/v1/attorney-calendar/webhooks/google')
      .set('x-goog-channel-id', 'channel-1')
      .set('x-goog-resource-id', 'resource-1')
      .set('x-goog-channel-token', 'token-abc')
      .send()

    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.attorneyCalendarBusyBlock.create)).toHaveBeenCalled()
    expect(vi.mocked(prisma.attorneyCalendarConnection.update)).toHaveBeenCalled()
  })

  it('accepts a Microsoft webhook notification and refreshes busy blocks', async () => {
    vi.mocked(prisma.attorneyCalendarConnection.findFirst).mockResolvedValue({ id: 'conn-ms-1' } as any)
    vi.mocked(prisma.attorneyCalendarConnection.findUnique).mockResolvedValue({
      id: 'conn-ms-1',
      attorneyId: 'att-1',
      provider: 'microsoft',
      accessToken: 'token-1',
      refreshToken: 'refresh-1',
      tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      calendarId: 'primary',
      calendarName: 'Primary',
      timezone: 'UTC',
      webhookSubscriptionId: 'sub-1',
      webhookClientState: 'client-state-1',
      webhookExpiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
    } as any)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        value: [
          {
            id: 'evt-1',
            showAs: 'busy',
            start: { dateTime: '2026-04-21T16:00:00.000Z' },
            end: { dateTime: '2026-04-21T16:30:00.000Z' },
            lastModifiedDateTime: '2026-04-21T15:00:00.000Z',
            isAllDay: false,
          },
        ],
      }),
    }))

    const res = await request(app)
      .post('/v1/attorney-calendar/webhooks/microsoft')
      .send({
        value: [
          {
            subscriptionId: 'sub-1',
            clientState: 'client-state-1',
            changeType: 'updated',
          },
        ],
      })

    expect(res.status).toBe(202)
    expect(vi.mocked(prisma.attorneyCalendarBusyBlock.create)).toHaveBeenCalled()
    expect(vi.mocked(prisma.attorneyCalendarConnection.update)).toHaveBeenCalled()
  })

  it('returns calendar health for the authenticated attorney', async () => {
    vi.mocked(prisma.attorneyCalendarConnection.findMany).mockResolvedValue([
      {
        id: 'conn-1',
        attorneyId: 'att-1',
        provider: 'google',
        externalAccountEmail: 'avery@gmail.com',
        calendarName: 'Primary',
        syncStatus: 'connected',
        lastSyncedAt: new Date('2026-04-12T12:00:00.000Z'),
        lastSyncError: null,
        webhookExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        lastWebhookAt: new Date('2026-04-12T12:05:00.000Z'),
        refreshToken: 'refresh',
        accessToken: 'access',
      },
    ] as any)
    vi.mocked(prisma.attorneyCalendarBusyBlock.groupBy).mockResolvedValue([
      { connectionId: 'conn-1', _count: { id: 4 } },
    ] as any)

    const res = await request(app)
      .get('/v1/attorney-calendar/health')
      .set(authHeader(attorneyUser.id))

    expect(res.status).toBe(200)
    expect(res.body.summary.healthyCount).toBe(1)
    expect(res.body.connections[0].health.busyBlockCount).toBe(4)
    expect(res.body.connections[0].health.status).toBe('healthy')
  })
})
