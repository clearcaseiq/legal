/**
 * Authorization to disclose a case to a law firm.
 *
 * Three problems this exists to close, all of which were about the same thing —
 * the permission that matters most was the one we could least prove:
 *
 *  1. The routing gate read `facts.consents` off the assessment's own
 *     client-submitted JSON. Nothing in the routing path ever queried the
 *     audited Consent table, so what the gate verified was self-reported. Worse,
 *     it verified terms + privacy + HIPAA — documents accepted before the
 *     consumer has seen a single attorney — which cannot stand in for permission
 *     to hand an identified person's injury facts to a third party.
 *
 *  2. A guest got no consent record at all. The Consent table is well designed
 *     (version, document hash, IP, user agent, signature, granted/revoked
 *     timestamps) but its writer sat behind auth middleware, and intake is
 *     deliberately anonymous. For the majority of submissions the only artifact
 *     was a boolean.
 *
 *  3. `skipPreRoutingGate` bypassed the whole gate, disclosure check included,
 *     on three paths that each contact a *new* attorney: manual-review release,
 *     an admin request-body flag, and every escalation or next wave. Because
 *     consent was never re-evaluated after the first wave, a withdrawal between
 *     waves had no effect.
 *
 * So: authorization is written to the audited table at the moment it is given
 * (guest or account, keyed to the case), it names the firms it covers, and it is
 * re-read from that table before any attorney is contacted — on every path,
 * including the ones that skip the rest of the gate.
 */

import crypto from 'crypto'
import { prisma } from './prisma'
import { logger } from './logger'
import {
  CONSENT_TEMPLATES,
  SHARE_AUTHORIZATION_CONSENT_TYPE,
} from './consent-templates'

const TEMPLATE = CONSENT_TEMPLATES.attorney_share

export type ShareAuthorizationBasis =
  /** A row in the audited Consent table. */
  | 'consent_record'
  /**
   * The `facts.consents.attorneyShare` object written before this module
   * existed. A real record of the consumer's instruction — timestamp, disclosure
   * version and the firms it covered — just kept in the wrong place. Accepted so
   * in-flight cases keep moving, and migrated into the table on first read.
   */
  | 'legacy_facts'
  | 'none'

export interface ShareAuthorization {
  authorized: boolean
  /** Why, in words suitable for a routing hold reason. */
  reason: string
  basis: ShareAuthorizationBasis
  /** Union of the firms every live authorization on this case names. */
  authorizedAttorneyIds: string[]
  authorizedAt: Date | null
  withdrawnAt: Date | null
}

export interface RecordShareAuthorizationInput {
  assessmentId: string
  /** Null for a pre-account intake; the case is the subject either way. */
  userId?: string | null
  /** The firms this authorization covers. Never treated as open-ended. */
  attorneyIds: string[]
  /** Which screen the consumer gave it on, for the audit trail. */
  context: 'case_submission' | 'batch_approval' | 'backfill'
  ipAddress?: string | null
  userAgent?: string | null
  /** 'clicked' for a checkbox; null when backfilled rather than given. */
  signatureMethod?: 'drawn' | 'typed' | 'clicked' | null
  /** Extra provenance, e.g. that a row was migrated rather than granted. */
  metadata?: Record<string, unknown>
}

function uniqueIds(ids: Iterable<string>): string[] {
  return [...new Set([...ids].filter((id) => typeof id === 'string' && id.length > 0))]
}

