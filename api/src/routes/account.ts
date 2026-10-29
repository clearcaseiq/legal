import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { authMiddleware, type AuthRequest } from '../lib/auth'
import { SELF_SERVICE_DELETION_ROLES, buildAccountExport, deleteClaimantAccount } from '../lib/account-privacy'

const router = Router()

router.get('/export', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const data = await buildAccountExport(req.user!.id)
    if (!data) return res.status(404).json({ error: 'Account not found' })
    const stamp = new Date().toISOString().slice(0, 10)
    res.set('Content-Disposition', `attachment; filename="clearcaseiq-data-${stamp}.json"`)
    res.set('Cache-Control', 'no-store')
    res.json(data)
    void prisma.auditLog
      .create({
        data: {
          userId: req.user!.id,
          action: 'account_data_exported',
          entityType: 'user',
          entityId: req.user!.id,
          ipAddress: req.ip || null,
          userAgent: req.get('user-agent') || null,
        },
      })
      .catch((error: unknown) => logger.error('Failed to audit data export', { error, userId: req.user?.id }))
  } catch (error) {
    logger.error('Account data export failed', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Could not prepare your data export' })
  }
})

const DeleteSchema = z.object({
  confirm: z.literal('DELETE'),
  password: z.string().optional(),
})

router.post('/delete', authMiddleware, async (req: AuthRequest, res) => {
  const parsed = DeleteSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Type DELETE to confirm.', code: 'CONFIRMATION_REQUIRED' })
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, role: true, passwordHash: true },
    })
    if (!user) return res.status(404).json({ error: 'Account not found' })

    // Attorney, firm and staff accounts carry records other people depend on
    // (firm membership, billing, assigned cases), so those go through support.
    if (!SELF_SERVICE_DELETION_ROLES.has(user.role || 'client')) {
      return res.status(403).json({
        error: 'To close this type of account, contact support@clearcaseiq.com.',
        code: 'DELETION_REQUIRES_SUPPORT',
      })
    }

    // Accounts created through Google/Apple/Microsoft have no password; for
    // them the session plus the typed confirmation is the check.
    if (user.passwordHash) {
      const ok = parsed.data.password ? await bcrypt.compare(parsed.data.password, user.passwordHash) : false
      if (!ok) return res.status(401).json({ error: 'Password is incorrect.', code: 'INVALID_PASSWORD' })
    }

    const result = await deleteClaimantAccount(user.id, {
      ipAddress: req.ip || null,
      userAgent: req.get('user-agent') || null,
    })
    res.json({ deleted: true, ...result })
  } catch (error) {
    logger.error('Account deletion failed', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Could not delete your account. Please contact support.' })
  }
})

export default router
