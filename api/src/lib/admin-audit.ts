import { prisma } from './prisma'
import { logger } from './logger'

type AuditActor = {
  id?: string | null
  email?: string | null
}

type AuditRequest = {
  user?: AuditActor
  ip?: string
  originalUrl?: string
  method?: string
  headers?: Record<string, unknown>
}

export type AdminAuditInput = {
  action: string
  entityType: string
  entityId?: string | null
  statusCode?: number
  metadata?: Record<string, unknown>
}

/**
 * Record an admin action in the audit trail.
 *
 * Deliberately never throws: this used to live in routes/admin.ts and was
 * awaited bare, so a failed audit insert turned a successful admin mutation
 * into a 500 and the caller retried an action that had already applied. Losing
 * an audit row is bad, but it is strictly better than corrupting the operation
 * being audited, so failures are logged and swallowed.
 */
export async function writeAdminAudit(req: AuditRequest, input: AdminAuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId || null,
        ipAddress: req.ip,
        userAgent: (req.headers?.['user-agent'] as string | undefined) || null,
        statusCode: input.statusCode || 200,
        metadata: JSON.stringify({
          ...(input.metadata || {}),
          actorEmail: req.user?.email || null,
          path: req.originalUrl,
          method: req.method,
        }),
      },
    })
  } catch (error) {
    logger.error('Failed to write admin audit entry', {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
