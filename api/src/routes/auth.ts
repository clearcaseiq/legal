import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { UserRegister, UserLogin, UserUpdate } from '../lib/validators'
import { generateToken, authMiddleware, AuthRequest } from '../lib/auth'
import { isAdminEmail } from '../lib/admin-access'

const router = Router()

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

    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        phone,
        emailVerified: false,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        createdAt: true
      }
    })

    // Generate token
    const token = generateToken(user.id)

    logger.info('User registered', { userId: user.id, email: user.email })

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

    // OAuth-only users have no password
    if (!user.passwordHash) {
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
      where: { email: user.email },
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
        specialties: attorney.specialties ? JSON.parse(attorney.specialties) : [],
        venues: attorney.venues ? JSON.parse(attorney.venues) : []
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
