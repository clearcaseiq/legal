import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { deviceTypeFromUserAgent } from '../lib/device-type'

/**
 * The first stage of the intake funnel: someone opened a fresh assessment.
 *
 * Public and unauthenticated, because it fires before the visitor has given us
 * anything. What it accepts is deliberately narrow — a browser-minted id, the
 * public page the visit entered on and the campaign tags — so nothing about the
 * person or the case can arrive here even by mistake. The device class comes
 * from the request header, as on intake leads, and no IP address is stored.
 */
const router = Router()

const VisitInput = z.object({
  id: z.string().uuid(),
  landingPath: z.string().trim().max(500).optional(),
  utmSource: z.string().trim().max(120).optional(),
  utmMedium: z.string().trim().max(120).optional(),
  utmCampaign: z.string().trim().max(200).optional(),
})

router.post('/', async (req, res) => {
  const parsed = VisitInput.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input' })
  }
  const { id, landingPath, utmSource, utmMedium, utmCampaign } = parsed.data

  try {
    // Idempotent on the id: a reload of Step 1 in the same tab is the same
    // visit, and the first record of it is the one that counts.
    await prisma.intakeVisit.upsert({
      where: { id },
      create: {
        id,
        landingPath: landingPath || null,
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        utmCampaign: utmCampaign || null,
        deviceType: deviceTypeFromUserAgent(req.get('user-agent')),
      },
      update: {},
    })
    res.status(204).end()
  } catch (error) {
    logger.error('Failed to record intake visit', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
