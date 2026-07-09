/**
 * Dropbox Sign (formerly HelloSign) adapter — the recommended default.
 *
 * API-first, supports embedded/email signing, and offers a BAA so it can carry
 * HIPAA authorizations. Uses the v3 REST API with HTTP Basic auth (API key as
 * the username, empty password).
 *
 * Docs: https://developers.hellosign.com/api/reference/
 */
import { readFile } from 'fs/promises'
import { basename } from 'path'
import crypto from 'crypto'
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

const API_BASE = 'https://api.hellosign.com/v3'

function apiKey(): string | null {
  return process.env.DROPBOX_SIGN_API_KEY || null
}

function configured(): boolean {
  return Boolean(apiKey())
}

function authHeader(): string {
  return `Basic ${Buffer.from(`${apiKey()}:`).toString('base64')}`
}

function isTestMode(): boolean {
  // Explicit override wins so you can send test_mode requests even in a
  // production build (e.g. verifying the flow on EC2 without a paid API plan),
  // or force live sends in a non-prod build. Falls back to NODE_ENV otherwise.
  const override = process.env.DROPBOX_SIGN_TEST_MODE
  if (override != null && override.trim() !== '') {
    return /^(1|true|yes|on)$/i.test(override.trim())
  }
  return process.env.NODE_ENV !== 'production'
}

/** Map a Dropbox Sign per-signature status_code to our neutral status. */
function statusFromSignatureCode(code: string | undefined): EnvelopeStatus {
  switch (code) {
    case 'signed':
      return 'signed'
    case 'declined':
      return 'declined'
    case 'awaiting_signature':
    case 'on_hold':
      return 'sent'
    default:
      return 'sent'
  }
}

/** Map a Dropbox Sign callback event_type to our neutral status (or null). */
function statusFromEventType(eventType: string): EnvelopeStatus | null {
  switch (eventType) {
    case 'signature_request_sent':
      return 'sent'
    case 'signature_request_viewed':
      return 'viewed'
    case 'signature_request_signed':
    case 'signature_request_all_signed':
      return 'signed'
    case 'signature_request_declined':
      return 'declined'
    case 'signature_request_canceled':
      return 'voided'
    case 'signature_request_expired':
      return 'expired'
    default:
      return null // callback_test and everything else: ack but no state change
  }
}

/**
 * Extract a named field from a raw webhook body. Dropbox Sign posts the event
 * as multipart/form-data with a single `json` field, but also tolerate
 * urlencoded and bare-JSON delivery.
 */
function readField(rawBody: string, contentType: string, field: string): string | null {
  const ct = (contentType || '').toLowerCase()
  if (ct.includes('application/json')) return rawBody
  if (ct.includes('x-www-form-urlencoded')) return new URLSearchParams(rawBody).get(field)

  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(ct)
  const boundary = boundaryMatch ? (boundaryMatch[1] || boundaryMatch[2]).trim() : null
  if (boundary) {
    for (const part of rawBody.split(`--${boundary}`)) {
      if (!new RegExp(`name="${field}"`).test(part)) continue
      const sep = part.indexOf('\r\n\r\n')
      if (sep === -1) continue
      return part.slice(sep + 4).replace(/\r\n--\s*$/, '').replace(/\r\n$/, '').trim()
    }
    return null
  }
  // Last resort: looks like a JSON object.
  return rawBody.trim().startsWith('{') ? rawBody : null
}

