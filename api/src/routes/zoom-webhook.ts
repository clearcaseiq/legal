import { Router } from 'express'
import { logger } from '../lib/logger'
import { verifyZoomWebhookSignature, zoomUrlValidationResponse } from '../lib/zoom'
import { handleZoomMeetingEnded, handleZoomMeetingStarted } from '../lib/video-meetings'

const router = Router()

// Zoom Event Subscriptions. Mounted with express.raw so the signature is
// checked against the exact bytes Zoom signed.
router.post('/', async (req, res) => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : ''
  const valid = verifyZoomWebhookSignature({
    rawBody,
    signature: req.header('x-zm-signature'),
    timestamp: req.header('x-zm-request-timestamp'),
  })
  if (!valid) return res.status(401).json({ error: 'Invalid signature' })

  let event: { event?: string; payload?: any }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' })
  }

  try {
    switch (event.event) {
      case 'endpoint.url_validation':
        return res.json(zoomUrlValidationResponse(String(event.payload?.plainToken || '')))
      case 'meeting.started':
        await handleZoomMeetingStarted(event.payload?.object || {})
        break
      case 'meeting.ended':
        await handleZoomMeetingEnded(event.payload?.object || {})
        break
      default:
        break
    }
    res.json({ ok: true })
  } catch (error: any) {
    logger.error('Zoom webhook handling failed', { event: event.event, error: error?.message })
    res.status(500).json({ error: 'Webhook handling failed' })
  }
})

export default router
