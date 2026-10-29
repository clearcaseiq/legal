import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { ENV } from '../env'
import { prisma } from './prisma'
import { logger } from './logger'
import { webBaseUrl } from './app-url'

// Per-attorney Zoom integration (Option B).
//
// Each attorney connects their own Zoom account via OAuth (a "User-managed"
// Zoom Marketplace app). We persist their access/refresh tokens and mint a real
// Zoom meeting on their account whenever they schedule a video consultation.
// This mirrors the calendar-sync OAuth pattern used for Google/Microsoft.

const ZOOM_OAUTH_AUTHORIZE_URL = 'https://zoom.us/oauth/authorize'
const ZOOM_OAUTH_TOKEN_URL = 'https://zoom.us/oauth/token'
const ZOOM_OAUTH_REVOKE_URL = 'https://zoom.us/oauth/revoke'
const ZOOM_API_BASE = 'https://api.zoom.us/v2'

// Scopes requested from Zoom. For user-managed apps Zoom ultimately enforces
// whatever scopes are enabled in the Marketplace app config; we still advertise
// the ones we rely on so consent screens are explicit.
// user:read:zak and user:read:token back the embedded (Meeting SDK) join: the
// host needs a ZAK and attendees need an on-behalf-of token from the host.
const ZOOM_SCOPES = ['user:read', 'meeting:write', 'user:read:zak', 'user:read:token']

type ZoomConnectionRecord = {
  id: string
  attorneyId: string
  accessToken: string | null
  refreshToken: string | null
  tokenExpiresAt: Date | null
}

type ZoomStatePayload = {
  attorneyId: string
  kind: 'zoom'
}

function zoomRedirectUri() {
  if (ENV.ZOOM_REDIRECT_URI) return ENV.ZOOM_REDIRECT_URI
  const base = ENV.API_URL || 'http://localhost:4000'
  return new URL('/v1/attorney-zoom/callback', base).toString()
}

export function zoomFrontendRedirect(status: 'success' | 'error', error?: string) {
  // Land on a lightweight SPA bounce page. When Zoom was connected from a popup
  // (e.g. the Schedule Consultation flow) that page notifies the opener and
  // closes itself; otherwise it forwards to the dashboard so the profile-card
  // connect flow keeps working.
  const url = new URL('/oauth/zoom/complete', webBaseUrl())
  url.searchParams.set('zoom_sync', status)
  if (error) {
    url.searchParams.set('zoom_error', error)
  }
  return url.toString()
}

/**
 * Where a Marketplace install lands: the web app's connect page, which signs
 * the attorney in if needed and then completes the install with this code.
 */
export function zoomMarketplaceInstallRedirect(code: string) {
  const url = new URL('/connect/zoom', webBaseUrl())
  url.searchParams.set('code', code)
  return url.toString()
}

export function isZoomConfigured() {
  return Boolean(ENV.ZOOM_CLIENT_ID && ENV.ZOOM_CLIENT_SECRET)
}

function basicAuthHeader() {
  const raw = `${ENV.ZOOM_CLIENT_ID}:${ENV.ZOOM_CLIENT_SECRET}`
  return `Basic ${Buffer.from(raw).toString('base64')}`
}

async function readJson(response: Response) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message =
      (payload && typeof payload === 'object' && 'reason' in payload && typeof (payload as any).reason === 'string' && (payload as any).reason)
      || (payload && typeof payload === 'object' && 'message' in payload && typeof (payload as any).message === 'string' && (payload as any).message)
      || (payload && typeof payload === 'object' && 'error' in payload && typeof (payload as any).error === 'string' && (payload as any).error)
      || `Zoom request failed with status ${response.status}`
    throw new Error(message)
  }
  return payload
}

function signZoomState(payload: ZoomStatePayload) {
  return jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: '10m' })
}

export function verifyZoomStateToken(token: string) {
  return jwt.verify(token, ENV.JWT_SECRET) as ZoomStatePayload
}

