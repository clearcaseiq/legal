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
 * Sent through the Data Manager API, not the Google Ads API's
 * `uploadClickConversions`: Google closed that method to new integrations and
 * answers it with CUSTOMER_NOT_ALLOWLISTED_FOR_THIS_FEATURE. The refresh token
 * therefore needs the `datamanager` scope; `adwords` alone is refused.
 *
 * Spoken over REST rather than through a client library, matching how the GA4
 * Data API is handled next door: the library exists to wrap protobufs we do not
 * otherwise use, for one endpoint.
 */
import { logger } from './logger'

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const INGEST_ENDPOINT = 'https://datamanager.googleapis.com/v1/events:ingest'

/**
 * Refreshed a minute early. An access token that expires between the check and
 * the call fails the upload for no reason, and the retry costs a whole sweep
 * interval.
 */
const TOKEN_EXPIRY_MARGIN_MS = 60_000

/**
 * The field an ad click's id travels in. Clicks from iOS often carry only a
 * gbraid (app) or wbraid (web) in place of a gclid, and Ads matches each one
 * only against its own upload field.
 */
export type ClickIdType = 'gclid' | 'gbraid' | 'wbraid'

/**
 * The click id an intake lead can be reported against, or null.
 *
 * gbraid and wbraid are kept in the lead's `attributionExtra` JSON rather than
 * a column. A gclid wins when both are present, since it matches most precisely.
 */
export function clickIdForLead(lead: {
  gclid: string | null
  attributionExtra?: string | null
}): { clickId: string; clickIdType: ClickIdType } | null {
  if (lead.gclid) return { clickId: lead.gclid, clickIdType: 'gclid' }
  if (!lead.attributionExtra) return null
  let extra: Record<string, unknown>
  try {
    extra = JSON.parse(lead.attributionExtra)
  } catch {
    return null
  }
  for (const type of ['gbraid', 'wbraid'] as const) {
    const value = extra?.[type]
    if (typeof value === 'string' && value.trim()) return { clickId: value.trim(), clickIdType: type }
  }
  return null
}

/** Narrows the lead query to rows that might carry any click id; `clickIdForLead` decides. */
export const HAS_CLICK_ID_WHERE = {
  OR: [{ gclid: { not: null } }, { attributionExtra: { contains: 'braid' } }],
}

export type ClickConversion = {
  /** The click id, of whichever type `clickIdType` names. */
  gclid: string
  /** Defaults to 'gclid'. */
  clickIdType?: ClickIdType
  /** When the case was retained (or submitted), not when we got around to uploading it. */
  convertedAt: Date
  value?: number | null
  currencyCode?: string
  /**
   * Stable across retries. Ads keeps the first event per transaction id within
   * a conversion action, so a batch resent after a timeout cannot double count.
   */
  transactionId?: string
}

