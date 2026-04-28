import express, { type Express, type NextFunction, type Request, type Response } from 'express'
import cors from 'cors'
import morgan from 'morgan'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import session from 'express-session'
import passport from 'passport'
import crypto from 'crypto'
import path from 'path'
import { prisma } from './lib/prisma'
import { logger } from './lib/logger'

const AUDITED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const PLACEHOLDER_SECRETS = new Set(['your-secret-key', 'development-secret', 'changeme'])

function parseCommaSeparatedEnv(value: string | undefined) {
  return (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function getSessionSecret(isProduction: boolean) {
  const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET
  if (isProduction && (!secret || PLACEHOLDER_SECRETS.has(secret))) {
    throw new Error('SESSION_SECRET or JWT_SECRET must be configured with a non-placeholder value in production')
  }
  return secret || 'development-secret'
}

function getAllowedProductionOrigins() {
  const origins = parseCommaSeparatedEnv(process.env.CORS_ORIGINS || process.env.WEB_URL)
  if (origins.length === 0) {
    throw new Error('CORS_ORIGINS or WEB_URL must be configured in production')
  }
  if (origins.some((origin) => origin === 'https://yourdomain.com')) {
    throw new Error('CORS_ORIGINS contains the placeholder https://yourdomain.com')
  }
  return origins
}

function getRateLimitMax(isProduction: boolean) {
  const raw = process.env.RATE_LIMIT_MAX
  if (!raw) return isProduction ? 300 : 1000
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('RATE_LIMIT_MAX must be a positive number')
  }
  return parsed
}

export function createServer(): Express {
  const app = express()
  app.disable('x-powered-by')
  const isProduction = process.env.NODE_ENV === 'production'

  if (process.env.TRUST_PROXY) {
    app.set('trust proxy', process.env.TRUST_PROXY)
  }

  // Minimal health check - before any middleware that could block
  app.get('/health', (req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() })
  })
  
  // Security middleware
  app.use(helmet())
  
  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: getRateLimitMax(isProduction), // higher default in dev to avoid blocking local UI
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again later.',
    skip: (req) => {
      if (isProduction) return false
      const ip = req.ip || ''
      return ip === '::1' || ip === '127.0.0.1' || ip.startsWith('::ffff:127.0.0.1')
    }
  })
  app.use(limiter)
  
  // Session configuration
  app.use(session({
    secret: getSessionSecret(isProduction),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }))

  // Initialize Passport
  app.use(passport.initialize())
  app.use(passport.session())

  // CORS and parsing
  const devOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5175',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ]
  const isDevLocalhost = (o: string) =>
    !o || devOrigins.includes(o) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)
  const productionAllowedOrigins = isProduction ? getAllowedProductionOrigins() : []

  app.use(cors({
    origin: (origin, callback) => {
      if (isProduction) {
        return callback(null, !origin || productionAllowedOrigins.includes(origin))
      }

      if (!origin) return callback(null, true)
      return callback(null, isDevLocalhost(origin))
    },
    credentials: true
  }))
  
  app.use('/v1/payments/stripe-webhook', express.raw({ type: 'application/json' }))
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true }))
  
  // Logging
  app.use(morgan(isProduction ? 'combined' : 'dev', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }))
  
  // Request ID middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = crypto.randomUUID()
    ;(req as any).id = requestId
    res.setHeader('X-Request-ID', requestId)
    next()
  })

  // Audit logging
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
      if (!req.originalUrl.startsWith('/v1')) return
      if (!AUDITED_METHODS.has(req.method) && res.statusCode < 400) return

      const actor = (req as any).user
      const requestId = (req as any).id ?? null

      void prisma.auditLog.create({
        data: {
          userId: actor?.id || null,
          attorneyId: actor?.attorneyId || null,
          action: `${req.method} ${req.originalUrl}`,
          statusCode: res.statusCode,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] || null,
          metadata: JSON.stringify({
            requestId,
          }),
        },
      }).catch((error: any) => {
        // Never block responses on audit persistence.
        console.warn('Audit log write failed', error?.message || error)
      })
    })
    next()
  })
  
  // Serve static files from uploads directory
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))
  
  return app
}
