import { Router } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { replicateUploads } from '../lib/object-storage'
import { webUrl } from '../lib/app-url'
import { UserRegister, UserLogin, UserUpdate, PasswordResetRequest, PasswordReset } from '../lib/validators'
import { generateToken, authMiddleware, AuthRequest } from '../lib/auth'
import { isAdminUser, resolveAdminCapabilities } from '../lib/admin-access'
import { adoptGuestCasesByEmail } from '../lib/guest-case-adoption'
import { sendClaimEmail } from '../lib/claims'
import { permissionsForRole } from '../lib/firm-roles'

// Look up a user's active firm membership (the record that makes a paralegal /
// case manager / etc. a real firm staffer). Returns null for plaintiffs.
async function findActiveFirmMembership(userId: string) {
  return (prisma as any).firmMember
    .findFirst({
      where: { userId, status: 'active' },
      include: { lawFirm: true },
      orderBy: { createdAt: 'asc' },
    })
    .catch(() => null)
}

// Password-reset tokens are valid for one hour and are single-use.
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000

function hashResetToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex')
}

function passwordResetUrl(rawToken: string): string {
  return webUrl(`/reset-password?token=${encodeURIComponent(rawToken)}`)
}

// Email verification tokens share the reset-token security model: single-use,
// expiring, and stored only as a SHA-256 hash. They live longer than reset
// tokens since verifying an email is lower-risk and users may act on it later.
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000

function emailVerificationUrl(rawToken: string): string {
  return webUrl(`/verify-email?token=${encodeURIComponent(rawToken)}`)
}

// Mint a single-use, expiring email-verification token and email the link.
// Best-effort: returns whether the message was actually dispatched, and never
// throws so callers (e.g. signup) can fire-and-forget without blocking (#224).
async function issueEmailVerification(user: { id: string; email: string; firstName?: string | null }): Promise<boolean> {
  try {
    await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id, usedAt: null } })
    const rawToken = crypto.randomBytes(32).toString('hex')
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(rawToken),
        expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
      },
    })
    const link = emailVerificationUrl(rawToken)
    const body = [
      `Hi ${user.firstName || 'there'},`,
      '',
      'Welcome to ClearCaseIQ! Please confirm your email address so we can keep your account secure and send you case updates. Click the link below to verify. This link expires in 24 hours and can be used once.',
      '',
      link,
      '',
      "If you didn't create this account, you can safely ignore this email.",
      '',
      '— The ClearCaseIQ team',
    ].join('\n')
    const sent = await sendClaimEmail({ to: user.email, subject: 'Verify your ClearCaseIQ email', body })
    logger.info('Email verification issued', { userId: user.id, emailSent: sent })
    return sent
  } catch (error) {
    logger.error('Failed to issue email verification', { userId: user.id, error })
    return false
  }
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

    // Send the email-verification link on signup (best-effort — never blocks or
    // fails registration if the email provider is unconfigured or slow) (#224).
    void issueEmailVerification(user)

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
    if (attorney && !isAdminUser(user)) {
      return res.status(403).json({
        error: 'Please use the attorney login page',
        isAttorney: true
      })
    }

    // Non-attorney firm staff (paralegal, case manager, etc.) have a real login
    // but belong in the firm workspace, not the plaintiff dashboard. Send them
    // to the staff login page instead of silently treating them as a claimant.
    if (!isAdminUser(user)) {
      const membership = await findActiveFirmMembership(user.id)
      if (membership) {
        return res.status(403).json({
          error: 'Please use the firm staff login page',
          isFirmStaff: true,
        })
      }
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    // Catch any case still stranded on the guest shadow user — cases submitted
    // before this account could adopt them at submit time, or by a claimant who
    // reached the account through a route that skips the claim link. Gated on a
    // verified email so an unverified signup cannot name a stranger's address
    // and inherit their case.
    if (user.emailVerified && !isAdminUser(user)) {
      await adoptGuestCasesByEmail(user.id, user.email)
    }

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
        avatar: user.avatar,
        emailVerified: user.emailVerified,
        preferredLanguage: user.preferredLanguage || 'en',
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
        "If you didn't request this, you can safely ignore this email. Your account is unchanged.",
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
      include: { user: { select: { passwordHash: true, role: true } } },
    })
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return res.status(400).json({ valid: false, error: 'This reset link is invalid or has expired.' })
    }
    return res.json({ valid: true, isNewPassword: !record.user.passwordHash, role: record.user.role })
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
      include: { user: { select: { role: true, email: true } } },
    })

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' })
    }

    const userRole = record.user.role
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

    // Setting a password means an invited firm member has accepted: flip any
    // pending memberships to active so they count toward the firm and can be
    // assigned work. Best-effort — never blocks the password reset.
    try {
      await (prisma as any).firmMember.updateMany({
        where: { userId: record.userId, status: 'invited' },
        data: { status: 'active', joinedAt: new Date() },
      })
    } catch (activateErr) {
      logger.warn('Failed to activate firm memberships after password set', {
        userId: record.userId,
        error: activateErr instanceof Error ? activateErr.message : activateErr,
      })
    }

    // Setting a password through an emailed link is how most guests first get an
    // account, and it reaches neither of the paths that attach a pre-account case
    // (the `pending_assessment_id` in `localStorage` and the emailed claim link).
    // Without this they signed in to an empty dashboard while their case sat on
    // the guest shadow user. The transaction above just proved control of the
    // inbox, which is the same authority the claim link runs on.
    if (userRole === 'client') {
      await adoptGuestCasesByEmail(record.userId, record.user.email)
    }

    logger.info('Password reset completed', { userId: record.userId })
    return res.json({ ok: true, message: 'Your password has been updated. You can now sign in.', role: userRole })
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

