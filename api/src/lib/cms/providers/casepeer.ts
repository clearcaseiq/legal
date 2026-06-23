/**
 * CasePeer (8am) connector (Phase 3) — partner-gated.
 *
 * CasePeer exposes an official API to partners (used by tools like Quilia) plus
 * Zapier for no-code flows. Access requires their partner program. This
 * connector authenticates with an API key; endpoint shapes should be confirmed
 * against CasePeer's partner API documentation. For firms without API access,
 * use the generic Zapier connector instead.
 */
import { ENV } from '../../../env'
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
} from '../types'

function resolveBaseAndKey(auth?: CmsAuthContext): { base: string; key: string } {
  const base = (auth?.apiBaseUrl || auth?.config?.apiBaseUrl || ENV.CASEPEER_API_BASE || '').replace(/\/$/, '')
  const key = (auth?.config?.apiKey as string) || ENV.CASEPEER_API_KEY || ''
  if (!base || !key) throw new CmsNotConfiguredError('casepeer')
  return { base, key }
}

async function cpJson<T>(
  auth: CmsAuthContext,
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const { base, key } = resolveBaseAndKey(auth)
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Token ${key}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`CasePeer ${method} ${path} failed (${res.status}): ${text.slice(0, 400)}`)
  }
  return (await res.json()) as T
}

export const casepeerConnector: CmsConnector = {
  id: 'casepeer',
  authType: 'partner',

  meta(): CmsProviderMeta {
    const configured = Boolean(ENV.CASEPEER_API_KEY)
    return {
      id: 'casepeer',
      label: 'CasePeer (8am)',
      authType: 'partner',
      configured,
      notes:
        'Requires CasePeer partner API access. Provide an API key (or use the Zapier connector for no-code sync).',
      docsUrl: 'https://www.casepeer.com/integrations/',
    }
  },

  async upsertContact(auth: CmsAuthContext, input: CmsContactInput): Promise<CmsContactResult> {
    const res = await cpJson<{ id?: number | string }>(auth, 'POST', '/api/v1/clients/', {
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email ?? undefined,
      phone: input.phone ?? undefined,
    })
    return { externalId: String(res.id ?? '') }
  },

  async createMatter(
    auth: CmsAuthContext,
    input: CmsMatterInput,
    contactExternalId?: string
  ): Promise<CmsMatterResult> {
    const res = await cpJson<{ id?: number | string }>(auth, 'POST', '/api/v1/cases/', {
      name: input.description,
      case_type: input.practiceArea,
      client_id: contactExternalId ? Number(contactExternalId) : undefined,
      reference: input.reference,
    })
    return { externalId: String(res.id ?? '') }
  },

  async uploadDocument(
    auth: CmsAuthContext,
    matterExternalId: string,
    input: CmsDocumentInput
  ): Promise<CmsDocumentResult> {
    const res = await cpJson<{ id?: number | string }>(
      auth,
      'POST',
      `/api/v1/cases/${matterExternalId}/documents/`,
      { file_name: input.fileName, mime_type: input.mimeType, category: input.category }
    )
    return { externalId: String(res.id ?? '') }
  },
}
