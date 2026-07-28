import { describe, expect, it, vi } from 'vitest'
import {
  DISCOVERY_FIELD_MASK,
  ENTERPRISE_FIELDS,
  emptyLedger,
  estimateCost,
  GooglePlacesClient,
  MAX_PAGES_PER_QUERY,
  PlacesQuotaExhaustedError,
  planRun,
  PRO_FIELDS,
  SKU_PRICING,
  tierForFields,
  type PlaceResult,
} from './google-places'

const noSleep = async () => {}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
    headers: { get: () => null },
  } as unknown as Response
}

function place(id: string, overrides: Partial<PlaceResult> = {}): PlaceResult {
  return { id, displayName: { text: `Firm ${id}` }, ...overrides }
}

describe('tierForFields', () => {
  it('bills at the highest tier present, not the lowest', () => {
    // The single most expensive mistake available here: one Enterprise field
    // reprices the whole request.
    expect(tierForFields(['places.id'])).toBe('essentials')
    expect(tierForFields(['places.id', 'places.displayName'])).toBe('pro')
    expect(tierForFields(['places.id', 'places.displayName', 'places.rating'])).toBe('enterprise')
  })

  it('puts websiteUri in Enterprise', () => {
    // This is the trap: a "cheap Pro discovery pass that filters on has-a-website"
    // is impossible, because the website is not visible at Pro tier.
    expect(tierForFields(['places.websiteUri'])).toBe('enterprise')
    expect(ENTERPRISE_FIELDS).toContain('places.websiteUri')
    expect(PRO_FIELDS).not.toContain('places.websiteUri')
  })

  it('ignores nextPageToken, which is not a billed place field', () => {
    expect(tierForFields(['places.displayName', 'nextPageToken'])).toBe('pro')
  })

  it('assumes Enterprise for unrecognized fields', () => {
    // Guessing high means an unknown field shows up as an early budget stop
    // rather than a surprise invoice.
    expect(tierForFields(['places.someFutureField'])).toBe('enterprise')
  })

  it('rates the discovery mask as Enterprise', () => {
    expect(tierForFields(DISCOVERY_FIELD_MASK)).toBe('enterprise')
  })
})

describe('estimateCost', () => {
  it('charges nothing inside the free allowance', () => {
    const ledger = emptyLedger()
    ledger.requestsByTier.enterprise = 900
    expect(estimateCost(ledger).totalUsd).toBe(0)
  })

  it('charges only the requests beyond the free allowance', () => {
    const ledger = emptyLedger()
    ledger.requestsByTier.enterprise = 2_000
    // 1,000 free, so 1,000 billable at $35/1,000.
    expect(estimateCost(ledger).totalUsd).toBe(35)
    expect(estimateCost(ledger).billableByTier.enterprise).toBe(1_000)
  })

  it('accounts for allowance already consumed earlier in the month', () => {
    const ledger = emptyLedger()
    ledger.requestsByTier.enterprise = 1_000
    // Free allowance already gone, so the whole run is billable.
    expect(estimateCost(ledger, { enterprise: 1_000 }).totalUsd).toBe(35)
  })

  it('prices a full statewide sweep in the expected range', () => {
    const ledger = emptyLedger()
    ledger.requestsByTier.enterprise = 5_712
    const { totalUsd } = estimateCost(ledger)
    expect(totalUsd).toBeGreaterThan(150)
    expect(totalUsd).toBeLessThan(180)
  })
})

describe('single-pass Enterprise versus two-stage cost', () => {
  it('is far cheaper per place than enriching each place separately', () => {
    // The reasoning behind defaulting to a single Enterprise pass. Text Search
    // amortizes across ~20 places per billed request; Place Details bills per
    // place, so it is an order of magnitude more expensive per record.
    const placesPerRequest = 20
    const textSearchPerPlace = SKU_PRICING.enterprise.perThousandUsd / 1000 / placesPerRequest
    const placeDetailsEnterprisePerPlace = 20 / 1000

    expect(textSearchPerPlace).toBeLessThan(placeDetailsEnterprisePerPlace / 10)
  })
})

