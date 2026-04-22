import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'
import { ENV } from '../env'
import { prisma } from './prisma'
import { logger } from './logger'

export type CalendarProvider = 'google' | 'microsoft'

type CalendarConnectionRecord = {
  id: string
  attorneyId: string
  provider: string
  accessToken: string | null
  refreshToken: string | null
  tokenExpiresAt: Date | null
  calendarId: string | null
  calendarName: string | null
  timezone: string | null
  webhookChannelId?: string | null
  webhookResourceId?: string | null
  webhookSubscriptionId?: string | null
  webhookClientState?: string | null
  webhookToken?: string | null
  webhookExpiresAt?: Date | null
  lastWebhookAt?: Date | null
}

type CalendarStatePayload = {
  attorneyId: string
  provider: CalendarProvider
}

type ExternalBusyBlock = {
  startTime: Date
  endTime: Date
  isAllDay?: boolean
  sourceKey?: string
  sourceUpdatedAt?: Date
}

type ExternalCalendarEvent = {
  externalEventId: string
  provider: CalendarProvider
}

const GOOGLE_CALENDAR_SCOPE = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
].join(' ')

const MICROSOFT_CALENDAR_SCOPE = [
  'openid',
  'email',
  'profile',
  'offline_access',
  'User.Read',
  'Calendars.Read',
  'Calendars.ReadWrite',
].join(' ')

const GOOGLE_WEBHOOK_TTL_SECONDS = 60 * 60 * 24 * 7
const GOOGLE_WEBHOOK_RENEWAL_BUFFER_MS = 24 * 60 * 60 * 1000
const MICROSOFT_WEBHOOK_RENEWAL_BUFFER_MS = 6 * 60 * 60 * 1000

function calendarFrontendRedirect(provider: CalendarProvider, status: 'success' | 'error', error?: string) {
  const url = new URL('/attorney-dashboard', ENV.WEB_URL)
  url.searchParams.set('calendar_provider', provider)
  url.searchParams.set('calendar_sync', status)
  if (error) {
    url.searchParams.set('calendar_error', error)
  }
  return url.toString()
}

function calendarCallbackUrl(provider: CalendarProvider) {
  const base = ENV.API_URL || 'http://localhost:4000'
  return new URL(`/v1/attorney-calendar/callback/${provider}`, base).toString()
}

function calendarWebhookUrl(provider: CalendarProvider) {
  const envOverride = provider === 'google'
    ? ENV.GOOGLE_CALENDAR_WEBHOOK_URI
    : ENV.MICROSOFT_CALENDAR_WEBHOOK_URI

  if (envOverride) {
    return envOverride
  }

  if (!ENV.API_URL || !ENV.API_URL.startsWith('https://')) {
    return null
  }

  return new URL(`/v1/attorney-calendar/webhooks/${provider}`, ENV.API_URL).toString()
}

function getProviderConfig(provider: CalendarProvider) {
  if (provider === 'google') {
    return {
      clientId: ENV.GOOGLE_CALENDAR_CLIENT_ID || ENV.GOOGLE_CLIENT_ID,
      clientSecret: ENV.GOOGLE_CALENDAR_CLIENT_SECRET || ENV.GOOGLE_CLIENT_SECRET,
      redirectUri: ENV.GOOGLE_CALENDAR_REDIRECT_URI || calendarCallbackUrl('google'),
    }
  }

  return {
    clientId: ENV.MICROSOFT_CALENDAR_CLIENT_ID,
    clientSecret: ENV.MICROSOFT_CALENDAR_CLIENT_SECRET,
    redirectUri: ENV.MICROSOFT_CALENDAR_REDIRECT_URI || calendarCallbackUrl('microsoft'),
  }
}

async function readJson(response: Response) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message =
      (payload && typeof payload === 'object' && 'error_description' in payload && typeof payload.error_description === 'string' && payload.error_description)
      || (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string' && payload.error)
      || `Request failed with status ${response.status}`
    throw new Error(message)
  }
  return payload
}

function signCalendarState(payload: CalendarStatePayload) {
  return jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: '10m' })
}

export function verifyCalendarStateToken(token: string) {
  return jwt.verify(token, ENV.JWT_SECRET) as CalendarStatePayload
}