export function buildZoomAuthorizeUrl(attorneyId: string) {
  if (!isZoomConfigured()) {
    throw new Error('Zoom integration is not configured')
  }

  const url = new URL(ZOOM_OAUTH_AUTHORIZE_URL)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', ENV.ZOOM_CLIENT_ID as string)
  url.searchParams.set('redirect_uri', zoomRedirectUri())
  url.searchParams.set('state', signZoomState({ attorneyId, kind: 'zoom' }))
  return url.toString()
}

async function exchangeZoomCode(code: string) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: zoomRedirectUri(),
  })

  return readJson(await fetch(ZOOM_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })) as Promise<{ access_token: string; refresh_token?: string; expires_in?: number; scope?: string }>
}

async function fetchZoomAccount(accessToken: string) {
  return readJson(await fetch(`${ZOOM_API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })) as Promise<{ id?: string; email?: string; first_name?: string; last_name?: string; timezone?: string }>
}

export async function upsertZoomConnectionFromCode(params: { attorneyId: string; code: string }) {
  const tokens = await exchangeZoomCode(params.code)
  const accessToken = tokens.access_token
  const refreshToken = tokens.refresh_token || null
  const tokenExpiresAt = tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null
  const scopes = tokens.scope ? JSON.stringify(tokens.scope.split(' ').filter(Boolean)) : JSON.stringify(ZOOM_SCOPES)

  const account = await fetchZoomAccount(accessToken)
  const displayName = [account.first_name, account.last_name].filter(Boolean).join(' ') || null

  return prisma.attorneyZoomConnection.upsert({
    where: { attorneyId: params.attorneyId },
    update: {
      accessToken,
      refreshToken,
      tokenExpiresAt,
      scopes,
      externalAccountId: account.id || null,
      externalAccountEmail: account.email || null,
      displayName,
      syncStatus: 'connected',
      lastError: null,
    },
    create: {
      attorneyId: params.attorneyId,
      accessToken,
      refreshToken,
      tokenExpiresAt,
      scopes,
      externalAccountId: account.id || null,
      externalAccountEmail: account.email || null,
      displayName,
      syncStatus: 'connected',
    },
  })
}

async function ensureFreshAccessToken(connection: ZoomConnectionRecord) {
  const expiresAt = connection.tokenExpiresAt?.getTime() || 0
  if (connection.accessToken && expiresAt > Date.now() + 60_000) {
    return connection.accessToken
  }

  if (!connection.refreshToken) {
    return connection.accessToken
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: connection.refreshToken,
  })

  const refreshed = await readJson(await fetch(ZOOM_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })) as { access_token: string; refresh_token?: string; expires_in?: number }

  // Zoom rotates the refresh token on every refresh — persist the new one.
  const updated = await prisma.attorneyZoomConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token || connection.refreshToken,
      tokenExpiresAt: refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000) : null,
      syncStatus: 'connected',
      lastError: null,
    },
  })

  return updated.accessToken
}

export async function getAttorneyZoomConnection(attorneyId: string) {
  return prisma.attorneyZoomConnection.findUnique({ where: { attorneyId } })
}

export function serializeZoomConnection(connection: {
  externalAccountEmail: string | null
  displayName: string | null
  syncStatus: string
  updatedAt: Date
} | null) {
  if (!connection) {
    return { connected: false }
  }
  return {
    connected: connection.syncStatus === 'connected',
    email: connection.externalAccountEmail,
    displayName: connection.displayName,
    syncStatus: connection.syncStatus,
    updatedAt: connection.updatedAt,
  }
}

export async function disconnectAttorneyZoom(attorneyId: string) {
  const connection = await prisma.attorneyZoomConnection.findFirst({
    where: { attorneyId },
    select: { accessToken: true },
  })
  // Revoking the access token ends the whole grant on Zoom's side. Best effort:
  // our copy is deleted either way, so a Zoom outage cannot block a disconnect.
  if (connection?.accessToken && isZoomConfigured()) {
    await fetch(`${ZOOM_OAUTH_REVOKE_URL}?${new URLSearchParams({ token: connection.accessToken })}`, {
      method: 'POST',
      headers: { Authorization: basicAuthHeader() },
    }).catch((error: any) => logger.warn('Zoom token revoke failed', { attorneyId, error: error?.message }))
  }
  await prisma.attorneyZoomConnection.deleteMany({ where: { attorneyId } })
  return { disconnected: true }
}

/**
 * Zoom's `app_deauthorized` event: the user removed ClearCaseIQ from their Zoom
 * account, so the tokens we hold for them are dead and must be deleted.
 */
export async function handleZoomAppDeauthorized(payload: { user_id?: string } | undefined) {
  const zoomUserId = String(payload?.user_id || '')
  if (!zoomUserId) return 0
  const { count } = await prisma.attorneyZoomConnection.deleteMany({ where: { externalAccountId: zoomUserId } })
  logger.info('Zoom app deauthorized; connection removed', { zoomUserId, removed: count })
  return count
}

export type ZoomMeeting = {
  meetingId: string
  joinUrl: string
  startUrl: string
  password: string | null
}

/** What a Zoom meeting belongs to on our side, persisted as a VideoMeeting. */
export type ZoomMeetingLink = {
  kind?: 'scheduled' | 'instant'
  assessmentId?: string | null
  appointmentId?: string | null
  userId?: string | null
  createdByUserId?: string | null
}

/**
 * Create a Zoom meeting on the attorney's connected account. Scheduled by
 * default; `instant: true` creates a meeting that can be started right away.
 * Returns `null` when the attorney has no (healthy) Zoom connection so callers
 * can gracefully fall back to a calendar-generated Meet/Teams link.
 */
export async function createZoomMeeting(params: {
  attorneyId: string
  topic: string
  start: Date
  durationMinutes: number
  timezone?: string
  agenda?: string
  instant?: boolean
  link?: ZoomMeetingLink
}): Promise<ZoomMeeting | null> {
  if (!isZoomConfigured()) return null

  const connection = await getAttorneyZoomConnection(params.attorneyId)
  if (!connection || connection.syncStatus !== 'connected') {
    return null
  }

  try {
    const accessToken = await ensureFreshAccessToken(connection)
    if (!accessToken) return null

    const payload = await readJson(await fetch(`${ZOOM_API_BASE}/users/me/meetings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: params.topic,
        type: params.instant ? 1 : 2,
        ...(params.instant ? {} : { start_time: params.start.toISOString() }),
        duration: Math.max(15, Math.round(params.durationMinutes)),
        timezone: params.timezone || 'UTC',
        agenda: params.agenda?.slice(0, 2000) || undefined,
        settings: {
          join_before_host: true,
          waiting_room: false,
          approval_type: 2,
        },
      }),
    })) as { id?: number | string; join_url?: string; start_url?: string; password?: string }

    if (!payload.join_url || !payload.start_url) {
      return null
    }

    const meeting: ZoomMeeting = {
      meetingId: String(payload.id ?? ''),
      joinUrl: payload.join_url,
      startUrl: payload.start_url,
      password: payload.password || null,
    }

    if (meeting.meetingId) {
      await recordVideoMeeting(params.attorneyId, params.topic, meeting, {
        kind: params.instant ? 'instant' : 'scheduled',
        ...params.link,
      })
    }

    return meeting
  } catch (error: any) {
    logger.warn('Zoom meeting creation failed', {
      attorneyId: params.attorneyId,
      error: error?.message,
    })
    await prisma.attorneyZoomConnection
      .update({
        where: { id: connection.id },
        data: { syncStatus: 'sync_error', lastError: error?.message?.slice(0, 500) || 'Zoom meeting creation failed' },
      })
      .catch(() => {})
    return null
  }
}

