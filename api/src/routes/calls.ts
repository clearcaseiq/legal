/**
 * Recorded plaintiff <-> attorney calls via Amazon Connect + Contact Lens.
 *
 * Flow:
 *   POST /v1/calls/consent   plaintiff acknowledges recording (stored as a
 *                            durable Consent row + on the call).
 *   POST /v1/calls/start     places a recorded outbound call to the plaintiff,
 *                            which the Connect contact flow bridges to the
 *                            attorney after playing the recording disclosure.
 *   GET  /v1/calls           list the caller's calls (optionally by chat room).
 *   GET  /v1/calls/:id       call detail incl. transcript + summary.
 *   GET  /v1/calls/:id/recording  streams the recording audio from S3.
 *   POST /v1/calls/:id/cancel     best-effort hang up.
 *
 * The recording + transcript arrive asynchronously and are attached by the
 * Connect/S3 webhook (routes/connect-webhook.ts).
 */
import { Router } from 'express'
import { z } from 'zod'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { isConnectConfigured, startOutboundCall, stopContact, toE164 } from '../lib/amazon-connect'
import { getConsentTemplate } from '../lib/consent-templates'
import { createHash } from 'crypto'
import { ENV } from '../env'

const router = Router()

const CALL_RECORDING_CONSENT = 'call_recording'

// A plaintiff has usable recording consent if they've granted the current
// version and not revoked it.
async function hasActiveRecordingConsent(userId: string): Promise<boolean> {
  const template = getConsentTemplate(CALL_RECORDING_CONSENT)
  const consent = await prisma.consent.findFirst({
    where: { userId, consentType: CALL_RECORDING_CONSENT, granted: true, revokedAt: null },
    orderBy: { createdAt: 'desc' },
  })
  if (!consent) return false
  if (template && consent.version !== template.version) return false
  return true
}

// POST /consent — record the plaintiff's call-recording acknowledgment.
router.post('/consent', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const template = getConsentTemplate(CALL_RECORDING_CONSENT)
    if (!template) return res.status(500).json({ error: 'Consent template missing' })

    const granted = req.body?.granted !== false
    const consentText = template.content
    const consentHash = createHash('sha256').update(consentText).digest('hex')

    const consent = await prisma.consent.create({
      data: {
        userId: req.user!.id,
        consentType: CALL_RECORDING_CONSENT,
        version: template.version,
        documentId: template.documentId,
        granted,
        grantedAt: granted ? new Date() : null,
        revokedAt: granted ? null : new Date(),
        signatureMethod: 'clicked',
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || undefined,
        consentText,
        consentHash,
      },
    })
    res.json({ granted, consentId: consent.id, version: template.version })
  } catch (error: any) {
    logger.error('calls: record consent failed', { error: error?.message })
    res.status(500).json({ error: 'Failed to record consent' })
  }
})

// GET /consent — current recording-consent status for the plaintiff.
router.get('/consent', authMiddleware, async (req: AuthRequest, res) => {
  const template = getConsentTemplate(CALL_RECORDING_CONSENT)
  const granted = await hasActiveRecordingConsent(req.user!.id)
  res.json({
    granted,
    version: template?.version || null,
    title: template?.title || null,
    summary: template?.plainLanguageSummary || null,
  })
})

const StartCall = z
  .object({
    chatRoomId: z.string().optional(),
    attorneyId: z.string().optional(),
    assessmentId: z.string().optional(),
    // Inline acknowledgment lets the client consent + call in one step.
    acknowledgeRecording: z.boolean().optional(),
  })
  .refine((d) => Boolean(d.chatRoomId || d.attorneyId), {
    message: 'chatRoomId or attorneyId is required',
    path: ['chatRoomId'],
  })

