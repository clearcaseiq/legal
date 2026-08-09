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
import { checkWebBaseUrl } from './lib/app-url'
import { runReadinessProbes } from './lib/ops-status'

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
  // 300/15min was too low for the authenticated dashboard SPA (it fires many
  // endpoints per page load and polls), especially when multiple users share
  // one office/NAT IP. Override with RATE_LIMIT_MAX if needed.
  if (!raw) return isProduction ? 2000 : 5000
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('RATE_LIMIT_MAX must be a positive number')
  }
  return parsed
}

/**
 * Build a persistent (Postgres-backed) session store so sessions survive API
 * restarts and work across multiple processes/instances. Falls back to the
 * default in-memory store in tests or when no database is configured.
 */
function buildSessionStore(): any {
  if (!process.env.DATABASE_URL || process.env.NODE_ENV === 'test') return undefined
  try {
    // Lazy require so the dependency is only loaded when actually used.
    const connectPgSimple = require('connect-pg-simple')
    const PgSession = connectPgSimple(session)
    return new PgSession({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      tableName: 'user_sessions',
    })
  } catch (error) {
    logger.warn('Falling back to in-memory session store', {
      error: error instanceof Error ? error.message : String(error),
    })
    return undefined
  }
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

  // Deep readiness probe. /health answers "is the process alive"; this answers
  // "can it actually serve", which is the question nobody was asking while the
  // API ran for three days against a database missing a column that the
  // generated client selected on every case query. /health stayed green
  // throughout.
  //
  // The probes themselves live in lib/ops-status so the admin System Status
  // page reports on exactly what the container healthcheck acts on.
  app.get('/health/ready', async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store')

    const { ok, probes, failed } = await runReadinessProbes()

    if (!ok) {
      const details = Object.fromEntries(
        probes.filter((p) => !p.ok).map((p) => [p.name, p.error || 'unknown error'])
      )
      // Always log the full reason; the response withholds it in production
      // because this endpoint is publicly reachable via api.clearcaseiq.com.
      logger.error('Readiness probe failed', { failed, details })
      return res.status(503).json({
        ok: false,
        failed,
        ...(isProduction ? {} : { details }),
        timestamp: new Date().toISOString(),
      })
    }

    res.json({ ok: true, timestamp: new Date().toISOString() })
  })

  
  // Security middleware.
  // Allow the web app (separate origin) to load avatar/evidence images from
  // /uploads — Helmet's default Cross-Origin-Resource-Policy: same-origin
  // otherwise blocks those <img> requests (CP-579).
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }))

  // CORS — registered BEFORE the rate limiter on purpose. Otherwise a
  // rate-limited (429) response or a preflight rejection is returned without
  // CORS headers, which the browser surfaces as an opaque "Failed to fetch"
  // instead of a status code the frontend can read and handle.
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
  // Origins explicitly configured via CORS_ORIGINS/WEB_URL are always honored,
  // regardless of NODE_ENV. This lets a self-hosted web app on a real domain
  // (e.g. https://www.clearcaseiq.com) reach an API running in "development"
  // mode without being blocked as a non-localhost origin.
  const configuredOrigins = parseCommaSeparatedEnv(process.env.CORS_ORIGINS || process.env.WEB_URL)

  app.use(cors({
    origin: (origin, callback) => {
      if (isProduction) {
        return callback(null, !origin || productionAllowedOrigins.includes(origin))
      }

      if (!origin) return callback(null, true)
      return callback(null, isDevLocalhost(origin) || configuredOrigins.includes(origin))
    },
    credentials: true
  }))

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: getRateLimitMax(isProduction), // higher default in dev to avoid blocking local UI
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again later.',
    skip: (req) => {
      // Never rate-limit CORS preflight requests: they are automatic browser
      // traffic, counting them doubles consumption, and a rate-limited OPTIONS
      // breaks every subsequent real request for that origin.
      if (req.method === 'OPTIONS') return true
      if (isProduction) return false
      const ip = req.ip || ''
      return ip === '::1' || ip === '127.0.0.1' || ip.startsWith('::ffff:127.0.0.1')
    }
  })
  app.use(limiter)
  
  // Session configuration. A Postgres-backed store is used in real deployments
  // (sessions persist across restarts and scale past one process); tests/local
  // runs without a DB fall back to the default in-memory store.
  const sessionStore = buildSessionStore()
  app.use(session({
    ...(sessionStore ? { store: sessionStore } : {}),
    secret: getSessionSecret(isProduction),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }))

  // Validate the public base URL once the security-critical checks above have
  // run, so a missing session secret or a placeholder CORS origin still reports
  // itself rather than being masked by this one.
  //
  // It belongs at boot regardless: this is the root of every link mailed to a
  // user, and a wrong value raises no error at all — just password resets and
  // booking pages pointing at localhost, found when a customer complains.
  const { baseUrl, warning } = checkWebBaseUrl()
  if (warning) logger.warn(warning)
  logger.info(`Web app base URL: ${baseUrl}`)

  // Initialize Passport
  app.use(passport.initialize())
  app.use(passport.session())

  // Body parsing
  app.use('/v1/payments/stripe-webhook', express.raw({ type: 'application/json' }))
  // E-sign provider webhooks need the raw body for HMAC signature verification.
  app.use('/v1/webhooks/esign', express.raw({ type: '*/*' }))
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
