/**
 * Filevine connector (Phase 2).
 *
 * Filevine's API gateway authenticates with a Personal Access Token (PAT) that
 * is exchanged for a short-lived bearer token at the identity endpoint; all
 * gateway calls then require `x-fv-orgid` / `x-fv-userid` headers. Client
 * credentials + PAT are issued by Filevine Partnerships, so this connector is
 * "configured" only once a firm supplies them.
 *
 * We model the PAT->bearer exchange as the framework's `refreshToken()` so the
 * generic token-validity path mints/rotates the bearer automatically. The PAT
 * itself is stored (encrypted) in the connection's refreshToken slot.
 *
 * Endpoint shapes for contacts/projects/documents should be validated against
 * the partner docs (https://developer.filevine.io) before production use.
 */
import { readFile } from 'fs/promises'
import { basename } from 'path'
import { ENV } from '../../../env'
import {
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
  return Boolean(ENV.FILEVINE_CLIENT_ID && ENV.FILEVINE_CLIENT_SECRET)
}

function apiBase(auth?: CmsAuthContext): string {
  return (auth?.apiBaseUrl || ENV.FILEVINE_API_BASE).replace(/\/$/, '')
}

async function fvJson<T>(
  auth: CmsAuthContext,
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  if (!auth.accessToken) throw new Error('Filevine connection is missing a bearer token')
  const res = await fetch(`${apiBase(auth)}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(auth.externalOrgId ? { 'x-fv-orgid': auth.externalOrgId } : {}),
      ...(auth.externalUserId ? { 'x-fv-userid': auth.externalUserId } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Filevine ${method} ${path} failed (${res.status}): ${text.slice(0, 400)}`)
  }
  return (await res.json()) as T
}

export const filevineConnector: CmsConnector = {
  id: 'filevine',
  authType: 'pat',

  meta(): CmsProviderMeta {
    return {
      id: 'filevine',
      label: 'Filevine',
      authType: 'pat',
      configured: configured(),
      notes: configured()
        ? 'Connect by pasting a Personal Access Token from your Filevine Account Manager.'
        : 'Request client credentials from Filevine Partnerships, then set FILEVINE_CLIENT_ID / FILEVINE_CLIENT_SECRET.',
      docsUrl: 'https://developer.filevine.io',
    }
  },

  // PAT -> bearer exchange (+ org/user resolution). `refreshToken` here is the PAT.
  async refreshToken(pat: string): Promise<CmsTokenSet> {
    const scope =
      'fv.api.gateway.access tenant filevine.v2.api.* openid email fv.auth.tenant.read'
    const body = new URLSearchParams({
      grant_type: 'personal_access_token',
      token: pat,
      client_id: ENV.FILEVINE_CLIENT_ID as string,
      client_secret: ENV.FILEVINE_CLIENT_SECRET as string,
      scope,
    })
    const res = await fetch(`${ENV.FILEVINE_IDENTITY_BASE.replace(/\/$/, '')}/connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Filevine token exchange failed (${res.status}): ${text.slice(0, 300)}`)
    }
    const json = (await res.json()) as { access_token: string; expires_in?: number }

    const tokenSet: CmsTokenSet = {
      accessToken: json.access_token,
      refreshToken: pat, // keep the PAT so we can mint again on expiry
      expiresInSeconds: json.expires_in ?? 3600,
    }

    // Resolve org + user ids required for all subsequent gateway calls.
    try {
      const orgRes = await fetch(
        `${ENV.FILEVINE_API_BASE.replace(/\/$/, '')}/fv-app/v2/utils/GetUserOrgsWithToken`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${json.access_token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({}),
        }
      )
      if (orgRes.ok) {
        const data: any = await orgRes.json()
        const user = data?.user ?? data?.User
        const org = Array.isArray(data?.orgs ?? data?.Orgs) ? (data.orgs ?? data.Orgs)[0] : undefined
        tokenSet.externalUserId = user?.userId != null ? String(user.userId) : undefined
        tokenSet.externalOrgId = org?.orgId != null ? String(org.orgId) : undefined
      }
    } catch {
      // Non-fatal: org/user can be supplied via config instead.
    }

    return tokenSet
  },

  async upsertContact(auth: CmsAuthContext, input: CmsContactInput): Promise<CmsContactResult> {
    const res = await fvJson<{ personId?: { native?: number | string } | number | string }>(
      auth,
      'POST',
      '/fv-app/v2/core/persons',
      {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email ?? undefined,
        phone: input.phone ?? undefined,
      }
    )
    return { externalId: extractFilevineId(res.personId) }
  },

  async createMatter(
    auth: CmsAuthContext,
    input: CmsMatterInput,
    contactExternalId?: string
  ): Promise<CmsMatterResult> {
    const res = await fvJson<{ projectId?: { native?: number | string } | number | string }>(
      auth,
      'POST',
      '/fv-app/v2/core/projects',
      {
        projectName: input.description,
        projectTypeCode: input.practiceArea,
        clientId: contactExternalId ? Number(contactExternalId) : undefined,
        number: input.reference,
      }
    )
    return { externalId: extractFilevineId(res.projectId) }
  },

  async uploadDocument(
    auth: CmsAuthContext,
    matterExternalId: string,
    input: CmsDocumentInput
  ): Promise<CmsDocumentResult> {
    // Filevine document upload is a multi-step gateway flow; partner docs define
    // the exact create/commit endpoints. We create the document metadata under
    // the project; the binary upload step is partner-config dependent.
    const bytes = await readFile(input.filePath)
    const res = await fvJson<{ documentId?: { native?: number | string } | number | string }>(
      auth,
      'POST',
      '/fv-app/v2/core/documents',
      {
        projectId: Number(matterExternalId),
        filename: input.fileName || basename(input.filePath),
        size: bytes.length,
        mimeType: input.mimeType,
      }
    )
    return { externalId: extractFilevineId(res.documentId) }
  },
}

function extractFilevineId(
  id: { native?: number | string } | number | string | undefined
): string {
  if (id == null) return ''
  if (typeof id === 'object') return String(id.native ?? '')
  return String(id)
}
