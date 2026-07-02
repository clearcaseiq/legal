import express from 'express'
import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import AppleStrategy from 'passport-apple'
import { oauthConfig, frontendUrl } from '../config/oauth'
import { generateToken } from '../lib/auth'
import { logger } from '../lib/logger'
import { prisma } from '../lib/prisma'

const router = express.Router()

function getOAuthRole(value: unknown) {
  return value === 'attorney' ? 'attorney' : 'plaintiff'
}

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
  router.get('/google', (req, res, next) => {
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      state: getOAuthRole(req.query.role)
    })(req, res, next)
  })

  router.get('/google/callback', 
    passport.authenticate('google', { failureRedirect: `${frontendUrl}/login?error=oauth_failed` }),
    (req: any, res) => {
      try {
        const user = req.user
        if (!user) {
          return res.redirect(`${frontendUrl}/login?error=oauth_failed`)
        }

        const token = generateToken(user.id)

        const role = getOAuthRole(req.query.state)
        res.redirect(`${frontendUrl}/auth/callback?token=${token}&provider=${user.provider}&role=${role}`)
      } catch (error: any) {
        logger.error('Google OAuth callback error', { error: error.message })
        res.redirect(`${frontendUrl}/login?error=oauth_failed`)
      }
    }
  )
}

// Apple OAuth routes (only if configured)
if (oauthConfig.apple.clientId && oauthConfig.apple.teamId && oauthConfig.apple.keyId && oauthConfig.apple.privateKey) {
  router.get('/apple', (req, res, next) => {
    passport.authenticate('apple', {
      state: getOAuthRole(req.query.role)
    })(req, res, next)
  })

  router.post('/apple/callback',
    passport.authenticate('apple', { failureRedirect: `${frontendUrl}/login?error=oauth_failed` }),
    (req: any, res) => {
      try {
        const user = req.user
        if (!user) {
          return res.redirect(`${frontendUrl}/login?error=oauth_failed`)
        }

        const token = generateToken(user.id)

        const role = getOAuthRole(req.query.state)
        res.redirect(`${frontendUrl}/auth/callback?token=${token}&provider=${user.provider}&role=${role}`)
      } catch (error: any) {
        logger.error('Apple OAuth callback error', { error: error.message })
        res.redirect(`${frontendUrl}/login?error=oauth_failed`)
      }
    }
  )
}

// Microsoft (Entra ID) login — manual OpenID Connect authorization-code flow.
// Implemented with fetch (no extra passport dependency) against the v2 endpoints.
const microsoftConfigured = Boolean(
  oauthConfig.microsoft.clientId && oauthConfig.microsoft.clientSecret
)

function microsoftAuthorizeUrl(state: string) {
  const { clientId, tenant, redirectUri } = oauthConfig.microsoft
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    response_mode: 'query',
    scope: 'openid profile email User.Read',
    state,
  })
  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`
}

async function findOrCreateMicrosoftUser(profile: {
  id: string
  email: string
  firstName: string
  lastName: string
}) {
  let user = await prisma.user.findUnique({ where: { microsoftId: profile.id } })
  if (user) {
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    return user
  }
  user = await prisma.user.findUnique({ where: { email: profile.email } })
  if (user) {
    return prisma.user.update({
      where: { id: user.id },
      data: { microsoftId: profile.id, provider: 'microsoft', lastLoginAt: new Date() },
    })
  }
  return prisma.user.create({
    data: {
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      microsoftId: profile.id,
      provider: 'microsoft',
      emailVerified: true,
      isActive: true,
      lastLoginAt: new Date(),
    },
  })
}

if (microsoftConfigured) {
  router.get('/microsoft', (req, res) => {
    res.redirect(microsoftAuthorizeUrl(getOAuthRole(req.query.role)))
  })

  router.get('/microsoft/callback', async (req, res) => {
    const role = getOAuthRole(req.query.state)
    const failRedirect = `${frontendUrl}/login/${role === 'attorney' ? 'attorney' : 'plaintiff'}?error=oauth_failed`
    try {
      const code = typeof req.query.code === 'string' ? req.query.code : ''
      if (!code) return res.redirect(failRedirect)

      const { clientId, clientSecret, tenant, redirectUri } = oauthConfig.microsoft
      const tokenRes = await fetch(
        `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            scope: 'openid profile email User.Read',
          }).toString(),
        }
      )
      if (!tokenRes.ok) {
        logger.error('Microsoft OAuth token exchange failed', { status: tokenRes.status })
        return res.redirect(failRedirect)
      }
      const tokens: any = await tokenRes.json()

      // Fetch the verified profile from Microsoft Graph using the access token.
      const meRes = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
      if (!meRes.ok) {
        logger.error('Microsoft Graph /me failed', { status: meRes.status })
        return res.redirect(failRedirect)
      }
      const me: any = await meRes.json()
      const email = me.mail || me.userPrincipalName
      if (!email) return res.redirect(failRedirect)

      const user = await findOrCreateMicrosoftUser({
        id: me.id,
        email,
        firstName: me.givenName || '',
        lastName: me.surname || '',
      })

      const token = generateToken(user.id)
      res.redirect(`${frontendUrl}/auth/callback?token=${token}&provider=microsoft&role=${role}`)
    } catch (error: any) {
      logger.error('Microsoft OAuth callback error', { error: error?.message })
      res.redirect(failRedirect)
    }
  })
} else {
  const notConfigured = (_req: express.Request, res: express.Response) =>
    res.status(503).json({
      error: 'Microsoft OAuth not configured',
      message: 'Set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET to enable Microsoft login',
    })
  router.get('/microsoft', notConfigured)
  router.get('/microsoft/callback', notConfigured)
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
    },
    microsoft: {
      configured: microsoftConfigured
    }
  })
})

export default router
