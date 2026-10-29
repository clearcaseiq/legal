import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { authMiddlewareAllowPendingMfa, issueSessionToken, requiresMfa, type AuthRequest } from '../lib/auth'
import { beginMfaEnrollment, confirmMfaEnrollment, getMfaStatus, verifyMfaCode } from '../lib/mfa'

/**
 * Two-step verification for accounts that require it. Every route here accepts
 * the short-lived token a sign-in issues before MFA; a successful code returns
 * a full session token in its place.
 */
const router = Router()

const CodeInput = z.object({ code: z.string().trim().min(6).max(32) })

async function upgradedToken(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, emailVerified: true, sessionVersion: true },
  })
  return user ? issueSessionToken(user, { mfaVerified: true }) : null
}

router.get('/status', authMiddlewareAllowPendingMfa, async (req: AuthRequest, res) => {
  try {
    const status = await getMfaStatus(req.user.id)
    const session = (req as any).authSession || {}
    res.json({
      required: requiresMfa(req.user),
      enrolled: status.enrolled,
      verified: Boolean(session.mfaVerified),
      recoveryCodesRemaining: status.recoveryCodesRemaining,
    })
  } catch (error) {
    logger.error('MFA status failed', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Could not load two-step verification status.' })
  }
})

router.post('/setup', authMiddlewareAllowPendingMfa, async (req: AuthRequest, res) => {
  try {
    const result = await beginMfaEnrollment({ id: req.user.id, email: req.user.email })
    if (!result.ok) return res.status(409).json({ error: result.error, code: result.code })
    res.json({ secret: result.secret, otpauthUrl: result.otpauthUrl })
  } catch (error) {
    logger.error('MFA setup failed', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Could not start two-step verification setup.' })
  }
})

router.post('/enable', authMiddlewareAllowPendingMfa, async (req: AuthRequest, res) => {
  try {
    const parsed = CodeInput.safeParse(req.body || {})
    if (!parsed.success) return res.status(400).json({ error: 'Enter the 6-digit code from your app.', code: 'MFA_INVALID_CODE' })
    const result = await confirmMfaEnrollment(req.user.id, parsed.data.code, req.ip)
    if (!result.ok) return res.status(result.status).json({ error: result.error, code: result.code })
    const token = await upgradedToken(req.user.id)
    res.json({ ok: true, token, recoveryCodes: result.recoveryCodes })
  } catch (error) {
    logger.error('MFA enable failed', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Could not turn on two-step verification.' })
  }
})

router.post('/verify', authMiddlewareAllowPendingMfa, async (req: AuthRequest, res) => {
  try {
    const parsed = CodeInput.safeParse(req.body || {})
    if (!parsed.success) return res.status(400).json({ error: 'Enter your 6-digit code or a recovery code.', code: 'MFA_INVALID_CODE' })
    const result = await verifyMfaCode(req.user.id, parsed.data.code, req.ip)
    if (!result.ok) return res.status(result.status).json({ error: result.error, code: result.code })
    const token = await upgradedToken(req.user.id)
    logger.info('MFA verified', { userId: req.user.id, recoveryCode: Boolean(result.usedRecoveryCode) })
    res.json({ ok: true, token, usedRecoveryCode: Boolean(result.usedRecoveryCode) })
  } catch (error) {
    logger.error('MFA verify failed', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Could not verify your code.' })
  }
})

export default router