// Firm staff login (paralegals, case managers, intake specialists, etc.).
// Authenticates against the same User credentials as everyone else, but requires
// an active FirmMember record and returns that firm role + permissions so the
// web app can route them into the firm workspace scoped to what they can do.
router.post('/staff-login', async (req, res) => {
  try {
    const parsed = UserLogin.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid login data', details: parsed.error.flatten() })
    }

    const { email, password } = parsed.data
    const user = await prisma.user.findUnique({ where: { email } })

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    if (!user.passwordHash) {
      if (user.provider === 'intake') {
        return res.status(400).json({
          error:
            "You haven't set a password yet. Use the invite link we emailed you, or \"Forgot your password?\" to create one.",
          code: 'NO_PASSWORD_SET',
        })
      }
      return res.status(400).json({
        error: 'This account has no password on file. Please set a password first.',
      })
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash)
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const membership = await findActiveFirmMembership(user.id)
    if (!membership) {
      // Pending invite? Give an actionable hint instead of a flat rejection.
      const invited = await (prisma as any).firmMember
        .findFirst({ where: { userId: user.id, status: 'invited' } })
        .catch(() => null)
      if (invited) {
        return res.status(403).json({
          error:
            'Your firm invitation is still pending. Please open the invite email and set your password first.',
          code: 'INVITE_PENDING',
        })
      }
      return res.status(403).json({
        error: 'This account is not a member of any law firm. Please use the regular login page.',
        isFirmStaff: false,
      })
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    const token = generateToken(user.id)

    logger.info('Firm staff logged in', {
      userId: user.id,
      firmId: membership.lawFirmId,
      role: membership.role,
    })

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        createdAt: user.createdAt,
      },
      firm: {
        id: membership.lawFirmId,
        name: membership.lawFirm?.name || null,
        role: membership.role,
        title: membership.title || null,
        permissions: [
          ...permissionsForRole(membership.role),
          ...(Array.isArray(membership.permissions)
            ? membership.permissions.map(String)
            : parseStringArrayField(membership.permissions)),
        ],
      },
      token,
      role: 'staff',
    })
  } catch (error) {
    logger.error('Staff login failed', { error })
    res.status(500).json({ error: 'Login failed' })
  }
})

/**
 * Confirms the current JWT may use the admin UI — either an ADMIN_EMAILS account or
 * a user whose role was set to 'admin'. Must stay in sync with adminMiddleware, or a
 * role-based admin would pass this login gate and then 403 on every admin API call.
 */
router.get('/admin-access', authMiddleware, (req: AuthRequest, res) => {
  if (!isAdminUser(req.user)) {
    return res.status(403).json({ error: 'Admin access required', code: 'NOT_ADMIN' })
  }
  const capabilities = resolveAdminCapabilities(req.user)
  res.json({ ok: true, capabilities })
})

const plaintiffAvatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'avatars')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (_req, file, cb) => {
    cb(null, `${uuidv4()}-${file.originalname}`)
  },
})

const plaintiffAvatarUpload = multer({
  storage: plaintiffAvatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    // Require BOTH a real image extension AND a matching image MIME. Using OR let
    // a caller store e.g. `evil.svg` with a spoofed `image/png` MIME, which is
    // then served from /uploads/avatars/ and rendered as active SVG (stored XSS).
    // Match the AND-based filter used for evidence uploads (files.ts).
    const allowedExt = /\.(jpe?g|png|gif|webp)$/i.test(file.originalname || '')
    const allowedMime = /image\/(jpeg|png|gif|webp)/i.test(file.mimetype || '')
    if (allowedExt && allowedMime) return cb(null, true)
    cb(new Error('Profile photo must be a JPEG, PNG, GIF, or WebP image'))
  },
})

function runPlaintiffAvatarUpload(req: any, res: any, next: any) {
  plaintiffAvatarUpload.single('photo')(req, res, (err: any) => {
    if (!err) return next()
    const message =
      err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
        ? 'Profile photo must be 5MB or smaller'
        : err.message || 'Profile photo must be a JPEG, PNG, GIF, or WebP image'
    return res.status(400).json({ error: message })
  })
}

