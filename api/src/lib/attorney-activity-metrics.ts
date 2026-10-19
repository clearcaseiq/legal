/**
 * Per-attorney activity metrics for the platform admin report: engagement,
 * feature usage, value delivered, and the merged access/change timeline.
 *
 * An attorney is the Attorney row; what they did is recorded against their
 * User account(s), matched by email or by a firm membership that links the two.
 * Directory attorneys with no account have no activity and are left out.
 */
import { prisma } from './prisma'

export const STALE_CASE_DAYS = 14
const DAY_MS = 86_400_000
const OPEN_LEAD_STATUSES = ['contacted', 'consulted', 'retained']

/** Minutes of attorney/staff work each platform action stands in for. */
export const MINUTES_SAVED_PER_ACTION = {
  demandsGenerated: 120,
  packagesBuilt: 60,
  packagesEmailed: 10,
  tasksCompleted: 5,
  aiSuggestionsAccepted: 10,
} as const

export type ValueCounts = { [K in keyof typeof MINUTES_SAVED_PER_ACTION]: number } & { demandsSent: number }

export type AttorneyIdentity = {
  attorneyId: string
  name: string
  email: string | null
  lawFirmId: string | null
  lawFirmName: string | null
  userIds: string[]
}

export type EngagementMetrics = {
  lastLoginAt: string | null
  lastSeenAt: string | null
  activeDays7: number
  activeDays30: number
  activeMinutes: number
  leadsReceived: number
  leadsPending: number
  medianLeadResponseHours: number | null
  openCases: number
  staleCases: number
  overdueTasks: number
}

export type AttorneyMetrics = {
  attorney: AttorneyIdentity
  engagement: EngagementMetrics
  value: ValueCounts & { hoursSaved: number }
}

// ---- Pure helpers -------------------------------------------------------------

export function median(values: number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function leadResponseStats(intros: Array<{ requestedAt: Date; respondedAt: Date | null; status: string }>) {
  const hours = intros
    .filter((i) => i.respondedAt)
    .map((i) => Math.max(0, (new Date(i.respondedAt!).getTime() - new Date(i.requestedAt).getTime()) / 3_600_000))
  const med = median(hours)
  return {
    received: intros.length,
    pending: intros.filter((i) => !i.respondedAt && i.status === 'PENDING').length,
    medianHours: med === null ? null : Math.round(med * 10) / 10,
  }
}

/** Open cases with no recorded attorney change in the window (cases newer than the window are not stale yet). */
export function countStaleCases(
  cases: Array<{ assessmentId: string; since: Date }>,
  lastActivity: Map<string, Date>,
  now: Date,
  days = STALE_CASE_DAYS,
): number {
  const cutoff = now.getTime() - days * DAY_MS
  return cases.filter((c) => {
    const last = lastActivity.get(c.assessmentId)
    return (last ? last.getTime() : new Date(c.since).getTime()) < cutoff
  }).length
}

export function hoursSaved(counts: Omit<ValueCounts, 'demandsSent'>): number {
  let minutes = 0
  for (const [k, perAction] of Object.entries(MINUTES_SAVED_PER_ACTION)) {
    minutes += (counts[k as keyof typeof MINUTES_SAVED_PER_ACTION] || 0) * perAction
  }
  return Math.round((minutes / 60) * 10) / 10
}

export function sumCounts(rows: Array<string | null | undefined>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const raw of rows) {
    let parsed: unknown
    try {
      parsed = JSON.parse(raw || '{}')
    } catch {
      continue
    }
    if (!parsed || typeof parsed !== 'object') continue
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) out[k] = (out[k] || 0) + (Number(v) || 0)
  }
  return out
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10)

// ---- Identity -------------------------------------------------------------------

