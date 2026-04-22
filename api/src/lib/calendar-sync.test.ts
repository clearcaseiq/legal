import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { renewCalendarWebhookSubscriptions } from './calendar-sync'
import { ENV } from '../env'

describe('renewCalendarWebhookSubscriptions', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    vi.unstubAllGlobals()
    ENV.GOOGLE_CALENDAR_WEBHOOK_URI = 'https://api.caseiq.local/v1/attorney-calendar/webhooks/google'
    ENV.MICROSOFT_CALENDAR_WEBHOOK_URI = 'https://api.caseiq.local/v1/attorney-calendar/webhooks/microsoft'
  })

  it('renews due Google webhook subscriptions', async () => {
    vi.mocked(prisma.attorneyCalendarConnection.findMany).mockResolvedValue([
      { id: 'conn-1', provider: 'google' },
    ] as any)
    vi.mocked(prisma.attorneyCalendarConnection.findUnique).mockResolvedValue({
      id: 'conn-1',
      attorneyId: 'att-1',
      provider: 'google',
      accessToken: 'token-1',
      refreshToken: 'refresh-1',
      tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      calendarId: 'primary',
      calendarName: 'Primary',
      timezone: 'UTC',
      webhookExpiresAt: new Date(Date.now() + 2 * 60 * 1000),
    } as any)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'channel-1',
        resourceId: 'resource-1',
        expiration: String(Date.now() + 60 * 60 * 1000),
      }),
    }))

    const result = await renewCalendarWebhookSubscriptions()

    expect(result).toEqual({
      processedCount: 1,
      renewedCount: 1,
      failedCount: 0,
    })
    expect(vi.mocked(prisma.attorneyCalendarConnection.update)).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'conn-1' },
      data: expect.objectContaining({
        webhookChannelId: 'channel-1',
        webhookResourceId: 'resource-1',
      }),
    }))
  })

  it('continues when one renewal fails', async () => {
    vi.mocked(prisma.attorneyCalendarConnection.findMany).mockResolvedValue([
      { id: 'conn-fail', provider: 'google' },
      { id: 'conn-ok', provider: 'microsoft' },
    ] as any)

    vi.mocked(prisma.attorneyCalendarConnection.findUnique)
      .mockResolvedValueOnce({
        id: 'conn-fail',
        attorneyId: 'att-1',
        provider: 'google',
        accessToken: 'token-1',
        refreshToken: 'refresh-1',
        tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        calendarId: 'primary',
        calendarName: 'Primary',
        timezone: 'UTC',
        webhookExpiresAt: null,
      } as any)
      .mockResolvedValueOnce({
        id: 'conn-ok',
        attorneyId: 'att-2',
        provider: 'microsoft',
        accessToken: 'token-2',
        refreshToken: 'refresh-2',
        tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        calendarId: 'primary',
        calendarName: 'Primary',
        timezone: 'UTC',
        webhookClientState: 'client-state',
        webhookExpiresAt: new Date(Date.now() + 60 * 1000),
      } as any)

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'google error' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      }))

    const result = await renewCalendarWebhookSubscriptions()

    expect(result).toEqual({
      processedCount: 2,
      renewedCount: 1,
      failedCount: 1,
    })
  })
})