export type ConversionUploadResult = {
  /** Indexes into the conversions array that Ads accepted. */
  uploaded: number[]
  /** Per-conversion rejections, by index. */
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
 * Which conversion action a conversion is reported against.
 *
 * 'retained' is a signed case. 'qualified' is a case from an ad click that
 * passed the one-time code check and was sent to attorneys: weeks earlier than
 * a retention and far more numerous, so bidding has enough signal to learn from
 * without falling back on raw form submits, which bots produce for free.
 * 'submitted' is a case from an ad click whose assessment was created: the
 * moment "Generate My Free Report" succeeds, recorded from the database so a
 * reload of the results page can never count twice.
 */
export type ConversionKind = 'retained' | 'qualified' | 'submitted'

export const CONVERSION_KINDS: readonly ConversionKind[] = ['retained', 'qualified', 'submitted']

const CONVERSION_ACTION_ENV: Record<ConversionKind, string> = {
  retained: 'GOOGLE_ADS_CONVERSION_ACTION_ID',
  qualified: 'GOOGLE_ADS_QUALIFIED_CONVERSION_ACTION',
  submitted: 'GOOGLE_ADS_SUBMITTED_CONVERSION_ACTION',
}

/**
 * Whether conversion upload is switched on and the account credentials are set.
 *
 * `GOOGLE_ADS_CONVERSION_ENABLED` is a separate switch from the credentials on
 * purpose, and defaults off. Credentials tend to arrive in an environment well
 * before anyone has decided that environment should be writing to the live Ads
 * account, and a staging deployment quietly reporting conversions would corrupt
 * the bidding on real spend.
 */
function hasAccountCredentials(): boolean {
  if (env('GOOGLE_ADS_CONVERSION_ENABLED') !== 'true') return false

  return Boolean(
    env('GOOGLE_ADS_CLIENT_ID') &&
      env('GOOGLE_ADS_CLIENT_SECRET') &&
      env('GOOGLE_ADS_REFRESH_TOKEN') &&
      customerId('GOOGLE_ADS_CUSTOMER_ID'),
  )
}

/** Whether conversions of this kind can be uploaded: credentials plus its own action id. */
export function isConversionActionConfigured(kind: ConversionKind): boolean {
  return hasAccountCredentials() && Boolean(env(CONVERSION_ACTION_ENV[kind]))
}

/** Whether conversion upload is switched on for at least one conversion action. */
export function isGoogleAdsConfigured(): boolean {
  return CONVERSION_KINDS.some((kind) => isConversionActionConfigured(kind))
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
 * `2026-09-10T14:32:05Z`: ISO 8601, always in UTC.
 *
 * An explicit offset is required. Without one Ads interprets the timestamp in
 * the account's own time zone, which silently shifts every conversion by however
 * many hours that account is from UTC — enough, near a day boundary, to push a
 * conversion outside the click's attribution window and have it rejected.
 */
export function formatConversionDateTime(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

function toEvent(conversion: ClickConversion): Record<string, unknown> {
  return {
    adIdentifiers: { [conversion.clickIdType || 'gclid']: conversion.gclid },
    eventTimestamp: formatConversionDateTime(conversion.convertedAt),
    eventSource: 'WEB',
    ...(conversion.transactionId ? { transactionId: conversion.transactionId } : {}),
    ...(conversion.value
      ? { conversionValue: conversion.value, currency: conversion.currencyCode || 'USD' }
      : {}),
  }
}

type IngestOutcome =
  | { ok: true; requestId?: string }
  | { ok: false; status: number; message: string; rejected: Map<number, string> }

type IngestErrorBody = {
  requestId?: string
  error?: {
    message?: string
    details?: { fieldViolations?: { field?: string; description?: string; reason?: string }[] }[]
  }
}

/** `events.events[3].ad_identifiers` names the event at index 3. */
const EVENT_FIELD = /^events(?:\.events)?\[(\d+)\]/

async function ingest(events: Record<string, unknown>[], kind: ConversionKind): Promise<IngestOutcome> {
  const customer = customerId('GOOGLE_ADS_CUSTOMER_ID')
  // The account the credential's Google user belongs to: the manager when the
  // user reaches the advertiser through one, otherwise the advertiser itself.
  const loginCustomer = customerId('GOOGLE_ADS_LOGIN_CUSTOMER_ID') || customer

  const response = await fetch(INGEST_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      destinations: [
        {
          operatingAccount: { accountType: 'GOOGLE_ADS', accountId: customer },
          loginAccount: { accountType: 'GOOGLE_ADS', accountId: loginCustomer },
          productDestinationId: env(CONVERSION_ACTION_ENV[kind]),
        },
      ],
      events,
    }),
  })

  const body = (await response.json().catch(() => ({}))) as IngestErrorBody
  if (response.ok) return { ok: true, requestId: body.requestId }

  const rejected = new Map<number, string>()
  for (const detail of body.error?.details || []) {
    for (const violation of detail.fieldViolations || []) {
      const match = EVENT_FIELD.exec(violation.field || '')
      if (!match) continue
      const index = Number(match[1])
      if (index < events.length && !rejected.has(index)) {
        rejected.set(index, violation.description || violation.reason || 'rejected by Google Ads')
      }
    }
  }
  return { ok: false, status: response.status, message: body.error?.message || 'unknown error', rejected }
}

/**
 * Upload click conversions.
 *
 * The Data Manager API is fast-fail: one invalid event rejects the whole
 * request. Left alone, a single bad row would block every good conversion
 * behind it on every sweep until its attempts ran out, and take theirs with it.
 * So when the rejection names the offending events, those are failed and the
 * rest are sent again once on their own.
 *
 * Acceptance means queued, not attributed. Ads matches clicks asynchronously,
 * and a click outside its window is dropped later rather than refused here.
 */
export async function uploadClickConversions(
  conversions: ClickConversion[],
  kind: ConversionKind = 'retained',
): Promise<ConversionUploadResult> {
  if (!conversions.length) return { uploaded: [], failures: [] }
  if (!isConversionActionConfigured(kind)) {
    throw new Error('Google Ads conversion upload is not configured')
  }

  const all = conversions.map((_, index) => index)
  const first = await ingest(conversions.map(toEvent), kind)
  if (first.ok) {
    logger.info('Google Ads conversions accepted', { kind, count: all.length, requestId: first.requestId })
    return { uploaded: all, failures: [] }
  }

  if (!first.rejected.size) {
    throw new Error(`Google Ads conversion upload failed (${first.status}): ${first.message}`)
  }

  const failures = [...first.rejected].map(([index, message]) => ({ index, message }))
  const remaining = all.filter((index) => !first.rejected.has(index))
  logger.warn('Google Ads rejected some conversions', {
    kind,
    count: all.length,
    rejected: failures.length,
    reason: failures[0].message,
  })
  if (!remaining.length) return { uploaded: [], failures }

  const second = await ingest(remaining.map((index) => toEvent(conversions[index])), kind)
  if (!second.ok) {
    throw new Error(`Google Ads conversion upload failed (${second.status}): ${second.message}`)
  }
  logger.info('Google Ads conversions accepted', { kind, count: remaining.length, requestId: second.requestId })
  return { uploaded: remaining, failures }
}