/** Attorneys that have a user account, with every user id their activity may be under. */
export async function resolveAttorneyIdentities(filter: { attorneyId?: string; lawFirmId?: string } = {}): Promise<AttorneyIdentity[]> {
  const attorneys = await prisma.attorney.findMany({
    where: {
      ...(filter.attorneyId ? { id: filter.attorneyId } : {}),
      ...(filter.lawFirmId ? { lawFirmId: filter.lawFirmId } : {}),
    },
    select: { id: true, name: true, email: true, lawFirmId: true, lawFirm: { select: { name: true } } },
  })
  if (!attorneys.length) return []

  const emails = [...new Set(attorneys.map((a) => a.email?.trim().toLowerCase()).filter(Boolean) as string[])]
  const userByEmail = new Map<string, string>()
  for (let i = 0; i < emails.length; i += 500) {
    const chunk = emails.slice(i, i + 500)
    const users = await prisma.user.findMany({
      where: { OR: chunk.map((email) => ({ email: { equals: email, mode: 'insensitive' as const } })) },
      select: { id: true, email: true },
    })
    for (const u of users) userByEmail.set(u.email.toLowerCase(), u.id)
  }
  const members = await (prisma as any).firmMember.findMany({
    where: { attorneyId: { in: attorneys.map((a) => a.id) } },
    select: { attorneyId: true, userId: true },
  })
  const memberUsers = new Map<string, string[]>()
  for (const m of members as Array<{ attorneyId: string; userId: string }>) {
    memberUsers.set(m.attorneyId, [...(memberUsers.get(m.attorneyId) || []), m.userId])
  }

  return attorneys
    .map((a) => {
      const ids = new Set<string>(memberUsers.get(a.id) || [])
      const byEmail = a.email ? userByEmail.get(a.email.trim().toLowerCase()) : undefined
      if (byEmail) ids.add(byEmail)
      return {
        attorneyId: a.id,
        name: a.name,
        email: a.email,
        lawFirmId: a.lawFirmId,
        lawFirmName: a.lawFirm?.name ?? null,
        userIds: [...ids],
      }
    })
    .filter((a) => a.userIds.length > 0)
}

// ---- Metrics --------------------------------------------------------------------

export async function computeAttorneyMetrics(
  identities: AttorneyIdentity[],
  range: { from: Date; to: Date },
  now = new Date(),
): Promise<AttorneyMetrics[]> {
  if (!identities.length) return []
  const userIds = identities.flatMap((a) => a.userIds)
  const attorneyIds = identities.map((a) => a.attorneyId)
  const inRange = { gte: range.from, lte: range.to }
  const from30 = dayKey(new Date(now.getTime() - 29 * DAY_MS))
  const from7 = dayKey(new Date(now.getTime() - 6 * DAY_MS))
  const rangeDays = { gte: dayKey(range.from), lte: dayKey(range.to) }

  const [users, usage, usageInRange, intros, openLeads, demandsMade, demandsSent, built, emailed, taskDone, aiAccepted] =
    await Promise.all([
      prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, lastLoginAt: true, lastSeenAt: true } }),
      prisma.attorneyUsageDaily.findMany({
        where: { userId: { in: userIds }, day: { gte: from30 } },
        select: { userId: true, day: true },
      }),
      prisma.attorneyUsageDaily.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds }, day: rangeDays },
        _sum: { activeMinutes: true },
      }),
      prisma.introduction.findMany({
        where: { attorneyId: { in: attorneyIds }, requestedAt: inRange },
        select: { attorneyId: true, requestedAt: true, respondedAt: true, status: true },
      }),
      prisma.leadSubmission.findMany({
        where: {
          assignedAttorneyId: { in: attorneyIds },
          status: { in: OPEN_LEAD_STATUSES },
          lifecycleState: { not: 'closed' },
        },
        select: { assignedAttorneyId: true, assessmentId: true, createdAt: true },
      }),
      prisma.demandLetter.groupBy({ by: ['createdById'], where: { createdById: { in: userIds }, createdAt: inRange }, _count: { _all: true } }),
      prisma.demandLetter.groupBy({ by: ['createdById'], where: { createdById: { in: userIds }, sentAt: inRange }, _count: { _all: true } }),
      (prisma as any).demandPackage.groupBy({ by: ['requestedById'], where: { requestedById: { in: userIds }, createdAt: inRange }, _count: { _all: true } }),
      (prisma as any).demandPackage.groupBy({ by: ['sentById'], where: { sentById: { in: userIds }, sentAt: inRange }, _count: { _all: true } }),
      prisma.attorneyActivityEvent.groupBy({
        by: ['actorUserId'],
        where: { actorUserId: { in: userIds }, action: 'task_status_changed', properties: { contains: '"to":"done"' }, occurredAt: inRange },
        _count: { _all: true },
      }),
      prisma.attorneyActivityEvent.groupBy({
        by: ['actorUserId'],
        where: { actorUserId: { in: userIds }, action: 'ai_suggestion_accepted', occurredAt: inRange },
        _count: { _all: true },
      }),
    ])

  const openAssessments = openLeads.map((l) => l.assessmentId)
  const [changes, taskEvents, overdue] = await Promise.all([
    openAssessments.length
      ? prisma.caseChangeEvent.groupBy({
          by: ['assessmentId', 'actorId'],
          where: { assessmentId: { in: openAssessments }, actorId: { in: userIds } },
          _max: { createdAt: true },
        })
      : Promise.resolve([] as any[]),
    openAssessments.length
      ? prisma.attorneyActivityEvent.groupBy({
          by: ['assessmentId', 'actorUserId'],
          where: { assessmentId: { in: openAssessments }, actorUserId: { in: userIds }, entityType: 'task' },
          _max: { occurredAt: true },
        })
      : Promise.resolve([] as any[]),
    prisma.caseTask.findMany({
      where: {
        status: { not: 'done' },
        mergedIntoId: null,
        dueDate: { lt: now },
        OR: [
          { assignedUserId: { in: userIds } },
          ...(openAssessments.length ? [{ assignedUserId: null, assessmentId: { in: openAssessments } }] : []),
        ],
      },
      select: { assessmentId: true, assignedUserId: true },
    }),
  ])

  const count = (rows: any[], key: string, ids: string[]) =>
    rows.filter((r) => ids.includes(r[key])).reduce((s, r) => s + (r._count?._all || 0), 0)

  return identities.map((a) => {
    const ids = a.userIds
    const mine = users.filter((u) => ids.includes(u.id))
    const latest = (k: 'lastLoginAt' | 'lastSeenAt') =>
      mine.map((u) => u[k]).filter(Boolean).sort((x, y) => y!.getTime() - x!.getTime())[0]?.toISOString() ?? null
    const days = (since: string) => new Set(usage.filter((u) => ids.includes(u.userId) && u.day >= since).map((u) => u.day)).size

    const leads = openLeads.filter((l) => l.assignedAttorneyId === a.attorneyId)
    const caseIds = new Set(leads.map((l) => l.assessmentId))
    const lastActivity = new Map<string, Date>()
    const bump = (assessmentId: string | null, at: Date | null | undefined) => {
      if (!assessmentId || !at || !caseIds.has(assessmentId)) return
      const prev = lastActivity.get(assessmentId)
      if (!prev || prev < at) lastActivity.set(assessmentId, at)
    }
    for (const c of changes) if (ids.includes(c.actorId)) bump(c.assessmentId, c._max?.createdAt)
    for (const t of taskEvents) if (ids.includes(t.actorUserId)) bump(t.assessmentId, t._max?.occurredAt)

    const response = leadResponseStats(intros.filter((i) => i.attorneyId === a.attorneyId))
    const counts = {
      demandsGenerated: count(demandsMade, 'createdById', ids),
      packagesBuilt: count(built, 'requestedById', ids),
      packagesEmailed: count(emailed, 'sentById', ids),
      tasksCompleted: count(taskDone, 'actorUserId', ids),
      aiSuggestionsAccepted: count(aiAccepted, 'actorUserId', ids),
    }

    return {
      attorney: a,
      engagement: {
        lastLoginAt: latest('lastLoginAt'),
        lastSeenAt: latest('lastSeenAt'),
        activeDays7: days(from7),
        activeDays30: days(from30),
        activeMinutes: usageInRange.filter((u) => ids.includes(u.userId)).reduce((s, u) => s + (u._sum.activeMinutes || 0), 0),
        leadsReceived: response.received,
        leadsPending: response.pending,
        medianLeadResponseHours: response.medianHours,
        openCases: leads.length,
        staleCases: countStaleCases(
          leads.map((l) => ({ assessmentId: l.assessmentId, since: l.createdAt })),
          lastActivity,
          now,
        ),
        overdueTasks: overdue.filter(
          (t) => (t.assignedUserId && ids.includes(t.assignedUserId)) || (!t.assignedUserId && caseIds.has(t.assessmentId)),
        ).length,
      },
      value: { ...counts, demandsSent: count(demandsSent, 'createdById', ids), hoursSaved: hoursSaved(counts) },
    }
  })
}

