/**
 * SMS webhook for attorney Accept/Decline replies (Twilio).
 * Twilio POSTs here when an attorney replies to a case routing SMS.
 * Configure Twilio: Messaging > Phone Numbers > Webhook URL = https://your-api.com/v1/sms/webhook
 *
 * For Amazon SNS two-way SMS, see routes/sns-webhook.ts.
 */
import express from 'express'
import { Router } from 'express'
import { logger } from '../lib/logger'
import { processInboundSmsDecision } from '../lib/sms-inbound'

const router = Router()

// Twilio sends application/x-www-form-urlencoded
router.use(express.urlencoded({ extended: false }))

function twimlMessage(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`
}

router.post('/webhook', async (req, res) => {
  try {
    const result = await processInboundSmsDecision({
      fromPhone: (req.body?.From as string) || '',
      body: (req.body?.Body as string) || '',
      messageId: (req.body?.MessageSid as string) || null,
    })
    res.status(result.responseCode).send(twimlMessage(result.responseMessage))
  } catch (error: any) {
    logger.error('SMS webhook error', { error: error?.message })
    res.status(500).send(twimlMessage('Internal error'))
  }
})

export default router