export function buildCalendarAuthorizeUrl(attorneyId: string, provider: CalendarProvider) {
  const config = getProviderConfig(provider)
  if (!config.clientId || !config.clientSecret) {
    throw new Error(`${provider} calendar sync is not configured`)
  }

  const state = signCalendarState({ attorneyId, provider })

  if (provider === 'google') {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    url.searchParams.set('client_id', config.clientId)
    url.searchParams.set('redirect_uri', config.redirectUri)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('access_type', 'offline')
    url.searchParams.set('prompt', 'consent')
    url.searchParams.set('include_granted_scopes', 'true')
    url.searchParams.set('scope', GOOGLE_CALENDAR_SCOPE)
    url.searchParams.set('state', state)
    return url.toString()
  }

  const url = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize')
  url.searchParams.set('client_id', config.clientId)
  url.searchParams.set('redirect_uri', config.redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('response_mode', 'query')
  url.searchParams.set('scope', MICROSOFT_CALENDAR_SCOPE)
  url.searchParams.set('state', state)
  return url.toString()
}

async function ensureFreshAccessToken(connection: CalendarConnectionRecord) {
  if (!connection.refreshToken) {
    return connection.accessToken
  }

  const expiresAt = connection.tokenExpiresAt?.getTime() || 0
  if (connection.accessToken && expiresAt > Date.now() + 60_000) {
    return connection.accessToken
  }

  const config = getProviderConfig(connection.provider as CalendarProvider)
  if (!config.clientId || !config.clientSecret) {
    throw new Error(`${connection.provider} calendar sync is not configured`)
  }

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: connection.refreshToken,
    grant_type: 'refresh_token',
  })

  const refreshUrl = connection.provider === 'google'
    ? 'https://oauth2.googleapis.com/token'
    : 'https://login.microsoftonline.com/common/oauth2/v2.0/token'

  if (connection.provider === 'microsoft') {
    body.set('scope', MICROSOFT_CALENDAR_SCOPE)
  }

  const refreshed = await readJson(await fetch(refreshUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })) as { access_token: string; refresh_token?: string; expires_in?: number }

  const updated = await prisma.attorneyCalendarConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token || connection.refreshToken,
      tokenExpiresAt: refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000) : null,
      syncStatus: 'connected',
      lastSyncError: null,
    },
  })

  return updated.accessToken
}

async function exchangeGoogleCode(code: string) {
  const config = getProviderConfig('google')
  const body = new URLSearchParams({
    code,
    client_id: config.clientId || '',
    client_secret: config.clientSecret || '',
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code',
  })

  return readJson(await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })) as Promise<{ access_token: string; refresh_token?: string; expires_in?: number; scope?: string }>
}

async function exchangeMicrosoftCode(code: string) {
  const config = getProviderConfig('microsoft')
  const body = new URLSearchParams({
    code,
    client_id: config.clientId || '',
    client_secret: config.clientSecret || '',
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code',
    scope: MICROSOFT_CALENDAR_SCOPE,
  })

  return readJson(await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })) as Promise<{ access_token: string; refresh_token?: string; expires_in?: number; scope?: string }>
}

async function fetchGoogleAccount(accessToken: string) {
  return readJson(await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })) as Promise<{ id?: string; email?: string }>
}

async function fetchMicrosoftAccount(accessToken: string) {
  return readJson(await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })) as Promise<{ id?: string; mail?: string; userPrincipalName?: string }>
}

function getExternalAccountEmail(account: { email?: string; mail?: string; userPrincipalName?: string }) {
  return account.email || account.mail || account.userPrincipalName || null
}

