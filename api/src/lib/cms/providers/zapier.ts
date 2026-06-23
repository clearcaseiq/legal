/**
 * Generic outbound webhook connector ("Zapier") — Phase 2 interim path.
 *
 * Posts neutral JSON events to a firm-configured webhook URL (Zapier, Make, or
 * any HTTP endpoint). This unlocks integrations with CMS platforms that only
 * expose Zapier/no-code automation (e.g. CasePeer, SmartAdvocate) without a
 * deep API build. Documents are sent as metadata + a download URL rather than
 * raw bytes.
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

function webhookUrl(auth: CmsAuthContext): string {
  const url = (auth.config?.webhookUrl as string) || ''
  if (!url) throw new CmsNotConfiguredError('zapier')
  return url
}

async function post(auth: CmsAuthContext, event: string, payload: Record<string, unknown>) {
  const res = await fetch(webhookUrl(auth), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ event, connectionId: auth.connectionId, ...payload }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Webhook POST failed (${res.status}): ${text.slice(0, 300)}`)
  }
}

export const zapierConnector: CmsConnector = {
  id: 'zapier',
  authType: 'webhook',

  meta(): CmsProviderMeta {
    return {
      id: 'zapier',
      label: 'Zapier / Webhook',
      authType: 'webhook',
      configured: true, // works for any firm that pastes a webhook URL
      notes: 'Send case data to any Zapier/Make/HTTP webhook. No API keys required.',
      docsUrl: `${ENV.WEB_URL}`,
    }
  },

  async upsertContact(auth: CmsAuthContext, input: CmsContactInput): Promise<CmsContactResult> {
    await post(auth, 'contact.upserted', { contact: input })
    return { externalId: `zapier:${input.email || input.lastName}` }
  },

  async createMatter(
    auth: CmsAuthContext,
    input: CmsMatterInput,
    contactExternalId?: string
  ): Promise<CmsMatterResult> {
    await post(auth, 'matter.created', { matter: input, contactExternalId })
    return { externalId: `zapier:${input.reference}` }
  },

  async uploadDocument(
    auth: CmsAuthContext,
    matterExternalId: string,
    input: CmsDocumentInput
  ): Promise<CmsDocumentResult> {
    await post(auth, 'document.added', {
      matterExternalId,
      document: { fileName: input.fileName, mimeType: input.mimeType, category: input.category },
    })
    return { externalId: `zapier:${matterExternalId}:${input.fileName}` }
  },
}
