/**
 * Self-service privacy rights for claimants: a copy of their data, and
 * deletion of their account. The Privacy Policy promises both (CCPA/CPRA right
 * to know, to a copy, and to delete).
 *
 * Deletion is not a cascade delete of the User row. Assessment, ChatRoom,
 * Appointment and EvidenceFile all cascade from User, so that would erase case
 * records a law firm is now working from, and the CCPA's own exceptions
 * (completing the service the consumer asked for, legal obligations) cover
 * keeping them. Instead:
 *
 *  - cases never shared with any firm are deleted outright;
 *  - cases already shared keep their record, but every authorization on them is
 *    withdrawn so no further firm is contacted;
 *  - the account itself is stripped of identity and contact details, disabled,
 *    and signed out everywhere;
 *  - admins are told, without PII, so stored files and retained records are
 *    reviewed inside the statutory response window.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { notifyAdmins } from './platform-notifications'
import { withdrawShareAuthorization } from './share-authorization'
import { SMS_CONSENT_TYPE } from './sms-consent'
import { optOutKey } from './sms-opt-out'

export const SELF_SERVICE_DELETION_ROLES = new Set(['client', 'plaintiff'])

const EXPORT_ROW_LIMIT = 5000

/** Credentials and internal secrets never leave in an export. */
const REDACTED_FIELD = /password|secret|token|hash|mfa|recovery|sessionVersion/i

function redact<T>(value: T): T {
  if (Array.isArray(value)) return value.map(redact) as T
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out: Record<string, unknown> = {}
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (REDACTED_FIELD.test(key)) continue
      out[key] = redact(v)
    }
    return out as T
  }
  return value
}

