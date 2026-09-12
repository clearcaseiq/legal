/**
 * Turn photos texted by a claimant into evidence on their case.
 *
 * This is an ingress, not a second pipeline. Once a file exists as an
 * `EvidenceFile` the machinery that already runs on an uploaded document — OCR,
 * extraction, damages merge, chronology, readiness — does the rest, so this
 * module's whole job is landing the bytes correctly and then firing the same
 * side effects `routes/evidence.ts` fires after an upload.
 *
 * Two things are deliberate. Media is downloaded immediately rather than having
 * its URL stored, because Twilio's media URLs need credentials and expire. And
 * every file is hashed, because a text has no "already sent" state and a
 * claimant who is unsure whether a photo went through simply sends it again —
 * which, uncaught, bills the same treatment twice.
 */
import { logger } from './logger'
import { activeBindingForPhone, markBindingUsed } from './case-phone-binding'
import { ensureCaseOwnerUserId } from './case-owner'
import {
  fanOutCaseUpdates,
  fileClaimantEvidence,
  MAX_EVIDENCE_BYTES,
  type FiledEvidence,
} from './evidence-intake'

export type SmsMediaRef = {
  url: string
  contentType?: string | null
}

export type SmsMediaIntakeOutcome = 'filed' | 'no_binding' | 'nothing_usable'

export type SmsMediaIntakeResult = {
  outcome: SmsMediaIntakeOutcome
  assessmentId: string | null
  filed: number
  duplicates: number
  rejected: number
  replyMessage: string
}

/** Twilio caps a message at 10 attachments. */
const MAX_MEDIA_PER_MESSAGE = 10

/**
 * The media URL arrives in a request body. It is signature-verified, but the
 * fetch still carries our account credentials, so the host is pinned rather
 * than trusted.
 */
const TWILIO_MEDIA_HOST = /^(api|media)\.twilio\.com$/

const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'image/heif': '.heif',
  'application/pdf': '.pdf',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
  'text/plain': '.txt',
}

/**
 * A name an attorney can read in a file list.
 *
 * Deliberately avoids the words "photo" and "image": `classifyEvidence` matches
 * on the filename as well as the OCR text, so naming every texted file
 * "photo-1.jpg" would push medical bills into the photos bucket.
 */
function displayName(receivedAt: Date, index: number, extension: string): string {
  const day = receivedAt.toISOString().slice(0, 10)
  return `Texted ${day} (${index + 1})${extension}`
}

function extensionFor(contentType: string | null | undefined): string {
  const key = (contentType || '').split(';')[0].trim().toLowerCase()
  return EXTENSION_BY_TYPE[key] || '.bin'
}

function isTwilioMediaUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && TWILIO_MEDIA_HOST.test(parsed.hostname)
  } catch {
    return false
  }
}

async function downloadMedia(url: string): Promise<{ buffer: Buffer; contentType: string | null } | null> {
  const sid = (process.env.TWILIO_ACCOUNT_SID || '').trim()
  const token = (process.env.TWILIO_AUTH_TOKEN || '').trim()
  if (!sid || !token) {
    logger.error('Cannot fetch texted media: Twilio credentials are not configured')
    return null
  }
  if (!isTwilioMediaUrl(url)) {
    logger.warn('Refusing to fetch texted media from an unexpected host')
    return null
  }

  const auth = Buffer.from(`${sid}:${token}`).toString('base64')
  const response = await fetch(url, { headers: { Authorization: `Basic ${auth}` } })
  if (!response.ok) {
    logger.warn('Texted media download failed', { status: response.status })
    return null
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  if (!buffer.length || buffer.length > MAX_EVIDENCE_BYTES) {
    logger.warn('Texted media rejected on size', { bytes: buffer.length })
    return null
  }
  return { buffer, contentType: response.headers.get('content-type') }
}

/**
 * File everything a claimant just texted onto their case.
 *
 * Returns the message to text back. Callers should treat a `no_binding` result
 * as final: we do not confirm or deny that a case exists for an unrecognized
 * number, because inbound medical records are the one thing worth being
 * unhelpful about.
 */
export async function ingestSmsMedia(params: {
  fromPhone: string
  media: SmsMediaRef[]
  messageSid?: string | null
}): Promise<SmsMediaIntakeResult> {
  const binding = await activeBindingForPhone(params.fromPhone)
  if (!binding) {
    return {
      outcome: 'no_binding',
      assessmentId: null,
      filed: 0,
      duplicates: 0,
      rejected: 0,
      replyMessage:
        'We could not match this number to a case. If your attorney asked you for documents, reply to their text request and send the photos there.',
    }
  }

  const assessmentId = binding.assessmentId
  const ownerUserId = await ensureCaseOwnerUserId(assessmentId)
  if (!ownerUserId) {
    return {
      outcome: 'no_binding',
      assessmentId: null,
      filed: 0,
      duplicates: 0,
      rejected: 0,
      replyMessage: 'We could not match this number to a case. Please contact your attorney.',
    }
  }

  const receivedAt = new Date()
  const filed: FiledEvidence[] = []
  let duplicates = 0
  let rejected = 0

  const queue = params.media.slice(0, MAX_MEDIA_PER_MESSAGE)
  for (let index = 0; index < queue.length; index++) {
    const item = queue[index]
    try {
      const downloaded = await downloadMedia(item.url)
      if (!downloaded) {
        rejected += 1
        continue
      }

      const contentType = downloaded.contentType || item.contentType || ''
      const originalName = displayName(receivedAt, index, extensionFor(contentType))

      const result = await fileClaimantEvidence({
        assessmentId,
        ownerUserId,
        buffer: downloaded.buffer,
        contentType,
        originalName,
        // The sender chose no category, so classification happens after OCR.
        uploadMethod: 'sms',
        provenanceSource: `sms:${binding.phoneE164}`,
        provenanceActor: 'claimant',
        provenanceNotes: `Received by text${params.messageSid ? ` (message ${params.messageSid})` : ''}.`,
        provenanceDate: receivedAt,
      })

      if (result.status === 'duplicate') duplicates += 1
      else if (result.status === 'rejected') rejected += 1
      else filed.push(result.filed)
    } catch (error: any) {
      rejected += 1
      logger.error('Failed to file a texted document', {
        assessmentId,
        error: error?.message,
      })
    }
  }

  if (filed.length > 0) {
    await markBindingUsed(binding.id)
    fanOutCaseUpdates(assessmentId, filed)
  }

  return {
    outcome: filed.length > 0 ? 'filed' : 'nothing_usable',
    assessmentId,
    filed: filed.length,
    duplicates,
    rejected,
    replyMessage: confirmationMessage(filed.length, duplicates, rejected),
  }
}

/** What the claimant reads a second after sending. */
export function confirmationMessage(filed: number, duplicates: number, rejected: number): string {
  if (filed === 0 && duplicates > 0 && rejected === 0) {
    return 'Thanks — we already had those, so nothing was added twice. Your case team has them.'
  }
  if (filed === 0) {
    return 'Sorry, we could not read what you sent. Please try again with a clear photo, or reply HELP.'
  }

  const noun = filed === 1 ? 'document' : 'documents'
  const parts = [`Got it — ${filed} ${noun} added to your case.`]
  if (duplicates > 0) parts.push(`${duplicates} we already had.`)
  if (rejected > 0) parts.push(`${rejected} could not be read — please resend ${rejected === 1 ? 'it' : 'them'}.`)
  parts.push('Your case team has been notified.')
  return parts.join(' ')
}