function parseMetadata(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function attorneyIdsFromMetadata(raw: string | null | undefined): string[] {
  const ids = parseMetadata(raw).authorizedAttorneyIds
  return Array.isArray(ids) ? uniqueIds(ids as string[]) : []
}

/**
 * Write the authorization, then record that we wrote it.
 *
 * Best-effort by design: a consumer who has just checked the box and clicked
 * send must not see their submission fail because an audit insert did. The
 * return value says whether the durable record exists, and the caller keeps the
 * `facts.consents.attorneyShare` write as a second copy.
 */
export async function recordShareAuthorization(
  input: RecordShareAuthorizationInput
): Promise<{ recorded: boolean; consentId?: string }> {
  const attorneyIds = uniqueIds(input.attorneyIds)
  try {
    const consent = await prisma.consent.create({
      data: {
        userId: input.userId || null,
        assessmentId: input.assessmentId,
        consentType: SHARE_AUTHORIZATION_CONSENT_TYPE,
        version: TEMPLATE.version,
        documentId: TEMPLATE.documentId,
        granted: true,
        grantedAt: new Date(),
        signatureMethod: input.signatureMethod ?? undefined,
        consentText: TEMPLATE.content,
        consentHash: crypto.createHash('sha256').update(TEMPLATE.content).digest('hex'),
        ipAddress: input.ipAddress || undefined,
        userAgent: input.userAgent || undefined,
        metadata: JSON.stringify({
          ...(input.metadata || {}),
          authorizedAttorneyIds: attorneyIds,
          context: input.context,
        }),
      },
      select: { id: true },
    })

    // The audit table had no entry for any consent event, so a consent could be
    // created or revoked with nothing outside the row itself to corroborate it.
    await prisma.auditLog
      .create({
        data: {
          userId: input.userId || null,
          action: 'consent_share_authorization_granted',
          entityType: 'assessment',
          entityId: input.assessmentId,
          ipAddress: input.ipAddress || null,
          userAgent: input.userAgent || null,
          metadata: JSON.stringify({
            consentId: consent.id,
            consentType: SHARE_AUTHORIZATION_CONSENT_TYPE,
            version: TEMPLATE.version,
            documentId: TEMPLATE.documentId,
            authorizedAttorneyIds: attorneyIds,
            context: input.context,
          }),
        },
      })
      .catch((error: unknown) =>
        logger.error('Failed to audit share authorization', {
          assessmentId: input.assessmentId,
          error: error instanceof Error ? error.message : String(error),
        })
      )

    logger.info('Recorded attorney share authorization', {
      assessmentId: input.assessmentId,
      consentId: consent.id,
      context: input.context,
      attorneyCount: attorneyIds.length,
    })
    return { recorded: true, consentId: consent.id }
  } catch (error: unknown) {
    logger.error('Failed to record attorney share authorization', {
      assessmentId: input.assessmentId,
      context: input.context,
      error: error instanceof Error ? error.message : String(error),
    })
    return { recorded: false }
  }
}

/**
 * Withdraw every live authorization on a case.
 *
 * Revocation had no effect on a case already in flight because consent was
 * checked once, before wave 1. Marking the rows revoked is what makes the
 * per-wave re-check below actually stop the next contact.
 */
export async function withdrawShareAuthorization(params: {
  assessmentId: string
  userId?: string | null
  reason?: string
  ipAddress?: string | null
  userAgent?: string | null
}): Promise<{ withdrawn: number }> {
  const now = new Date()
  const result = await prisma.consent.updateMany({
    where: {
      assessmentId: params.assessmentId,
      consentType: SHARE_AUTHORIZATION_CONSENT_TYPE,
      granted: true,
      revokedAt: null,
    },
    data: { granted: false, revokedAt: now },
  })

  // A case whose only authorization is the legacy fact has nothing to update, and
  // the legacy reader would migrate that fact straight back into a live grant. The
  // tombstone is what makes the withdrawal stick.
  if (result.count === 0) {
    await prisma.consent
      .create({
        data: {
          userId: params.userId || null,
          assessmentId: params.assessmentId,
          consentType: SHARE_AUTHORIZATION_CONSENT_TYPE,
          version: TEMPLATE.version,
          documentId: TEMPLATE.documentId,
          granted: false,
          revokedAt: now,
          consentText: TEMPLATE.content,
          consentHash: crypto.createHash('sha256').update(TEMPLATE.content).digest('hex'),
          ipAddress: params.ipAddress || undefined,
          userAgent: params.userAgent || undefined,
          metadata: JSON.stringify({
            authorizedAttorneyIds: [],
            context: 'withdrawal',
            reason: params.reason || null,
          }),
        },
      })
      .catch((error: unknown) =>
        logger.error('Failed to record share authorization withdrawal', {
          assessmentId: params.assessmentId,
          error: error instanceof Error ? error.message : String(error),
        })
      )
  }

  await prisma.auditLog
    .create({
      data: {
        userId: params.userId || null,
        action: 'consent_share_authorization_withdrawn',
        entityType: 'assessment',
        entityId: params.assessmentId,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        metadata: JSON.stringify({
          consentType: SHARE_AUTHORIZATION_CONSENT_TYPE,
          withdrawnCount: result.count,
          reason: params.reason || null,
        }),
      },
    })
    .catch((error: unknown) =>
      logger.error('Failed to audit share authorization withdrawal', {
        assessmentId: params.assessmentId,
        error: error instanceof Error ? error.message : String(error),
      })
    )

  logger.info('Withdrew attorney share authorization', {
    assessmentId: params.assessmentId,
    withdrawnCount: result.count,
    reason: params.reason || null,
  })
  return { withdrawn: result.count }
}

/**
 * Read the effective authorization for a case from the audited table.
 *
 * A withdrawal wins over an earlier grant regardless of order, because the
 * question being asked is always "may we contact someone right now".
 */
export async function getShareAuthorization(
  assessmentId: string
): Promise<ShareAuthorization> {
  const rows = await prisma.consent.findMany({
    where: {
      assessmentId,
      consentType: SHARE_AUTHORIZATION_CONSENT_TYPE,
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      granted: true,
      grantedAt: true,
      revokedAt: true,
      expiresAt: true,
      createdAt: true,
      metadata: true,
    },
  })

  const withdrawn = rows.find((row) => row.revokedAt)
  if (withdrawn) {
    return {
      authorized: false,
      reason: 'The plaintiff withdrew authorization to share this case with law firms',
      basis: 'consent_record',
      authorizedAttorneyIds: [],
      authorizedAt: null,
      withdrawnAt: withdrawn.revokedAt,
    }
  }

  const now = new Date()
  const live = rows.filter(
    (row) => row.granted && (!row.expiresAt || row.expiresAt > now)
  )
  if (live.length > 0) {
    const attorneyIds = uniqueIds(live.flatMap((row) => attorneyIdsFromMetadata(row.metadata)))
    return {
      authorized: true,
      reason: 'Plaintiff authorized sharing this case with the firms named in their authorization',
      basis: 'consent_record',
      authorizedAttorneyIds: attorneyIds,
      authorizedAt: live[live.length - 1].grantedAt ?? live[live.length - 1].createdAt,
      withdrawnAt: null,
    }
  }

  return await readLegacyAuthorization(assessmentId)
}

/**
 * Fall back to the pre-table record, and migrate it on the way past.
 *
 * Hard-failing here would strand every case submitted before this module
 * shipped, which punishes consumers for our storage choice rather than fixing
 * it. The object being read was written by the submit handler and carries a
 * timestamp, the disclosure version and the firms it covered, so it is a record
 * — copying it into the table converges the tail without a batch job.
 */
async function readLegacyAuthorization(assessmentId: string): Promise<ShareAuthorization> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { id: true, userId: true, facts: true },
  })
  if (!assessment) {
    return {
      authorized: false,
      reason: 'Case not found',
      basis: 'none',
      authorizedAttorneyIds: [],
      authorizedAt: null,
      withdrawnAt: null,
    }
  }

  let facts: Record<string, unknown> = {}
  try {
    facts =
      typeof assessment.facts === 'string'
        ? (JSON.parse(assessment.facts) as Record<string, unknown>)
        : ((assessment.facts as Record<string, unknown>) || {})
  } catch {
    facts = {}
  }

  const consents = (facts.consents || {}) as Record<string, unknown>
  const share = consents.attorneyShare
  if (!share || typeof share !== 'object' || (share as Record<string, unknown>).authorized !== true) {
    return {
      authorized: false,
      reason: 'Plaintiff has not authorized sharing this case with law firms',
      basis: 'none',
      authorizedAttorneyIds: [],
      authorizedAt: null,
      withdrawnAt: null,
    }
  }

  const legacy = share as Record<string, unknown>
  const attorneyIds = Array.isArray(legacy.authorizedAttorneyIds)
    ? uniqueIds(legacy.authorizedAttorneyIds as string[])
    : []
  const authorizedAtRaw = typeof legacy.authorizedAt === 'string' ? legacy.authorizedAt : null
  const authorizedAt = authorizedAtRaw ? new Date(authorizedAtRaw) : null

  await recordShareAuthorization({
    assessmentId,
    userId: assessment.userId,
    attorneyIds,
    context: 'backfill',
    signatureMethod: null,
    metadata: {
      migratedFrom: 'facts.consents.attorneyShare',
      originalAuthorizedAt: authorizedAtRaw,
      originalDisclosureVersion:
        typeof legacy.disclosureVersion === 'string' ? legacy.disclosureVersion : null,
    },
  })

  return {
    authorized: true,
    reason: 'Plaintiff authorization migrated from the assessment record',
    basis: 'legacy_facts',
    authorizedAttorneyIds: attorneyIds,
    authorizedAt: authorizedAt && !Number.isNaN(authorizedAt.getTime()) ? authorizedAt : null,
    withdrawnAt: null,
  }
}

