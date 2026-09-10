import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const request = vi.fn()

vi.mock('google-auth-library', () => ({
  GoogleAuth: class {
    getClient() {
      return Promise.resolve({ request })
    }
  },
}))

import { clearGa4Cache, fetchTrafficReport, isGa4Configured } from './ga4-analytics'

const SERVICE_ACCOUNT = JSON.stringify({
  type: 'service_account',
  client_email: 'reader@example.iam.gserviceaccount.com',
  private_key: '-----BEGIN PRIVATE KEY-----\nx\n-----END PRIVATE KEY-----\n',
})

function row(dimensions: string[], metrics: (string | number)[]) {
  return {
    dimensionValues: dimensions.map((value) => ({ value })),
    metricValues: metrics.map((value) => ({ value: String(value) })),
  }
}

/** Eight reports across two batches, in the order the module asks for them. */
function respondWithReports() {
  request
    .mockResolvedValueOnce({
      data: {
        reports: [
          { rows: [row([], [1200, 900, 700, 3400, 0.62, 95.5, 0.38])] },
          { rows: [row(['20260901'], [100, 60]), row(['20260902'], [140, 80])] },
          { rows: [row(['Organic Search'], [700, 400]), row(['Paid Search'], [300, 250])] },
          { rows: [row(['google', 'organic'], [700])] },
          { rows: [row(['spring-injury'], [300])] },
        ],
      },
    })
    .mockResolvedValueOnce({
      data: {
        reports: [
          { rows: [row(['/car-accident'], [500])] },
          { rows: [row(['mobile'], [800])] },
          { rows: [row(['California'], [450])] },
        ],
      },
    })
}

beforeEach(() => {
  clearGa4Cache()
  request.mockReset()
  process.env.GA4_PROPERTY_ID = '123456789'
  process.env.GA4_SERVICE_ACCOUNT_JSON = SERVICE_ACCOUNT
})

afterEach(() => {
  delete process.env.GA4_PROPERTY_ID
  delete process.env.GA4_SERVICE_ACCOUNT_JSON
})

describe('isGa4Configured', () => {
  it('is true only when both the property and the credentials are present', () => {
    expect(isGa4Configured()).toBe(true)

    delete process.env.GA4_SERVICE_ACCOUNT_JSON
    expect(isGa4Configured()).toBe(false)
  })
})

describe('fetchTrafficReport', () => {
  /**
   * Unconfigured is the normal state everywhere but production. It must not
   * throw, and it must be distinguishable from a site nobody visited.
   */
  it('reports not-configured rather than throwing when no property is set', async () => {
    delete process.env.GA4_PROPERTY_ID

    expect(await fetchTrafficReport(30)).toEqual({ configured: false })
    expect(request).not.toHaveBeenCalled()
  })

  it('shapes the GA4 response into the admin payload', async () => {
    respondWithReports()

    const result = await fetchTrafficReport(30)
    if (!result.configured) throw new Error('expected a configured report')

    expect(result.totals).toEqual({
      sessions: 1200,
      totalUsers: 900,
      newUsers: 700,
      pageViews: 3400,
      engagementRate: 0.62,
      averageSessionDuration: 95.5,
      bounceRate: 0.38,
    })
    expect(result.byChannel[0]).toEqual({ label: 'Organic Search', sessions: 700, newUsers: 400 })
    expect(result.byCampaign).toEqual([{ label: 'spring-injury', sessions: 300 }])
    expect(result.byLandingPage).toEqual([{ label: '/car-accident', sessions: 500 }])
    expect(result.byDevice).toEqual([{ label: 'mobile', sessions: 800 }])
    expect(result.byRegion).toEqual([{ label: 'California', sessions: 450 }])
  })

  it('turns the compact GA4 date into an ISO date the chart can label', async () => {
    respondWithReports()

    const result = await fetchTrafficReport(30)
    if (!result.configured) throw new Error('expected a configured report')

    expect(result.byDay).toEqual([
      { date: '2026-09-01', sessions: 100, newUsers: 60 },
      { date: '2026-09-02', sessions: 140, newUsers: 80 },
    ])
  })

  it('joins source and medium into one label', async () => {
    respondWithReports()

    const result = await fetchTrafficReport(30)
    if (!result.configured) throw new Error('expected a configured report')

    expect(result.bySourceMedium).toEqual([{ label: 'google / organic', sessions: 700 }])
  })

  /**
   * The Data API is quota-limited per property per day and this endpoint is hit
   * on every visit to the admin analytics screen.
   */
  it('serves a repeat request for the same window from cache', async () => {
    respondWithReports()

    await fetchTrafficReport(30)
    await fetchTrafficReport(30)

    expect(request).toHaveBeenCalledTimes(2) // two batches, one round of them
  })

  it('does not serve one window from another window cache', async () => {
    respondWithReports()
    await fetchTrafficReport(30)

    respondWithReports()
    const result = await fetchTrafficReport(7)

    expect(result).toMatchObject({ periodDays: 7 })
    expect(request).toHaveBeenCalledTimes(4)
  })

  it('reads base64 credentials, which is how secret stores avoid mangling the key', async () => {
    process.env.GA4_SERVICE_ACCOUNT_JSON = Buffer.from(SERVICE_ACCOUNT).toString('base64')
    respondWithReports()

    await expect(fetchTrafficReport(30)).resolves.toMatchObject({ configured: true })
  })

  it('survives a report that came back with no rows at all', async () => {
    request.mockResolvedValue({ data: { reports: [{}, {}, {}, {}, {}] } })

    const result = await fetchTrafficReport(30)
    if (!result.configured) throw new Error('expected a configured report')

    expect(result.totals.sessions).toBe(0)
    expect(result.byDay).toEqual([])
    expect(result.byRegion).toEqual([])
  })

  it('lets an upstream failure surface so the route can report it', async () => {
    request.mockRejectedValue(new Error('403 caller does not have permission'))

    await expect(fetchTrafficReport(30)).rejects.toThrow('permission')
  })
})
