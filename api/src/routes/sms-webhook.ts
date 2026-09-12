/**
 * SMS webhook for attorney Accept/Decline replies (Twilio).
 * Twilio POSTs here when an attorney replies to a case routing SMS.
 * Configure Twilio: Messaging > Phone Numbers > Webhook URL = https://your-api.com/v1/sms/webhook
 *
 * Requests must carry a valid X-Twilio-Signature, which requires TWILIO_AUTH_TOKEN
 * to be set even when SMS is sent through a different provider. If the signed URL
 * does not match what this process derives from the request, set TWILIO_WEBHOOK_URL.
 *
 * For Amazon SNS two-way SMS, see routes/sns-webhook.ts.
 */
import express from 'express'
import { Router } from 'express'
import { logger } from '../lib/logger'
import { processInboundSmsDecision } from '../lib/sms-inbound'
import { buildTwilioRequestUrl, verifyTwilioSignature } from '../lib/sms-webhook-verification'

const router = Router()

// Twilio sends application/x-www-form-urlencoded
router.use(express.urlencoded({ extended: false }))

function twimlMessage(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`
}

/** Twilio caps a message at 10 attachments; the loop is bounded regardless. */
const MAX_MEDIA = 10

/**
 * Pull MMS attachments out of the form body.
 *
 * Twilio flattens them into `NumMedia` plus `MediaUrl0..N` rather than sending
 * an array. They are covered by the signature like any other POST param, so
 * nothing extra is needed to trust them beyond the check already performed.
 */
function readMedia(body: any): Array<{ url: string; contentType: string | null }> {
  const count = Number(body?.NumMedia || 0)
  if (!Number.isFinite(count) || count <= 0) return []

  const media: Array<{ url: string; contentType: string | null }> = []
  for (let i = 0; i < Math.min(count, MAX_MEDIA); i++) {
    const url = body?.[`MediaUrl${i}`]
    if (typeof url !== 'string' || !url) continue
    const contentType = body?.[`MediaContentType${i}`]
    media.push({ url, contentType: typeof contentType === 'string' ? contentType : null })
  }
  return media
}

router.post('/webhook', async (req, res) => {
  try {
    // `From` decides which attorney is answering, and answering "ACCEPT" claims a
    // case. Unsigned, that field is just attacker-supplied text, so the signature
    // has to hold before anything downstream reads it.
    const verification = verifyTwilioSignature({
      signature: req.get('x-twilio-signature'),
      url: buildTwilioRequestUrl(req),
      params: (req.body || {}) as Record<string, unknown>,
    })
    if (!verification.ok) {
      logger.warn('SMS webhook: rejected unverified request', { reason: verification.reason })
      return res.status(403).send(twimlMessage('Unable to process this message.'))
    }

    const result = await processInboundSmsDecision({
      fromPhone: (req.body?.From as string) || '',
      body: (req.body?.Body as string) || '',
      messageId: (req.body?.MessageSid as string) || null,
      media: readMedia(req.body),
    })
    res.status(result.responseCode).send(twimlMessage(result.responseMessage))
  } catch (error: any) {
    logger.error('SMS webhook error', { error: error?.message })
    res.status(500).send(twimlMessage('Internal error'))
  }
})

export default router
