import { Router } from 'express'
import { authMiddleware, type AuthRequest } from '../lib/auth'
import { logger } from '../lib/logger'
import { getCounterpartPresence, recordHeartbeat } from '../lib/presence'

const router = Router()

// POST /v1/presence/heartbeat — sent by an open, visible web session.
router.post('/heartbeat', authMiddleware, async (req: AuthRequest, res) => {
  try {
    await recordHeartbeat(req.user!.id)
    res.status(204).end()
  } catch (error) {
    logger.warn('Presence heartbeat failed', { userId: req.user?.id, error: (error as Error).message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /v1/presence — online state of the caller's own counterparts only.
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    res.json(await getCounterpartPresence({ id: req.user!.id, email: req.user?.email }))
  } catch (error) {
    logger.error('Failed to load presence', { userId: req.user?.id, error: (error as Error).message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
