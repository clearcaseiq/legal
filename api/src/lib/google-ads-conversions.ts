/**
 * Google Ads offline conversion import.
 *
 * Closes the attribution loop. Ads knows it produced a click, and our database
 * knows the click became a signed case, but Ads cannot learn the second part on
 * its own: the intake wizard and results page carry no conversion tag, by
 * design, because their URLs can hold an assessment id or a claim token. HHS
 * guidance treats third-party tracking on such pages as a disclosure of health
 * information, so no amount of convenience justifies a tag there.
 *
 * Uploading the conversion from the server is what makes value-based bidding
 * possible without one. Only a click id, a timestamp and a projected revenue
 * figure leave this process — no claim detail, no contact details, no case
 * content of any kind.
 *
 * Spoken over REST rather than through `google-ads-api`, matching how the GA4
 * Data API is handled next door: the client library exists to wrap protobufs we
 * do not otherwise use, for one endpoint.
 */
import { logger } from './logger'

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const ADS_API_VERSION = 'v21'

/**
 * Refreshed a minute early. An access token that expires between the check and
 * the call fails the upload for no reason, and the retry costs a whole sweep
 * interval.
 */
const TOKEN_EXPIRY_MARGIN_MS = 60_000

export type ClickConversion = {
  gclid: string
  /** When the case was retained, not when we got around to uploading it. */
  convertedAt: Date
  value?: number | null
  currencyCode?: string
}

export type ConversionUploadResult = {
  /** Indexes into the conversions array that Ads accepted. */
  uploaded: number[]
  /** Per-conversion rejections from a partial failure, by index. */
  failures: { index: number; message: string }[]
}

function env(name: string): string {
  return (process.env[name] || '').trim()
}

/** Ads customer ids are written with dashes in the UI and rejected with them. */
function customerId(name: string): string {
  return env(name).replace(/-/g, '')
}

/**
 * Whether conversion upload is switched on and fully configured.
 *
 * `GOOGLE_ADS_CONVERSION_ENABLED` is a separate switch from the credentials on
 * purpose, and defaults off. Credentials tend to arrive in an environment well
 * before anyone has decided that environment should be writing to the live Ads
 * account, and a staging deployment quietly reporting conversions would corrupt
 * the bidding on real spend.
 */
export function isGoogleAdsConfigured(): boolean {
  if (env('GOOGLE_ADS_CONVERSION_ENABLED') !== 'true') return false

  return Boolean(
    env('GOOGLE_ADS_DEVELOPER_TOKEN') &&
      env('GOOGLE_ADS_CLIENT_ID') &&
      env('GOOGLE_ADS_CLIENT_SECRET') &&
      env('GOOGLE_ADS_REFRESH_TOKEN') &&
      customerId('GOOGLE_ADS_CUSTOMER_ID') &&
      env('GOOGLE_ADS_CONVERSION_ACTION_ID'),
  )
}

let cachedToken: { value: string; expiresAt: number } | null = null

/** Exported for tests, which must not inherit a previous run's token. */
export function clearGoogleAdsTokenCache(): void {
  cachedToken = null
}

/**
 * A short-lived access token from the offline refresh token.
 *
 * Cached because the sweep uploads in batches and every run would otherwise
 * spend a round trip re-minting a token that is valid for an hour.
 */
async function accessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - TOKEN_EXPIRY_MARGIN_MS) {
    return cachedToken.value
  }

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env('GOOGLE_ADS_CLIENT_ID'),
      client_secret: env('GOOGLE_ADS_CLIENT_SECRET'),
      refresh_token: env('GOOGLE_ADS_REFRESH_TOKEN'),
      grant_type: 'refresh_token',
    }),
  })

  const body = (await response.json().catch(() => ({}))) as {
    access_token?: string
    expires_in?: number
    error_description?: string
    error?: string
  }

  if (!response.ok || !body.access_token) {
    // Worth naming precisely: a revoked or expired refresh token is the single
    // most common way this breaks, and it looks identical to a config typo
    // unless the message from Google is carried through.
    throw new Error(
      `Google Ads token refresh failed (${response.status}): ${body.error_description || body.error || 'no access token returned'}`,
    )
  }

  cachedToken = {
    value: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
  }
  return cachedToken.value
}

