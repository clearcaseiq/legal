/**
 * Documenso adapter — open-source, self-hostable e-signature.
 *
 * The "build vs buy" middle path: ESIGN/UETA-grade signing + audit trail
 * without writing the cryptography yourself, hosted on your own infra (data
 * ownership, no per-envelope fee, PHI never leaves your VPC). Targets the v2
 * API ("envelope" resource). Set DOCUMENSO_API_URL to the v2 base, e.g.
 * https://sign.yourfirm.com/api/v2
 *
 * Docs: https://docs.documenso.com/docs/developers/api/documents
 */
import { readFile } from 'fs/promises'
import { basename } from 'path'
import { logger } from '../logger'
import {
  ESignNotConfiguredError,
  type CreateEnvelopeInput,
  type CreateEnvelopeResult,
  type EnvelopeStatus,
  type EnvelopeStatusResult,
  type ESignProviderMeta,
  type ESignWebhookEvent,
  type ESignatureProvider,
} from './types'

function baseUrl(): string | null {
  const url = process.env.DOCUMENSO_API_URL
  return url ? url.replace(/\/$/, '') : null
}

function apiKey(): string | null {
  return process.env.DOCUMENSO_API_KEY || null
}

function configured(): boolean {
  return Boolean(baseUrl() && apiKey())
}

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${apiKey()}` }
}

/** Map a Documenso envelope/document status to our neutral status. */
function statusFromDocumenso(raw: string | undefined): EnvelopeStatus {
  switch ((raw || '').toUpperCase()) {
    case 'COMPLETED':
      return 'signed'
    case 'PENDING':
      return 'sent'
    case 'REJECTED':
      return 'declined'
    case 'DRAFT':
      return 'draft'
    default:
      return 'sent'
  }
}

export const documensoProvider: ESignatureProvider = {
  id: 'documenso',
  label: 'Documenso (self-hosted)',

  meta(): ESignProviderMeta {
    return {
      id: 'documenso',
      label: 'Documenso (self-hosted)',
      configured: configured(),
      // Self-hosted: PHI stays on infrastructure you control. Confirm your own
      // HIPAA controls; no third-party BAA is required for that boundary.
      hipaaCapable: true,
      notes: 'Open-source, self-hostable. Data ownership + no per-envelope fee.',
      docsUrl: 'https://docs.documenso.com/docs/developers/api/documents',
    }
  },

  async createEnvelope(input: CreateEnvelopeInput): Promise<CreateEnvelopeResult> {
    if (!configured()) throw new ESignNotConfiguredError('documenso')
    const base = baseUrl() as string

    const payload = {
      type: 'DOCUMENT',
      title: input.title,
      externalId: input.reference,
      recipients: [{ email: input.signerEmail, name: input.signerName, role: 'SIGNER' }],
      meta: { subject: input.title, ...(input.redirectUrl ? { redirectUrl: input.redirectUrl } : {}) },
    }

    const fileBuf = await readFile(input.filePath)
    const form = new FormData()
    form.append('payload', JSON.stringify(payload))
    form.append(
      'files',
      new Blob([new Uint8Array(fileBuf)], { type: 'application/pdf' }),
      basename(input.filePath)
    )

    const createRes = await fetch(`${base}/envelope/create`, {
      method: 'POST',
      headers: authHeaders(),
      body: form,
    })
    if (!createRes.ok) {
      const text = await createRes.text().catch(() => '')
      throw new Error(`Documenso create failed (${createRes.status}): ${text.slice(0, 500)}`)
    }

    const created = (await createRes.json()) as {
      id?: string | number
      envelopeId?: string
      recipients?: { signingUrl?: string; token?: string }[]
    }
    const externalEnvelopeId = String(created.envelopeId ?? created.id ?? '')
    if (!externalEnvelopeId) throw new Error('Documenso create returned no envelope id')

    // Distribute: DRAFT -> PENDING, emailing the signer.
    const sendRes = await fetch(`${base}/envelope/distribute`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ envelopeId: externalEnvelopeId }),
    })
    if (!sendRes.ok) {
      const text = await sendRes.text().catch(() => '')
      throw new Error(`Documenso distribute failed (${sendRes.status}): ${text.slice(0, 500)}`)
    }

    return {
      externalEnvelopeId,
      signingUrl: created.recipients?.[0]?.signingUrl ?? null,
      status: 'sent',
    }
  },

  async getStatus(externalEnvelopeId: string): Promise<EnvelopeStatusResult> {
    if (!configured()) throw new ESignNotConfiguredError('documenso')
    const base = baseUrl() as string

    const res = await fetch(`${base}/envelope/${externalEnvelopeId}`, { headers: authHeaders() })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Documenso get failed (${res.status}): ${text.slice(0, 500)}`)
    }
    const data = (await res.json()) as { status?: string; completedAt?: string | null }
    return {
      status: statusFromDocumenso(data.status),
      signedAt: data.completedAt ?? null,
      auditTrailUrl: null,
    }
  },

  async downloadSigned(externalEnvelopeId: string): Promise<Buffer> {
    if (!configured()) throw new ESignNotConfiguredError('documenso')
    const base = baseUrl() as string

    const res = await fetch(`${base}/envelope/${externalEnvelopeId}/download`, {
      headers: authHeaders(),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Documenso download failed (${res.status}): ${text.slice(0, 300)}`)
    }
    // Some versions return { downloadUrl } instead of raw bytes; follow it.
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const { downloadUrl } = (await res.json()) as { downloadUrl?: string }
      if (!downloadUrl) throw new Error('Documenso download returned no url')
      const fileRes = await fetch(downloadUrl)
      return Buffer.from(await fileRes.arrayBuffer())
    }
    return Buffer.from(await res.arrayBuffer())
  },

  async voidEnvelope(externalEnvelopeId: string): Promise<void> {
    if (!configured()) throw new ESignNotConfiguredError('documenso')
    const base = baseUrl() as string
    // Exact path can vary by Documenso version; DELETE on the envelope is the
    // documented way to cancel an in-flight document.
    const res = await fetch(`${base}/envelope/${externalEnvelopeId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Documenso void failed (${res.status}): ${text.slice(0, 300)}`)
    }
  },

  async sendReminder(externalEnvelopeId: string): Promise<void> {
    if (!configured()) throw new ESignNotConfiguredError('documenso')
    const base = baseUrl() as string
    // Re-run distribution to re-email pending recipients.
    const res = await fetch(`${base}/envelope/distribute`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ envelopeId: externalEnvelopeId }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Documenso reminder failed (${res.status}): ${text.slice(0, 300)}`)
    }
  },

  parseWebhook(rawBody: string, headers: Record<string, string>): ESignWebhookEvent | null {
    // Documenso posts JSON. If a webhook secret is configured, require it to
    // match the header Documenso sends before trusting the event.
    const secret = process.env.DOCUMENSO_WEBHOOK_SECRET
    if (secret) {
      const provided = headers['x-documenso-secret'] || headers['x-webhook-secret']
      if (provided !== secret) {
        logger.warn('Documenso webhook rejected: secret mismatch')
        return null
      }
    }

    let payload: {
      event?: string
      type?: string
      payload?: { id?: string | number; externalId?: string; status?: string }
      data?: { id?: string | number; externalId?: string; status?: string }
    }
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return null
    }

    const eventType = payload.event || payload.type || ''
    const body = payload.payload || payload.data
    const externalEnvelopeId = body?.id != null ? String(body.id) : undefined
    if (!externalEnvelopeId) return null

    let status: EnvelopeStatus | null = null
    if (/completed|signed/i.test(eventType)) status = 'signed'
    else if (/opened|viewed/i.test(eventType)) status = 'viewed'
    else if (/rejected|declined/i.test(eventType)) status = 'declined'
    else if (/sent|pending/i.test(eventType)) status = 'sent'
    else if (body?.status) status = statusFromDocumenso(body.status)
    if (!status) return null

    return {
      externalEnvelopeId,
      status,
      signedAt: status === 'signed' ? new Date().toISOString() : null,
      rawType: eventType,
    }
  },
}
