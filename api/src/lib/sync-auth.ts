/**
 * Authentication for the external sync API (them → us).
 *
 * CMS connections authenticate us calling them; this authenticates an external
 * system calling ClearCaseIQ to read the canonical record / change feed and to
 * submit write proposals. Each key is firm-scoped: a key only ever sees and
 * touches its own firm's cases. We store only a sha256 of the token — the
 * plaintext is shown exactly once, at creation.
 */
import { createHash, randomBytes } from 'crypto'
import type { NextFunction, Request, Response } from 'express'
import { prisma } from './prisma'
import { logger } from './logger'

const TOKEN_PREFIX = 'ccsk'

export const SYNC_SCOPES = ['cases:read', 'changes:read', 'proposals:write', 'export:read'] as const
export type SyncScope = (typeof SYNC_SCOPES)[number]
const LEGACY_SCOPES: SyncScope[] = ['cases:read', 'changes:read', 'proposals:write']

export interface SyncRequest extends Request {
  syncFirmId?: string
  syncKeyId?: string
  syncKeyScopes?: SyncScope[]
}

export function hashSyncToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Mint a token. Returns the one-time plaintext plus the stored (hashed) parts. */
export function generateSyncToken(): { token: string; prefix: string; tokenHash: string } {
  const prefix = randomBytes(4).toString('hex') // 8 chars, visible identifier
  const secret = randomBytes(24).toString('hex')
  const token = `${TOKEN_PREFIX}_${prefix}_${secret}`
  return { token, prefix, tokenHash: hashSyncToken(token) }
}

export async function createSyncApiKey(args: {
  lawFirmId: string
  name: string
  createdByUserId?: string | null
  scopes: SyncScope[]
  expiresAt: Date
}, client: Pick<typeof prisma, 'syncApiKey'> = prisma): Promise<{
  token: string
  record: { id: string; prefix: string; name: string; scopes: string | null; expiresAt: Date | null; createdAt: Date }
}> {
  const { token, prefix, tokenHash } = generateSyncToken()
  const record = await client.syncApiKey.create({
    data: {
      lawFirmId: args.lawFirmId,
      name: args.name,
      prefix,
      tokenHash,
      scopes: JSON.stringify(args.scopes),
      expiresAt: args.expiresAt,
      createdByUserId: args.createdByUserId ?? null,
    },
    select: { id: true, prefix: true, name: true, scopes: true, expiresAt: true, createdAt: true },
  })
  return { token, record }
}

export function parseSyncScopes(raw: string | null | undefined): SyncScope[] {
  if (!raw) return [...LEGACY_SCOPES]
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value): value is SyncScope =>
      typeof value === 'string' && (SYNC_SCOPES as readonly string[]).includes(value),
    )
  } catch {
    return []
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization
  if (header && header.toLowerCase().startsWith('bearer ')) return header.slice(7).trim()
  const apiKey = req.headers['x-api-key']
  if (typeof apiKey === 'string' && apiKey) return apiKey.trim()
  return null
}

/** Express guard: require a valid, un-revoked sync key; scopes req to its firm. */
export async function syncKeyAuth(req: SyncRequest, res: Response, next: NextFunction): Promise<void> {
  const token = extractToken(req)
  if (!token) {
    res.status(401).json({ error: 'Missing API key' })
    return
  }
  const key = await prisma.syncApiKey.findUnique({
    where: { tokenHash: hashSyncToken(token) },
    select: { id: true, lawFirmId: true, revokedAt: true, expiresAt: true, scopes: true },
  })
  if (!key || key.revokedAt || (key.expiresAt && key.expiresAt <= new Date())) {
    res.status(401).json({ error: 'Invalid, expired, or revoked API key' })
    return
  }
  req.syncFirmId = key.lawFirmId
  req.syncKeyId = key.id
  req.syncKeyScopes = parseSyncScopes(key.scopes)
  // Best-effort last-used stamp; never block the request on it.
  prisma.syncApiKey
    .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
    .catch((error) => logger.warn('Failed to stamp sync key lastUsedAt', { keyId: key.id, error }))
  next()
}

export function requireSyncScope(scope: SyncScope) {
  return (req: SyncRequest, res: Response, next: NextFunction): void => {
    if (!req.syncKeyScopes?.includes(scope)) {
      res.status(403).json({ error: 'API key does not have the required scope', required_scope: scope })
      return
    }
    next()
  }
}
