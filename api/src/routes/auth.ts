import { Router } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { UserRegister, UserLogin, UserUpdate, PasswordResetRequest, PasswordReset } from '../lib/validators'
import { generateToken, authMiddleware, AuthRequest } from '../lib/auth'
import { isAdminEmail } from '../lib/admin-access'
import { sendClaimEmail } from '../lib/claims'

// Password-reset tokens are valid for one hour and are single-use.
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000

function hashResetToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex')
}

function passwordResetUrl(rawToken: string): string {
  const base = (process.env.WEB_URL || 'https://www.clearcaseiq.com').replace(/\/$/, '')
  return `${base}/reset-password?token=${encodeURIComponent(rawToken)}`
}

const router = Router()

function parseStringArrayField(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

// Health check for auth routes (verify API is reachable)
router.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'auth' })
})

// Register user
router.post('/register', async (req, res) => {
  try {
    const parsed = UserRegister.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Invalid registration data', 
        details: parsed.error.flatten() 
      })
    }

    const { email, password, firstName, lastName, phone } = parsed.data

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    // A provisional account (auto-created during intake) has no password and was
    // created with empty name fields. Registration "upgrades" it in place so the
    // user keeps the same id and all linked intake leads/assessments. A real,
    // password-backed (or OAuth) account is still a genuine duplicate.
    const isProvisional = existingUser != null && !existingUser.passwordHash && existingUser.provider === 'intake'
    if (existingUser && !isProvisional) {
      return res.status(409).json({ error: 'User already exists' })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    const userSelect = {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      createdAt: true,
    } as const

    // Upgrade the provisional account, or create a fresh one.
    const user = existingUser
      ? await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            passwordHash,
            firstName,
            lastName,
            phone: phone ?? existingUser.phone,
            provider: 'local',
          },
          select: userSelect,
        })
      : await prisma.user.create({
          data: {
            email,
            passwordHash,
            firstName,
            lastName,
            phone,
            emailVerified: false,
          },
          select: userSelect,
        })

    // Generate token
    const token = generateToken(user.id)

    logger.info(existingUser ? 'Provisional account upgraded via registration' : 'User registered', { userId: user.id, email: user.email })

    res.status(201).json({
      user,
      token
    })
  } catch (error) {
    logger.error('Registration failed', { error })
    res.status(500).json({ error: 'Registration failed' })
  }
})

// Login user
router.post('/login', async (req, res) => {
  try {
    const parsed = UserLogin.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Invalid login data', 
        details: parsed.error.flatten() 
      })
    }

    const { email, password } = parsed.data

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Accounts can lack a password for two reasons: (a) created via OAuth, or
    // (b) auto-provisioned during intake (provider === 'intake') before the user
    // ever set one. Give the intake case an accurate, actionable message instead
    // of incorrectly claiming the account was created with Google/Apple.
    if (!user.passwordHash) {
      if (user.provider === 'intake') {
        return res.status(400).json({
          error: "You started a case but haven't set a password yet. Use \"Forgot your password?\" to create one, or continue with Google.",
          code: 'NO_PASSWORD_SET',
        })
      }
      return res.status(400).json({
        error: 'This account was created with Google or Apple. Please sign in using the same method.',
        useOAuth: true
      })
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash)
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Check if user is an attorney — they should use attorney login unless this is an admin email (admin UI uses the same /login endpoint)
    const attorney = await prisma.attorney.findUnique({
      where: { email: user.email }
    })
    if (attorney && !isAdminEmail(user.email)) {
      return res.status(403).json({
        error: 'Please use the attorney login page',
        isAttorney: true
      })
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    // Generate token
    const token = generateToken(user.id)

    logger.info('User logged in', { userId: user.id, email: user.email })

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt
      },
      token,
      isAttorney: false
    })
  } catch (error) {
    logger.error('Login failed', { error })
    res.status(500).json({ error: 'Login failed' })
  }
})

// Request a password reset / "set password" link. Always responds 200 with a
// generic message so the endpoint can't be used to probe which emails exist.
router.post('/request-password-reset', async (req, res) => {
  const genericResponse = {
    ok: true,
    message: 'If an account exists for that email, a password reset link is on its way.',
  }
  try {
    const parsed = PasswordResetRequest.safeParse(req.body)
    if (!parsed.success) {
      // Still return the generic message — never reveal validation specifics here.
      return res.json(genericResponse)
    }

    const { email } = parsed.data
    const user = await prisma.user.findUnique({ where: { email } })

    // No user, inactive user, or OAuth-only account (google/apple) → silently no-op.
    // Intake-provisional accounts (provider === 'intake', no password yet) ARE
    // eligible: this flow doubles as their "set a password" path.
    const oauthOnly = user?.provider === 'google' || user?.provider === 'apple'
    if (user && user.isActive && !oauthOnly) {
      // Invalidate any outstanding tokens for this user before issuing a new one.
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } })

      const rawToken = crypto.randomBytes(32).toString('hex')
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashResetToken(rawToken),
          expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
        },
      })

      const link = passwordResetUrl(rawToken)
      const hasPassword = !!user.passwordHash
      const subject = hasPassword ? 'Reset your ClearCaseIQ password' : 'Set your ClearCaseIQ password'
      const action = hasPassword ? 'reset your password' : 'set a password for your account'
      const body = [
        `Hi ${user.firstName || 'there'},`,
        '',
        `We received a request to ${action}. Click the link below to continue. This link expires in 1 hour and can be used once.`,
        '',
        link,
        '',
        "If you didn't request this, you can safely ignore this email — your account is unchanged.",
        '',
        '— The ClearCaseIQ team',
      ].join('\n')

      const sent = await sendClaimEmail({ to: user.email, subject, body })
      logger.info('Password reset requested', { userId: user.id, emailSent: sent })
    } else {
      logger.info('Password reset requested for non-eligible email (no-op)')
    }

    return res.json(genericResponse)
  } catch (error) {
    logger.error('Password reset request failed', { error })
    // Even on error, avoid leaking anything actionable to the client.
    return res.json(genericResponse)
  }
})

