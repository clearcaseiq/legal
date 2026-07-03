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
 * Optional hardening: set SNS_INBOUND_TOPIC_ARN to only accept messages from
 * your topic.
 */
import express from 'express'
import { Router } from 'express'
import https from 'https'
import { logger } from '../lib/logger'
import { processInboundSmsDecision } from '../lib/sms-inbound'

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

    // Optional topic allow-list.
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
