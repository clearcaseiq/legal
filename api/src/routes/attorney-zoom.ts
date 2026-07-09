import { Router } from 'express'
import { authMiddleware, type AuthRequest } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import {
  buildZoomAuthorizeUrl,
  disconnectAttorneyZoom,
  getAttorneyZoomConnection,
  isZoomConfigured,
  serializeZoomConnection,
  upsertZoomConnectionFromCode,
  verifyZoomStateToken,
  zoomFrontendRedirect,
} from '../lib/zoom'

const router = Router()

async function getAttorneyByUser(req: AuthRequest) {
  if (!req.user?.email) {
    return null
  }
  return prisma.attorney.findFirst({
    where: { email: req.user.email },
    select: { id: true, email: true, name: true },
  })
}

// OAuth callback — Zoom redirects the browser here. No auth middleware because
// the caller is Zoom, not our logged-in session; identity comes from the signed
// state token instead.
router.get('/callback', async (req, res) => {
  const code = typeof req.query.code === 'string' ? req.query.code : ''
  const state = typeof req.query.state === 'string' ? req.query.state : ''

  if (!code || !state) {
    return res.redirect(zoomFrontendRedirect('error', 'missing_callback_params'))
  }

  try {
    const verified = verifyZoomStateToken(state)
    const attorney = await prisma.attorney.findUnique({
      where: { id: verified.attorneyId },
      select: { id: true },
    })
    if (!attorney) {
      throw new Error('Attorney profile not found')
    }

    await upsertZoomConnectionFromCode({ attorneyId: attorney.id, code })
    return res.redirect(zoomFrontendRedirect('success'))
  } catch (error) {
    logger.error('Zoom OAuth callback failed', { error })
    const message = error instanceof Error ? error.message : 'zoom_connect_failed'
    return res.redirect(zoomFrontendRedirect('error', message))
  }
})

router.use(authMiddleware)

router.get('/status', async (req: AuthRequest, res) => {
  try {
    const attorney = await getAttorneyByUser(req)
    if (!attorney) {
      return res.status(403).json({ error: 'Attorney profile not found' })
    }
    const connection = await getAttorneyZoomConnection(attorney.id)
    res.json({ configured: isZoomConfigured(), ...serializeZoomConnection(connection) })
  } catch (error) {
    logger.error('Failed to load Zoom status', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/connect', async (req: AuthRequest, res) => {
  try {
    const attorney = await getAttorneyByUser(req)
    if (!attorney) {
      return res.status(403).json({ error: 'Attorney profile not found' })
    }
    const authorizeUrl = buildZoomAuthorizeUrl(attorney.id)
    res.json({ authorizeUrl })
  } catch (error) {
    logger.error('Failed to build Zoom authorize url', { error, userId: req.user?.id })
    const message = error instanceof Error ? error.message : 'Zoom is not configured'
    res.status(503).json({ error: message })
  }
})

router.delete('/', async (req: AuthRequest, res) => {
  try {
    const attorney = await getAttorneyByUser(req)
    if (!attorney) {
      return res.status(403).json({ error: 'Attorney profile not found' })
    }
    const result = await disconnectAttorneyZoom(attorney.id)
    res.json(result)
  } catch (error) {
    logger.error('Failed to disconnect Zoom', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
