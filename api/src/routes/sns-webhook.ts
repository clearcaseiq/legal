/**
 * Amazon SNS webhook for attorney Accept/Decline replies via two-way SMS.
 *
 * AWS End User Messaging delivers inbound texts to an SNS topic; subscribe that
 * topic (HTTPS) to this endpoint:
 *   https://your-api.com/v1/sms/sns/inbound
 *
 * SNS posts three message types (Content-Type is usually text/plain):
 *   - SubscriptionConfirmation → we GET the SubscribeURL to confirm.
 *   - Notification            → the inbound SMS; we parse and process it.
 *   - UnsubscribeConfirmation → logged, no action.
 *
 * Every message must carry a valid SNS signature; unsigned or unverifiable
 * envelopes are rejected outright. Set SNS_INBOUND_TOPIC_ARN to additionally
 * restrict accepted messages to a single topic.
 */
import express from 'express'
import { Router } from 'express'
import https from 'https'
import { logger } from '../lib/logger'
import { processInboundSmsDecision } from '../lib/sms-inbound'
import { sendSms } from '../lib/sms'
import { verifySnsSignature } from '../lib/sms-webhook-verification'

const router = Router()

// SNS posts JSON with a text/plain content-type, so capture the raw body.
router.use(express.text({ type: () => true, limit: '256kb' }))

function confirmSubscription(subscribeUrl: string): void {
  try {
    const parsed = new URL(subscribeUrl)
    // Only ever call back to AWS SNS endpoints.
    if (!/(^|\.)sns\.[a-z0-9-]+\.amazonaws\.com$/i.test(parsed.hostname)) {
      logger.warn('SNS webhook: refusing to confirm non-SNS SubscribeURL', { host: parsed.hostname })
      return
    }
    https
      .get(subscribeUrl, (res) => {
        res.resume()
        logger.info('SNS webhook: subscription confirmed', { status: res.statusCode })
      })
      .on('error', (err) => logger.error('SNS webhook: subscription confirm failed', { error: err.message }))
  } catch (err: any) {
    logger.error('SNS webhook: invalid SubscribeURL', { error: err?.message })
  }
}

router.post('/inbound', async (req, res) => {
  try {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {})
    let envelope: any
    try {
      envelope = JSON.parse(raw)
    } catch {
      logger.warn('SNS webhook: unparseable body')
      return res.status(400).send('Bad request')
    }

    // Nothing in this envelope means anything until the signature holds: the
    // origination number decides which attorney is answering, and "ACCEPT"
    // claims a case. Verify before reading any field, including the topic and
    // the SubscribeURL we would otherwise call back.
    const verification = await verifySnsSignature(envelope)
    if (!verification.ok) {
      logger.warn('SNS webhook: rejected unverified message', { reason: verification.reason })
      return res.status(403).send('forbidden')
    }

    // Now that the envelope is authenticated, the topic is worth checking.
    const allowedTopic = process.env.SNS_INBOUND_TOPIC_ARN
    if (allowedTopic && envelope.TopicArn && envelope.TopicArn !== allowedTopic) {
      logger.warn('SNS webhook: topic ARN mismatch', { topic: envelope.TopicArn })
      return res.status(200).send('ignored')
    }

    const type = envelope.Type || envelope.type

    if (type === 'SubscriptionConfirmation') {
      if (envelope.SubscribeURL) confirmSubscription(envelope.SubscribeURL)
      return res.status(200).send('ok')
    }

    if (type === 'UnsubscribeConfirmation') {
      logger.info('SNS webhook: unsubscribe confirmation received')
      return res.status(200).send('ok')
    }

    if (type === 'Notification') {
      // The inbound SMS payload is itself JSON inside Message.
      let inbound: any = {}
      try {
        inbound = typeof envelope.Message === 'string' ? JSON.parse(envelope.Message) : envelope.Message || {}
      } catch {
        inbound = {}
      }
      const fromPhone: string = inbound.originationNumber || inbound.OriginationNumber || ''
      const body: string = inbound.messageBody || inbound.MessageBody || ''
      const messageId: string | null =
        inbound.inboundMessageId || inbound.InboundMessageId || envelope.MessageId || null

      if (!fromPhone || !body) {
        logger.warn('SNS webhook: notification missing phone or body')
        return res.status(200).send('ignored')
      }

      const result = await processInboundSmsDecision({ fromPhone, body, messageId })
      logger.info('SNS webhook: inbound processed', { status: result.processingStatus })

      // The Twilio route answers the attorney simply by returning TwiML from
      // its handler. SNS discards the response body, so the same reply has to
      // be sent explicitly — without this, every reply-to-accept over SNS is
      // met with silence, whether it claimed the case, lost the race to another
      // attorney, or could not be parsed. An accepted case looked identical to
      // a text that never arrived.
      if (!result.duplicate) {
        const reply =
          result.processingStatus === 'failed'
            ? 'Something went wrong handling your reply. Please respond in CaseIQ.'
            : result.responseMessage
        // An opt-out has to be acknowledged by the one message the opt-out
        // itself would otherwise block. Carriers expect that confirmation, and
        // without the bypass a STOP would be answered with silence — the same
        // thing a broken number looks like.
        await sendSms(fromPhone, reply, { ignoreOptOut: !!result.optOutKeyword }).catch((err: any) =>
          logger.warn('SNS webhook: failed to send reply', { error: err?.message }),
        )
      }

      // SNS ignores the response body; 200 acknowledges receipt.
      return res.status(200).send('ok')
    }

    logger.warn('SNS webhook: unknown message type', { type })
    return res.status(200).send('ok')
  } catch (error: any) {
    logger.error('SNS webhook error', { error: error?.message })
    // Return 200 so SNS doesn't spin on retries for a message we can't process.
    return res.status(200).send('ok')
  }
})

export default router
