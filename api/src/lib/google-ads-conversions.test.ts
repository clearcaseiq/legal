import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearGoogleAdsTokenCache,
  formatConversionDateTime,
  isConversionActionConfigured,
  isGoogleAdsConfigured,
  uploadClickConversions,
} from './google-ads-conversions'

const CONFIG = {
  GOOGLE_ADS_CONVERSION_ENABLED: 'true',
  GOOGLE_ADS_CLIENT_ID: 'client-id',
  GOOGLE_ADS_CLIENT_SECRET: 'client-secret',
  GOOGLE_ADS_REFRESH_TOKEN: 'refresh-token',
  GOOGLE_ADS_CUSTOMER_ID: '123-456-7890',
  GOOGLE_ADS_CONVERSION_ACTION_ID: '99887766',
}

const fetchMock = vi.fn()

function tokenResponse() {
  return {
    ok: true,
    status: 200,
    json: async () => ({ access_token: 'access-token', expires_in: 3600 }),
  }
}

function ingestOk(requestId = 'req-1') {
  return { ok: true, status: 200, json: async () => ({ requestId }) }
}

function ingestRejected(violations: { field: string; description?: string; reason?: string }[]) {
  return {
    ok: false,
    status: 400,
    json: async () => ({
      error: {
        code: 400,
        message: 'There was a problem with the request.',
        status: 'INVALID_ARGUMENT',
        details: [
          { '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason: 'INVALID_ARGUMENT' },
          { '@type': 'type.googleapis.com/google.rpc.BadRequest', fieldViolations: violations },
        ],
      },
    }),
  }
}

function sentBody(call: number) {
  return JSON.parse(fetchMock.mock.calls[call][1].body as string)
}

const CONVERSION = {
  gclid: 'Cj0KCQ',
  convertedAt: new Date('2026-09-10T14:32:05.000Z'),
  value: 4000,
  currencyCode: 'USD',
}

beforeEach(() => {
  clearGoogleAdsTokenCache()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  for (const [key, value] of Object.entries(CONFIG)) process.env[key] = value
})

afterEach(() => {
  for (const key of Object.keys(CONFIG)) delete process.env[key]
  delete process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID
  vi.unstubAllGlobals()
})

describe('isGoogleAdsConfigured', () => {
  it('is true when the switch is on and every credential is present', () => {
    expect(isGoogleAdsConfigured()).toBe(true)
  })

  /**
   * Credentials reach an environment long before anyone decides that
   * environment should write to the live Ads account. A staging deployment
   * quietly reporting conversions would corrupt bidding on real spend.
   */
  it('stays off when the enable switch is not set, even with full credentials', () => {
    delete process.env.GOOGLE_ADS_CONVERSION_ENABLED
    expect(isGoogleAdsConfigured()).toBe(false)
  })

  it('is false when any single credential is missing', () => {
    delete process.env.GOOGLE_ADS_CONVERSION_ACTION_ID
    expect(isGoogleAdsConfigured()).toBe(false)
  })

  /** The Data Manager API does not use a developer token. */
  it('does not require a developer token', () => {
    delete process.env.GOOGLE_ADS_DEVELOPER_TOKEN
    expect(isGoogleAdsConfigured()).toBe(true)
  })

  /** Either conversion action can be switched on without the other. */
  it('is true with only the qualified-lead action set', () => {
    delete process.env.GOOGLE_ADS_CONVERSION_ACTION_ID
    process.env.GOOGLE_ADS_QUALIFIED_CONVERSION_ACTION = '55443322'
    try {
      expect(isGoogleAdsConfigured()).toBe(true)
      expect(isConversionActionConfigured('qualified')).toBe(true)
      expect(isConversionActionConfigured('retained')).toBe(false)
    } finally {
      delete process.env.GOOGLE_ADS_QUALIFIED_CONVERSION_ACTION
    }
  })
})

describe('the qualified-lead conversion action', () => {
  afterEach(() => {
    delete process.env.GOOGLE_ADS_QUALIFIED_CONVERSION_ACTION
  })

  it('uploads against its own action id, sending only the click id and timestamp', async () => {
    process.env.GOOGLE_ADS_QUALIFIED_CONVERSION_ACTION = '55443322'
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(ingestOk())

    await uploadClickConversions([{ gclid: 'Cj0KCQ', convertedAt: CONVERSION.convertedAt, value: null }], 'qualified')

    const body = sentBody(1)
    expect(body.destinations[0].productDestinationId).toBe('55443322')
    expect(body.events[0]).toEqual({
      adIdentifiers: { gclid: 'Cj0KCQ' },
      eventTimestamp: '2026-09-10T14:32:05Z',
      eventSource: 'WEB',
    })
  })

  it('refuses to upload qualified conversions when that action is not set', async () => {
    await expect(uploadClickConversions([CONVERSION], 'qualified')).rejects.toThrow('not configured')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('formatConversionDateTime', () => {
  /**
   * Without an explicit offset Ads reads the timestamp in the account's own
   * time zone, shifting every conversion by however many hours that is — enough
   * near a day boundary to push one outside its attribution window.
   */
  it('emits ISO 8601 in UTC with an explicit zone', () => {
    expect(formatConversionDateTime(new Date('2026-09-10T14:32:05.123Z'))).toBe('2026-09-10T14:32:05Z')
  })
})

describe('uploadClickConversions', () => {
  it('does not call out at all for an empty batch', async () => {
    await expect(uploadClickConversions([])).resolves.toEqual({ uploaded: [], failures: [] })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refuses to run when not configured', async () => {
    delete process.env.GOOGLE_ADS_CONVERSION_ENABLED
    await expect(uploadClickConversions([CONVERSION])).rejects.toThrow('not configured')
  })

  it('sends the event to the configured destination with a bearer token', async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(ingestOk())

    const result = await uploadClickConversions([{ ...CONVERSION, transactionId: 'row-1' }])

    expect(result).toEqual({ uploaded: [0], failures: [] })

    const [url, init] = fetchMock.mock.calls[1]
    expect(url).toBe('https://datamanager.googleapis.com/v1/events:ingest')
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer access-token')
    expect(headers).not.toHaveProperty('developer-token')

    const body = sentBody(1)
    // Dashes are how the UI writes a customer id and are rejected by the API.
    expect(body.destinations).toEqual([
      {
        operatingAccount: { accountType: 'GOOGLE_ADS', accountId: '1234567890' },
        loginAccount: { accountType: 'GOOGLE_ADS', accountId: '1234567890' },
        productDestinationId: '99887766',
      },
    ])
    expect(body.events[0]).toEqual({
      adIdentifiers: { gclid: 'Cj0KCQ' },
      eventTimestamp: '2026-09-10T14:32:05Z',
      eventSource: 'WEB',
      transactionId: 'row-1',
      conversionValue: 4000,
      currency: 'USD',
    })
  })

  it('logs in through the manager account when one is configured', async () => {
    process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID = '111-222-3333'
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(ingestOk())
    await uploadClickConversions([CONVERSION])

    const destination = sentBody(1).destinations[0]
    expect(destination.loginAccount.accountId).toBe('1112223333')
    expect(destination.operatingAccount.accountId).toBe('1234567890')
  })

  /**
   * A conversion with no value is a retention we could not price, which is
   * different from one worth nothing.
   */
  it('leaves the value off entirely when there is none', async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(ingestOk())
    await uploadClickConversions([{ gclid: 'Cj0KCQ', convertedAt: new Date(), value: null }])

    const event = sentBody(1).events[0]
    expect(event).not.toHaveProperty('conversionValue')
    expect(event).not.toHaveProperty('currency')
  })

  it('sends an iOS click id in its own field', async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(ingestOk())
    const result = await uploadClickConversions([{ gclid: 'WB123', clickIdType: 'wbraid', convertedAt: new Date() }])

    expect(sentBody(1).events[0].adIdentifiers).toEqual({ wbraid: 'WB123' })
    expect(result.uploaded).toEqual([0])
  })

  /**
   * One invalid event rejects the whole request. The named events are failed
   * and the rest resent, so a bad row cannot hold good ones hostage.
   */
  it('fails the events a rejection names and resends the others', async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(
        ingestRejected([{ field: 'events.events[1].ad_identifiers', description: 'Invalid click id.' }]),
      )
      .mockResolvedValueOnce(ingestOk())

    const result = await uploadClickConversions([
      { gclid: 'a', convertedAt: new Date() },
      { gclid: 'b', convertedAt: new Date() },
      { gclid: 'c', convertedAt: new Date() },
    ])

    expect(result.uploaded).toEqual([0, 2])
    expect(result.failures).toEqual([{ index: 1, message: 'Invalid click id.' }])
    expect(sentBody(2).events.map((event: { adIdentifiers: { gclid: string } }) => event.adIdentifiers.gclid)).toEqual([
      'a',
      'c',
    ])
  })

  it('does not resend when every event was rejected', async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(ingestRejected([{ field: 'events.events[0]', reason: 'INVALID_GCLID' }]))

    const result = await uploadClickConversions([CONVERSION])

    expect(result).toEqual({ uploaded: [], failures: [{ index: 0, message: 'INVALID_GCLID' }] })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('reuses the access token across uploads rather than re-minting it', async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(ingestOk())
      .mockResolvedValueOnce(ingestOk())

    await uploadClickConversions([CONVERSION])
    await uploadClickConversions([CONVERSION])

    expect(fetchMock).toHaveBeenCalledTimes(3) // one token, two uploads
  })

  /**
   * A revoked refresh token is the most common way this breaks and looks
   * identical to a config typo unless Google's message is carried through.
   */
  it('surfaces the reason a token refresh was rejected', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'invalid_grant', error_description: 'Token has been expired or revoked.' }),
    })

    await expect(uploadClickConversions([CONVERSION])).rejects.toThrow('Token has been expired or revoked.')
  })

  it('surfaces a rejection that names no event', async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: { message: 'Request had insufficient authentication scopes.' } }),
    })

    await expect(uploadClickConversions([CONVERSION])).rejects.toThrow('insufficient authentication scopes')
  })
})
