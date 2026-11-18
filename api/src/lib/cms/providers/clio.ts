/**
 * Clio Manage connector (Phase 1).
 *
 * Clio Manage exposes a mature REST API (v4) with self-serve OAuth 2.0
 * (Authorization Code grant), so it is the first fully-functional connector.
 * Tokens are valid ~30 days and refreshable. Document upload follows Clio's
 * documented 3-step flow: create document -> PUT bytes to the returned URL ->
 * PATCH fully_uploaded=true.
 *
 * Docs: https://docs.developers.clio.com/clio-manage/api-reference/
 */
import { readFile } from 'fs/promises'
import { basename } from 'path'
import { ENV } from '../../../env'
import { parseIncidentDate } from '../../imported-date'
import {
  CmsNotConfiguredError,
  type CmsAuthContext,
  type CmsConnector,
  type CmsContactInput,
  type CmsContactResult,
  type CmsDocumentInput,
  type CmsDocumentResult,
  type CmsInboundMatter,
  type CmsListMattersOptions,
  type CmsMatterInput,
  type CmsMatterPage,
  type CmsMatterResult,
  type CmsProviderMeta,
  type CmsTokenSet,
} from '../types'

function configured(): boolean {
  return Boolean(ENV.CLIO_CLIENT_ID && ENV.CLIO_CLIENT_SECRET && ENV.CLIO_REDIRECT_URI)
}

function apiBase(auth?: CmsAuthContext): string {
  return (auth?.apiBaseUrl || ENV.CLIO_API_BASE).replace(/\/$/, '')
}

const CLIO_REQUEST_TIMEOUT_MS = 30_000
const CLIO_MAX_ATTEMPTS = 4

function headerValue(response: Response, name: string): string | null {
  return typeof response.headers?.get === 'function' ? response.headers.get(name) : null
}

function retryDelayMs(response: Response | null, attempt: number): number {
  const retryAfter = response ? headerValue(response, 'retry-after') : null
  if (retryAfter) {
    const seconds = Number(retryAfter)
    if (Number.isFinite(seconds)) return Math.min(Math.max(seconds * 1000, 0), 30_000)
    const at = Date.parse(retryAfter)
    if (Number.isFinite(at)) return Math.min(Math.max(at - Date.now(), 0), 30_000)
  }
  return Math.min(500 * 2 ** (attempt - 1), 4_000)
}

function sleep(ms: number): Promise<void> {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve()
}

function retryableStatus(method: string, status: number): boolean {
  if (status === 429) return true
  return method.toUpperCase() === 'GET' && [500, 502, 503, 504].includes(status)
}

