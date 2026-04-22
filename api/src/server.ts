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

const AUDITED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export function createServer(): Express {
  const app = express()
  app.disable('x-powered-by')

  // Minimal health check - before any middleware that could block
  app.get('/health', (req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() })
  })
  
  // Security middleware
  app.use(helmet())
  
  // Rate limiting
  const isProduction = process.env.NODE_ENV === 'production'
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isProduction ? 100 : 1000, // higher limit in dev to avoid blocking local UI
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
    secret: process.env.JWT_SECRET || 'your-secret-key',
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

  app.use(cors({
    origin: (origin, callback) => {
      if (process.env.NODE_ENV === 'production') {
        const allowed = ['https://yourdomain.com']
        return callback(null, !origin || allowed.includes(origin))
      }

      if (!origin) return callback(null, true)
      return callback(null, isDevLocalhost(origin))
    },
    credentials: true
  }))
  
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true }))
  
  // Logging
  app.use(morgan('dev'))
  
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