/** Screen and feature counts plus active minutes per day, for the Usage tab. */
export async function usageBreakdown(userIds: string[], range: { from: Date; to: Date }) {
  const rows = await prisma.attorneyUsageDaily.findMany({
    where: { userId: { in: userIds }, day: { gte: dayKey(range.from), lte: dayKey(range.to) } },
    orderBy: { day: 'asc' },
    select: { day: true, activeMinutes: true, screens: true, features: true },
  })
  const byDay = new Map<string, number>()
  for (const r of rows) byDay.set(r.day, (byDay.get(r.day) || 0) + r.activeMinutes)
  const sorted = (o: Record<string, number>) =>
    Object.entries(o)
      .map(([key, count]) => ({ key, count }))
      .sort((x, y) => y.count - x.count)
  return {
    screens: sorted(sumCounts(rows.map((r) => r.screens))),
    features: sorted(sumCounts(rows.map((r) => r.features))),
    activeMinutesByDay: [...byDay.entries()].map(([day, minutes]) => ({ day, minutes })),
  }
}

// ---- Timeline -------------------------------------------------------------------

export type TimelineKind = 'activity' | 'case_change' | 'document_access' | 'audit'

export type TimelineEntry = {
  id: string
  at: string
  kind: TimelineKind
  action: string
  detail: string | null
  assessmentId: string | null
}