async function recordVideoMeeting(attorneyId: string, topic: string, meeting: ZoomMeeting, link: ZoomMeetingLink) {
  const data = {
    kind: link.kind || 'scheduled',
    attorneyId,
    assessmentId: link.assessmentId || null,
    appointmentId: link.appointmentId || null,
    userId: link.userId || null,
    createdByUserId: link.createdByUserId || null,
    topic,
    joinUrl: meeting.joinUrl,
    startUrl: meeting.startUrl,
    password: meeting.password,
  }
  await prisma.videoMeeting
    .upsert({
      where: { externalMeetingId: meeting.meetingId },
      update: data,
      create: { ...data, provider: 'zoom', externalMeetingId: meeting.meetingId },
    })
    .catch((error: any) => {
      logger.warn('Failed to record video meeting', { attorneyId, error: error?.message })
    })
}

// ---------------------------------------------------------------------------
// Webhooks (meeting.started / meeting.ended)
// ---------------------------------------------------------------------------

export function isZoomWebhookConfigured() {
  return Boolean(ENV.ZOOM_WEBHOOK_SECRET_TOKEN)
}

function hmacHex(message: string) {
  return crypto.createHmac('sha256', ENV.ZOOM_WEBHOOK_SECRET_TOKEN as string).update(message).digest('hex')
}