/** JSON columns are stored as strings; parse them so the export is readable. */
function parseJsonColumns<T>(row: T): T {
  if (!row || typeof row !== 'object') return row
  const out: Record<string, unknown> = { ...(row as Record<string, unknown>) }
  for (const [key, value] of Object.entries(out)) {
    if (typeof value === 'string' && /^[[{]/.test(value.trim())) {
      try {
        out[key] = JSON.parse(value)
      } catch {
        // Not JSON after all; keep the string.
      }
    }
  }
  return out as T
}

/**
 * The person's own records. An explicit list rather than every model with a
 * user relation: several of those (tasks assigned to staff, specialist case
 * interactions, blog authorship) are work items about other people.
 */
export async function buildAccountExport(userId: string) {
  const db = prisma as any
  const take = EXPORT_ROW_LIMIT
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) return null

  const byUser = { where: { userId }, take }
  const [
    assessments,
    evidenceFiles,
    consents,
    appointments,
    chatRooms,
    notifications,
    favoriteAttorneys,
    attorneyReviews,
    supportTickets,
    intakeLeads,
    chatBotSessions,
    auditLog,
  ] = await Promise.all([
    db.assessment.findMany(byUser),
    db.evidenceFile.findMany(byUser),
    db.consent.findMany(byUser),
    db.appointment.findMany(byUser),
    db.chatRoom.findMany({ ...byUser, include: { messages: { take, orderBy: { createdAt: 'asc' } } } }),
    db.notification.findMany(byUser),
    db.favoriteAttorney.findMany(byUser),
    db.attorneyReview.findMany(byUser),
    db.supportTicket.findMany(byUser),
    db.intakeLead.findMany(byUser),
    db.chatBotSession.findMany(byUser),
    db.auditLog.findMany({ ...byUser, orderBy: { createdAt: 'desc' } }),
  ])

  return redact({
    exportedAt: new Date().toISOString(),
    format: 'clearcaseiq-account-export-v1',
    note:
      'Uploaded documents are listed with their details; download the files themselves from your case dashboard. Credentials and security secrets are not included.',
    account: user,
    assessments: assessments.map(parseJsonColumns),
    evidenceFiles: evidenceFiles.map(parseJsonColumns),
    consents: consents.map(parseJsonColumns),
    appointments,
    conversations: chatRooms,
    notifications,
    favoriteAttorneys,
    attorneyReviews,
    supportTickets,
    intakeLeads: intakeLeads.map(parseJsonColumns),
    assistantSessions: chatBotSessions.map(parseJsonColumns),
    activityLog: auditLog.map(parseJsonColumns),
  })
}

export type AccountDeletionResult = {
  deletedAssessments: number
  retainedAssessments: number
}

export async function deleteClaimantAccount(
  userId: string,
  meta: { ipAddress?: string | null; userAgent?: string | null } = {},
): Promise<AccountDeletionResult> {
  const db = prisma as any
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, phone: true } })
  if (!user) throw new Error('User not found')

  const assessments: Array<{ id: string }> = await db.assessment.findMany({
    where: { userId },
    select: { id: true },
  })
  const ids = assessments.map((a) => a.id)

  // "Shared" means a firm was offered it or holds it; either way a firm has
  // seen it and may be relying on it.
  const [introduced, submitted] = ids.length
    ? await Promise.all([
        db.introduction.findMany({ where: { assessmentId: { in: ids } }, select: { assessmentId: true } }),
        db.leadSubmission.findMany({ where: { assessmentId: { in: ids } }, select: { assessmentId: true } }),
      ])
    : [[], []]
  const shared = new Set<string>([...introduced, ...submitted].map((r: { assessmentId: string }) => r.assessmentId))
  const unshared = ids.filter((id) => !shared.has(id))

  for (const assessmentId of shared) {
    await withdrawShareAuthorization({
      assessmentId,
      userId,
      reason: 'account_deleted',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    })
  }

  if (unshared.length) {
    await db.assessment.deleteMany({ where: { id: { in: unshared }, userId } })
  }

  const phoneKey = optOutKey(user.phone)
  const now = new Date()
  await db.$transaction([
    db.notification.deleteMany({ where: { userId } }),
    db.favoriteAttorney.deleteMany({ where: { userId } }),
    db.userTourProgress.deleteMany({ where: { userId } }),
    db.featureToggle.deleteMany({ where: { userId } }),
    db.attorneyPushDevice.deleteMany({ where: { userId } }),
    db.chatBotSession.deleteMany({ where: { userId } }),
    db.passwordResetToken.deleteMany({ where: { userId } }),
    db.emailVerificationToken.deleteMany({ where: { userId } }),
    db.consent.updateMany({
      where: {
        consentType: SMS_CONSENT_TYPE,
        revokedAt: null,
        OR: [{ userId }, ...(phoneKey ? [{ phone: phoneKey }] : [])],
      },
      data: { granted: false, revokedAt: now },
    }),
    db.user.update({
      where: { id: userId },
      data: {
        email: `deleted-${userId}@deleted.clearcaseiq.invalid`,
        firstName: 'Deleted',
        lastName: 'User',
        phone: null,
        addressLine1: null,
        addressLine2: null,
        city: null,
        state: null,
        postalCode: null,
        passwordHash: null,
        googleId: null,
        appleId: null,
        microsoftId: null,
        avatar: null,
        emailVerified: false,
        isActive: false,
        mfaSecret: null,
        mfaPendingSecret: null,
        mfaRecoveryCodes: null,
        mfaEnabledAt: null,
        sessionVersion: { increment: 1 },
      },
    }),
  ])

  const result = { deletedAssessments: unshared.length, retainedAssessments: shared.size }

  await db.auditLog
    .create({
      data: {
        userId,
        action: 'account_deleted',
        entityType: 'user',
        entityId: userId,
        ipAddress: meta.ipAddress || null,
        userAgent: meta.userAgent || null,
        metadata: JSON.stringify({ ...result, retainedAssessmentIds: [...shared] }),
      },
    })
    .catch((error: unknown) => logger.error('Failed to audit account deletion', { error, userId }))

  await notifyAdmins({
    subject: 'Account deletion request completed',
    message:
      `A claimant deleted their account (user ${userId}). ${result.deletedAssessments} unshared case(s) were deleted; ` +
      `${result.retainedAssessments} case(s) already shared with a firm were kept with all authorizations withdrawn. ` +
      'Review the retained cases and remove stored files for the deleted ones within the CCPA response window (45 days).',
    metadata: { userId, ...result, retainedAssessmentIds: [...shared] },
  }).catch((error: unknown) => logger.error('Failed to notify admins of account deletion', { error, userId }))

  logger.info('Claimant account deleted', { userId, ...result })
  return result
}