export async function upsertCalendarConnectionFromCode(params: {
  attorneyId: string
  provider: CalendarProvider
  code: string
}) {
  const tokens = params.provider === 'google'
    ? await exchangeGoogleCode(params.code)
    : await exchangeMicrosoftCode(params.code)

  const accessToken = tokens.access_token
  const refreshToken = tokens.refresh_token || null
  const tokenExpiresAt = tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null
  const scopes = tokens.scope
    ? JSON.stringify(tokens.scope.split(' ').filter(Boolean))
    : null

  const externalAccount = params.provider === 'google'
    ? await fetchGoogleAccount(accessToken)
    : await fetchMicrosoftAccount(accessToken)

  return prisma.attorneyCalendarConnection.upsert({
    where: {
      attorneyId_provider: {
        attorneyId: params.attorneyId,
        provider: params.provider,
      },
    },
    update: {
      accessToken,
      refreshToken,
      tokenExpiresAt,
      scopes,
      externalAccountId: externalAccount.id || null,
      externalAccountEmail: getExternalAccountEmail(externalAccount),
      calendarId: 'primary',
      calendarName: 'Primary calendar',
      syncStatus: 'connected',
      lastSyncError: null,
    },
    create: {
      attorneyId: params.attorneyId,
      provider: params.provider,
      accessToken,
      refreshToken,
      tokenExpiresAt,
      scopes,
      externalAccountId: externalAccount.id || null,
      externalAccountEmail: getExternalAccountEmail(externalAccount),
      calendarId: 'primary',
      calendarName: 'Primary calendar',
      syncStatus: 'connected',
    },
  })
}

async function fetchGoogleBusyBlocks(connection: CalendarConnectionRecord) {
  const accessToken = await ensureFreshAccessToken(connection)
  const timeMin = new Date()
  timeMin.setHours(0, 0, 0, 0)
  const timeMax = new Date(timeMin)
  timeMax.setDate(timeMax.getDate() + 60)
  const timezone = connection.timezone || 'UTC'

  const payload = await readJson(await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      timeZone: timezone,
      items: [{ id: connection.calendarId || 'primary' }],
    }),
  })) as {
    calendars?: Record<string, { busy?: Array<{ start: string; end: string }> }>
  }

  const busy = payload.calendars?.[connection.calendarId || 'primary']?.busy || []
  return busy.map((item, index) => ({
    startTime: new Date(item.start),
    endTime: new Date(item.end),
    sourceKey: `${item.start}:${item.end}:${index}`,
  }))
}

async function fetchMicrosoftBusyBlocks(connection: CalendarConnectionRecord) {
  const accessToken = await ensureFreshAccessToken(connection)
  const timeMin = new Date()
  timeMin.setHours(0, 0, 0, 0)
  const timeMax = new Date(timeMin)
  timeMax.setDate(timeMax.getDate() + 60)

  const url = new URL('https://graph.microsoft.com/v1.0/me/calendarView')
  url.searchParams.set('startDateTime', timeMin.toISOString())
  url.searchParams.set('endDateTime', timeMax.toISOString())
  url.searchParams.set('$select', 'id,showAs,start,end,lastModifiedDateTime,isAllDay')

  const payload = await readJson(await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'outlook.timezone="UTC"',
    },
  })) as {
    value?: Array<{
      id?: string
      showAs?: string
      isAllDay?: boolean
      start?: { dateTime?: string }
      end?: { dateTime?: string }
      lastModifiedDateTime?: string
    }>
  }

  return (payload.value || [])
    .filter((item) => item.showAs && item.showAs !== 'free')
    .map((item) => ({
      startTime: new Date(item.start?.dateTime || ''),
      endTime: new Date(item.end?.dateTime || ''),
      isAllDay: Boolean(item.isAllDay),
      sourceKey: item.id,
      sourceUpdatedAt: item.lastModifiedDateTime ? new Date(item.lastModifiedDateTime) : undefined,
    }))
    .filter((item) => !Number.isNaN(item.startTime.getTime()) && !Number.isNaN(item.endTime.getTime()))
}

async function replaceBusyBlocks(connectionId: string, attorneyId: string, provider: CalendarProvider, blocks: ExternalBusyBlock[]) {
  await prisma.attorneyCalendarBusyBlock.deleteMany({
    where: { connectionId },
  })

  for (const block of blocks) {
    await prisma.attorneyCalendarBusyBlock.create({
      data: {
        attorneyId,
        connectionId,
        provider,
        startTime: block.startTime,
        endTime: block.endTime,
        isAllDay: Boolean(block.isAllDay),
        sourceKey: block.sourceKey || null,
        sourceUpdatedAt: block.sourceUpdatedAt || null,
      },
    })
  }
}