async function unlinkLocalAvatar(avatarUrl?: string | null) {
  if (!avatarUrl || !avatarUrl.startsWith('/uploads/avatars/')) return
  const previousPath = path.join(process.cwd(), avatarUrl.replace(/^\/+/, ''))
  await fs.promises.unlink(previousPath).catch(() => undefined)
}

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
        avatar: true,
        emailVerified: true,
        preferredLanguage: true,
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

    res.json({
      ...user,
      preferredLanguage: user.preferredLanguage || 'en',
    })
  } catch (error) {
    logger.error('Get user failed', { error })
    res.status(500).json({ error: 'Failed to get user' })
  }
})

/** Placeholder for email verification flow (integrate SendGrid/SES later). */
router.post('/request-email-verification', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
    if (!user || !user.isActive) {
      return res.status(404).json({ ok: false, error: 'Account not found.' })
    }

    // Already verified — nothing to send, but report success so the UI can
    // simply clear the banner.
    if (user.emailVerified) {
      return res.json({ ok: true, alreadyVerified: true, message: 'Your email is already verified.' })
    }

    // Invalidate any outstanding tokens before issuing a fresh one.
    await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id, usedAt: null } })

    const rawToken = crypto.randomBytes(32).toString('hex')
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(rawToken),
        expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
      },
    })

    const link = emailVerificationUrl(rawToken)
    const body = [
      `Hi ${user.firstName || 'there'},`,
      '',
      'Please confirm your email address so we can keep your ClearCaseIQ account secure and send you case updates. Click the link below to verify. This link expires in 24 hours and can be used once.',
      '',
      link,
      '',
      "If you didn't request this, you can safely ignore this email.",
      '',
      '— The ClearCaseIQ team',
    ].join('\n')

    const sent = await sendClaimEmail({ to: user.email, subject: 'Verify your ClearCaseIQ email', body })
    logger.info('Email verification requested', { userId: user.id, emailSent: sent })

    if (!sent) {
      // No email provider configured (e.g. local/dev). Surface a clear, honest
      // error instead of pretending the message went out.
      return res.status(503).json({
        ok: false,
        error: 'We couldn’t send the verification email right now. Please try again later or contact support.',
        code: 'EMAIL_DELIVERY_UNAVAILABLE',
      })
    }

    return res.json({ ok: true, message: 'Verification link sent. Please check your email (including spam).' })
  } catch (error) {
    logger.error('Email verification request failed', { error, userId: req.user?.id })
    return res.status(500).json({
      ok: false,
      error: 'We couldn’t send the verification email right now. Please try again later or contact support.',
    })
  }
})

// Consume an email verification token and mark the user's email as verified.
router.post('/verify-email', async (req, res) => {
  try {
    const rawToken = String(req.body?.token || '')
    if (rawToken.length < 10) {
      return res.status(400).json({ ok: false, error: 'Invalid verification link.' })
    }

    const record = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash: hashResetToken(rawToken) },
    })

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return res.status(400).json({ ok: false, error: 'This verification link is invalid or has expired. Please request a new one.' })
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: true },
      }),
      prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.emailVerificationToken.deleteMany({
        where: { userId: record.userId, usedAt: null, id: { not: record.id } },
      }),
    ])

    logger.info('Email verified', { userId: record.userId })
    return res.json({ ok: true, message: 'Your email has been verified. Thank you!' })
  } catch (error) {
    logger.error('Email verification failed', { error })
    return res.status(500).json({ ok: false, error: 'Could not verify your email. Please try again.' })
  }
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
        avatar: true,
        preferredLanguage: true,
        updatedAt: true
      }
    })

    logger.info('User updated', { userId: user.id })

    res.json({
      ...user,
      preferredLanguage: user.preferredLanguage || 'en',
    })
  } catch (error) {
    logger.error('Update user failed', { error })
    res.status(500).json({ error: 'Failed to update user' })
  }
})

// Upload / replace plaintiff profile photo (stored on User.avatar)
router.post('/me/avatar', authMiddleware, runPlaintiffAvatarUpload, replicateUploads, async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo uploaded' })
    }

    const existing = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { avatar: true },
    })
    const avatar = `/uploads/avatars/${req.file.filename}`
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { avatar },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        emailVerified: true,
        preferredLanguage: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    await unlinkLocalAvatar(existing?.avatar)

    logger.info('Plaintiff profile photo uploaded', { userId: user.id, fileName: req.file.originalname })
    res.json({
      ...user,
      preferredLanguage: user.preferredLanguage || 'en',
    })
  } catch (error) {
    logger.error('Plaintiff avatar upload failed', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Failed to upload profile photo' })
  }
})

// Delete plaintiff profile photo
router.delete('/me/avatar', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { avatar: true },
    })
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { avatar: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        emailVerified: true,
        preferredLanguage: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    await unlinkLocalAvatar(existing?.avatar)

    logger.info('Plaintiff profile photo deleted', { userId: user.id })
    res.json({
      ...user,
      preferredLanguage: user.preferredLanguage || 'en',
    })
  } catch (error) {
    logger.error('Plaintiff avatar delete failed', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Failed to delete profile photo' })
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