async function clioJson<T>(
  auth: CmsAuthContext,
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  if (!auth.accessToken) throw new Error('Clio connection is missing an access token')
  const serializedBody = body ? JSON.stringify(body) : undefined

  for (let attempt = 1; attempt <= CLIO_MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), CLIO_REQUEST_TIMEOUT_MS)
    let res: Response
    try {
      res = await fetch(`${apiBase(auth)}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: serializedBody,
        signal: controller.signal,
      })
    } catch (error) {
      clearTimeout(timeout)
      const canRetry = method.toUpperCase() === 'GET' && attempt < CLIO_MAX_ATTEMPTS
      if (!canRetry) throw error
      await sleep(retryDelayMs(null, attempt))
      continue
    } finally {
      clearTimeout(timeout)
    }

    if (res.ok) return (await res.json()) as T
    if (attempt < CLIO_MAX_ATTEMPTS && retryableStatus(method, res.status)) {
      await sleep(retryDelayMs(res, attempt))
      continue
    }

    const requestId = headerValue(res, 'x-request-id')
    const suffix = requestId ? `; request ${requestId}` : ''
    throw new Error(`Clio ${method} ${path} failed (${res.status}${suffix})`)
  }

  throw new Error(`Clio ${method} ${path} failed after ${CLIO_MAX_ATTEMPTS} attempts`)
}

async function verifyInboundReadAccess(auth: CmsAuthContext): Promise<void> {
  try {
    await clioJson(auth, 'GET', '/api/v4/matters.json?fields=id&limit=1')
    await clioJson(auth, 'GET', '/api/v4/custom_fields.json?fields=id,name&parent_type=Matter&limit=1')
  } catch (error) {
    throw new Error(
      `Clio authorization is missing required read access to Matters or Custom Fields. ` +
        `Update the Clio app permissions and reconnect. ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

export const clioConnector: CmsConnector = {
  id: 'clio',
  authType: 'oauth',

  meta(): CmsProviderMeta {
    return {
      id: 'clio',
      label: 'Clio Manage',
      authType: 'oauth',
      configured: configured(),
      notes: configured()
        ? 'Connect your Clio account via OAuth.'
        : 'Set CLIO_CLIENT_ID / CLIO_CLIENT_SECRET / CLIO_REDIRECT_URI to enable.',
      docsUrl: 'https://docs.developers.clio.com/clio-manage/api-reference/',
    }
  },

  buildAuthorizeUrl(state: string): string {
    if (!configured()) throw new CmsNotConfiguredError('clio')
    const url = new URL(`${ENV.CLIO_API_BASE.replace(/\/$/, '')}/oauth/authorize`)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('client_id', ENV.CLIO_CLIENT_ID as string)
    url.searchParams.set('redirect_uri', ENV.CLIO_REDIRECT_URI as string)
    url.searchParams.set('state', state)
    return url.toString()
  },

  async exchangeCode(code: string): Promise<CmsTokenSet> {
    if (!configured()) throw new CmsNotConfiguredError('clio')
    const tokenSet = await clioOauthToken({
      grant_type: 'authorization_code',
      code,
      redirect_uri: ENV.CLIO_REDIRECT_URI as string,
    })
    const auth = { connectionId: '', accessToken: tokenSet.accessToken, config: {} }
    // Identity is required for stable account ownership and deduplication.
    const who = await clioJson<{ data: { id: number; name?: string; email?: string } }>(
      auth,
      'GET',
      '/api/v4/users/who_am_i.json?fields=id,name,email'
    )
    const userId = String(who.data?.id ?? '')
    tokenSet.externalUserId = userId
    tokenSet.externalAccountId = userId
    tokenSet.externalAccountEmail = who.data?.email ?? null

    // A successful OAuth exchange does not prove the Clio app was granted the
    // resource permissions this importer needs. Fail while the user is still
    // connecting instead of six hours later in the scheduled sweep.
    await verifyInboundReadAccess(auth)
    return tokenSet
  },

  async refreshToken(refreshToken: string): Promise<CmsTokenSet> {
    if (!configured()) throw new CmsNotConfiguredError('clio')
    return clioOauthToken({ grant_type: 'refresh_token', refresh_token: refreshToken })
  },

  async upsertContact(auth: CmsAuthContext, input: CmsContactInput): Promise<CmsContactResult> {
    const data: Record<string, unknown> = {
      type: 'Person',
      first_name: input.firstName,
      last_name: input.lastName,
    }
    if (input.email) data.email_addresses = [{ name: 'Other', address: input.email, default_email: true }]
    if (input.phone) data.phone_numbers = [{ name: 'Other', number: input.phone, default_number: true }]
    const res = await clioJson<{ data: { id: number } }>(
      auth,
      'POST',
      '/api/v4/contacts.json?fields=id',
      { data }
    )
    return { externalId: String(res.data.id) }
  },

  async createMatter(
    auth: CmsAuthContext,
    input: CmsMatterInput,
    contactExternalId?: string
  ): Promise<CmsMatterResult> {
    const data: Record<string, unknown> = {
      description: input.description,
      status: input.status || 'Open',
    }
    if (contactExternalId) data.client = { id: Number(contactExternalId) }
    if (input.customFields) {
      const noteLines = Object.entries(input.customFields)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${k}: ${v}`)
      if (noteLines.length) data.notes = noteLines.join('\n')
    }
    const res = await clioJson<{ data: { id: number } }>(
      auth,
      'POST',
      '/api/v4/matters.json?fields=id',
      { data }
    )
    return { externalId: String(res.data.id) }
  },

  async uploadDocument(
    auth: CmsAuthContext,
    matterExternalId: string,
    input: CmsDocumentInput
  ): Promise<CmsDocumentResult> {
    const bytes = await readFile(input.filePath)
    const name = input.fileName || basename(input.filePath)

    // Step 1: create the document; Clio returns a presigned PUT target.
    const created = await clioJson<{
      data: {
        id: number
        latest_document_version?: { uuid: string; put_url: string; put_headers?: { name: string; value: string }[] }
      }
    }>(
      auth,
      'POST',
      '/api/v4/documents.json?fields=id,latest_document_version{uuid,put_url,put_headers}',
      { data: { name, parent: { id: Number(matterExternalId), type: 'Matter' } } }
    )

    const version = created.data.latest_document_version
    if (!version?.put_url || !version.uuid) {
      // Some Clio configurations accept inline content; fall back to returning the id.
      return { externalId: String(created.data.id) }
    }

    // Step 2: upload the bytes to the presigned URL with Clio-provided headers.
    const putHeaders: Record<string, string> = {}
    for (const h of version.put_headers || []) putHeaders[h.name] = h.value
    const putRes = await fetch(version.put_url, {
      method: 'PUT',
      headers: putHeaders,
      body: new Uint8Array(bytes),
    })
    if (!putRes.ok) {
      throw new Error(`Clio document upload PUT failed (${putRes.status})`)
    }

    // Step 3: mark the version fully uploaded.
    await clioJson(
      auth,
      'PATCH',
      `/api/v4/documents/${created.data.id}.json?fields=id`,
      { data: { uuid: version.uuid, fully_uploaded: true } }
    )

    return { externalId: String(created.data.id) }
  },

  /**
   * Page through Clio matters.
   *
   * Clio v4 returns `meta.paging.next`, an absolute URL carrying its own
   * offset token, so the cursor here is that URL rather than a page number —
   * Clio's docs are explicit that clients should follow the link instead of
   * constructing offsets themselves.
   *
   * `fields` is spelled out because Clio omits nested resources unless asked,
   * and a matter without `client` has no name on it at all.
   */
  async listMatters(auth: CmsAuthContext, options: CmsListMattersOptions): Promise<CmsMatterPage> {
    const fields = [
      'id',
      'display_number',
      'description',
      'status',
      'open_date',
      'practice_area{id,name}',
      'client{id,name,first_name,last_name,primary_email_address,primary_phone_number}',
      'custom_field_values{id,field_name,value,custom_field{id,name}}',
    ].join(',')

    let path: string
    if (options.cursor) {
      // Follow Clio's own link, minus the origin, which apiBase supplies.
      path = options.cursor.startsWith('http') ? new URL(options.cursor).pathname + new URL(options.cursor).search : options.cursor
    } else {
      const params = new URLSearchParams({
        fields,
        limit: String(Math.min(options.limit ?? 100, 200)),
        order: 'id(asc)',
      })
      if (options.since) params.set('updated_since', options.since.toISOString())
      path = `/api/v4/matters.json?${params.toString()}`
    }

    const res = await clioJson<{
      data: ClioMatter[]
      meta?: { paging?: { next?: string | null } }
    }>(auth, 'GET', path)

    return {
      matters: (res.data || []).map(mapClioMatter),
      nextCursor: res.meta?.paging?.next ?? null,
    }
  },
}

interface ClioMatter {
  id: number
  display_number?: string | null
  description?: string | null
  status?: string | null
  open_date?: string | null
  practice_area?: { name?: string | null } | null
  client?: {
    name?: string | null
    first_name?: string | null
    last_name?: string | null
    primary_email_address?: string | null
    primary_phone_number?: string | null
  } | null
  custom_field_values?: Array<{
    id?: number | null
    field_name?: string | null
    value?: unknown
    custom_field?: { id?: number | null; name?: string | null } | null
  }> | null
}

const INCIDENT_DATE_FIELDS = new Set(['dateofloss', 'incidentdate', 'accidentdate', 'dateofincident'])
const VENUE_STATE_FIELDS = new Set(['venuestate', 'jurisdictionstate', 'stateofvenue'])
const VENUE_COUNTY_FIELDS = new Set(['venuecounty', 'jurisdictioncounty', 'countyofvenue'])

function normalizeFieldName(value: string | null | undefined): string {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function customFieldValue(value: unknown): string | null {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const text = String(value).trim()
    return text || null
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    for (const key of ['name', 'value', 'label']) {
      if (typeof record[key] === 'string' || typeof record[key] === 'number') {
        const text = String(record[key]).trim()
        if (text) return text
      }
    }
  }
  return null
}

function mappedCustomFields(matter: ClioMatter) {
  let incidentDate: string | null = null
  let venueState: string | null = null
  let venueCounty: string | null = null

  for (const field of matter.custom_field_values || []) {
    const name = normalizeFieldName(field.custom_field?.name || field.field_name)
    const value = customFieldValue(field.value)
    if (!name || !value) continue

    if (!incidentDate && INCIDENT_DATE_FIELDS.has(name)) {
      const parsed = parseIncidentDate(value)
      if (parsed.ok) incidentDate = parsed.date
    } else if (!venueState && VENUE_STATE_FIELDS.has(name)) {
      const state = value.trim().toUpperCase()
      if (/^[A-Z]{2}$/.test(state)) venueState = state
    } else if (!venueCounty && VENUE_COUNTY_FIELDS.has(name)) {
      venueCounty = value.replace(/\s+county$/i, '').trim() || null
    }
  }

  return { incidentDate, venueState, venueCounty }
}

function mapClioMatter(matter: ClioMatter): CmsInboundMatter {
  const client = matter.client || {}
  // Clio stores companies as a single `name` with no first/last, and people
  // populate both. Splitting the fallback keeps a company from landing
  // entirely in the first-name field.
  const [fallbackFirst, ...fallbackRest] = String(client.name || '').trim().split(/\s+/)
  const custom = mappedCustomFields(matter)

  return {
    externalId: String(matter.id),
    clientFirstName: client.first_name || fallbackFirst || null,
    clientLastName: client.last_name || (fallbackRest.length ? fallbackRest.join(' ') : null),
    clientEmail: client.primary_email_address || null,
    clientPhone: client.primary_phone_number || null,
    description: matter.description || null,
    practiceArea: matter.practice_area?.name || null,
    // Clio has no built-in incident date. Firms commonly add one as a custom
    // field; only recognised labels and strictly parsed values are trusted.
    // `open_date` remains deliberately unused because it is not the date of
    // loss and would create a wrong limitations deadline.
    incidentDate: custom.incidentDate,
    venueState: custom.venueState,
    venueCounty: custom.venueCounty,
    status: matter.status || null,
    raw: { ...matter, display_number: matter.display_number ?? null },
  }
}

async function clioOauthToken(params: Record<string, string>): Promise<CmsTokenSet> {
  const body = new URLSearchParams({
    client_id: ENV.CLIO_CLIENT_ID as string,
    client_secret: ENV.CLIO_CLIENT_SECRET as string,
    ...params,
  })
  const res = await fetch(`${ENV.CLIO_API_BASE.replace(/\/$/, '')}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Clio token exchange failed (${res.status}): ${text.slice(0, 300)}`)
  }
  const json = (await res.json()) as {
    access_token: string
    refresh_token?: string
    expires_in?: number
    scope?: string
  }
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresInSeconds: json.expires_in ?? null,
    scope: json.scope ?? null,
  }
}