async function stopGoogleWebhook(connection: CalendarConnectionRecord) {
  if (!connection.webhookChannelId || !connection.webhookResourceId) {
    return
  }

  try {
    const accessToken = await ensureFreshAccessToken(connection)
    await fetch('https://www.googleapis.com/calendar/v3/channels/stop', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: connection.webhookChannelId,
        resourceId: connection.webhookResourceId,
      }),
    })
  } catch (error) {
    logger.warn('Failed to stop Google calendar webhook', { error, connectionId: connection.id })
  }
}

async function ensureGoogleWebhook(connection: CalendarConnectionRecord) {
  const webhookUrl = calendarWebhookUrl('google')
  if (!webhookUrl) {
    return { autoSyncEnabled: false }
  }

  const expiresAt = connection.webhookExpiresAt?.getTime() || 0
  if (
    connection.webhookChannelId &&
    connection.webhookResourceId &&
    connection.webhookToken &&
    expiresAt > Date.now() + GOOGLE_WEBHOOK_RENEWAL_BUFFER_MS
  ) {
    return { autoSyncEnabled: true, webhookExpiresAt: connection.webhookExpiresAt || null }
  }

  await stopGoogleWebhook(connection)

  const accessToken = await ensureFreshAccessToken(connection)
  const channelId = randomUUID()
  const channelToken = randomUUID()
  const payload = await readJson(await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(connection.calendarId || 'primary')}/events/watch`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: channelId,
      type: 'web_hook',
      address: webhookUrl,
      token: channelToken,
      params: {
        ttl: String(GOOGLE_WEBHOOK_TTL_SECONDS),
      },
    }),
  })) as { id?: string; resourceId?: string; expiration?: string }

  const webhookExpiresAt = payload.expiration ? new Date(Number(payload.expiration)) : new Date(Date.now() + GOOGLE_WEBHOOK_TTL_SECONDS * 1000)

  await prisma.attorneyCalendarConnection.update({
    where: { id: connection.id },
    data: {
      webhookChannelId: payload.id || channelId,
      webhookResourceId: payload.resourceId || null,
      webhookToken: channelToken,
      webhookSubscriptionId: null,
      webhookClientState: null,
      webhookExpiresAt,
    },
  })

  return { autoSyncEnabled: true, webhookExpiresAt }
}

async function createMicrosoftSubscription(connection: CalendarConnectionRecord, clientState: string) {
  const webhookUrl = calendarWebhookUrl('microsoft')
  if (!webhookUrl) {
    return { autoSyncEnabled: false }
  }

  const accessToken = await ensureFreshAccessToken(connection)
  const expirationDateTime = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()

  const payload = await readJson(await fetch('https://graph.microsoft.com/v1.0/subscriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      changeType: 'created,updated,deleted',
      notificationUrl: webhookUrl,
      resource: 'me/events',
      expirationDateTime,
      clientState,
      latestSupportedTlsVersion: 'v1_2',
    }),
  })) as { id?: string; expirationDateTime?: string }

  return {
    subscriptionId: payload.id || null,
    webhookExpiresAt: payload.expirationDateTime ? new Date(payload.expirationDateTime) : new Date(expirationDateTime),
  }
}

async function ensureMicrosoftWebhook(connection: CalendarConnectionRecord) {
  const webhookUrl = calendarWebhookUrl('microsoft')
  if (!webhookUrl) {
    return { autoSyncEnabled: false }
  }

  const expiresAt = connection.webhookExpiresAt?.getTime() || 0
  if (
    connection.webhookSubscriptionId &&
    connection.webhookClientState &&
    expiresAt > Date.now() + MICROSOFT_WEBHOOK_RENEWAL_BUFFER_MS
  ) {
    return { autoSyncEnabled: true, webhookExpiresAt: connection.webhookExpiresAt || null }
  }

  const accessToken = await ensureFreshAccessToken(connection)
  const clientState = connection.webhookClientState || randomUUID()
  const expirationDateTime = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()

  try {
    if (connection.webhookSubscriptionId) {
      const response = await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${encodeURIComponent(connection.webhookSubscriptionId)}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expirationDateTime }),
      })

      if (response.ok) {
        const webhookExpiresAt = new Date(expirationDateTime)
        await prisma.attorneyCalendarConnection.update({
          where: { id: connection.id },
          data: {
            webhookExpiresAt,
            webhookClientState: clientState,
          },
        })
        return { autoSyncEnabled: true, webhookExpiresAt }
      }
    }
  } catch (error) {
    logger.warn('Failed to renew Microsoft calendar subscription, creating a new one', { error, connectionId: connection.id })
  }

  const created = await createMicrosoftSubscription(connection, clientState)
  await prisma.attorneyCalendarConnection.update({
    where: { id: connection.id },
    data: {
      webhookSubscriptionId: created.subscriptionId,
      webhookClientState: clientState,
      webhookChannelId: null,
      webhookResourceId: null,
      webhookToken: null,
      webhookExpiresAt: created.webhookExpiresAt,
    },
  })

  return { autoSyncEnabled: true, webhookExpiresAt: created.webhookExpiresAt }
}

export async function ensureCalendarWebhookSubscription(connectionId: string) {
  const connection = await prisma.attorneyCalendarConnection.findUnique({
    where: { id: connectionId },
  })

  if (!connection) {
    throw new Error('Calendar connection not found')
  }

  return connection.provider === 'google'
    ? ensureGoogleWebhook(connection)
    : ensureMicrosoftWebhook(connection)
}

export async function renewCalendarWebhookSubscriptions(params?: { limit?: number }) {
  const renewalCutoff = new Date(Date.now() + GOOGLE_WEBHOOK_RENEWAL_BUFFER_MS)
  const dueConnections = await prisma.attorneyCalendarConnection.findMany({
    where: {
      syncStatus: { in: ['connected', 'sync_error'] },
      OR: [
        { webhookExpiresAt: null },
        { webhookExpiresAt: { lte: renewalCutoff } },
      ],
    },
    orderBy: [
      { webhookExpiresAt: 'asc' },
      { updatedAt: 'asc' },
    ],
    take: params?.limit ?? 25,
    select: { id: true, provider: true },
  })

  let renewedCount = 0
  let failedCount = 0

  for (const connection of dueConnections) {
    try {
      const result = await ensureCalendarWebhookSubscription(connection.id)
      if (result.autoSyncEnabled) {
        renewedCount += 1
      }
    } catch (error) {
      failedCount += 1
      logger.warn('Calendar webhook renewal failed', {
        error,
        connectionId: connection.id,
        provider: connection.provider,
      })
    }
  }

  return {
    processedCount: dueConnections.length,
    renewedCount,
    failedCount,
  }
}

export async function syncCalendarConnection(connectionId: string) {
  const connection = await prisma.attorneyCalendarConnection.findUnique({
    where: { id: connectionId },
  })

  if (!connection) {
    throw new Error('Calendar connection not found')
  }

  try {
    const blocks = connection.provider === 'google'
      ? await fetchGoogleBusyBlocks(connection)
      : await fetchMicrosoftBusyBlocks(connection)

    await replaceBusyBlocks(connection.id, connection.attorneyId, connection.provider as CalendarProvider, blocks)

    let autoSyncEnabled = false
    let webhookExpiresAt: Date | null = null
    try {
      const webhookState = await ensureCalendarWebhookSubscription(connection.id)
      autoSyncEnabled = Boolean(webhookState.autoSyncEnabled)
      webhookExpiresAt = webhookState.webhookExpiresAt || null
    } catch (webhookError) {
      logger.warn('Calendar webhook registration failed after sync', {
        webhookError,
        connectionId: connection.id,
      })
    }

    await prisma.attorneyCalendarConnection.update({
      where: { id: connection.id },
      data: {
        syncStatus: 'connected',
        lastSyncedAt: new Date(),
        lastSyncError: null,
      },
    })

    return { success: true, syncedBlocks: blocks.length, autoSyncEnabled, webhookExpiresAt }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Calendar sync failed'
    await prisma.attorneyCalendarConnection.update({
      where: { id: connection.id },
      data: {
        syncStatus: 'sync_error',
        lastSyncError: message,
      },
    })
    throw error
  }
}

async function createGoogleCalendarEvent(connection: CalendarConnectionRecord, params: {
  title: string
  start: Date
  end: Date
  description?: string
}) {
  const accessToken = await ensureFreshAccessToken(connection)
  const payload = await readJson(await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(connection.calendarId || 'primary')}/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: params.title,
      description: params.description,
      start: { dateTime: params.start.toISOString() },
      end: { dateTime: params.end.toISOString() },
    }),
  })) as { id?: string }

  if (!payload.id) {
    throw new Error('Google calendar did not return an event id')
  }

  return payload.id
}

async function createMicrosoftCalendarEvent(connection: CalendarConnectionRecord, params: {
  title: string
  start: Date
  end: Date
  description?: string
}) {
  const accessToken = await ensureFreshAccessToken(connection)
  const payload = await readJson(await fetch('https://graph.microsoft.com/v1.0/me/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      subject: params.title,
      body: params.description ? { contentType: 'text', content: params.description } : undefined,
      start: { dateTime: params.start.toISOString(), timeZone: 'UTC' },
      end: { dateTime: params.end.toISOString(), timeZone: 'UTC' },
    }),
  })) as { id?: string }

  if (!payload.id) {
    throw new Error('Microsoft calendar did not return an event id')
  }

  return payload.id
}

export async function createExternalCalendarEvent(params: {
  attorneyId: string
  title: string
  start: Date
  end: Date
  description?: string
}): Promise<ExternalCalendarEvent | null> {
  const connection = await prisma.attorneyCalendarConnection.findFirst({
    where: {
      attorneyId: params.attorneyId,
      syncStatus: { in: ['connected', 'sync_error'] },
    },
    orderBy: { updatedAt: 'desc' },
  })

  if (!connection) {
    return null
  }

  const eventId = connection.provider === 'google'
    ? await createGoogleCalendarEvent(connection, params)
    : await createMicrosoftCalendarEvent(connection, params)

  await syncCalendarConnection(connection.id).catch((error) => {
    logger.warn('Calendar sync after event creation failed', { error, connectionId: connection.id })
  })

  return {
    externalEventId: eventId,
    provider: connection.provider as CalendarProvider,
  }
}

async function deleteGoogleCalendarEvent(connection: CalendarConnectionRecord, eventId: string) {
  const accessToken = await ensureFreshAccessToken(connection)
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(connection.calendarId || 'primary')}/events/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to remove Google calendar event (${response.status})`)
  }
}

