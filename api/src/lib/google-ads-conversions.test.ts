import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearGoogleAdsTokenCache,
  formatConversionDateTime,
  isGoogleAdsConfigured,
  uploadClickConversions,
} from './google-ads-conversions'

const CONFIG = {
  GOOGLE_ADS_CONVERSION_ENABLED: 'true',
  GOOGLE_ADS_DEVELOPER_TOKEN: 'dev-token',
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

function uploadResponse(results: unknown[], partialFailureError?: { message: string }) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ results, ...(partialFailureError ? { partialFailureError } : {}) }),
  }
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
})

describe('formatConversionDateTime', () => {
  /**
   * Without an explicit offset Ads reads the timestamp in the account's own
   * time zone, shifting every conversion by however many hours that is — enough
   * near a day boundary to push one outside its attribution window.
   */
  it('emits the space-separated format with an explicit UTC offset', () => {
    expect(formatConversionDateTime(new Date('2026-09-10T14:32:05.000Z'))).toBe(
      '2026-09-10 14:32:05+00:00',
    )
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

  it('sends the conversion with the resolved action and a bearer token', async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(uploadResponse([{ gclid: 'Cj0KCQ' }]))

    const result = await uploadClickConversions([CONVERSION])

    expect(result).toEqual({ uploaded: [0], failures: [] })

    const [url, init] = fetchMock.mock.calls[1]
    // Dashes are how the UI writes a customer id and are rejected by the API.
    expect(url).toBe('https://googleads.googleapis.com/v21/customers/1234567890:uploadClickConversions')
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer access-token')
    expect(headers['developer-token']).toBe('dev-token')

    const body = JSON.parse(init.body as string)
    expect(body.partialFailure).toBe(true)
    expect(body.conversions[0]).toEqual({
      gclid: 'Cj0KCQ',
      conversionAction: 'customers/1234567890/conversionActions/99887766',
      conversionDateTime: '2026-09-10 14:32:05+00:00',
      conversionValue: 4000,
      currencyCode: 'USD',
    })
  })

  /** Sending it when the credentials are not a manager account is an error. */
  it('omits the login customer header unless a manager account is configured', async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(uploadResponse([{ gclid: 'Cj0KCQ' }]))
    await uploadClickConversions([CONVERSION])

    expect(fetchMock.mock.calls[1][1].headers).not.toHaveProperty('login-customer-id')
  })

  it('sends the login customer header when a manager account is configured', async () => {
    process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID = '111-222-3333'
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(uploadResponse([{ gclid: 'Cj0KCQ' }]))
    await uploadClickConversions([CONVERSION])

    expect(fetchMock.mock.calls[1][1].headers['login-customer-id']).toBe('1112223333')
  })

  /**
   * A conversion with no value is a retention we could not price, which is
   * different from one worth nothing.
   */
  it('leaves the value off entirely when there is none', async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(uploadResponse([{ gclid: 'Cj0KCQ' }]))
    await uploadClickConversions([{ gclid: 'Cj0KCQ', convertedAt: new Date(), value: null }])

    const body = JSON.parse(fetchMock.mock.calls[1][1].body as string)
    expect(body.conversions[0]).not.toHaveProperty('conversionValue')
    expect(body.conversions[0]).not.toHaveProperty('currencyCode')
  })

  /**
   * With partialFailure the response is a 200 whether or not anything
   * succeeded, and a rejected row comes back as an empty object at its original
   * index. Index is the only thing tying a result to its conversion.
   */
  it('reads a partial failure by index rather than by position in results', async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(
      uploadResponse([{ gclid: 'a' }, {}, { gclid: 'c' }], { message: 'click too old' }),
    )

    const result = await uploadClickConversions([
      { gclid: 'a', convertedAt: new Date() },
      { gclid: 'b', convertedAt: new Date() },
      { gclid: 'c', convertedAt: new Date() },
    ])

    expect(result.uploaded).toEqual([0, 2])
    expect(result.failures).toEqual([{ index: 1, message: 'click too old' }])
  })

  it('treats a wholly empty results array as every row rejected', async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(uploadResponse([]))

    const result = await uploadClickConversions([CONVERSION])

    expect(result.uploaded).toEqual([])
    expect(result.failures).toHaveLength(1)
  })

  it('reuses the access token across uploads rather than re-minting it', async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(uploadResponse([{ gclid: 'Cj0KCQ' }]))
      .mockResolvedValueOnce(uploadResponse([{ gclid: 'Cj0KCQ' }]))

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

  it('surfaces an outright upload rejection', async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: { message: 'The caller does not have permission' } }),
    })

    await expect(uploadClickConversions([CONVERSION])).rejects.toThrow('does not have permission')
  })
})
