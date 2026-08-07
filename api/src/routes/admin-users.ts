import { Router, type Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { logger } from '../lib/logger'
import { authMiddleware, AuthRequest } from '../lib/auth'
import {
  adminMiddleware,
  requireAdminCapability,
  parseAdminCapabilities,
  hasAdminCapability,
  resolveAdminCapabilities,
} from '../lib/admin-access'
import { writeAdminAudit } from '../lib/admin-audit'
import { parsePagination, paginated } from '../lib/pagination'
import { prismaAny } from './admin-shared'

const router: ExpressRouter = Router()

const RoleUpdateSchema = z.object({
  role: z.enum(['client', 'attorney', 'staff', 'admin']),
  capabilities: z.array(z.enum(['ops', 'network', 'oversight', 'config', 'users'])).optional(),
})

const CapabilitiesUpdateSchema = z.object({
  capabilities: z.array(z.enum(['ops', 'network', 'oversight', 'config', 'users'])),
})

router.get('/users', authMiddleware, adminMiddleware, requireAdminCapability('users'), async (req: AuthRequest, res) => {
  try {
    const { search, role } = req.query
    const { take, skip } = parsePagination(req.query as Record<string, unknown>, {
      defaultLimit: 50,
      maxLimit: 200,
    })

    const where: Record<string, unknown> = {}
    const roleFilter = typeof role === 'string' ? role.trim() : ''
    if (roleFilter) where.role = roleFilter

    const searchTerm = typeof search === 'string' ? search.trim() : ''
    if (searchTerm) {
      where.OR = [
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
      ]
    }

    const [users, total] = await Promise.all([
      prismaAny.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          adminCapabilities: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prismaAny.user.count({ where }),
    ])

    const data = users.map((user: any) => ({
      ...user,
      capabilities:
        user.role === 'admin'
          ? resolveAdminCapabilities(user)
          : parseAdminCapabilities(user.adminCapabilities),
    }))

    res.json({ success: true, data, ...paginated(data, total, { take, skip }) })
  } catch (error) {
    logger.error('Failed to list users', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.patch('/users/:userId/role', authMiddleware, adminMiddleware, requireAdminCapability('users'), async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params
    const parsed = RoleUpdateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    }

    // Only allowlist / users-capable admins who themselves have `users` can grant admin.
    // Granting the `users` capability itself also requires the actor to already have it
    // (enforced by middleware) — and allowlist actors always have every capability.
    if (parsed.data.role === 'admin' && !hasAdminCapability(req.user, 'users')) {
      return res.status(403).json({ error: 'Insufficient admin capability to promote admins' })
    }

    const previous = await prismaAny.user.findUnique({
      where: { id: userId },
      select: { role: true, email: true, adminCapabilities: true },
    })
    if (!previous) {
      return res.status(404).json({ error: 'User not found' })
    }

    const nextCapabilities =
      parsed.data.role === 'admin'
        ? parsed.data.capabilities && parsed.data.capabilities.length > 0
          ? JSON.stringify(parsed.data.capabilities)
          : previous.adminCapabilities ?? null
        : null

    const updated = await prismaAny.user.update({
      where: { id: userId },
      data: {
        role: parsed.data.role,
        adminCapabilities: nextCapabilities,
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        adminCapabilities: true,
      },
    })

    await writeAdminAudit(req, {
      action: 'user_role_changed',
      entityType: 'user',
      entityId: userId,
      metadata: {
        targetEmail: previous.email,
        fromRole: previous.role,
        toRole: parsed.data.role,
        capabilities: parseAdminCapabilities(updated.adminCapabilities),
      },
    })

    res.json({
      success: true,
      data: {
        ...updated,
        capabilities:
          updated.role === 'admin'
            ? resolveAdminCapabilities(updated)
            : parseAdminCapabilities(updated.adminCapabilities),
      },
    })
  } catch (error) {
    logger.error('Failed to update user role', { error, userId: req.params.userId })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.patch(
  '/users/:userId/capabilities',
  authMiddleware,
  adminMiddleware,
  requireAdminCapability('users'),
  async (req: AuthRequest, res) => {
    try {
      const { userId } = req.params
      const parsed = CapabilitiesUpdateSchema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
      }

      const previous = await prismaAny.user.findUnique({
        where: { id: userId },
        select: { role: true, email: true, adminCapabilities: true },
      })
      if (!previous) {
        return res.status(404).json({ error: 'User not found' })
      }
      if (previous.role !== 'admin') {
        return res.status(400).json({ error: 'Capabilities apply only to admin users' })
      }

      const updated = await prismaAny.user.update({
        where: { id: userId },
        data: { adminCapabilities: JSON.stringify(parsed.data.capabilities) },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          adminCapabilities: true,
        },
      })

      await writeAdminAudit(req, {
        action: 'user_capabilities_changed',
        entityType: 'user',
        entityId: userId,
        metadata: {
          targetEmail: previous.email,
          from: parseAdminCapabilities(previous.adminCapabilities),
          to: parsed.data.capabilities,
        },
      })

      res.json({
        success: true,
        data: {
          ...updated,
          capabilities: resolveAdminCapabilities(updated),
        },
      })
    } catch (error) {
      logger.error('Failed to update user capabilities', { error, userId: req.params.userId })
      res.status(500).json({ error: 'Internal server error' })
    }
  },
)

router.get('/firms', authMiddleware, adminMiddleware, async (_req: AuthRequest, res) => {
  try {
    const firms = await prismaAny.lawFirm.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        state: true,
        city: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json({ success: true, data: firms })
  } catch (error) {
    logger.error('Failed to list firms', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