async function deleteMicrosoftCalendarEvent(connection: CalendarConnectionRecord, eventId: string) {
  const accessToken = await ensureFreshAccessToken(connection)
  const response = await fetch(`https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to remove Microsoft calendar event (${response.status})`)
  }
}

export async function deleteExternalCalendarEvent(params: {
  attorneyId: string
  provider: string | null
  eventId: string | null
}) {
  if (!params.provider || !params.eventId) {
    return
  }

  const connection = await prisma.attorneyCalendarConnection.findFirst({
    where: {
      attorneyId: params.attorneyId,
      provider: params.provider,
    },
  })

  if (!connection) {
    return
  }

  if (connection.provider === 'google') {
    await deleteGoogleCalendarEvent(connection, params.eventId)
  } else if (connection.provider === 'microsoft') {
    await deleteMicrosoftCalendarEvent(connection, params.eventId)
  }

  await syncCalendarConnection(connection.id).catch((error) => {
    logger.warn('Calendar sync after event deletion failed', { error, connectionId: connection.id })
  })
}

export async function handleGoogleCalendarWebhook(headers: Record<string, string | string[] | undefined>) {
  const channelId = typeof headers['x-goog-channel-id'] === 'string' ? headers['x-goog-channel-id'] : null
  const resourceId = typeof headers['x-goog-resource-id'] === 'string' ? headers['x-goog-resource-id'] : null
  const channelToken = typeof headers['x-goog-channel-token'] === 'string' ? headers['x-goog-channel-token'] : null

  if (!channelId) {
    return { matched: false }
  }

  const connection = await prisma.attorneyCalendarConnection.findFirst({
    where: {
      provider: 'google',
      webhookChannelId: channelId,
      ...(resourceId ? { webhookResourceId: resourceId } : {}),
      ...(channelToken ? { webhookToken: channelToken } : {}),
    },
    select: { id: true },
  })

  if (!connection) {
    return { matched: false }
  }

  await prisma.attorneyCalendarConnection.update({
    where: { id: connection.id },
    data: {
      lastWebhookAt: new Date(),
    },
  })

  await syncCalendarConnection(connection.id)
  return { matched: true }
}