/**
 * `2026-09-10 14:32:05+00:00`, the only format the Ads API accepts here.
 *
 * An explicit offset is required. Without one Ads interprets the timestamp in
 * the account's own time zone, which silently shifts every conversion by however
 * many hours that account is from UTC — enough, near a day boundary, to push a
 * conversion outside the click's attribution window and have it rejected.
 */
export function formatConversionDateTime(date: Date): string {
  return `${date.toISOString().slice(0, 19).replace('T', ' ')}+00:00`
}

/**
 * Upload click conversions.
 *
 * Sent with `partialFailure`, so one bad row does not reject the batch. That
 * matters more than it sounds: the usual rejection is a click id outside its
 * conversion window, and without partial failure a single stale case would
 * block every good conversion behind it, indefinitely, on every sweep.
 */
export async function uploadClickConversions(
  conversions: ClickConversion[],
): Promise<ConversionUploadResult> {
  if (!conversions.length) return { uploaded: [], failures: [] }
  if (!isGoogleAdsConfigured()) {
    throw new Error('Google Ads conversion upload is not configured')
  }

  const customer = customerId('GOOGLE_ADS_CUSTOMER_ID')
  const conversionAction = `customers/${customer}/conversionActions/${env('GOOGLE_ADS_CONVERSION_ACTION_ID')}`
  const loginCustomer = customerId('GOOGLE_ADS_LOGIN_CUSTOMER_ID')

  const headers: Record<string, string> = {
    Authorization: `Bearer ${await accessToken()}`,
    'developer-token': env('GOOGLE_ADS_DEVELOPER_TOKEN'),
    'Content-Type': 'application/json',
  }
  // Only when the credentials belong to a manager account acting on behalf of
  // the advertiser. Sending it otherwise is itself an error.
  if (loginCustomer) headers['login-customer-id'] = loginCustomer

  const response = await fetch(
    `https://googleads.googleapis.com/${ADS_API_VERSION}/customers/${customer}:uploadClickConversions`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        partialFailure: true,
        conversions: conversions.map((conversion) => ({
          gclid: conversion.gclid,
          conversionAction,
          conversionDateTime: formatConversionDateTime(conversion.convertedAt),
          ...(conversion.value
            ? {
                conversionValue: conversion.value,
                currencyCode: conversion.currencyCode || 'USD',
              }
            : {}),
        })),
      }),
    },
  )

  const body = (await response.json().catch(() => ({}))) as {
    results?: ({ gclid?: string } | null)[]
    partialFailureError?: { message?: string; details?: unknown[] }
    error?: { message?: string }
  }

  if (!response.ok) {
    throw new Error(
      `Google Ads conversion upload failed (${response.status}): ${body.error?.message || 'unknown error'}`,
    )
  }

  return readResults(conversions.length, body)
}

/**
 * Work out which rows Ads actually took.
 *
 * With `partialFailure` the response is a 200 whether or not anything
 * succeeded, and rejected rows come back as an empty object in `results` at
 * their original index — the array stays the same length. So the index is the
 * only thing tying a result back to the conversion that produced it, and an
 * empty entry is a rejection, not a success with no detail.
 */
function readResults(
  count: number,
  body: { results?: ({ gclid?: string } | null)[]; partialFailureError?: { message?: string } },
): ConversionUploadResult {
  const uploaded: number[] = []
  const failures: { index: number; message: string }[] = []
  const results = body.results || []

  // Google returns the rejection reasons in a packed error detail that needs the
  // protobuf definitions to unpack properly. Rather than half-decode it, the
  // whole message is attached to each rejected row: imprecise per row, but it
  // names the actual problem, which is what someone debugging needs.
  const reason = body.partialFailureError?.message || 'rejected by Google Ads'

  for (let index = 0; index < count; index += 1) {
    if (results[index]?.gclid) uploaded.push(index)
    else failures.push({ index, message: reason })
  }

  if (failures.length) {
    logger.warn('Google Ads rejected some conversions', { count, rejected: failures.length, reason })
  }

  return { uploaded, failures }
}
