import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { authMiddleware, type AuthRequest } from '../lib/auth'
import {
  getAttorneyAgreement,
  getAttorneyAgreementAcceptance,
  recordAttorneyAgreementAcceptance,
} from '../lib/attorney-agreement'

const router = Router()

// Public: the signup form shows the terms before an account exists.
router.get('/', (_req, res) => {
  res.set('Cache-Control', 'public, max-age=300')
  res.json(getAttorneyAgreement())
})

router.get('/status', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const current = getAttorneyAgreement()!
    const { accepted, acceptedAt } = await getAttorneyAgreementAcceptance(req.user!.id)
    res.json({ version: current.version, accepted, acceptedAt })
  } catch (error) {
    logger.error('Failed to read attorney agreement status', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Could not load agreement status' })
  }
})

const AcceptSchema = z.object({ version: z.string().min(1) })

router.post('/accept', authMiddleware, async (req: AuthRequest, res) => {
  const parsed = AcceptSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'version is required' })
  try {
    const attorney = await prisma.attorney.findFirst({
      where: { email: req.user!.email },
      select: { id: true, lawFirmId: true },
    })
    const ok = await recordAttorneyAgreementAcceptance({
      userId: req.user!.id,
      version: parsed.data.version,
      attorneyId: attorney?.id,
      lawFirmId: attorney?.lawFirmId,
      source: 'dashboard',
      ipAddress: req.ip || null,
      userAgent: req.get('user-agent') || null,
    })
    if (!ok) {
      return res.status(409).json({
        error: 'The agreement has been updated. Please review the current version.',
        code: 'AGREEMENT_VERSION_STALE',
      })
    }
    res.json({ accepted: true, version: parsed.data.version })
  } catch (error) {
    logger.error('Failed to record attorney agreement acceptance', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Could not record acceptance' })
  }
})

export default router
