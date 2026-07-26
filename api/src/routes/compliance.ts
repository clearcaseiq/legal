import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authMiddleware, requireRole } from '../lib/auth'
import { adminMiddleware } from '../lib/admin-access'
import { parsePagination, paginated } from '../lib/pagination'
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

/** ISO date string -> Date, ignoring blank/garbage input rather than 500ing. */
function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const parsed = new Date(value.trim())
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/**
 * Audit trail feed for the admin viewer.
 *
 * Guarded by `adminMiddleware` rather than `requireRole(['admin'])`: the rest
 * of the audit surface accepts either the ADMIN_EMAILS allowlist or
 * `User.role === 'admin'`, and requireRole only honors the latter, so a
 * break-glass admin could reach every other admin screen but got a 403 here.
 */
router.get('/audit-logs', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { action, entityType, search, actorId, from, to } = req.query
    const { take, skip } = parsePagination(req.query as Record<string, unknown>, {
      defaultLimit: 50,
      maxLimit: 200,
    })

    const where: Record<string, unknown> = {}
    if (typeof action === 'string' && action.trim()) {
      // `contains`, not equality: the global request middleware writes actions
      // as raw "POST /v1/..." strings, so exact match was unusable for them.
      where.action = { contains: action.trim() }
    }
    if (typeof entityType === 'string' && entityType.trim()) {
      where.entityType = entityType.trim()
    }
    if (typeof actorId === 'string' && actorId.trim()) {
      where.userId = actorId.trim()
    }

    const fromDate = parseDate(from)
    const toDate = parseDate(to)
    if (fromDate || toDate) {
      where.createdAt = {
        ...(fromDate ? { gte: fromDate } : {}),
        ...(toDate ? { lte: toDate } : {}),
      }
    }

    if (typeof search === 'string' && search.trim()) {
      where.OR = [
        { entityId: { contains: search.trim() } },
        { action: { contains: search.trim() } },
        { metadata: { contains: search.trim() } },
      ]
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        // The raw row only carries userId, so the viewer had no way to show who
        // performed an action without a second lookup per row.
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          attorney: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ])

    res.json({ logs, ...paginated(logs, total, { take, skip }) })
  } catch (error: any) {
    logger.error('Failed to load audit logs', { error: error.message })
    res.status(500).json({ error: 'Failed to load audit logs' })
  }
})

/**
 * Distinct action / entityType values for the viewer's filter dropdowns, so the
 * options reflect what is actually in the table instead of a hardcoded list.
 */
router.get('/audit-logs/facets', authMiddleware, adminMiddleware, async (_req, res) => {
  try {
    const [actions, entityTypes] = await Promise.all([
      prisma.auditLog.groupBy({
        by: ['action'],
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
        take: 50,
      }),
      prisma.auditLog.groupBy({
        by: ['entityType'],
        _count: { entityType: true },
        orderBy: { _count: { entityType: 'desc' } },
        take: 50,
      }),
    ])

    res.json({
      actions: actions.map((a) => ({ value: a.action, count: a._count.action })),
      entityTypes: entityTypes
        .filter((e) => e.entityType)
        .map((e) => ({ value: e.entityType as string, count: e._count.entityType })),
    })
  } catch (error: any) {
    logger.error('Failed to load audit log facets', { error: error.message })
    res.status(500).json({ error: 'Failed to load audit log facets' })
  }
})

export default router
