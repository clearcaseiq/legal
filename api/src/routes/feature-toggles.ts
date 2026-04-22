import { Router, type Router as ExpressRouter } from 'express'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'

const router: ExpressRouter = Router()

// Public/global feature toggles (enabled only)
router.get('/', async (req, res) => {
  try {
    const toggles = await (prisma as any).featureToggle.findMany({
      where: {
        enabled: true,
        scope: 'global'
      },
      select: {
        key: true,
        description: true,
        enabled: true,
        scope: true
      }
    })

    res.json({ success: true, data: toggles })
  } catch (error) {
    logger.error('Failed to load feature toggles', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
