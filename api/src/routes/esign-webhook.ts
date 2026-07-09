/**
 * Public e-signature provider webhook.
 *
 *   POST /v1/webhooks/esign/:provider
 *
 * server.ts registers express.raw for this path so req.body is the raw Buffer —
 * required for HMAC signature verification inside each provider's parseWebhook.
 * We always answer 200 quickly so providers don't retry based on our internal
 * processing decisions.
 */
import { Router } from 'express'
import { logger } from '../lib/logger'
import { applyEsignWebhook } from '../lib/esign/esign-service'
import { getESignatureProvider } from '../lib/esign'

const router = Router()

router.post('/:provider', async (req, res) => {
  // Some providers (Dropbox Sign) require a specific plain-text ack body.
  let ack: string | undefined
  try {
    ack = getESignatureProvider(req.params.provider).webhookAck?.()
  } catch {
    ack = undefined
  }

  try {
    const raw = Buffer.isBuffer(req.body)
      ? req.body.toString('utf8')
      : typeof req.body === 'string'
        ? req.body
        : JSON.stringify(req.body ?? {})
    const headers = req.headers as unknown as Record<string, string>

    const updated = await applyEsignWebhook(req.params.provider, raw, headers)
    if (ack) return res.status(200).send(ack)
    res.status(200).json({ received: true, updated: Boolean(updated) })
  } catch (error) {
    logger.error('E-sign webhook processing failed', {
      provider: req.params.provider,
      error: error instanceof Error ? error.message : String(error),
    })
    // Still acknowledge so the provider doesn't hammer us with retries.
    if (ack) return res.status(200).send(ack)
    res.status(200).json({ received: true })
  }
})

export default router
