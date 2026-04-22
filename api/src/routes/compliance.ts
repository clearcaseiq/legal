import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authMiddleware, requireRole } from '../lib/auth'
import { z } from 'zod'
import { logger } from '../lib/logger'

const router = Router()

const complianceSchema = z.object({
  hipaaAligned: z.boolean().optional(),
  soc2Ready: z.boolean().optional(),
  secureApis: z.boolean().optional(),
  notes: z.string().optional()
})

const retentionSchema = z.object({
  entityType: z.string(),
  retentionDays: z.number().int().min(1),
  action: z.enum(['archive', 'delete']).optional(),
  enabled: z.boolean().optional()
})

const ethicalWallSchema = z.object({
  assessmentId: z.string(),
  blockedAttorneyId: z.string(),
  reason: z.string().optional()
})

router.get('/settings', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const existing = await prisma.complianceSetting.findUnique({
      where: { key: 'global' }
    })
    if (!existing) {
      const created = await prisma.complianceSetting.create({
        data: { key: 'global', hipaaAligned: false, soc2Ready: false, secureApis: true }
      })
      return res.json(created)
    }
    res.json(existing)
  } catch (error: any) {
    logger.error('Failed to load compliance settings', { error: error.message })
    res.status(500).json({ error: 'Failed to load compliance settings' })
  }
})

router.post('/settings', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const payload = complianceSchema.parse(req.body || {})
    const updated = await prisma.complianceSetting.upsert({
      where: { key: 'global' },
      update: {
        hipaaAligned: payload.hipaaAligned,
        soc2Ready: payload.soc2Ready,
        secureApis: payload.secureApis,
        notes: payload.notes
      },
      create: {
        key: 'global',
        hipaaAligned: payload.hipaaAligned ?? false,
        soc2Ready: payload.soc2Ready ?? false,
        secureApis: payload.secureApis ?? true,
        notes: payload.notes ?? null
      }
    })
    res.json(updated)
  } catch (error: any) {
    logger.error('Failed to update compliance settings', { error: error.message })
    res.status(500).json({ error: 'Failed to update compliance settings' })
  }
})

router.get('/retention-policies', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const policies = await prisma.dataRetentionPolicy.findMany({
      orderBy: { entityType: 'asc' }
    })
    res.json(policies)
  } catch (error: any) {
    logger.error('Failed to load retention policies', { error: error.message })
    res.status(500).json({ error: 'Failed to load retention policies' })
  }
})

router.post('/retention-policies', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const payload = retentionSchema.parse(req.body || {})
    const policy = await prisma.dataRetentionPolicy.create({
      data: {
        entityType: payload.entityType,
        retentionDays: payload.retentionDays,
        action: payload.action || 'archive',
        enabled: payload.enabled ?? true
      }
    })
    res.json(policy)
  } catch (error: any) {
    logger.error('Failed to create retention policy', { error: error.message })
    res.status(500).json({ error: 'Failed to create retention policy' })
  }
})

router.get('/ethical-walls', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { assessmentId } = req.query
    const whereClause = assessmentId ? { assessmentId: String(assessmentId) } : {}
    const walls = await prisma.ethicalWall.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    })
    res.json(walls)
  } catch (error: any) {
    logger.error('Failed to load ethical walls', { error: error.message })
    res.status(500).json({ error: 'Failed to load ethical walls' })
  }
})

router.post('/ethical-walls', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const payload = ethicalWallSchema.parse(req.body || {})
    const wall = await prisma.ethicalWall.create({
      data: {
        assessmentId: payload.assessmentId,
        blockedAttorneyId: payload.blockedAttorneyId,
        reason: payload.reason || null
      }
    })
    res.json(wall)
  } catch (error: any) {
    logger.error('Failed to create ethical wall', { error: error.message })
    res.status(500).json({ error: 'Failed to create ethical wall' })
  }
})

router.get('/audit-logs', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { limit = 50, offset = 0, action, entityType, search } = req.query
    const where: Record<string, unknown> = {}
    if (typeof action === 'string' && action.trim()) {
      where.action = action.trim()
    }
    if (typeof entityType === 'string' && entityType.trim()) {
      where.entityType = entityType.trim()
    }
    if (typeof search === 'string' && search.trim()) {
      where.OR = [
        { entityId: { contains: search.trim() } },
        { action: { contains: search.trim() } },
        { metadata: { contains: search.trim() } },
      ]
    }
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset)
    })
    res.json(logs)
  } catch (error: any) {
    logger.error('Failed to load audit logs', { error: error.message })
    res.status(500).json({ error: 'Failed to load audit logs' })
  }
})

export default router
