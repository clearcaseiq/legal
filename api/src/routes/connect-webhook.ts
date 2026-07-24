/**
 * Amazon Connect / S3 webhook for recorded calls.
 *
 * Two kinds of SNS notifications land here (subscribe both to this endpoint):
 *   1. S3 event notifications for the recordings bucket — fired when Connect
 *      writes a call recording (.wav) or a Contact Lens analysis (.json). We
 *      correlate them to a Call by the ContactId embedded in the object key.
 *   2. Amazon Connect "contact events" (EventBridge → SNS) — lifecycle updates
 *      (CONNECTED_TO_AGENT, DISCONNECTED, etc.) used to move the Call through
 *      its states and record duration.
 *
 * Subscribe the SNS topic (HTTPS) to:
 *   https://your-api.com/v1/calls/connect/events
 */
import express, { Router } from 'express'
import https from 'https'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { ingestContactLensAnalysis, transcribeRecording } from '../lib/call-extraction'

const router = Router()

router.use(express.text({ type: () => true, limit: '1mb' }))

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

function confirmSubscription(subscribeUrl: string): void {
  try {
    const parsed = new URL(subscribeUrl)
    if (!/(^|\.)sns\.[a-z0-9-]+\.amazonaws\.com$/i.test(parsed.hostname)) {
      logger.warn('connect-webhook: refusing non-SNS SubscribeURL', { host: parsed.hostname })
      return
    }
    https
      .get(subscribeUrl, (res) => {
        res.resume()
        logger.info('connect-webhook: subscription confirmed', { status: res.statusCode })
      })
      .on('error', (err) => logger.error('connect-webhook: confirm failed', { error: err.message }))
  } catch (err: any) {
    logger.error('connect-webhook: invalid SubscribeURL', { error: err?.message })
  }
}

function extractContactId(key: string, message: any): string | null {
  const fromKey = key.match(UUID_RE)?.[0]
  if (fromKey) return fromKey
  const fromMsg = message?.detail?.contactId || message?.ContactId || message?.contactId
  return typeof fromMsg === 'string' ? fromMsg : null
}

function isAnalysisKey(key: string): boolean {
  return /analysis/i.test(key) && key.toLowerCase().endsWith('.json')
}
function isRecordingKey(key: string): boolean {
  return /\.(wav|mp3|mp4|m4a|ogg)$/i.test(key)
}

async function findCallByContactId(contactId: string) {
  return prisma.call.findUnique({ where: { connectContactId: contactId } }).catch(() => null)
}

async function handleS3Record(record: any): Promise<void> {
  const bucket = record?.s3?.bucket?.name
  const rawKey = record?.s3?.object?.key
  if (!bucket || !rawKey) return
  const key = decodeURIComponent(String(rawKey).replace(/\+/g, ' '))
  const sizeBytes = Number(record?.s3?.object?.size) || undefined

  const contactId = extractContactId(key, null)
  if (!contactId) {
    logger.warn('connect-webhook: no contactId in S3 key', { key })
    return
  }
  const call = await findCallByContactId(contactId)
  if (!call) {
    logger.warn('connect-webhook: no call for contactId', { contactId, key })
    return
  }

  if (isAnalysisKey(key)) {
    logger.info('connect-webhook: ingesting Contact Lens analysis', { callId: call.id, key })
    await ingestContactLensAnalysis(call.id, bucket, key)
    return
  }

  if (isRecordingKey(key)) {
    logger.info('connect-webhook: recording available', { callId: call.id, key })
    await prisma.callRecording.upsert({
      where: { callId: call.id },
      create: { callId: call.id, s3Bucket: bucket, s3Key: key, sizeBytes, status: 'available' },
      update: { s3Bucket: bucket, s3Key: key, sizeBytes, status: 'available' },
    })
    // If no transcript exists yet (Contact Lens disabled), fall back to Transcribe.
    const existing = await prisma.callTranscript.findUnique({ where: { callId: call.id } })
    if (!existing) {
      transcribeRecording(call.id).catch((e) =>
        logger.warn('connect-webhook: transcribe fallback failed', { callId: call.id, error: e?.message }),
      )
    }
  }
}

async function handleContactEvent(message: any): Promise<void> {
  const detail = message?.detail || message
  const contactId = detail?.contactId || detail?.ContactId
  const eventType = detail?.eventType || detail?.EventType || message?.['detail-type']
  if (!contactId || !eventType) return

  const call = await findCallByContactId(contactId)
  if (!call) return

  const now = new Date()
  const data: any = {}
  switch (String(eventType).toUpperCase()) {
    case 'CONNECTED_TO_AGENT':
    case 'CONTACT_CONNECTED':
      data.status = 'in_progress'
      data.answeredAt = call.answeredAt || now
      break
    case 'DISCONNECTED':
    case 'CONTACT_DISCONNECTED':
      data.status = call.status === 'in_progress' ? 'completed' : call.status
      data.endedAt = now
      if (call.answeredAt) data.durationSec = Math.round((now.getTime() - call.answeredAt.getTime()) / 1000)
      break
    case 'CONTACT_MISSED':
    case 'CONTACT_ABANDONED':
      data.status = 'no_answer'
      data.endedAt = now
      break
    default:
      return
  }
  await prisma.call.update({ where: { id: call.id }, data }).catch(() => undefined)
}

router.post('/events', async (req, res) => {
  try {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {})
    let envelope: any
    try {
      envelope = JSON.parse(raw)
    } catch {
      return res.status(400).send('Bad request')
    }

    const type = envelope.Type || envelope.type
    if (type === 'SubscriptionConfirmation') {
      if (envelope.SubscribeURL) confirmSubscription(envelope.SubscribeURL)
      return res.status(200).send('ok')
    }
    if (type === 'UnsubscribeConfirmation') {
      return res.status(200).send('ok')
    }

    // Notification (or a direct EventBridge payload).
    let message: any = envelope
    if (type === 'Notification') {
      try {
        message = typeof envelope.Message === 'string' ? JSON.parse(envelope.Message) : envelope.Message
      } catch {
        message = {}
      }
    }

    if (Array.isArray(message?.Records)) {
      for (const record of message.Records) {
        if (record?.eventSource === 'aws:s3' || record?.s3) {
          await handleS3Record(record)
        }
      }
    } else if (message?.detail || message?.contactId || message?.ContactId) {
      await handleContactEvent(message)
    } else {
      logger.warn('connect-webhook: unrecognized notification shape')
    }

    return res.status(200).send('ok')
  } catch (error: any) {
    logger.error('connect-webhook error', { error: error?.message })
    // 200 so SNS doesn't hammer retries for a payload we can't use.
    return res.status(200).send('ok')
  }
})

export default router