// Validate a reset token without consuming it (so the reset page can show an
// "expired link" state before the user types a new password).
router.get('/reset-password/:token/validate', async (req, res) => {
  try {
    const rawToken = String(req.params.token || '')
    if (rawToken.length < 10) {
      return res.status(400).json({ valid: false, error: 'Invalid reset link.' })
    }
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashResetToken(rawToken) },
      include: { user: { select: { passwordHash: true } } },
    })
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return res.status(400).json({ valid: false, error: 'This reset link is invalid or has expired.' })
    }
    return res.json({ valid: true, isNewPassword: !record.user.passwordHash })
  } catch (error) {
    logger.error('Password reset token validation failed', { error })
    return res.status(500).json({ valid: false, error: 'Could not validate reset link.' })
  }
})

// Complete a password reset: consume the token and set the new password.
router.post('/reset-password', async (req, res) => {
  try {
    const parsed = PasswordReset.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.flatten(),
      })
    }

    const { token: rawToken, password } = parsed.data
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashResetToken(rawToken) },
    })

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    // Set the password and consume the token atomically. Proving control of the
    // inbox also verifies the email, and upgrades a provider to 'local' login.
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash, provider: 'local', emailVerified: true },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Any other outstanding tokens for this user are now moot.
      prisma.passwordResetToken.deleteMany({
        where: { userId: record.userId, usedAt: null, id: { not: record.id } },
      }),
    ])

    logger.info('Password reset completed', { userId: record.userId })
    return res.json({ ok: true, message: 'Your password has been updated. You can now sign in.' })
  } catch (error) {
    logger.error('Password reset failed', { error })
    return res.status(500).json({ error: 'Could not reset your password. Please try again.' })
  }
})

// Attorney login
router.post('/attorney-login', async (req, res) => {
  try {
    const parsed = UserLogin.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Invalid login data', 
        details: parsed.error.flatten() 
      })
    }

    const { email, password } = parsed.data

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    if (!user.passwordHash) {
      return res.status(401).json({
        error:
          'This account has no password on file (e.g. Google sign-in). Sign in on the website or set a password first.',
      })
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash)
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Find attorney record (email on attorney row must match user email)
    const attorney = await prisma.attorney.findFirst({
      where: { email: { equals: user.email, mode: 'insensitive' } },
    })

    if (!attorney) {
      return res.status(403).json({
        error: 'This account is not registered as an attorney. Please use the regular login page.',
        isAttorney: false,
      })
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    // Generate token
    const token = generateToken(user.id)

    logger.info('Attorney logged in', { userId: user.id, attorneyId: attorney.id, email: user.email })

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        createdAt: user.createdAt
      },
      attorney: {
        id: attorney.id,
        name: attorney.name,
        email: attorney.email,
        specialties: parseStringArrayField(attorney.specialties),
        venues: parseStringArrayField(attorney.venues),
      },
      token,
      isAttorney: true
    })
  } catch (error) {
    logger.error('Attorney login failed', { error })
    res.status(500).json({ error: 'Login failed' })
  }
})

/** Confirms the current JWT belongs to an ADMIN_EMAILS account (for admin UI login). */
router.get('/admin-access', authMiddleware, (req: AuthRequest, res) => {
  if (!req.user?.email || !isAdminEmail(req.user.email)) {
    return res.status(403).json({ error: 'Admin access required', code: 'NOT_ADMIN' })
  }
  res.json({ ok: true })
})

// Get current user
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            assessments: true,
            favoriteAttorneys: true
          }
        }
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json(user)
  } catch (error) {
    logger.error('Get user failed', { error })
    res.status(500).json({ error: 'Failed to get user' })
  }
})

/** Placeholder for email verification flow (integrate SendGrid/SES later). */
router.post('/request-email-verification', authMiddleware, async (req: AuthRequest, res) => {
  logger.info('Email verification requested (stub)', { userId: req.user!.id })
  res.status(501).json({
    ok: false,
    error: 'Email verification is not configured yet.',
    code: 'EMAIL_VERIFICATION_NOT_CONFIGURED',
  })
})

// Update user
router.put('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const parsed = UserUpdate.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Invalid update data', 
        details: parsed.error.flatten() 
      })
    }

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: parsed.data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        updatedAt: true
      }
    })

    logger.info('User updated', { userId: user.id })

    res.json(user)
  } catch (error) {
    logger.error('Update user failed', { error })
    res.status(500).json({ error: 'Failed to update user' })
  }
})

// Change password
router.put('/change-password', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Invalid password data' })
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Check current password
    if (!user.passwordHash) {
      return res.status(400).json({ error: 'Password login is not enabled for this account' })
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' })
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12)

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    })

    logger.info('Password changed', { userId: user.id })

    res.json({ message: 'Password changed successfully' })
  } catch (error) {
    logger.error('Change password failed', { error })
    res.status(500).json({ error: 'Failed to change password' })
  }
})

export default router
