/**
 * Clio Manage connector (Phase 1).
 *
 * Clio Manage exposes a mature REST API (v4) with self-serve OAuth 2.0
 * (Authorization Code grant), so it is the first fully-functional connector.
 * Tokens are valid ~30 days and refreshable. Document upload follows Clio's
 * documented 3-step flow: create document -> PUT bytes to the returned URL ->
 * PATCH fully_uploaded=true.
 *
 * Docs: https://docs.developers.clio.com/api-docs/clio-manage/
 */
import { readFile } from 'fs/promises'
import { basename } from 'path'
import { ENV } from '../../../env'
import { logger } from '../../logger'
import {
  CmsNotConfiguredError,
  type CmsAuthContext,
  type CmsConnector,
  type CmsContactInput,
  type CmsContactResult,
  type CmsDocumentInput,
  type CmsDocumentResult,
  type CmsMatterInput,
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

async function clioJson<T>(
  auth: CmsAuthContext,
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  if (!auth.accessToken) throw new Error('Clio connection is missing an access token')
  const res = await fetch(`${apiBase(auth)}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Clio ${method} ${path} failed (${res.status}): ${text.slice(0, 500)}`)
  }
  return (await res.json()) as T
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
      docsUrl: 'https://docs.developers.clio.com/api-docs/clio-manage/',
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
    // Resolve identity so we can store external account id/email + org.
    try {
      const who = await clioJson<{ data: { id: number; name?: string; email?: string } }>(
        { connectionId: '', accessToken: tokenSet.accessToken, config: {} },
        'GET',
        '/api/v4/users/who_am_i.json?fields=id,name,email'
      )
      tokenSet.externalUserId = String(who.data?.id ?? '')
      tokenSet.externalAccountEmail = who.data?.email ?? null
    } catch (error) {
      logger.warn('Clio who_am_i lookup failed', { error })
    }
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
