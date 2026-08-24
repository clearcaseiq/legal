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
import { requireSessionForPrivateUploads } from './lib/uploads-access'
import { checkObjectStorageConfig, ensureLocalCopy, isObjectStorageEnabled } from './lib/object-storage'
import { checkEmailProviderConfig } from './lib/claims'
import { checkSmsProviderConfig } from './lib/sms'

const AUDITED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
/**
 * Values that must never sign a production token or session.
 *
 * The list has to include the placeholders this repo actually ships, not just
 * generic ones: the realistic way a bad secret reaches production is someone
 * copying an example env file and filling in the database URL. Every string
 * below appears verbatim in a tracked `.env*.example` or setup script, so any of
 * them reaching production means the signing key is public. `JWT_SECRET` is also
 * the fallback encryption key for stored CMS credentials (see lib/cms/crypto.ts),
 * so the blast radius is wider than sessions.
 *
 * Keep this in step with the example files.
 */
const PLACEHOLDER_SECRETS = new Set([
  'your-secret-key',
  'development-secret',
  'changeme',
  // .env.prod.example
  'replace-with-long-random-secret',
  'replace-with-long-random-session-secret',
  // .env.qa.example
  'generate-a-new-one-do-not-copy-from-prod',
  // api/.env.example and api/env.example
  'your-super-secret-jwt-key-here',
  'your-super-secret-jwt-key-change-this-in-production',
])

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
    // A numeric TRUST_PROXY is a hop count and must reach Express as a Number.
    // Passed as a string, Express treats it as a comma-separated list of trusted
    // IP addresses instead, so a single nginx hop is never trusted: req.ip
    // becomes the proxy's container IP for every request. That collapses the
    // per-IP rate limiters into one shared bucket and locks the whole platform
    // out with "Too many attempts" the moment enough traffic hits /v1/auth.
    // A non-numeric value (e.g. an explicit subnet list) is passed through as-is.
    const rawTrustProxy = process.env.TRUST_PROXY
    const numericTrustProxy = Number(rawTrustProxy)
    app.set('trust proxy', Number.isNaN(numericTrustProxy) ? rawTrustProxy : numericTrustProxy)
  }

  // The API answers on its own hostname (api.clearcaseiq.com), and Search
  // Console has been crawling it — it turned up in the coverage report as a
  // crawled URL. A robots.txt only ever governs the host that serves it, so the
  // one the web app returns says nothing at all about this origin.
  //
  // Disallowing outright is the right call here specifically because the URL is
  // crawled but *not* indexed. The usual objection to blanket-disallow is that a
  // crawler has to be able to fetch a page to read a noindex on it, so blocking
  // an already-indexed URL strands it in the index with no way to remove it —
  // which is why the web app's robots.txt deliberately leaves /login and friends
  // crawlable. Nothing here is indexed, so there is nothing to strand.
  //
  // The header is the belt to that braces: it covers responses a crawler already
  // holds or reaches by following a link from somewhere else.
  app.use((_req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow')
    next()
  })

  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain').send('User-agent: *\nDisallow: /\n')
  })

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
    'http://127.0.0.1:3000',
    'http://localhost:3100',
    'http://127.0.0.1:3100',
  ]
  const isDevLocalhost = (o: string) =>
    !o || devOrigins.includes(o) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)
  // Next.js prints a Network URL (e.g. http://192.168.x.x:3100). Without this,
  // browsers on that origin get opaque "Failed to fetch" / "Unable to reach the
  // server" because CORS omits Access-Control-Allow-Origin.
  const isDevPrivateLan = (o: string) =>
    /^https?:\/\/(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(o)
  const productionAllowedOrigins = isProduction ? getAllowedProductionOrigins() : []
  // Origins explicitly configured via CORS_ORIGINS/WEB_URL are always honored,
  // regardless of NODE_ENV. This lets a self-hosted web app on a real domain
  // (e.g. https://www.clearcaseiq.com) reach an API running in "development"
  // mode without being blocked as a non-localhost origin.
  const configuredOrigins = parseCommaSeparatedEnv(process.env.CORS_ORIGINS || process.env.WEB_URL)

  // Chromium Private Network Access: must run BEFORE cors(). cors ends OPTIONS
  // preflights itself, so a later middleware never sees them. A page on a LAN IP
  // that targets http://localhost:4000 sends Access-Control-Request-Private-Network;
  // without Allow-Private-Network the browser aborts before POST ("Unable to reach
  // the server").
  if (!isProduction) {
    app.use((req, res, next) => {
      if (
        req.method === 'OPTIONS' &&
        String(req.headers['access-control-request-private-network'] || '').toLowerCase() === 'true'
      ) {
        res.setHeader('Access-Control-Allow-Private-Network', 'true')
      }
      next()
    })
  }

  app.use(cors({
    origin: (origin, callback) => {
      if (isProduction) {
        return callback(null, !origin || productionAllowedOrigins.includes(origin))
      }

      if (!origin) return callback(null, true)
      return callback(
        null,
        isDevLocalhost(origin) || isDevPrivateLan(origin) || configuredOrigins.includes(origin),
      )
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

  // Same reasoning as the URL check above: `FILE_BUCKET=s3` without a bucket
  // name produces no error, just uploads that persist to a container filesystem
  // and are gone with the instance.
  checkObjectStorageConfig()

  // And the same again for the outbound channels. An unconfigured email provider
  // is the quietest failure on the platform: every send returns false from a
  // best-effort call site, so nothing surfaces while no user can reset a
  // password. SMS only warns — routing offers still reach attorneys in-app.
  checkEmailProviderConfig()
  checkSmsProviderConfig()

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
  
  // Serve static files from the uploads directory.
  //
  // This used to be an open static mount, so anything ever written under
  // uploads/ was readable by URL alone: medical records and police reports in
  // evidence/, executed retainers and HIPAA authorizations in
  // signed-documents/, and attorney bar credentials in licenses/. The paths are
  // UUID-prefixed, but an unguessable URL is not an authorization check, and
  // `EvidenceFile.accessLevel: 'private'` was never consulted.
  //
  // Avatars stay open because they are rendered with plain <img> tags that
  // cannot carry an Authorization header, and a profile photo is not case data.
  // Everything else is fetched through the API client as a blob (see
  // getEvidenceObjectUrl and downloadEvidenceByUrl), so it already sends a
  // bearer token and only needs the server to start checking it.
  app.use('/uploads', requireSessionForPrivateUploads)

  // Read-through from object storage, between the authorization check and the
  // static handler so a restored file is still subject to the same decision.
  //
  // A replaced instance starts with an empty uploads volume. Without this, every
  // historical evidence file and executed retainer would 404 even though S3 has
  // them. `ensureLocalCopy` is a no-op when the file is already on disk, so the
  // warm path costs one `existsSync`.
  if (isObjectStorageEnabled()) {
    app.use('/uploads', async (req: Request, _res: Response, next: NextFunction) => {
      try {
        let pathname = decodeURIComponent(req.path)
        pathname = pathname.replace(/\\/g, '/')
        if (pathname.includes('..')) return next()
        await ensureLocalCopy(path.join(process.cwd(), 'uploads', pathname))
      } catch {
        // Fall through to the static handler, which answers 404 on its own.
      }
      next()
    })
  }

  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))
  
  return app
}