export async function handleMicrosoftCalendarWebhook(body: any) {
  const notifications = Array.isArray(body?.value) ? body.value : []
  const matchedConnectionIds = new Set<string>()

  for (const notification of notifications) {
    if (!notification?.subscriptionId || !notification?.clientState) {
      continue
    }

    const connection = await prisma.attorneyCalendarConnection.findFirst({
      where: {
        provider: 'microsoft',
        webhookSubscriptionId: notification.subscriptionId,
        webhookClientState: notification.clientState,
      },
      select: { id: true },
    })

    if (!connection) {
      continue
    }

    matchedConnectionIds.add(connection.id)
    await prisma.attorneyCalendarConnection.update({
      where: { id: connection.id },
      data: {
        lastWebhookAt: new Date(),
      },
    })
  }

  for (const connectionId of matchedConnectionIds) {
    await syncCalendarConnection(connectionId)
  }

  return { matchedCount: matchedConnectionIds.size }
}

function buildCalendarConnectionHealth(connection: {
  syncStatus: string
  lastSyncedAt: Date | null
  lastSyncError: string | null
  webhookExpiresAt: Date | null
  lastWebhookAt: Date | null
  refreshToken: string | null
  accessToken: string | null
}, busyBlockCount: number) {
  const now = Date.now()
  const connected = Boolean(connection.refreshToken || connection.accessToken)
  const autoSyncEnabled = Boolean(connection.webhookExpiresAt && connection.webhookExpiresAt.getTime() > now)
  const expiresSoon = Boolean(connection.webhookExpiresAt && connection.webhookExpiresAt.getTime() <= now + 24 * 60 * 60 * 1000)

  const issues: string[] = []
  let status: 'healthy' | 'warning' | 'error' | 'disconnected' = 'healthy'
  let recommendedAction = 'No action needed.'

  if (!connected) {
    status = 'disconnected'
    issues.push('Calendar is not connected.')
    recommendedAction = 'Connect a calendar provider.'
  } else {
    if (connection.syncStatus === 'sync_error') {
      status = 'error'
      issues.push(connection.lastSyncError || 'Recent sync failed.')
      recommendedAction = 'Run a manual sync or reconnect the provider.'
    }
    if (!autoSyncEnabled) {
      if (status !== 'error') status = 'warning'
      issues.push('Auto-sync subscription is not active.')
      recommendedAction = 'Run a manual sync to refresh the subscription.'
    } else if (expiresSoon) {
      if (status !== 'error') status = 'warning'
      issues.push('Auto-sync subscription expires within 24 hours.')
      recommendedAction = 'The renewal loop should refresh this soon; you can also run a manual sync.'
    }
    if (!connection.lastSyncedAt) {
      if (status !== 'error') status = 'warning'
      issues.push('Calendar has not completed an initial sync yet.')
      recommendedAction = 'Run the first sync to import busy time.'
    }
    if (autoSyncEnabled && !connection.lastWebhookAt) {
      issues.push('No webhook change notifications received yet.')
    }
  }

  return {
    status,
    issues,
    recommendedAction,
    autoSyncEnabled,
    busyBlockCount,
  }
}