/** Zoom signs `v0:{timestamp}:{rawBody}`; reject stale or mismatched requests. */
export function verifyZoomWebhookSignature(params: {
  rawBody: string
  signature: string | undefined
  timestamp: string | undefined
  nowMs?: number
}) {
  if (!isZoomWebhookConfigured() || !params.signature || !params.timestamp) return false
  const ts = Number(params.timestamp)
  const now = params.nowMs ?? Date.now()
  if (!Number.isFinite(ts) || Math.abs(now - ts * 1000) > 5 * 60_000) return false
  const expected = `v0=${hmacHex(`v0:${params.timestamp}:${params.rawBody}`)}`
  const a = Buffer.from(expected)
  const b = Buffer.from(params.signature)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/** Response to Zoom's `endpoint.url_validation` challenge. */
export function zoomUrlValidationResponse(plainToken: string) {
  return { plainToken, encryptedToken: hmacHex(plainToken) }
}

// ---------------------------------------------------------------------------
// Embedded meetings (Zoom Meeting SDK, component view)
// ---------------------------------------------------------------------------

function sdkCredentials() {
  const key = ENV.ZOOM_SDK_KEY || ENV.ZOOM_CLIENT_ID
  const secret = ENV.ZOOM_SDK_SECRET || ENV.ZOOM_CLIENT_SECRET
  return key && secret ? { key, secret } : null
}

export function isZoomEmbedEnabled() {
  return ENV.ZOOM_EMBED_ENABLED === 'true' && Boolean(sdkCredentials())
}

/** Meeting SDK join signature. role 1 = host, 0 = attendee. */
export function signZoomSdkJoin(meetingNumber: string, role: 0 | 1) {
  const creds = sdkCredentials()
  if (!creds) throw new Error('Zoom Meeting SDK is not configured')
  const iat = Math.floor(Date.now() / 1000) - 30
  const exp = iat + 2 * 60 * 60
  const signature = jwt.sign(
    { appKey: creds.key, sdkKey: creds.key, mn: meetingNumber, role, iat, exp, tokenExp: exp },
    creds.secret,
    { algorithm: 'HS256' },
  )
  return { signature, sdkKey: creds.key }
}

/**
 * ZAK (host) or on-behalf-of (attendee) token minted from the attorney's Zoom
 * account. Zoom requires an OBF token for SDK joins to meetings outside the
 * app owner's account, which is every attorney-hosted meeting here.
 */
export async function getZoomUserToken(attorneyId: string, type: 'zak' | 'onbehalf', meetingId?: string) {
  const connection = await getAttorneyZoomConnection(attorneyId)
  if (!connection || connection.syncStatus !== 'connected') return null
  const accessToken = await ensureFreshAccessToken(connection)
  if (!accessToken) return null
  const url = new URL(`${ZOOM_API_BASE}/users/me/token`)
  url.searchParams.set('type', type)
  if (meetingId) url.searchParams.set('meeting_id', meetingId)
  try {
    const payload = (await readJson(await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }))) as { token?: string }
    return payload.token || null
  } catch (error: any) {
    logger.warn('Zoom user token request failed', { attorneyId, type, error: error?.message })
    return null
  }
}