// POST /start — place a recorded outbound call to the plaintiff, bridged to the
// attorney by the Connect contact flow.
router.post('/start', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const parsed = StartCall.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() })
    }
    const { chatRoomId, acknowledgeRecording } = parsed.data
    const userId = req.user!.id

    // Resolve the conversation → attorney + assessment.
    let room: any = null
    if (chatRoomId) {
      room = await prisma.chatRoom.findFirst({
        where: { id: chatRoomId, userId },
        include: { attorney: true },
      })
    } else if (parsed.data.attorneyId) {
      room = await prisma.chatRoom.findFirst({
        where: { userId, attorneyId: parsed.data.attorneyId },
        include: { attorney: true },
      })
      if (!room) {
        const attorney = await prisma.attorney.findUnique({ where: { id: parsed.data.attorneyId } })
        if (attorney) room = { attorney, id: null, assessmentId: parsed.data.assessmentId || null }
      }
    }
    if (!room?.attorney) {
      return res.status(404).json({ error: 'Attorney conversation not found' })
    }

    // Consent: honor an inline acknowledgment, otherwise require prior consent.
    let consented = await hasActiveRecordingConsent(userId)
    if (!consented && acknowledgeRecording) {
      const template = getConsentTemplate(CALL_RECORDING_CONSENT)!
      await prisma.consent.create({
        data: {
          userId,
          consentType: CALL_RECORDING_CONSENT,
          version: template.version,
          documentId: template.documentId,
          granted: true,
          grantedAt: new Date(),
          signatureMethod: 'clicked',
          ipAddress: req.ip,
          userAgent: req.get('user-agent') || undefined,
          consentText: template.content,
          consentHash: createHash('sha256').update(template.content).digest('hex'),
        },
      })
      consented = true
    }
    if (!consented) {
      return res.status(428).json({
        error: 'Recording consent required',
        code: 'RECORDING_CONSENT_REQUIRED',
      })
    }

    // Resolve both phone numbers.
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } })
    const plaintiffPhone = toE164(user?.phone)
    const attorneyPhone = toE164(room.attorney.phone)
    if (!plaintiffPhone) {
      return res.status(422).json({ error: 'Add a phone number to your profile to place a call', code: 'NO_PLAINTIFF_PHONE' })
    }
    if (!attorneyPhone) {
      return res.status(422).json({ error: 'This attorney has no phone number on file', code: 'NO_ATTORNEY_PHONE' })
    }

    // Create the call row first so the webhook can correlate it later.
    const call = await prisma.call.create({
      data: {
        userId,
        attorneyId: room.attorney.id,
        assessmentId: room.assessmentId || null,
        chatRoomId: room.id || null,
        initiatedBy: 'plaintiff',
        initiatedByUserId: userId,
        plaintiffPhone,
        attorneyPhone,
        status: 'queued',
        recordingConsent: true,
        recordingConsentAt: new Date(),
        recordingConsentBy: userId,
      },
    })

    if (!isConnectConfigured()) {
      await prisma.call.update({
        where: { id: call.id },
        data: { status: 'failed', failureReason: 'connect_not_configured' },
      })
      return res.status(503).json({
        error: 'Calling is not yet enabled for this environment',
        code: 'CONNECT_NOT_CONFIGURED',
        callId: call.id,
      })
    }

    const result = await startOutboundCall({
      destinationPhone: plaintiffPhone,
      attributes: {
        callId: call.id,
        attorneyPhone,
        attorneyName: room.attorney.name || '',
        plaintiffUserId: userId,
        assessmentId: room.assessmentId || '',
      },
    })

    if (!result) {
      await prisma.call.update({
        where: { id: call.id },
        data: { status: 'failed', failureReason: 'connect_start_failed' },
      })
      return res.status(502).json({ error: 'Failed to place call', callId: call.id })
    }

    const updated = await prisma.call.update({
      where: { id: call.id },
      data: {
        status: 'ringing',
        connectContactId: result.contactId,
        connectInstanceId: result.instanceId,
        startedAt: new Date(),
      },
    })

    logger.info('calls: outbound call started', { callId: call.id, contactId: result.contactId })
    res.status(201).json({ call: toPublicCall(updated) })
  } catch (error: any) {
    logger.error('calls: start failed', { error: error?.message })
    res.status(500).json({ error: 'Failed to start call' })
  }
})