export const dropboxSignProvider: ESignatureProvider = {
  id: 'dropbox_sign',
  label: 'Dropbox Sign',

  meta(): ESignProviderMeta {
    return {
      id: 'dropbox_sign',
      label: 'Dropbox Sign',
      configured: configured(),
      hipaaCapable: true,
      notes: 'API-first, embedded/email signing, BAA available for HIPAA authorizations.',
      docsUrl: 'https://developers.hellosign.com/api/reference/',
    }
  },

  async createEnvelope(input: CreateEnvelopeInput): Promise<CreateEnvelopeResult> {
    if (!configured()) throw new ESignNotConfiguredError('dropbox_sign')

    const fileBuf = await readFile(input.filePath)
    const form = new FormData()
    form.append('title', input.title)
    form.append('subject', input.title)
    form.append('signers[0][name]', input.signerName)
    form.append('signers[0][email_address]', input.signerEmail)
    form.append('signers[0][order]', '0')
    form.append(
      'file[0]',
      new Blob([new Uint8Array(fileBuf)], { type: 'application/pdf' }),
      basename(input.filePath)
    )
    if (input.reference) form.append('metadata[reference]', input.reference)
    for (const [k, v] of Object.entries(input.metadata ?? {})) {
      form.append(`metadata[${k}]`, v)
    }
    if (isTestMode()) form.append('test_mode', '1')

    const res = await fetch(`${API_BASE}/signature_request/send`, {
      method: 'POST',
      headers: { Authorization: authHeader() },
      body: form,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Dropbox Sign send failed (${res.status}): ${text.slice(0, 500)}`)
    }

    const data = (await res.json()) as {
      signature_request?: { signature_request_id?: string }
    }
    const externalEnvelopeId = data.signature_request?.signature_request_id
    if (!externalEnvelopeId) {
      throw new Error('Dropbox Sign send returned no signature_request_id')
    }

    // Email flow: the signer receives a link by email, so no embedded URL here.
    return { externalEnvelopeId, signingUrl: null, status: 'sent' }
  },

  async getStatus(externalEnvelopeId: string): Promise<EnvelopeStatusResult> {
    if (!configured()) throw new ESignNotConfiguredError('dropbox_sign')

    const res = await fetch(`${API_BASE}/signature_request/${externalEnvelopeId}`, {
      headers: { Authorization: authHeader() },
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Dropbox Sign get failed (${res.status}): ${text.slice(0, 500)}`)
    }

    const data = (await res.json()) as {
      signature_request?: {
        is_complete?: boolean
        files_url?: string
        signatures?: { status_code?: string; signed_at?: number | null }[]
      }
    }
    const sr = data.signature_request
    const sig = sr?.signatures?.[0]
    const status: EnvelopeStatus = sr?.is_complete
      ? 'signed'
      : statusFromSignatureCode(sig?.status_code)
    return {
      status,
      signedAt: sig?.signed_at ? new Date(sig.signed_at * 1000).toISOString() : null,
      auditTrailUrl: sr?.files_url ?? null,
    }
  },

  async downloadSigned(externalEnvelopeId: string): Promise<Buffer> {
    if (!configured()) throw new ESignNotConfiguredError('dropbox_sign')

    const res = await fetch(
      `${API_BASE}/signature_request/files/${externalEnvelopeId}?file_type=pdf`,
      { headers: { Authorization: authHeader() } }
    )
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Dropbox Sign file download failed (${res.status}): ${text.slice(0, 300)}`)
    }
    return Buffer.from(await res.arrayBuffer())
  },

  parseWebhook(rawBody: string, headers: Record<string, string>): ESignWebhookEvent | null {
    const key = apiKey()
    if (!key) return null

    const jsonStr = readField(rawBody, headers['content-type'] || '', 'json')
    if (!jsonStr) return null

    let payload: {
      event?: { event_time?: string; event_type?: string; event_hash?: string }
      signature_request?: { signature_request_id?: string }
    }
    try {
      payload = JSON.parse(jsonStr)
    } catch {
      return null
    }

    const ev = payload.event
    if (!ev?.event_time || !ev.event_type || !ev.event_hash) return null

    // Verify authenticity: HMAC-SHA256(key = api key, msg = event_time + event_type).
    const expected = crypto
      .createHmac('sha256', key)
      .update(`${ev.event_time}${ev.event_type}`)
      .digest('hex')
    if (expected !== ev.event_hash) {
      logger.warn('Dropbox Sign webhook failed HMAC verification', { eventType: ev.event_type })
      return null
    }

    const status = statusFromEventType(ev.event_type)
    const externalEnvelopeId = payload.signature_request?.signature_request_id
    if (!status || !externalEnvelopeId) return null

    return {
      externalEnvelopeId,
      status,
      signedAt: status === 'signed' ? new Date(Number(ev.event_time) * 1000).toISOString() : null,
      rawType: ev.event_type,
    }
  },

  webhookAck(): string {
    return 'Hello API Event Received'
  },
}

export { API_BASE as DROPBOX_SIGN_API_BASE }
