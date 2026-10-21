import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../lib/auth'
import { logger } from '../lib/logger'
import { prisma } from '../lib/prisma'

/** In-app guided tour progress for the signed-in user. */
const router = Router()

export const TOUR_IDS = ['workspace', 'case_lifecycle', 'client_portal'] as const

const progressSchema = z.object({
  status: z.enum(['started', 'completed', 'dismissed']),
  lastStep: z.number().int().min(0).max(200).optional(),
})

router.get('/', authMiddleware, async (req: any, res) => {
  try {
    const rows = await prisma.userTourProgress.findMany({
      where: { userId: req.user.id },
      select: { tourId: true, status: true, lastStep: true, updatedAt: true },
    })
    res.json({ tours: rows })
  } catch (error: any) {
    logger.error('Failed to load tour progress', { error: error?.message })
    res.status(500).json({ error: 'Could not load tour progress' })
  }
})

router.put('/:tourId', authMiddleware, async (req: any, res) => {
  try {
    const tourId = String(req.params.tourId)
    if (!(TOUR_IDS as readonly string[]).includes(tourId)) {
      return res.status(404).json({ error: 'Unknown tour' })
    }
    const body = progressSchema.parse(req.body || {})
    const row = await prisma.userTourProgress.upsert({
      where: { userId_tourId: { userId: req.user.id, tourId } },
      create: { userId: req.user.id, tourId, status: body.status, lastStep: body.lastStep ?? 0 },
      update: { status: body.status, ...(body.lastStep !== undefined ? { lastStep: body.lastStep } : {}) },
      select: { tourId: true, status: true, lastStep: true, updatedAt: true },
    })
    res.json(row)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid tour progress', details: error.flatten() })
    }
    logger.error('Failed to save tour progress', { error: error?.message })
    res.status(500).json({ error: 'Could not save tour progress' })
  }
})

export default router
