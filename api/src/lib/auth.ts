import jwt, { type Secret, type SignOptions } from 'jsonwebtoken'
import { Request, Response, NextFunction } from 'express'
import { prisma } from './prisma'
import { logger } from './logger'
import { ENV } from '../env'

export interface AuthRequest extends Request {
  user?: any
}

const JWT_SECRET: Secret = ENV.JWT_SECRET
const JWT_EXPIRES_IN = ENV.JWT_EXPIRES_IN as SignOptions['expiresIn']

function resolveUserRole(email: string): string {
  const adminEmails = ENV.ADMIN_EMAILS?.split(',') || ['admin@caseiq.com']
  return adminEmails.includes(email.toLowerCase()) ? 'admin' : 'user'
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  })
}

export function verifyToken(token: string): { userId: string } {
  return jwt.verify(token, JWT_SECRET) as { userId: string }
}

export async function authMiddleware(
  req: AuthRequest, 
  res: Response, 
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true
      }
    })

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    req.user = {
      ...user,
      role: resolveUserRole(user.email)
    }
    next()
  } catch (error) {
    logger.error('Auth middleware error', { error })
    const detail = error instanceof Error ? error.message : String(error)
    res.status(401).json({ 
      error: 'Invalid token', 
      ...(ENV.NODE_ENV === 'development' ? { detail } : {}) 
    })
  }
}

export function requireRole(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const role = req.user?.role
    if (!role || !roles.includes(role)) {
      return res.status(403).json({ error: 'Insufficient privileges' })
    }
    next()
  }
}

export async function optionalAuthMiddleware(
  req: AuthRequest, 
  res: Response, 
  next: NextFunction
) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next() // No token, but that's ok for optional auth
  }

  // Try to authenticate, but continue without auth if it fails
  try {
    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true
      }
    })

    if (user && user.isActive) {
      req.user = {
        ...user,
        role: resolveUserRole(user.email)
      }
    }
    // If user not found or not active, continue without setting req.user
  } catch (error) {
    // Token invalid or expired, continue without auth
    logger.debug('Optional auth failed, continuing without authentication', { error })
  }
  
  next()
}