describe('planRun', () => {
  it('shows the cost before anything is spent', () => {
    const plan = planRun({ queries: 1_000, tier: 'enterprise' })
    expect(plan.requests).toBe(1_000)
    expect(plan.billable).toBe(0)
    expect(plan.estimatedUsd).toBe(0)
  })

  it('assumes worst-case paging so the budget is not optimistic', () => {
    const plan = planRun({ queries: 100, pagesPerQuery: 3, tier: 'enterprise' })
    expect(plan.requests).toBe(300)
  })

  it('refuses to plan more pages than Google will serve', () => {
    const plan = planRun({ queries: 10, pagesPerQuery: 99, tier: 'enterprise' })
    expect(plan.requests).toBe(10 * MAX_PAGES_PER_QUERY)
  })

  it('reprices when the free allowance is already used', () => {
    const fresh = planRun({ queries: 1_500, tier: 'enterprise' })
    const used = planRun({ queries: 1_500, tier: 'enterprise', alreadyUsedThisMonth: 1_000 })
    expect(used.estimatedUsd).toBeGreaterThan(fresh.estimatedUsd)
  })
})

describe('GooglePlacesClient', () => {
  it('requires an explicit budget', () => {
    expect(() => new GooglePlacesClient({ apiKey: 'k', maxRequests: 0 })).toThrow(/positive maxRequests/)
    expect(() => new GooglePlacesClient({ apiKey: '', maxRequests: 10 })).toThrow(/API key/)
  })

  it('sends the field mask and key as headers', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ places: [place('a')] }))
    const client = new GooglePlacesClient({
      apiKey: 'secret-key',
      maxRequests: 5,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: noSleep,
    })

    await client.searchText('personal injury attorney in Fresno, CA')

    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://places.googleapis.com/v1/places:searchText')
    const headers = (init as RequestInit).headers as Record<string, string>
    expect(headers['X-Goog-Api-Key']).toBe('secret-key')
    expect(headers['X-Goog-FieldMask']).toContain('places.websiteUri')
    expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({
      textQuery: 'personal injury attorney in Fresno, CA',
      regionCode: 'US',
    })
  })

  it('follows pagination and counts every page as a request', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ places: [place('a')], nextPageToken: 't1' }))
      .mockResolvedValueOnce(jsonResponse({ places: [place('b')], nextPageToken: 't2' }))
      .mockResolvedValueOnce(jsonResponse({ places: [place('c')] }))

    const client = new GooglePlacesClient({
      apiKey: 'k',
      maxRequests: 10,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: noSleep,
    })

    const result = await client.searchText('q')
    expect(result.places.map((p) => p.id)).toEqual(['a', 'b', 'c'])
    expect(result.pagesFetched).toBe(3)
    // Each page is separately billable.
    expect(client.ledger.totalRequests).toBe(3)
  })

  it('stops at Google\u2019s three-page ceiling', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ places: [place('a')], nextPageToken: 'always-more' }))

    const client = new GooglePlacesClient({
      apiKey: 'k',
      maxRequests: 100,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: noSleep,
    })

    const result = await client.searchText('q')
    expect(result.pagesFetched).toBe(MAX_PAGES_PER_QUERY)
  })

  it('stops when the budget runs out and returns what it has', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ places: [place('a')], nextPageToken: 'more' }))

    const client = new GooglePlacesClient({
      apiKey: 'k',
      maxRequests: 2,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: noSleep,
    })

    const result = await client.searchText('q')
    expect(result.budgetExhausted).toBe(true)
    expect(client.ledger.totalRequests).toBe(2)
    expect(result.places).toHaveLength(2)
    // A runaway loop cannot spend past the cap.
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('counts a request even when it fails, so the budget still protects', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ error: 'bad request' }, 400))
    const client = new GooglePlacesClient({
      apiKey: 'k',
      maxRequests: 5,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: noSleep,
    })

    await expect(client.searchText('q')).rejects.toThrow(/400/)
    // A failed call may still be billable; an uncounted one is unprotected.
    expect(client.ledger.totalRequests).toBe(1)
  })

  it('retries rate limiting and server errors', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 429))
      .mockResolvedValueOnce(jsonResponse({}, 503))
      .mockResolvedValueOnce(jsonResponse({ places: [place('a')] }))

    const client = new GooglePlacesClient({
      apiKey: 'k',
      maxRequests: 10,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: noSleep,
    })

    const result = await client.searchText('q')
    expect(result.places).toHaveLength(1)
    expect(client.ledger.retries).toBe(2)
  })

  it('does not retry a daily quota exhaustion', async () => {
    // Google reports a spent daily allowance and a momentary rate limit with the
    // same 429, so only the body separates them. Retrying a daily exhaustion
    // cannot succeed, and because requests are counted before they are sent, the
    // doomed attempts eat the spending cap. Verbatim shape from a live run.
    const body = JSON.stringify({
      error: {
        code: 429,
        message:
          "Quota exceeded for quota metric 'SearchTextRequest' and limit " +
          "'SearchTextRequest per day' of service 'places.googleapis.com'.",
        status: 'RESOURCE_EXHAUSTED',
        details: [
          {
            reason: 'RATE_LIMIT_EXCEEDED',
            metadata: {
              quota_limit: 'SearchTextRequestPerDayPerProject',
              quota_unit: '1/d/{project}',
            },
          },
        ],
      },
    })

    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => body,
      json: async () => JSON.parse(body),
      headers: { get: () => null },
    } as unknown as Response)

    const client = new GooglePlacesClient({
      apiKey: 'k',
      maxRequests: 10,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: noSleep,
    })

    await expect(client.searchText('q')).rejects.toBeInstanceOf(PlacesQuotaExhaustedError)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(client.ledger.retries).toBe(0)
  })

  it('still retries a per-minute rate limit', async () => {
    // The counterpart to the test above: a minute-scoped 429 is worth waiting out,
    // and must not be mistaken for the daily cap.
    const body = JSON.stringify({
      error: {
        message: "Quota exceeded for quota metric 'SearchTextRequest' and limit 'per minute'",
        details: [{ metadata: { quota_unit: '1/min/{project}' } }],
      },
    })

    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => body,
        json: async () => JSON.parse(body),
        headers: { get: () => null },
      } as unknown as Response)
      .mockResolvedValueOnce(jsonResponse({ places: [place('a')] }))

    const client = new GooglePlacesClient({
      apiKey: 'k',
      maxRequests: 10,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: noSleep,
    })

    const result = await client.searchText('q')
    expect(result.places).toHaveLength(1)
    expect(client.ledger.retries).toBe(1)
  })

  it('does not retry a malformed request', async () => {
    // A 400 is usually a bad field mask. Retrying just burns budget on the same
    // error.
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, 400))
    const client = new GooglePlacesClient({
      apiKey: 'k',
      maxRequests: 10,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: noSleep,
    })

    await expect(client.searchText('q')).rejects.toThrow()
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('does not retry a rejected key', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, 403))
    const client = new GooglePlacesClient({
      apiKey: 'k',
      maxRequests: 10,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: noSleep,
    })

    await expect(client.searchText('q')).rejects.toThrow(/403/)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('retries network failures', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce(jsonResponse({ places: [place('a')] }))

    const client = new GooglePlacesClient({
      apiKey: 'k',
      maxRequests: 10,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: noSleep,
    })

    const result = await client.searchText('q')
    expect(result.places).toHaveLength(1)
  })

  it('gives up after the attempt limit', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, 500))
    const client = new GooglePlacesClient({
      apiKey: 'k',
      maxRequests: 100,
      maxAttempts: 3,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: noSleep,
    })

    await expect(client.searchText('q')).rejects.toThrow(/500/)
    expect(fetchImpl).toHaveBeenCalledTimes(3)
  })

  it('honours a Retry-After header over its own backoff', async () => {
    const sleeps: number[] = []
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => '',
        json: async () => ({}),
        headers: { get: (name: string) => (name === 'retry-after' ? '2' : null) },
      } as unknown as Response)
      .mockResolvedValueOnce(jsonResponse({ places: [place('a')] }))

    const client = new GooglePlacesClient({
      apiKey: 'k',
      maxRequests: 10,
      delayMs: 0,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: async (ms) => {
        sleeps.push(ms)
      },
    })

    await client.searchText('q')
    expect(sleeps).toContain(2000)
  })

  it('reports the tier it will be billed at', () => {
    const client = new GooglePlacesClient({ apiKey: 'k', maxRequests: 1 })
    expect(client.skuTier).toBe('enterprise')

    const cheap = new GooglePlacesClient({
      apiKey: 'k',
      maxRequests: 1,
      fieldMask: ['places.id', 'places.displayName', 'nextPageToken'],
    })
    expect(cheap.skuTier).toBe('pro')
  })
})