/** Newest first across sources; `before` is exclusive. */
export function mergeTimeline(sources: TimelineEntry[][], limit: number): { entries: TimelineEntry[]; nextBefore: string | null } {
  const all = sources.flat().sort((x, y) => (x.at < y.at ? 1 : x.at > y.at ? -1 : x.id < y.id ? 1 : -1))
  const entries = all.slice(0, limit)
  return { entries, nextBefore: all.length > limit ? entries[entries.length - 1].at : null }
}

function activityDetail(e: { action: string; entityId: string | null; properties: string | null }): string | null {
  if (e.action === 'screen_viewed' || e.action === 'feature_used') return e.entityId
  try {
    const p = JSON.parse(e.properties || '{}')
    if (p.title) return String(p.title)
    if (p.method) return String(p.method)
  } catch {
    /* fall through */
  }
  return null
}

export async function attorneyTimeline(
  identity: AttorneyIdentity,
  opts: { before?: Date; from?: Date; limit?: number; kinds?: TimelineKind[] } = {},
): Promise<{ entries: TimelineEntry[]; nextBefore: string | null }> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 500)
  const kinds = new Set<TimelineKind>(opts.kinds?.length ? opts.kinds : ['activity', 'case_change', 'document_access', 'audit'])
  const ids = identity.userIds
  const at = { ...(opts.before ? { lt: opts.before } : {}), ...(opts.from ? { gte: opts.from } : {}) }
  const take = limit + 1

  const [activity, changes, access, audit] = await Promise.all([
    kinds.has('activity')
      ? prisma.attorneyActivityEvent.findMany({
          where: { actorUserId: { in: ids }, occurredAt: at },
          orderBy: { occurredAt: 'desc' },
          take,
          select: { id: true, occurredAt: true, action: true, entityId: true, properties: true, assessmentId: true },
        })
      : [],
    kinds.has('case_change')
      ? prisma.caseChangeEvent.findMany({
          where: { actorId: { in: ids }, createdAt: at },
          orderBy: { createdAt: 'desc' },
          take,
          select: { id: true, createdAt: true, action: true, summary: true, assessmentId: true },
        })
      : [],
    kinds.has('document_access')
      ? prisma.evidenceAccessLog.findMany({
          where: { accessedBy: { in: [...ids, identity.attorneyId] }, createdAt: at },
          orderBy: { createdAt: 'desc' },
          take,
          select: {
            id: true,
            createdAt: true,
            accessType: true,
            evidenceFile: { select: { originalName: true, assessmentId: true } },
          },
        })
      : [],
    kinds.has('audit')
      ? prisma.auditLog.findMany({
          where: { OR: [{ userId: { in: ids } }, { attorneyId: identity.attorneyId }], createdAt: at },
          orderBy: { createdAt: 'desc' },
          take,
          select: { id: true, createdAt: true, action: true, entityType: true, entityId: true, statusCode: true },
        })
      : [],
  ])

  return mergeTimeline(
    [
      activity.map((e) => ({
        id: `act:${e.id}`,
        at: e.occurredAt.toISOString(),
        kind: 'activity' as const,
        action: e.action,
        detail: activityDetail(e),
        assessmentId: e.assessmentId,
      })),
      changes.map((e) => ({
        id: `chg:${e.id}`,
        at: e.createdAt.toISOString(),
        kind: 'case_change' as const,
        action: e.action,
        detail: e.summary,
        assessmentId: e.assessmentId,
      })),
      access.map((e: any) => ({
        id: `doc:${e.id}`,
        at: e.createdAt.toISOString(),
        kind: 'document_access' as const,
        action: `document_${e.accessType}`,
        detail: e.evidenceFile?.originalName ?? null,
        assessmentId: e.evidenceFile?.assessmentId ?? null,
      })),
      audit.map((e) => ({
        id: `aud:${e.id}`,
        at: e.createdAt.toISOString(),
        kind: 'audit' as const,
        action: e.action,
        detail: [e.entityType, e.entityId, e.statusCode ? `HTTP ${e.statusCode}` : null].filter(Boolean).join(' ') || null,
        assessmentId: e.entityType === 'assessment' ? e.entityId : null,
      })),
    ],
    limit,
  )
}

export function timelineToCsv(entries: TimelineEntry[]): string {
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v)
    // Spreadsheet formula injection guard.
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
  }
  const header = ['time', 'kind', 'action', 'detail', 'assessmentId']
  return [header.join(','), ...entries.map((e) => [e.at, e.kind, e.action, e.detail, e.assessmentId].map(cell).join(','))].join('\n')
}
