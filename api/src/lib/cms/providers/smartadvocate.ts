/**
 * SmartAdvocate connector (Phase 3) — partner-gated.
 *
 * SmartAdvocate offers a REST API to Integration Partners; the base URL is
 * firm/instance-specific and access is granted through their partner program
 * (the same path Lawmatics used for its intake integration). This connector
 * authenticates with an API key and uses neutral REST calls; exact endpoint
 * shapes must be confirmed against the firm's SmartAdvocate API documentation.
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
  const base = (auth?.apiBaseUrl || auth?.config?.apiBaseUrl || ENV.SMARTADVOCATE_API_BASE || '').replace(/\/$/, '')
  const key = (auth?.config?.apiKey as string) || ENV.SMARTADVOCATE_API_KEY || ''
  if (!base || !key) throw new CmsNotConfiguredError('smartadvocate')
  return { base, key }
}

async function saJson<T>(
  auth: CmsAuthContext,
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const { base, key } = resolveBaseAndKey(auth)
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`SmartAdvocate ${method} ${path} failed (${res.status}): ${text.slice(0, 400)}`)
  }
  return (await res.json()) as T
}

export const smartadvocateConnector: CmsConnector = {
  id: 'smartadvocate',
  authType: 'partner',

  meta(): CmsProviderMeta {
    const configured = Boolean(ENV.SMARTADVOCATE_API_BASE && ENV.SMARTADVOCATE_API_KEY)
    return {
      id: 'smartadvocate',
      label: 'SmartAdvocate',
      authType: 'partner',
      configured,
      notes:
        'Requires SmartAdvocate Integration Partner access. Provide the firm-specific API base URL and key.',
      docsUrl: 'https://www.smartadvocate.com/integration-and-partners',
    }
  },

  async upsertContact(auth: CmsAuthContext, input: CmsContactInput): Promise<CmsContactResult> {
    const res = await saJson<{ id?: number | string; contactId?: number | string }>(
      auth,
      'POST',
      '/api/contacts',
      {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email ?? undefined,
        phone: input.phone ?? undefined,
        contactType: input.type ?? 'Plaintiff',
      }
    )
    return { externalId: String(res.id ?? res.contactId ?? '') }
  },

  async createMatter(
    auth: CmsAuthContext,
    input: CmsMatterInput,
    contactExternalId?: string
  ): Promise<CmsMatterResult> {
    const res = await saJson<{ caseId?: number | string; id?: number | string }>(
      auth,
      'POST',
      '/api/cases',
      {
        caseName: input.description,
        caseType: input.practiceArea,
        primaryContactId: contactExternalId ? Number(contactExternalId) : undefined,
        externalReference: input.reference,
      }
    )
    return { externalId: String(res.caseId ?? res.id ?? '') }
  },

  async uploadDocument(
    auth: CmsAuthContext,
    matterExternalId: string,
    input: CmsDocumentInput
  ): Promise<CmsDocumentResult> {
    const res = await saJson<{ documentId?: number | string; id?: number | string }>(
      auth,
      'POST',
      `/api/cases/${matterExternalId}/documents`,
      { fileName: input.fileName, mimeType: input.mimeType, category: input.category }
    )
    return { externalId: String(res.documentId ?? res.id ?? '') }
  },
}
