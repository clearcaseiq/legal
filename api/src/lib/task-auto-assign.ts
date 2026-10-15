/**
 * Put a named firm employee on every open task that only carries a role.
 *
 * Workflow steps, the Day-1 checklist, readiness checkpoints and the like are
 * created with a role ("paralegal", "case_manager", …) and no person, so the
 * Tasks tab showed "Paralegal (role)" and nobody in particular owned the work.
 * Each such task now goes to someone in the case's firm who holds that role;
 * when nobody does, to the case's attorney.
 *
 * Left alone: client tasks (they are for the plaintiff), Rose's tasks held for
 * review (approval assigns them), and the intake milestones the system
 * completes on its own ("Auto"). Idempotent. Returns how many tasks it assigned.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { resolveCaseAssignees } from './case-coach-loop'

const CLIENT_ROLES = ['client', 'plaintiff']
const PARALEGAL_FAMILY = ['paralegal', 'legal_assistant', 'case_manager', 'demand_writer']
const ATTORNEY_FAMILY = ['attorney', 'firm_admin']
/** Same rows the Tasks tab shows as "Auto". */
const AUTO_INTAKE_TITLES = [
  /confirm signed (retainer|representation)/i,
  /complete conflict check/i,
  /open matter.*conflict check/i,
  /^run conflict check$/i,
  /^send retainer to client$/i,
]

type Member = { userId: string; role: string; name: string }

export function pickAssigneeForRole(
  role: string | null,
  members: Member[],
  attorney: { userId: string | null; name: string | null },
): { userId: string; name: string } | null {
  const key = String(role || '').toLowerCase()
  const byRole = (r: string) => members.find((m) => m.role === r)
  const exact = key ? byRole(key) : undefined
  if (exact) return { userId: exact.userId, name: exact.name }
  if (PARALEGAL_FAMILY.includes(key)) {
    for (const r of PARALEGAL_FAMILY) {
      const m = byRole(r)
      if (m) return { userId: m.userId, name: m.name }
    }
  }
  if (attorney.userId) {
    const member = members.find((m) => m.userId === attorney.userId)
    return { userId: attorney.userId, name: attorney.name || member?.name || 'Attorney' }
  }
  for (const r of ATTORNEY_FAMILY) {
    const m = byRole(r)
    if (m) return { userId: m.userId, name: m.name }
  }
  return null
}

export async function assignRoleOnlyTasks(assessmentId: string): Promise<number> {
  if (!assessmentId) return 0
  const tasks = await prisma.caseTask.findMany({
    where: {
      assessmentId,
      mergedIntoId: null,
      status: { in: ['open', 'in_progress'] },
      assignedUserId: null,
      taskType: { not: 'time_entry' },
      OR: [{ reviewStatus: null }, { reviewStatus: { not: 'pending' } }],
      AND: [{ OR: [{ assignedRole: null }, { assignedRole: { notIn: CLIENT_ROLES } }] }],
    },
    select: { id: true, title: true, assignedRole: true },
  })
  const todo = tasks.filter((t) => !AUTO_INTAKE_TITLES.some((re) => re.test(t.title || '')))
  if (todo.length === 0) return 0

  const assignees = await resolveCaseAssignees(assessmentId).catch(() => null)
  if (!assignees?.lawFirmId && !assignees?.attorneyUserId) return 0

  const rows = assignees.lawFirmId
    ? await prisma.firmMember
        .findMany({
          where: { lawFirmId: assignees.lawFirmId, status: 'active' },
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
          orderBy: { createdAt: 'asc' },
        })
        .catch(() => [])
    : []
  const members: Member[] = (rows as any[]).map((m) => ({
    userId: m.userId as string,
    role: String(m.role || '').toLowerCase(),
    name: [m.user?.firstName, m.user?.lastName].filter(Boolean).join(' ').trim() || m.user?.email || 'Member',
  }))
  const attorney = { userId: assignees.attorneyUserId, name: assignees.attorneyName }

  let assigned = 0
  for (const task of todo) {
    const person = pickAssigneeForRole(task.assignedRole, members, attorney)
    if (!person) continue
    const res = await prisma.caseTask.updateMany({
      where: { id: task.id, assignedUserId: null },
      data: { assignedUserId: person.userId, assignedTo: person.name },
    })
    assigned += res.count
  }
  if (assigned > 0) logger.info('Assigned role-only tasks to firm employees', { assessmentId, assigned })
  return assigned
}
