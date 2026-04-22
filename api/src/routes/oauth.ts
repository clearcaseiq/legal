import express from 'express'
import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import AppleStrategy from 'passport-apple'
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken'
import { oauthConfig, frontendUrl } from '../config/oauth'
import { logger } from '../lib/logger'
import { prisma } from '../lib/prisma'

const router = express.Router()
const JWT_SECRET: Secret = process.env.JWT_SECRET || 'development-secret'
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn']

// Configure Google OAuth Strategy (only if credentials are available)
if (oauthConfig.google.clientId && oauthConfig.google.clientSecret) {
  passport.use(new GoogleStrategy({
    clientID: oauthConfig.google.clientId,
    clientSecret: oauthConfig.google.clientSecret,
    callbackURL: oauthConfig.google.redirectUri
  }, async (_accessToken: string, _refreshToken: string, profile: any, done: (error: unknown, user?: any) => void) => {
  try {
    logger.info('Google OAuth callback', { 
      profileId: profile.id, 
      email: profile.emails?.[0]?.value 
    })

    const email = profile.emails?.[0]?.value
    const firstName = profile.name?.givenName || ''
    const lastName = profile.name?.familyName || ''
    const avatar = profile.photos?.[0]?.value

    if (!email) {
      return done(new Error('No email found in Google profile'), undefined)
    }

    // Check if user exists with this Google ID
    let user = await prisma.user.findUnique({
      where: { googleId: profile.id }
    })

    if (user) {
      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      })
      return done(null, user)
    }

    // Check if user exists with this email
    user = await prisma.user.findUnique({
      where: { email }
    })

    if (user) {
      // Link Google account to existing user
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          googleId: profile.id,
          provider: 'google',
          avatar,
          lastLoginAt: new Date()
        }
      })
      return done(null, user)
    }

    // Create new user
    user = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        googleId: profile.id,
        provider: 'google',
        avatar,
        emailVerified: true, // Google emails are verified
        isActive: true,
        lastLoginAt: new Date()
      }
    })

    return done(null, user)
  } catch (error: any) {
    logger.error('Google OAuth error', { error: error.message })
    return done(error, undefined)
  }
  }))
}

// Configure Apple OAuth Strategy (only if credentials are available)
if (oauthConfig.apple.clientId && oauthConfig.apple.teamId && oauthConfig.apple.keyId && oauthConfig.apple.privateKey) {
  passport.use(new AppleStrategy({
    clientID: oauthConfig.apple.clientId,
    teamID: oauthConfig.apple.teamId,
    keyID: oauthConfig.apple.keyId,
    privateKey: oauthConfig.apple.privateKey,
    callbackURL: oauthConfig.apple.redirectUri,
    scope: ['name', 'email']
  }, async (_accessToken: string, _refreshToken: string, _idToken: string, profile: any, done: (error: unknown, user?: any) => void) => {
  try {
    logger.info('Apple OAuth callback', { 
      profileId: profile.id,
      email: profile.email 
    })

    const email = profile.email
    const firstName = profile.name?.firstName || ''
    const lastName = profile.name?.lastName || ''

    if (!email) {
      return done(new Error('No email found in Apple profile'), undefined)
    }

    // Check if user exists with this Apple ID
    let user = await prisma.user.findUnique({
      where: { appleId: profile.id }
    })

    if (user) {
      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      })
      return done(null, user)
    }

    // Check if user exists with this email
    user = await prisma.user.findUnique({
      where: { email }
    })

    if (user) {
      // Link Apple account to existing user
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          appleId: profile.id,
          provider: 'apple',
          lastLoginAt: new Date()
        }
      })
      return done(null, user)
    }

    // Create new user
    user = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        appleId: profile.id,
        provider: 'apple',
        emailVerified: true, // Apple emails are verified
        isActive: true,
        lastLoginAt: new Date()
      }
    })

    return done(null, user)
  } catch (error: any) {
    logger.error('Apple OAuth error', { error: error.message })
    return done(error, undefined)
  }
  }))
}

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id)
})

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        provider: true,
        avatar: true
      }
    })
    done(null, user)
  } catch (error) {
    done(error, null)
  }
})

// Google OAuth routes (only if configured)
if (oauthConfig.google.clientId && oauthConfig.google.clientSecret) {
  router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email']
  }))

  router.get('/google/callback', 
    passport.authenticate('google', { failureRedirect: `${frontendUrl}/login?error=oauth_failed` }),
    (req: any, res) => {
      try {
        const user = req.user
        if (!user) {
          return res.redirect(`${frontendUrl}/login?error=oauth_failed`)
        }

        // Generate JWT token
        const token = jwt.sign(
          { 
            id: user.id, 
            email: user.email,
            provider: user.provider 
          },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRES_IN }
        )

        // Redirect to frontend with token
        res.redirect(`${frontendUrl}/auth/callback?token=${token}&provider=${user.provider}`)
      } catch (error: any) {
        logger.error('Google OAuth callback error', { error: error.message })
        res.redirect(`${frontendUrl}/login?error=oauth_failed`)
      }
    }
  )
}

// Apple OAuth routes (only if configured)
if (oauthConfig.apple.clientId && oauthConfig.apple.teamId && oauthConfig.apple.keyId && oauthConfig.apple.privateKey) {
  router.get('/apple', passport.authenticate('apple'))

  router.post('/apple/callback',
    passport.authenticate('apple', { failureRedirect: `${frontendUrl}/login?error=oauth_failed` }),
    (req: any, res) => {
      try {
        const user = req.user
        if (!user) {
          return res.redirect(`${frontendUrl}/login?error=oauth_failed`)
        }

        // Generate JWT token
        const token = jwt.sign(
          { 
            id: user.id, 
            email: user.email,
            provider: user.provider 
          },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRES_IN }
        )

        // Redirect to frontend with token
        res.redirect(`${frontendUrl}/auth/callback?token=${token}&provider=${user.provider}`)
      } catch (error: any) {
        logger.error('Apple OAuth callback error', { error: error.message })
        res.redirect(`${frontendUrl}/login?error=oauth_failed`)
      }
    }
  )
}

// Fallback routes when OAuth is not configured
if (!oauthConfig.google.clientId || !oauthConfig.google.clientSecret) {
  router.get('/google', (req, res) => {
    res.status(503).json({ 
      error: 'Google OAuth not configured', 
      message: 'Please follow the OAUTH_SETUP.md guide to configure Google OAuth' 
    })
  })
  router.get('/google/callback', (req, res) => {
    res.status(503).json({ 
      error: 'Google OAuth not configured', 
      message: 'Please follow the OAUTH_SETUP.md guide to configure Google OAuth' 
    })
  })
}

if (!oauthConfig.apple.clientId || !oauthConfig.apple.teamId || !oauthConfig.apple.keyId || !oauthConfig.apple.privateKey) {
  router.get('/apple', (req, res) => {
    res.status(503).json({ 
      error: 'Apple OAuth not configured', 
      message: 'Please follow the OAUTH_SETUP.md guide to configure Apple OAuth' 
    })
  })
  router.post('/apple/callback', (req, res) => {
    res.status(503).json({ 
      error: 'Apple OAuth not configured', 
      message: 'Please follow the OAUTH_SETUP.md guide to configure Apple OAuth' 
    })
  })
}

// OAuth status endpoint
router.get('/status', (req, res) => {
  res.json({
    google: {
      configured: !!(oauthConfig.google.clientId && oauthConfig.google.clientSecret)
    },
    apple: {
      configured: !!(oauthConfig.apple.clientId && oauthConfig.apple.teamId)
    }
  })
})

export default router