export async function listAttorneyCalendarConnections(attorneyId: string) {
  const connections = await prisma.attorneyCalendarConnection.findMany({
    where: { attorneyId },
    orderBy: { createdAt: 'asc' },
  })

  const busyBlockCounts = await prisma.attorneyCalendarBusyBlock.groupBy({
    by: ['connectionId'],
    where: {
      attorneyId,
      connectionId: { not: null },
    },
    _count: { id: true },
  })
  const busyBlockCountByConnectionId = new Map(
    busyBlockCounts.map((item: any) => [item.connectionId, item._count.id])
  )

  return connections.map((connection) => ({
    id: connection.id,
    provider: connection.provider,
    externalAccountEmail: connection.externalAccountEmail,
    calendarName: connection.calendarName,
    syncStatus: connection.syncStatus,
    lastSyncedAt: connection.lastSyncedAt,
    lastSyncError: connection.lastSyncError,
    autoSyncEnabled: Boolean(connection.webhookExpiresAt && connection.webhookExpiresAt.getTime() > Date.now()),
    webhookExpiresAt: connection.webhookExpiresAt,
    lastWebhookAt: connection.lastWebhookAt,
    connected: Boolean(connection.refreshToken || connection.accessToken),
    health: buildCalendarConnectionHealth(connection, busyBlockCountByConnectionId.get(connection.id) || 0),
  }))
}