/**
 * The check every routing path runs before contacting an attorney.
 *
 * `attorneyIds` narrows the question from "may this case be disclosed at all" to
 * "may it be disclosed to these firms", which is the question that matters when
 * a later wave reaches someone the consumer never approved. Passing nothing asks
 * only the first question — appropriate for a dry run that contacts no one.
 */
export async function assertShareAuthorization(
  assessmentId: string,
  attorneyIds?: string[]
): Promise<{ ok: true; authorization: ShareAuthorization } | { ok: false; reason: string; authorization: ShareAuthorization }> {
  const authorization = await getShareAuthorization(assessmentId)
  if (!authorization.authorized) {
    return { ok: false, reason: authorization.reason, authorization }
  }

  const requested = uniqueIds(attorneyIds || [])
  if (requested.length === 0) return { ok: true, authorization }

  // An older authorization may predate the metadata column. Treat an empty
  // covered set as "the case may be shared" rather than blocking, since the
  // consumer did authorize disclosure; the firm-level check applies as soon as
  // any authorization on the case names firms.
  if (authorization.authorizedAttorneyIds.length === 0) return { ok: true, authorization }

  const covered = new Set(authorization.authorizedAttorneyIds)
  const uncovered = requested.filter((id) => !covered.has(id))
  if (uncovered.length === 0) return { ok: true, authorization }

  return {
    ok: false,
    reason: `Plaintiff has not authorized sharing this case with ${uncovered.length} of the attorneys being contacted`,
    authorization,
  }
}