// GET / — list the caller's calls (optionally scoped to a chat room).
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const chatRoomId = typeof req.query.chatRoomId === 'string' ? req.query.chatRoomId : undefined
    const calls = await prisma.call.findMany({
      where: { userId: req.user!.id, ...(chatRoomId ? { chatRoomId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { recording: true, transcript: true },
    })
    res.json({ calls: calls.map((c) => toPublicCall(c)) })
  } catch (error: any) {
    logger.error('calls: list failed', { error: error?.message })
    res.status(500).json({ error: 'Failed to load calls' })
  }
})

// GET /:id — one call with transcript + summary.
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const call = await prisma.call.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { recording: true, transcript: true },
    })
    if (!call) return res.status(404).json({ error: 'Call not found' })
    res.json({ call: toPublicCall(call, { includeTranscript: true }) })
  } catch (error: any) {
    logger.error('calls: get failed', { error: error?.message })
    res.status(500).json({ error: 'Failed to load call' })
  }
})

// GET /:id/recording — stream the recording audio from S3 (auth-scoped).
router.get('/:id/recording', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const call = await prisma.call.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { recording: true },
    })
    if (!call?.recording?.s3Bucket || !call.recording.s3Key) {
      return res.status(404).json({ error: 'Recording not available' })
    }
    const s3 = new S3Client({ region: ENV.CONNECT_REGION })
    const obj = await s3.send(
      new GetObjectCommand({ Bucket: call.recording.s3Bucket, Key: call.recording.s3Key }),
    )
    res.setHeader('Content-Type', call.recording.mediaType || 'audio/wav')
    if (obj.ContentLength) res.setHeader('Content-Length', String(obj.ContentLength))
    // @ts-expect-error Body is a Node Readable stream in the Node runtime.
    obj.Body?.pipe(res)
  } catch (error: any) {
    logger.error('calls: recording stream failed', { error: error?.message })
    res.status(500).json({ error: 'Failed to load recording' })
  }
})

// POST /:id/cancel — best-effort hang up an in-progress call.
router.post('/:id/cancel', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const call = await prisma.call.findFirst({ where: { id: req.params.id, userId: req.user!.id } })
    if (!call) return res.status(404).json({ error: 'Call not found' })
    if (call.connectContactId) await stopContact(call.connectContactId)
    const updated = await prisma.call.update({
      where: { id: call.id },
      data: { status: 'canceled', endedAt: new Date() },
    })
    res.json({ call: toPublicCall(updated) })
  } catch (error: any) {
    logger.error('calls: cancel failed', { error: error?.message })
    res.status(500).json({ error: 'Failed to cancel call' })
  }
})

// GET /config/status — lets the UI know whether to show the "recorded call" CTA.
router.get('/config/status', authMiddleware, async (_req: AuthRequest, res) => {
  res.json({ enabled: ENV.CALLS_ENABLED && isConnectConfigured() })
})

function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return '••••'
  return `••• ••• ${digits.slice(-4)}`
}

function toPublicCall(call: any, opts: { includeTranscript?: boolean } = {}) {
  const t = call.transcript
  return {
    id: call.id,
    status: call.status,
    direction: call.direction,
    failureReason: call.failureReason,
    attorneyId: call.attorneyId,
    chatRoomId: call.chatRoomId,
    assessmentId: call.assessmentId,
    plaintiffPhone: maskPhone(call.plaintiffPhone),
    attorneyPhone: maskPhone(call.attorneyPhone),
    startedAt: call.startedAt,
    answeredAt: call.answeredAt,
    endedAt: call.endedAt,
    durationSec: call.durationSec,
    createdAt: call.createdAt,
    hasRecording: call.recording?.status === 'available',
    transcript: t
      ? {
          status: t.status,
          source: t.source,
          summary: t.summary,
          sentiment: t.sentiment,
          actionItems: safeJsonArray(t.actionItems),
          keyFacts: safeJsonArray(t.keyFacts),
          fullText: opts.includeTranscript ? t.fullText : undefined,
          segments: opts.includeTranscript ? safeJsonArray(t.segments) : undefined,
        }
      : null,
  }
}

function safeJsonArray(raw: string | null | undefined): any[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default router
