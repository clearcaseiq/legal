/**
 * Solo-attorney firms: when a firm has exactly one attorney-role member,
 * CaseTasks with no person assignee default to that attorney so work is never
 * left as role-only / unassigned on a one-lawyer desk.
 */
import { prisma } from './prisma'
import { ATTORNEY_FIRM_ROLES } from './firm-roles'
import { logger } from './logger'

export type SoleFirmAttorney = {
  userId: string
  name: string
  role: string
  lawFirmId: string
}

/** Active/invited attorney-desk members (firm_admin + attorney). */
export async function findSoleFirmAttorney(
  lawFirmId: string | null | undefined,
): Promise<SoleFirmAttorney | null> {
  if (!lawFirmId) return null
  const members = await (prisma as any).firmMember
    .findMany({
      where: {
        lawFirmId,
        status: { in: ['active', 'invited'] },
        role: { in: [...ATTORNEY_FIRM_ROLES] },
        userId: { not: null },
      },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    })
    .catch(() => [])

  if (!Array.isArray(members) || members.length !== 1) return null
  const m = members[0]
  const userId = String(m.userId || m.user?.id || '')
  if (!userId) return null
  const name =
    [m.user?.firstName, m.user?.lastName].filter(Boolean).join(' ').trim() ||
    m.user?.email ||
    'Attorney'
  return { userId, name, role: String(m.role || 'attorney'), lawFirmId }
}

export async function resolveLawFirmIdForAssessment(
  assessmentId: string | null | undefined,
): Promise<string | null> {
  if (!assessmentId) return null
  const assessment = await prisma.assessment
    .findUnique({ where: { id: assessmentId }, select: { lawFirmId: true } })
    .catch(() => null)
  if (assessment?.lawFirmId) return assessment.lawFirmId

  // Fall back to the assigned attorney's firm when the assessment stamp is empty.
  const lead = await prisma.leadSubmission
    .findFirst({
      where: { assessmentId },
      select: { assignedAttorney: { select: { lawFirmId: true } } },
      orderBy: { createdAt: 'desc' },
    })
    .catch(() => null)
  return lead?.assignedAttorney?.lawFirmId || null
}

export async function findSoleAttorneyForAssessment(
  assessmentId: string | null | undefined,
): Promise<SoleFirmAttorney | null> {
  const lawFirmId = await resolveLawFirmIdForAssessment(assessmentId)
  return findSoleFirmAttorney(lawFirmId)
}

/** Roles that mean "any attorney desk" — safe to auto-fill with the sole attorney. */
const SOLE_ATTORNEY_FILL_ROLES = new Set(['', 'attorney', 'firm_admin', 'lead_attorney'])

/**
 * Fill assignee fields when none is set and the firm has a single attorney.
 * Never overrides an explicit person, a client (plaintiff) assignment, or a
 * staff role from the workflow (paralegal / case manager / etc.) — those stay
 * role-only so Tasks / Edit details match Workflow's "Paralegal (role)" labels.
 */
export function applySoleAttorneyAssignee<T extends {
  assignedUserId?: string | null
  assignedTo?: string | null
  assignedRole?: string | null
}>(fields: T, sole: SoleFirmAttorney | null): T {
  if (!sole) return fields
  if (fields.assignedUserId) return fields
  const role = String(fields.assignedRole || '').trim().toLowerCase()
  if (role === 'client' || role === 'plaintiff') return fields
  if (!SOLE_ATTORNEY_FILL_ROLES.has(role)) return fields
  return {
    ...fields,
    assignedUserId: sole.userId,
    assignedTo: sole.name,
    assignedRole: role || sole.role || 'attorney',
  }
}

/**
 * Backfill open, non-client tasks that still have no assignedUserId.
 * Idempotent; safe to call from the case tasks list.
 */
export async function ensureSoleAttorneyTaskAssignments(
  assessmentId: string,
): Promise<number> {
  const sole = await findSoleAttorneyForAssessment(assessmentId)
  if (!sole) return 0

  const open = await prisma.caseTask
    .findMany({
      where: {
        assessmentId,
        mergedIntoId: null,
        status: { not: 'done' },
        assignedUserId: null,
      },
      select: { id: true, assignedRole: true },
    })
    .catch(() => [] as Array<{ id: string; assignedRole: string | null }>)

  const targets = open.filter((t) => {
    const role = String(t.assignedRole || '').trim().toLowerCase()
    if (role === 'client' || role === 'plaintiff') return false
    // Leave staff-role workflow steps role-only (match Workflow tab labels).
    return SOLE_ATTORNEY_FILL_ROLES.has(role)
  })
  if (!targets.length) return 0

  await prisma.caseTask.updateMany({
    where: { id: { in: targets.map((t) => t.id) } },
    data: {
      assignedUserId: sole.userId,
      assignedTo: sole.name,
      assignedRole: 'attorney',
    },
  })

  logger.info('Auto-assigned tasks to sole firm attorney', {
    assessmentId,
    lawFirmId: sole.lawFirmId,
    userId: sole.userId,
    count: targets.length,
  })
  return targets.length
}
