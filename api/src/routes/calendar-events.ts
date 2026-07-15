import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware, type AuthRequest } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { deliverDirectNotification } from '../lib/platform-notifications'

/**
 * MyCase-style general calendar events for attorneys: optionally linked to a
 * case, can repeat (daily/weekly/monthly), carry reminder offsets, and invite
 * both firm staff and client contacts. Reminders are sent by the appointment
 * engagement sweep; create/update/cancel fire immediate notifications here.
 */

const router = Router()

function webBaseUrl(): string {
  return (
    process.env.APP_URL ||
    process.env.FRONTEND_URL ||
    process.env.WEB_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '')
}

async function getAttorney(req: AuthRequest) {
  if (!req.user?.email) return null
  return prisma.attorney.findFirst({
    where: { email: req.user.email },
    select: { id: true, name: true, email: true, lawFirmId: true },
  })
}

const ROLE_LABELS: Record<string, string> = {
  firm_admin: 'Firm Admin',
  attorney: 'Attorney',
  case_manager: 'Case Manager',
  intake_specialist: 'Intake Specialist',
  paralegal: 'Paralegal',
  billing_admin: 'Billing Admin',
  legal_assistant: 'Legal Assistant',
  demand_writer: 'Demand Writer',
  medical_records: 'Medical Records',
}

const AttendeeInput = z.object({
  kind: z.enum(['staff', 'client']),
  firmMemberId: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  name: z.string().max(200).optional().nullable(),
  attend: z.boolean().optional(),
  share: z.boolean().optional(),
})

const EventInput = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional().nullable(),
  location: z.string().max(500).optional().nullable(),
  assessmentId: z.string().optional().nullable(),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  allDay: z.boolean().optional(),
  repeatFreq: z.enum(['daily', 'weekly', 'monthly']).optional().nullable(),
  repeatUntil: z.string().optional().nullable(),
  reminders: z.array(z.number().int().min(0).max(43200)).max(6).optional(),
  attendees: z.array(AttendeeInput).max(50).optional(),
})

/** Expand a stored event into occurrences overlapping [from, to). */
function expandOccurrences(
  ev: { startAt: Date; endAt: Date; repeatFreq: string | null; repeatUntil: Date | null },
  from: Date,
  to: Date,
): Array<{ start: Date; end: Date; idx: number }> {
  const durationMs = Math.max(ev.endAt.getTime() - ev.startAt.getTime(), 0)
  const out: Array<{ start: Date; end: Date; idx: number }> = []
  if (!ev.repeatFreq) {
    if (ev.startAt.getTime() < to.getTime() && ev.endAt.getTime() > from.getTime()) {
      out.push({ start: ev.startAt, end: ev.endAt, idx: 0 })
    }
    return out
  }
  const until = ev.repeatUntil ? new Date(Math.min(ev.repeatUntil.getTime(), to.getTime())) : to
  const cur = new Date(ev.startAt)
  let idx = 0
  let guard = 0
  while (cur.getTime() <= until.getTime() && guard < 1000) {
    const start = new Date(cur)
    const end = new Date(cur.getTime() + durationMs)
    if (start.getTime() < to.getTime() && end.getTime() > from.getTime()) {
      out.push({ start, end, idx })
    }
    if (ev.repeatFreq === 'daily') cur.setDate(cur.getDate() + 1)
    else if (ev.repeatFreq === 'weekly') cur.setDate(cur.getDate() + 7)
    else if (ev.repeatFreq === 'monthly') cur.setMonth(cur.getMonth() + 1)
    else break
    idx += 1
    guard += 1
  }
  return out
}

function parseReminders(raw: string | null): number[] {
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((n) => typeof n === 'number') : []
  } catch {
    return []
  }
}

function serializeAttendees(
  attendees: Array<{ kind: string; name: string | null; email: string | null; attend: boolean; firmMemberId: string | null }>,
  roleByMember: Map<string, string>,
) {
  return attendees.map((a) => ({
    kind: a.kind,
    name: a.name,
    email: a.email,
    role: a.firmMemberId ? ROLE_LABELS[roleByMember.get(a.firmMemberId) || ''] || null : null,
    attend: a.attend,
  }))
}