export async function getAttorneyCalendarHealth(attorneyId: string) {
  const connections = await listAttorneyCalendarConnections(attorneyId)
  const summary = {
    totalConnections: connections.length,
    connectedCount: connections.filter((connection) => connection.connected).length,
    healthyCount: connections.filter((connection) => connection.health.status === 'healthy').length,
    warningCount: connections.filter((connection) => connection.health.status === 'warning').length,
    errorCount: connections.filter((connection) => connection.health.status === 'error').length,
    disconnectedCount: connections.filter((connection) => connection.health.status === 'disconnected').length,
  }

  return { summary, connections }
}

export async function getAdminCalendarHealth() {
  const connections = await prisma.attorneyCalendarConnection.findMany({
    orderBy: [
      { updatedAt: 'desc' },
      { createdAt: 'desc' },
    ],
    include: {
      attorney: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })
  const busyBlockCounts = await prisma.attorneyCalendarBusyBlock.groupBy({
    by: ['connectionId'],
    where: {
      connectionId: { not: null },
    },
    _count: { id: true },
  })
  const busyBlockCountByConnectionId = new Map(
    busyBlockCounts.map((item: any) => [item.connectionId, item._count.id])
  )

  const items = connections.map((connection) => ({
    id: connection.id,
    provider: connection.provider,
    attorney: connection.attorney,
    externalAccountEmail: connection.externalAccountEmail,
    syncStatus: connection.syncStatus,
    lastSyncedAt: connection.lastSyncedAt,
    lastSyncError: connection.lastSyncError,
    webhookExpiresAt: connection.webhookExpiresAt,
    lastWebhookAt: connection.lastWebhookAt,
    connected: Boolean(connection.refreshToken || connection.accessToken),
    health: buildCalendarConnectionHealth(connection, busyBlockCountByConnectionId.get(connection.id) || 0),
  }))

  return {
    summary: {
      totalConnections: items.length,
      healthyCount: items.filter((item) => item.health.status === 'healthy').length,
      warningCount: items.filter((item) => item.health.status === 'warning').length,
      errorCount: items.filter((item) => item.health.status === 'error').length,
      disconnectedCount: items.filter((item) => item.health.status === 'disconnected').length,
    },
    connections: items,
  }
}

export async function disconnectAttorneyCalendarConnection(attorneyId: string, provider: CalendarProvider) {
  const connection = await prisma.attorneyCalendarConnection.findUnique({
    where: {
      attorneyId_provider: {
        attorneyId,
        provider,
      },
    },
  })

  if (!connection) {
    return { disconnected: false }
  }

  if (connection.provider === 'google') {
    await stopGoogleWebhook(connection)
  } else if (connection.provider === 'microsoft' && connection.webhookSubscriptionId) {
    try {
      const accessToken = await ensureFreshAccessToken(connection)
      await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${encodeURIComponent(connection.webhookSubscriptionId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
    } catch (error) {
      logger.warn('Failed to delete Microsoft calendar subscription', { error, connectionId: connection.id })
    }
  }

  await prisma.attorneyCalendarBusyBlock.deleteMany({
    where: { connectionId: connection.id },
  })

  await prisma.attorneyCalendarConnection.delete({
    where: { id: connection.id },
  })

  return { disconnected: true }
}

export {
  calendarFrontendRedirect,
}
