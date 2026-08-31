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
import { sendClaimEmail } from '../lib/claims'
import { INVITE_TTL_MS, issuePasswordSetupToken, passwordResetUrl } from '../lib/password-reset'

const router: ExpressRouter = Router()

const RoleUpdateSchema = z.object({
  role: z.enum(['client', 'attorney', 'staff', 'admin']),
  capabilities: z.array(z.enum(['ops', 'network', 'oversight', 'config', 'users'])).optional(),
})

const CapabilitiesUpdateSchema = z.object({
  capabilities: z.array(z.enum(['ops', 'network', 'oversight', 'config', 'users'])),
})

// Only internal roles can be created here. Clients arrive by signing up and
// attorneys by registering a firm; minting either from this screen would
// produce an account with no matching Attorney or intake record behind it.
const UserCreateSchema = z.object({
  email: z.string().email(),
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  role: z.enum(['staff', 'admin']),
  capabilities: z.array(z.enum(['ops', 'network', 'oversight', 'config', 'users'])).optional(),
})

const StatusUpdateSchema = z.object({
  isActive: z.boolean(),
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

router.post('/users', authMiddleware, adminMiddleware, requireAdminCapability('users'), async (req: AuthRequest, res) => {
  try {
    const parsed = UserCreateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    }

    const { firstName, lastName, role, capabilities } = parsed.data
    // Stored lower-case and matched case-insensitively. Addresses are not
    // case-sensitive in practice, and elsewhere in this codebase an exact-match
    // lookup on a mixed-case address silently dropped an attorney's
    // notifications — a duplicate account here would fail the same way.
    const email = parsed.data.email.trim().toLowerCase()

    if (role === 'admin' && !hasAdminCapability(req.user, 'users')) {
      return res.status(403).json({ error: 'Insufficient admin capability to create admins' })
    }

    const existing = await prismaAny.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true, email: true },
    })
    if (existing) {
      return res.status(409).json({ error: `An account already exists for ${existing.email}` })
    }

    // No password is ever set here: the account is created without one and the
    // invitee chooses their own. That keeps admins from handling colleagues'
    // credentials, and means a leaked invite expires on its own.
    const created = await prismaAny.user.create({
      data: {
        email,
        firstName,
        lastName,
        role,
        isActive: true,
        emailVerified: false,
        passwordHash: null,
        adminCapabilities: role === 'admin' && capabilities?.length ? JSON.stringify(capabilities) : null,
      },
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
    })

    let inviteSent = false
    try {
      const rawToken = await issuePasswordSetupToken(created.id, INVITE_TTL_MS)
      const link = passwordResetUrl(rawToken)
      inviteSent = await sendClaimEmail({
        to: created.email,
        subject: 'Your ClearCaseIQ account',
        body: [
          `Hi ${created.firstName},`,
          '',
          `An account has been created for you on ClearCaseIQ. Click the link below to set your password and sign in. This link expires in 72 hours and can be used once.`,
          '',
          link,
          '',
          'If you were not expecting this, you can ignore this email and the link will lapse.',
          '',
          '— The ClearCaseIQ team',
        ].join('\n'),
      })
    } catch (error) {
      // The account is already created and usable via "forgot password", so a
      // failed send is reported rather than rolled back — deleting a valid
      // account because an SMTP hiccup would be the worse outcome.
      logger.error('Failed to send staff invite email', { error, userId: created.id })
    }

    await writeAdminAudit(req, {
      action: 'user_created',
      entityType: 'user',
      entityId: created.id,
      metadata: { targetEmail: created.email, role, capabilities: capabilities ?? [], inviteSent },
    })

    res.status(201).json({
      success: true,
      inviteSent,
      data: {
        ...created,
        capabilities:
          created.role === 'admin'
            ? resolveAdminCapabilities(created)
            : parseAdminCapabilities(created.adminCapabilities),
      },
    })
  } catch (error) {
    logger.error('Failed to create user', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.patch(
  '/users/:userId/status',
  authMiddleware,
  adminMiddleware,
  requireAdminCapability('users'),
  async (req: AuthRequest, res) => {
    try {
      const { userId } = req.params
      const parsed = StatusUpdateSchema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
      }
      const { isActive } = parsed.data

      const target = await prismaAny.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true, isActive: true },
      })
      if (!target) {
        return res.status(404).json({ error: 'User not found' })
      }

      // Deactivation takes effect on the target's next request, because
      // authMiddleware rejects inactive users. Two ways that becomes a lockout:
      if (!isActive && target.id === req.user?.id) {
        return res.status(400).json({ error: 'You cannot deactivate your own account' })
      }
      if (!isActive && target.role === 'admin') {
        const otherActiveAdmins = await prismaAny.user.count({
          where: { role: 'admin', isActive: true, id: { not: target.id } },
        })
        if (otherActiveAdmins === 0) {
          return res.status(400).json({ error: 'Cannot deactivate the last active admin' })
        }
      }

      const updated = await prismaAny.user.update({
        where: { id: userId },
        data: { isActive },
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
      })

      await writeAdminAudit(req, {
        action: isActive ? 'user_reactivated' : 'user_deactivated',
        entityType: 'user',
        entityId: userId,
        metadata: { targetEmail: target.email, role: target.role },
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
      logger.error('Failed to update user status', { error, userId: req.params.userId })
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