// GET /v1/calendar-events?from&to — expanded occurrences for the attorney.
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const attorney = await getAttorney(req)
    if (!attorney) return res.status(404).json({ error: 'Attorney profile not found' })

    const from = new Date(String(req.query.from || ''))
    const to = new Date(String(req.query.to || ''))
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return res.status(400).json({ error: 'from and to are required ISO dates' })
    }

    // Events the attorney owns OR is an invited attendee on. Include repeating
    // events that started before the window (their occurrences may fall inside).
    const events = await prisma.calendarEvent.findMany({
      where: {
        OR: [
          { attorneyId: attorney.id },
          { attendees: { some: { userId: req.user?.id || '__none__' } } },
        ],
        startAt: { lt: to },
      },
      include: { attendees: true },
      orderBy: { startAt: 'asc' },
    })

    // Resolve leadId for case-linked events (for "Open case" deep link).
    const assessmentIds = Array.from(
      new Set(events.map((e) => e.assessmentId).filter((x): x is string => !!x)),
    )
    const leadMap = new Map<string, string>()
    const roleByMember = new Map<string, string>()
    if (assessmentIds.length) {
      const leads = await prisma.leadSubmission.findMany({
        where: { assessmentId: { in: assessmentIds } },
        select: { id: true, assessmentId: true },
      })
      for (const l of leads) if (l.assessmentId) leadMap.set(l.assessmentId, l.id)
    }
    const memberIds = Array.from(
      new Set(
        events.flatMap((e) => e.attendees.map((a) => a.firmMemberId).filter((x): x is string => !!x)),
      ),
    )
    if (memberIds.length) {
      const members = await prisma.firmMember.findMany({
        where: { id: { in: memberIds } },
        select: { id: true, role: true },
      })
      for (const m of members) roleByMember.set(m.id, m.role)
    }

    const out: any[] = []
    for (const ev of events) {
      const reminders = parseReminders(ev.reminders)
      const attendees = serializeAttendees(ev.attendees as any, roleByMember)
      for (const occ of expandOccurrences(ev, from, to)) {
        out.push({
          id: occ.idx === 0 && !ev.repeatFreq ? ev.id : `${ev.id}-${occ.idx}`,
          eventId: ev.id,
          title: ev.title,
          description: ev.description,
          location: ev.location,
          assessmentId: ev.assessmentId,
          leadId: ev.assessmentId ? leadMap.get(ev.assessmentId) || null : null,
          allDay: ev.allDay,
          repeatFreq: ev.repeatFreq,
          repeatUntil: ev.repeatUntil ? ev.repeatUntil.toISOString() : null,
          recurring: !!ev.repeatFreq,
          reminders,
          startAt: occ.start.toISOString(),
          endAt: occ.end.toISOString(),
          attendees,
        })
      }
    }

    res.json({ events: out })
  } catch (error) {
    logger.error('Failed to list calendar events', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /v1/calendar-events/invitees?assessmentId= — staff + client suggestions.
router.get('/invitees', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const attorney = await getAttorney(req)
    if (!attorney) return res.status(404).json({ error: 'Attorney profile not found' })

    const staffRows = attorney.lawFirmId
      ? await prisma.firmMember.findMany({
          where: { lawFirmId: attorney.lawFirmId, status: 'active' },
          select: {
            id: true,
            role: true,
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
            attorney: { select: { id: true, name: true, email: true } },
          },
        })
      : []

    const staff = staffRows.map((m) => {
      const name =
        m.attorney?.name ||
        [m.user?.firstName, m.user?.lastName].filter(Boolean).join(' ') ||
        m.user?.email ||
        'Team member'
      return {
        firmMemberId: m.id,
        userId: m.user?.id || null,
        name,
        email: m.attorney?.email || m.user?.email || null,
        role: m.role,
        roleLabel: ROLE_LABELS[m.role] || m.role,
      }
    })

    let client: { userId: string | null; name: string; email: string | null } | null = null
    const assessmentId = req.query.assessmentId ? String(req.query.assessmentId) : ''
    if (assessmentId) {
      const a = await prisma.assessment.findUnique({
        where: { id: assessmentId },
        select: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
      })
      if (a?.user) {
        client = {
          userId: a.user.id,
          name: [a.user.firstName, a.user.lastName].filter(Boolean).join(' ') || a.user.email || 'Client',
          email: a.user.email || null,
        }
      }
    }

    res.json({ staff, client })
  } catch (error) {
    logger.error('Failed to load event invitees', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

/** Build attendee create rows from validated input. */
function attendeeCreateData(attendees: z.infer<typeof AttendeeInput>[] | undefined) {
  return (attendees || []).map((a) => ({
    kind: a.kind,
    firmMemberId: a.firmMemberId || null,
    userId: a.userId || null,
    email: a.email || null,
    name: a.name || null,
    attend: a.attend ?? false,
    share: a.share ?? true,
  }))
}

/** Notify invited staff (email + in-app) and clients (email w/ portal link). */
async function notifyAttendees(
  event: { id: string; title: string; startAt: Date; assessmentId: string | null },
  attendees: Array<{ kind: string; email: string | null; name: string | null; userId: string | null }>,
  attorneyName: string,
  action: 'created' | 'updated' | 'cancelled',
) {
  const base = webBaseUrl()
  const whenStr = event.startAt.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  const verb = action === 'created' ? 'scheduled' : action === 'updated' ? 'updated' : 'cancelled'
  const subject =
    action === 'cancelled' ? `Cancelled: ${event.title}` : `${action === 'created' ? 'Invitation' : 'Updated'}: ${event.title}`

  for (const a of attendees) {
    if (!a.email) continue
    const who = a.name?.split(' ')[0] || 'there'
    const isClient = a.kind === 'client'
    const link = isClient ? `${base}/dashboard` : `${base}/attorney-dashboard/cases/calendar`
    const message =
      `Hi ${who},\n\n${attorneyName} has ${verb} an event:\n\n` +
      `${event.title}\n${whenStr}\n\n` +
      (action === 'cancelled'
        ? 'This event has been removed from the calendar.\n\n'
        : `View the details here:\n${link}\n\n`) +
      'Best regards,\nClearCaseIQ'
    try {
      await deliverDirectNotification({
        type: 'email',
        recipient: a.email,
        subject,
        message,
        userId: a.userId || null,
        assessmentId: event.assessmentId || null,
        role: isClient ? 'plaintiff' : 'attorney',
        fromName: attorneyName,
        metadata: { eventType: 'calendar_event', action, calendarEventId: event.id, link },
      })
    } catch (err: any) {
      logger.warn('Failed to notify event attendee', { error: err?.message, calendarEventId: event.id })
    }
  }
}

// POST /v1/calendar-events — create an event.
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const attorney = await getAttorney(req)
    if (!attorney) return res.status(404).json({ error: 'Attorney profile not found' })

    const parsed = EventInput.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    }
    const d = parsed.data
    const startAt = new Date(d.startAt)
    const endAt = new Date(d.endAt)
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
      return res.status(400).json({ error: 'End time must be after start time' })
    }

    const event = await prisma.calendarEvent.create({
      data: {
        attorneyId: attorney.id,
        lawFirmId: attorney.lawFirmId || null,
        assessmentId: d.assessmentId || null,
        createdById: req.user?.id || null,
        title: d.title,
        description: d.description || null,
        location: d.location || null,
        startAt,
        endAt,
        allDay: d.allDay ?? false,
        repeatFreq: d.repeatFreq || null,
        repeatUntil: d.repeatUntil ? new Date(d.repeatUntil) : null,
        reminders: d.reminders && d.reminders.length ? JSON.stringify(d.reminders) : null,
        attendees: { create: attendeeCreateData(d.attendees) },
      },
      include: { attendees: true },
    })

    // Fire invites (best-effort; do not block the response on email).
    notifyAttendees(event, event.attendees as any, attorney.name || 'Your attorney', 'created').catch(() => {})

    res.status(201).json({ id: event.id })
  } catch (error) {
    logger.error('Failed to create calendar event', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PATCH /v1/calendar-events/:id — update an event (applies to the whole series).
router.patch('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const attorney = await getAttorney(req)
    if (!attorney) return res.status(404).json({ error: 'Attorney profile not found' })

    const existing = await prisma.calendarEvent.findFirst({
      where: { id: req.params.id, attorneyId: attorney.id },
      select: { id: true },
    })
    if (!existing) return res.status(404).json({ error: 'Event not found' })

    const parsed = EventInput.partial().safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    }
    const d = parsed.data

    const data: Record<string, unknown> = {}
    if (d.title !== undefined) data.title = d.title
    if (d.description !== undefined) data.description = d.description || null
    if (d.location !== undefined) data.location = d.location || null
    if (d.assessmentId !== undefined) data.assessmentId = d.assessmentId || null
    if (d.allDay !== undefined) data.allDay = d.allDay
    if (d.repeatFreq !== undefined) data.repeatFreq = d.repeatFreq || null
    if (d.repeatUntil !== undefined) data.repeatUntil = d.repeatUntil ? new Date(d.repeatUntil) : null
    if (d.reminders !== undefined) data.reminders = d.reminders && d.reminders.length ? JSON.stringify(d.reminders) : null
    if (d.startAt !== undefined) data.startAt = new Date(d.startAt)
    if (d.endAt !== undefined) data.endAt = new Date(d.endAt)

    if (data.startAt && data.endAt && (data.endAt as Date) <= (data.startAt as Date)) {
      return res.status(400).json({ error: 'End time must be after start time' })
    }

    // Replace attendees wholesale when provided.
    const event = await prisma.$transaction(async (tx) => {
      if (d.attendees !== undefined) {
        await tx.calendarEventAttendee.deleteMany({ where: { eventId: existing.id } })
        data.attendees = { create: attendeeCreateData(d.attendees) }
      }
      return tx.calendarEvent.update({
        where: { id: existing.id },
        data,
        include: { attendees: true },
      })
    })

    notifyAttendees(event, event.attendees as any, attorney.name || 'Your attorney', 'updated').catch(() => {})

    res.json({ id: event.id })
  } catch (error) {
    logger.error('Failed to update calendar event', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /v1/calendar-events/:id — delete the event (whole series).
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const attorney = await getAttorney(req)
    if (!attorney) return res.status(404).json({ error: 'Attorney profile not found' })

    const existing = await prisma.calendarEvent.findFirst({
      where: { id: req.params.id, attorneyId: attorney.id },
      include: { attendees: true },
    })
    if (!existing) return res.status(404).json({ error: 'Event not found' })

    await prisma.calendarEvent.delete({ where: { id: existing.id } })

    notifyAttendees(existing, existing.attendees as any, attorney.name || 'Your attorney', 'cancelled').catch(() => {})

    res.json({ ok: true })
  } catch (error) {
    logger.error('Failed to delete calendar event', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
