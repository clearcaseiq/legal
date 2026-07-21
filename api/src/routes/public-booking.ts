import { Router } from 'express'
import { z } from 'zod'
import crypto from 'crypto'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { computeBookableSlots } from '../lib/booking-slots'
import { createExternalCalendarEvent, deleteExternalCalendarEvent } from '../lib/calendar-sync'
import { createZoomMeeting } from '../lib/zoom'
import { notifyAppointmentEvent } from '../lib/appointment-engagement'
import { notifyAttorneyInApp } from '../lib/case-notifications'
import { ATTORNEY_EVENTS } from '../lib/notification-events'

function webBaseUrl(): string {
  return (
    process.env.APP_URL ||
    process.env.FRONTEND_URL ||
    process.env.WEB_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '')
}

function manageUrlFor(token: string): string {
  return `${webBaseUrl()}/booking/manage/${token}`
}

/**
 * Public, unauthenticated "Calendly-style" booking API. Visitors reach it via a
 * shared link (/book/:slug) — no account required. It exposes the attorney's
 * bookable event types, computes open slots, and creates a confirmed
 * appointment (with Zoom + calendar wiring reused from the in-app flow).
 */

const router = Router()

const DEFAULT_TZ = 'America/Los_Angeles'
const MAX_RANGE_DAYS = 62

function busyBlocksToBusy(blocks: Array<{ startTime: Date; endTime: Date }>) {
  return blocks.map((b) => ({
    scheduledAt: b.startTime,
    duration: Math.max(1, Math.round((b.endTime.getTime() - b.startTime.getTime()) / 60000)),
  }))
}

async function loadAttorney(slug: string) {
  return prisma.attorney.findFirst({
    where: { bookingSlug: slug, isActive: true },
    select: {
      id: true,
      name: true,
      schedulingTimezone: true,
      lawFirm: { select: { name: true } },
    },
  })
}

// GET /v1/public/booking/:slug — attorney public profile + active event types.
router.get('/:slug', async (req, res) => {
  try {
    const attorney = await loadAttorney(req.params.slug)
    if (!attorney) return res.status(404).json({ error: 'Booking page not found' })

    const eventTypes = await prisma.attorneyEventType.findMany({
      where: { attorneyId: attorney.id, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        durationMinutes: true,
        locationType: true,
        color: true,
      },
    })

    res.json({
      attorney: {
        name: attorney.name,
        firmName: attorney.lawFirm?.name || null,
        timezone: attorney.schedulingTimezone || DEFAULT_TZ,
      },
      eventTypes,
    })
  } catch (error) {
    logger.error('Failed to load public booking page', { error, slug: req.params.slug })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /v1/public/booking/:slug/:eventSlug/slots?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/:slug/:eventSlug/slots', async (req, res) => {
  try {
    const attorney = await loadAttorney(req.params.slug)
    if (!attorney) return res.status(404).json({ error: 'Booking page not found' })

    const eventType = await prisma.attorneyEventType.findFirst({
      where: { attorneyId: attorney.id, slug: req.params.eventSlug, isActive: true },
    })
    if (!eventType) return res.status(404).json({ error: 'Meeting type not found' })

    const from = String(req.query.from || '')
    const to = String(req.query.to || '')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return res.status(400).json({ error: 'from and to (YYYY-MM-DD) are required' })
    }
    const spanDays = (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86400000
    if (spanDays < 0 || spanDays > MAX_RANGE_DAYS) {
      return res.status(400).json({ error: `Range must be between 0 and ${MAX_RANGE_DAYS} days` })
    }

    const timezone = attorney.schedulingTimezone || DEFAULT_TZ

    // Pad the DB query by a day on each side to cover timezone offsets.
    const rangeStart = new Date(`${from}T00:00:00Z`)
    rangeStart.setUTCDate(rangeStart.getUTCDate() - 1)
    const rangeEnd = new Date(`${to}T23:59:59Z`)
    rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 1)

    const [availability, appointments, busyBlocks] = await Promise.all([
      prisma.attorneyAvailability.findMany({ where: { attorneyId: attorney.id } }),
      prisma.appointment.findMany({
        where: {
          attorneyId: attorney.id,
          scheduledAt: { gte: rangeStart, lte: rangeEnd },
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
        },
        select: { scheduledAt: true, duration: true },
      }),
      prisma.attorneyCalendarBusyBlock.findMany({
        where: { attorneyId: attorney.id, startTime: { lt: rangeEnd }, endTime: { gt: rangeStart } },
        select: { startTime: true, endTime: true },
      }),
    ])

    const slots = computeBookableSlots({
      timezone,
      from,
      to,
      durationMinutes: eventType.durationMinutes,
      bufferBeforeMinutes: eventType.bufferBeforeMinutes,
      bufferAfterMinutes: eventType.bufferAfterMinutes,
      minNoticeMinutes: eventType.minNoticeMinutes,
      availability,
      busy: [...appointments, ...busyBlocksToBusy(busyBlocks)],
    })

    res.json({ timezone, durationMinutes: eventType.durationMinutes, slots })
  } catch (error) {
    logger.error('Failed to compute public booking slots', { error, slug: req.params.slug })
    res.status(500).json({ error: 'Internal server error' })
  }
})

const BookingCreate = z.object({
  start: z.string().datetime(),
  name: z.string().min(1).max(160),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  notes: z.string().max(2000).optional(),
})

// POST /v1/public/booking/:slug/:eventSlug — create a confirmed booking.
router.post('/:slug/:eventSlug', async (req, res) => {
  try {
    const attorney = await loadAttorney(req.params.slug)
    if (!attorney) return res.status(404).json({ error: 'Booking page not found' })

    const eventType = await prisma.attorneyEventType.findFirst({
      where: { attorneyId: attorney.id, slug: req.params.eventSlug, isActive: true },
    })
    if (!eventType) return res.status(404).json({ error: 'Meeting type not found' })

    const parsed = BookingCreate.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    }

    const { start, name, email, phone, notes } = parsed.data
    const startDate = new Date(start)
    const timezone = attorney.schedulingTimezone || DEFAULT_TZ

    // Re-validate the requested slot against a fresh availability computation so
    // two visitors can't grab the same time (and slugged times can't be forged).
    const dayBefore = new Date(startDate)
    dayBefore.setUTCDate(dayBefore.getUTCDate() - 1)
    const dayAfter = new Date(startDate)
    dayAfter.setUTCDate(dayAfter.getUTCDate() + 1)
    const iso = (d: Date) => d.toISOString().slice(0, 10)

    const rangeStart = new Date(dayBefore)
    rangeStart.setUTCHours(0, 0, 0, 0)
    const rangeEnd = new Date(dayAfter)
    rangeEnd.setUTCHours(23, 59, 59, 999)

    const [availability, appointments, busyBlocks] = await Promise.all([
      prisma.attorneyAvailability.findMany({ where: { attorneyId: attorney.id } }),
      prisma.appointment.findMany({
        where: {
          attorneyId: attorney.id,
          scheduledAt: { gte: rangeStart, lte: rangeEnd },
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
        },
        select: { scheduledAt: true, duration: true },
      }),
      prisma.attorneyCalendarBusyBlock.findMany({
        where: { attorneyId: attorney.id, startTime: { lt: rangeEnd }, endTime: { gt: rangeStart } },
        select: { startTime: true, endTime: true },
      }),
    ])

    const validSlots = computeBookableSlots({
      timezone,
      from: iso(dayBefore),
      to: iso(dayAfter),
      durationMinutes: eventType.durationMinutes,
      bufferBeforeMinutes: eventType.bufferBeforeMinutes,
      bufferAfterMinutes: eventType.bufferAfterMinutes,
      minNoticeMinutes: eventType.minNoticeMinutes,
      availability,
      busy: [...appointments, ...busyBlocksToBusy(busyBlocks)],
    })

    if (!validSlots.includes(startDate.toISOString())) {
      return res.status(409).json({ error: 'That time is no longer available. Please pick another slot.' })
    }

    // Provision (or reuse) a lightweight passwordless account for the booker.
    const normalizedEmail = email.trim().toLowerCase()
    const [firstName, ...rest] = name.trim().split(/\s+/)
    const lastName = rest.join(' ') || '—'
    const user = await prisma.user.upsert({
      where: { email: normalizedEmail },
      update: {},
      create: {
        email: normalizedEmail,
        firstName: firstName || 'Guest',
        lastName,
        phone: phone || null,
        isActive: true,
        emailVerified: false,
      },
      select: { id: true },
    })

    const type = eventType.locationType // 'video' | 'phone' | 'in_person'
    const manageToken = crypto.randomBytes(24).toString('hex')
    const appointment = await prisma.appointment.create({
      data: {
        userId: user.id,
        attorneyId: attorney.id,
        type,
        scheduledAt: startDate,
        duration: eventType.durationMinutes,
        notes: notes || null,
        location: type === 'in_person' ? eventType.location || null : null,
        phoneNumber: type === 'phone' ? phone || eventType.location || null : null,
        status: 'SCHEDULED',
        manageToken,
        eventTypeId: eventType.id,
      },
      select: { id: true, scheduledAt: true, duration: true },
    })

    logger.info('Public booking created', {
      appointmentId: appointment.id,
      attorneyId: attorney.id,
      eventTypeId: eventType.id,
    })

    // Confirmation emails to booker + attorney (reuses in-app appointment flow).
    notifyAppointmentEvent({
      appointmentId: appointment.id,
      userId: user.id,
      attorneyId: attorney.id,
      type: 'scheduled',
      scheduledAt: appointment.scheduledAt,
    }).catch((err) => logger.warn('Booking confirmation email failed', { err, appointmentId: appointment.id }))

    // Video meeting (Zoom preferred, calendar-provider fallback below).
    let resolvedMeetingUrl: string | null = null
    if (type === 'video') {
      try {
        const zoom = await createZoomMeeting({
          attorneyId: attorney.id,
          topic: `ClearCaseIQ — ${eventType.name}`,
          start: appointment.scheduledAt,
          durationMinutes: appointment.duration,
          agenda: `Booked via public scheduling link by ${name}.`,
        })
        if (zoom) {
          resolvedMeetingUrl = zoom.joinUrl
          await prisma.appointment.update({
            where: { id: appointment.id },
            data: {
              meetingUrl: zoom.joinUrl,
              hostMeetingUrl: zoom.startUrl,
              externalCalendarProvider: 'zoom',
              externalCalendarSyncedAt: new Date(),
            },
          })
        }
      } catch (err) {
        logger.warn('Zoom creation failed for public booking', { err, appointmentId: appointment.id })
      }
    }

    try {
      const externalEvent = await createExternalCalendarEvent({
        attorneyId: attorney.id,
        title: `ClearCaseIQ — ${eventType.name} (${name})`,
        start: appointment.scheduledAt,
        end: new Date(appointment.scheduledAt.getTime() + appointment.duration * 60000),
        description: `Booked via public scheduling link.\nName: ${name}\nEmail: ${normalizedEmail}${phone ? `\nPhone: ${phone}` : ''}${notes ? `\nNotes: ${notes}` : ''}`,
        createVideoLink: type === 'video' && !resolvedMeetingUrl,
      })
      if (externalEvent) {
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: {
            externalCalendarProvider: externalEvent.provider,
            externalCalendarEventId: externalEvent.externalEventId,
            externalCalendarSyncedAt: new Date(),
            ...(externalEvent.meetingUrl && !resolvedMeetingUrl
              ? { meetingUrl: externalEvent.meetingUrl }
              : {}),
          },
        })
        if (externalEvent.meetingUrl && !resolvedMeetingUrl) resolvedMeetingUrl = externalEvent.meetingUrl
      }
    } catch (err) {
      logger.warn('Calendar event failed for public booking', { err, appointmentId: appointment.id })
    }

    // Attorney's in-app notification bell.
    try {
      const whenLabel = appointment.scheduledAt.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: timezone,
        timeZoneName: 'short',
      })
      await notifyAttorneyInApp({
        attorneyId: attorney.id,
        assessmentId: null,
        eventType: ATTORNEY_EVENTS.consult_scheduled,
        subject: 'New booking',
        body: `${name} booked "${eventType.name}" for ${whenLabel}.`,
      })
    } catch (err) {
      logger.warn('Attorney booking notification failed', { err, appointmentId: appointment.id })
    }

    res.status(201).json({
      ok: true,
      appointmentId: appointment.id,
      scheduledAt: appointment.scheduledAt,
      durationMinutes: appointment.duration,
      locationType: type,
      meetingUrl: resolvedMeetingUrl,
      timezone,
      manageToken,
      manageUrl: manageUrlFor(manageToken),
    })
  } catch (error) {
    logger.error('Failed to create public booking', { error, slug: req.params.slug })
    res.status(500).json({ error: 'Internal server error' })
  }
})

/* -------------------------------------------------------------------------- */
/* Team ("round-robin") booking                                               */
/* -------------------------------------------------------------------------- */

type TeamMember = {
  attorneyId: string
  sortOrder: number
  timezone: string
  name: string
}

async function loadTeamLink(firmSlug: string, linkSlug: string) {
  const firm = await prisma.lawFirm.findUnique({ where: { slug: firmSlug }, select: { id: true, name: true } })
  if (!firm) return null
  const link = await (prisma as any).firmBookingLink.findFirst({
    where: { lawFirmId: firm.id, slug: linkSlug, isActive: true },
    include: {
      members: {
        orderBy: { sortOrder: 'asc' },
        include: { attorney: { select: { id: true, name: true, schedulingTimezone: true, isActive: true } } },
      },
    },
  })
  if (!link) return null
  const members: TeamMember[] = (link.members || [])
    .filter((m: any) => m.attorney?.isActive)
    .map((m: any) => ({
      attorneyId: m.attorneyId,
      sortOrder: m.sortOrder,
      timezone: m.attorney?.schedulingTimezone || DEFAULT_TZ,
      name: m.attorney?.name || 'Attorney',
    }))
  return { firm, link, members }
}

// Bookable slot instants for one attorney over a date range.
async function attorneyBookableSet(params: {
  attorneyId: string
  timezone: string
  from: string
  to: string
  durationMinutes: number
  bufferBeforeMinutes: number
  bufferAfterMinutes: number
  minNoticeMinutes: number
  rangeStart: Date
  rangeEnd: Date
}): Promise<string[]> {
  const [availability, appointments, busyBlocks] = await Promise.all([
    prisma.attorneyAvailability.findMany({ where: { attorneyId: params.attorneyId } }),
    prisma.appointment.findMany({
      where: {
        attorneyId: params.attorneyId,
        scheduledAt: { gte: params.rangeStart, lte: params.rangeEnd },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
      select: { scheduledAt: true, duration: true },
    }),
    prisma.attorneyCalendarBusyBlock.findMany({
      where: { attorneyId: params.attorneyId, startTime: { lt: params.rangeEnd }, endTime: { gt: params.rangeStart } },
      select: { startTime: true, endTime: true },
    }),
  ])
  return computeBookableSlots({
    timezone: params.timezone,
    from: params.from,
    to: params.to,
    durationMinutes: params.durationMinutes,
    bufferBeforeMinutes: params.bufferBeforeMinutes,
    bufferAfterMinutes: params.bufferAfterMinutes,
    minNoticeMinutes: params.minNoticeMinutes,
    availability,
    busy: [...appointments, ...busyBlocksToBusy(busyBlocks)],
  })
}

// GET /v1/public/booking/team/:firmSlug/:linkSlug — team link profile.
router.get('/team/:firmSlug/:linkSlug', async (req, res) => {
  try {
    const loaded = await loadTeamLink(req.params.firmSlug, req.params.linkSlug)
    if (!loaded) return res.status(404).json({ error: 'Booking page not found' })
    const { firm, link, members } = loaded
    res.json({
      firmName: firm.name,
      event: {
        name: link.name,
        description: link.description,
        durationMinutes: link.durationMinutes,
        locationType: link.locationType,
      },
      memberCount: members.length,
      timezone: members[0]?.timezone || DEFAULT_TZ,
    })
  } catch (error) {
    logger.error('Failed to load team booking page', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /v1/public/booking/team/:firmSlug/:linkSlug/slots — union of members' slots.
router.get('/team/:firmSlug/:linkSlug/slots', async (req, res) => {
  try {
    const loaded = await loadTeamLink(req.params.firmSlug, req.params.linkSlug)
    if (!loaded) return res.status(404).json({ error: 'Booking page not found' })
    const { link, members } = loaded

    const from = String(req.query.from || '')
    const to = String(req.query.to || '')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return res.status(400).json({ error: 'from and to (YYYY-MM-DD) are required' })
    }
    const spanDays = (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86400000
    if (spanDays < 0 || spanDays > MAX_RANGE_DAYS) {
      return res.status(400).json({ error: `Range must be between 0 and ${MAX_RANGE_DAYS} days` })
    }

    const rangeStart = new Date(`${from}T00:00:00Z`)
    rangeStart.setUTCDate(rangeStart.getUTCDate() - 1)
    const rangeEnd = new Date(`${to}T23:59:59Z`)
    rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 1)

    const union = new Set<string>()
    for (const member of members) {
      const slots = await attorneyBookableSet({
        attorneyId: member.attorneyId,
        timezone: member.timezone,
        from,
        to,
        durationMinutes: link.durationMinutes,
        bufferBeforeMinutes: link.bufferBeforeMinutes,
        bufferAfterMinutes: link.bufferAfterMinutes,
        minNoticeMinutes: link.minNoticeMinutes,
        rangeStart,
        rangeEnd,
      })
      for (const s of slots) union.add(s)
    }

    res.json({
      timezone: members[0]?.timezone || DEFAULT_TZ,
      durationMinutes: link.durationMinutes,
      slots: Array.from(union).sort(),
    })
  } catch (error) {
    logger.error('Failed to compute team slots', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /v1/public/booking/team/:firmSlug/:linkSlug — assign an attorney + book.
router.post('/team/:firmSlug/:linkSlug', async (req, res) => {
  try {
    const loaded = await loadTeamLink(req.params.firmSlug, req.params.linkSlug)
    if (!loaded) return res.status(404).json({ error: 'Booking page not found' })
    const { link, members } = loaded
    if (members.length === 0) return res.status(409).json({ error: 'No attorneys are available for this link.' })

    const parsed = BookingCreate.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    }
    const { start, name, email, phone, notes } = parsed.data
    const startDate = new Date(start)

    // Range around the requested time for per-member availability checks.
    const dayBefore = new Date(startDate)
    dayBefore.setUTCDate(dayBefore.getUTCDate() - 1)
    const dayAfter = new Date(startDate)
    dayAfter.setUTCDate(dayAfter.getUTCDate() + 1)
    const isoDay = (d: Date) => d.toISOString().slice(0, 10)
    const rangeStart = new Date(dayBefore)
    rangeStart.setUTCHours(0, 0, 0, 0)
    const rangeEnd = new Date(dayAfter)
    rangeEnd.setUTCHours(23, 59, 59, 999)

    // Which members are actually free at the requested instant?
    const freeMemberIds = new Set<string>()
    for (const member of members) {
      const slots = await attorneyBookableSet({
        attorneyId: member.attorneyId,
        timezone: member.timezone,
        from: isoDay(dayBefore),
        to: isoDay(dayAfter),
        durationMinutes: link.durationMinutes,
        bufferBeforeMinutes: link.bufferBeforeMinutes,
        bufferAfterMinutes: link.bufferAfterMinutes,
        minNoticeMinutes: link.minNoticeMinutes,
        rangeStart,
        rangeEnd,
      })
      if (slots.includes(startDate.toISOString())) freeMemberIds.add(member.attorneyId)
    }

    if (freeMemberIds.size === 0) {
      return res.status(409).json({ error: 'That time is no longer available. Please pick another slot.' })
    }

    // Choose an attorney. Round-robin rotates from the last-assigned cursor;
    // first-available takes the earliest in the configured order.
    const ordered = [...members].sort((a, b) => a.sortOrder - b.sortOrder)
    let chosen: TeamMember | undefined
    if (link.assignmentStrategy === 'round_robin' && link.lastAssignedAttorneyId) {
      const lastIdx = ordered.findIndex((m) => m.attorneyId === link.lastAssignedAttorneyId)
      for (let i = 1; i <= ordered.length; i += 1) {
        const cand = ordered[(lastIdx + i) % ordered.length]
        if (freeMemberIds.has(cand.attorneyId)) {
          chosen = cand
          break
        }
      }
    }
    if (!chosen) chosen = ordered.find((m) => freeMemberIds.has(m.attorneyId))
    if (!chosen) return res.status(409).json({ error: 'That time is no longer available. Please pick another slot.' })

    // Provision the booker.
    const normalizedEmail = email.trim().toLowerCase()
    const [firstName, ...rest] = name.trim().split(/\s+/)
    const user = await prisma.user.upsert({
      where: { email: normalizedEmail },
      update: {},
      create: {
        email: normalizedEmail,
        firstName: firstName || 'Guest',
        lastName: rest.join(' ') || '—',
        phone: phone || null,
        isActive: true,
        emailVerified: false,
      },
      select: { id: true },
    })

    const type = link.locationType as 'video' | 'phone' | 'in_person'
    const manageToken = crypto.randomBytes(24).toString('hex')
    const appointment = await prisma.appointment.create({
      data: {
        userId: user.id,
        attorneyId: chosen.attorneyId,
        type,
        scheduledAt: startDate,
        duration: link.durationMinutes,
        notes: notes || null,
        location: type === 'in_person' ? link.location || null : null,
        phoneNumber: type === 'phone' ? phone || link.location || null : null,
        status: 'SCHEDULED',
        manageToken,
      },
      select: { id: true, scheduledAt: true, duration: true },
    })

    await (prisma as any).firmBookingLink.update({
      where: { id: link.id },
      data: { lastAssignedAttorneyId: chosen.attorneyId },
    })

    logger.info('Team booking created', { appointmentId: appointment.id, attorneyId: chosen.attorneyId, linkId: link.id })

    notifyAppointmentEvent({
      appointmentId: appointment.id,
      userId: user.id,
      attorneyId: chosen.attorneyId,
      type: 'scheduled',
      scheduledAt: appointment.scheduledAt,
    }).catch(() => {})

    let resolvedMeetingUrl: string | null = null
    if (type === 'video') {
      try {
        const zoom = await createZoomMeeting({
          attorneyId: chosen.attorneyId,
          topic: `ClearCaseIQ — ${link.name}`,
          start: appointment.scheduledAt,
          durationMinutes: appointment.duration,
          agenda: `Booked via team scheduling link by ${name}.`,
        })
        if (zoom) {
          resolvedMeetingUrl = zoom.joinUrl
          await prisma.appointment.update({
            where: { id: appointment.id },
            data: {
              meetingUrl: zoom.joinUrl,
              hostMeetingUrl: zoom.startUrl,
              externalCalendarProvider: 'zoom',
              externalCalendarSyncedAt: new Date(),
            },
          })
        }
      } catch (err) {
        logger.warn('Zoom creation failed for team booking', { err, appointmentId: appointment.id })
      }
    }

    try {
      const externalEvent = await createExternalCalendarEvent({
        attorneyId: chosen.attorneyId,
        title: `ClearCaseIQ — ${link.name} (${name})`,
        start: appointment.scheduledAt,
        end: new Date(appointment.scheduledAt.getTime() + appointment.duration * 60000),
        description: `Booked via team scheduling link.\nName: ${name}\nEmail: ${normalizedEmail}${phone ? `\nPhone: ${phone}` : ''}${notes ? `\nNotes: ${notes}` : ''}`,
        createVideoLink: type === 'video' && !resolvedMeetingUrl,
      })
      if (externalEvent) {
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: {
            externalCalendarProvider: externalEvent.provider,
            externalCalendarEventId: externalEvent.externalEventId,
            externalCalendarSyncedAt: new Date(),
            ...(externalEvent.meetingUrl && !resolvedMeetingUrl ? { meetingUrl: externalEvent.meetingUrl } : {}),
          },
        })
        if (externalEvent.meetingUrl && !resolvedMeetingUrl) resolvedMeetingUrl = externalEvent.meetingUrl
      }
    } catch (err) {
      logger.warn('Calendar event failed for team booking', { err, appointmentId: appointment.id })
    }

    try {
      const whenLabel = appointment.scheduledAt.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: chosen.timezone || DEFAULT_TZ,
        timeZoneName: 'short',
      })
      await notifyAttorneyInApp({
        attorneyId: chosen.attorneyId,
        assessmentId: null,
        eventType: ATTORNEY_EVENTS.consult_scheduled,
        subject: 'New booking',
        body: `${name} booked "${link.name}" for ${whenLabel} (team link).`,
      })
    } catch (err) {
      logger.warn('Attorney team booking notification failed', { err, appointmentId: appointment.id })
    }

    res.status(201).json({
      ok: true,
      appointmentId: appointment.id,
      scheduledAt: appointment.scheduledAt,
      durationMinutes: appointment.duration,
      locationType: type,
      attorneyName: chosen.name,
      meetingUrl: resolvedMeetingUrl,
      manageToken,
      manageUrl: manageUrlFor(manageToken),
    })
  } catch (error) {
    logger.error('Failed to create team booking', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

/* -------------------------------------------------------------------------- */
/* Self-service manage (reschedule / cancel) via opaque token                 */
/* -------------------------------------------------------------------------- */

async function loadManaged(token: string) {
  const appointment = await prisma.appointment.findFirst({
    where: { manageToken: token },
    select: {
      id: true,
      attorneyId: true,
      scheduledAt: true,
      duration: true,
      status: true,
      type: true,
      location: true,
      meetingUrl: true,
      eventTypeId: true,
      externalCalendarProvider: true,
      externalCalendarEventId: true,
      userId: true,
      attorney: {
        select: { name: true, bookingSlug: true, schedulingTimezone: true, lawFirm: { select: { name: true } } },
      },
    },
  })
  if (!appointment) return null
  const eventType = appointment.eventTypeId
    ? await prisma.attorneyEventType.findUnique({ where: { id: appointment.eventTypeId } })
    : null
  return { appointment, eventType }
}

// GET /v1/public/booking/manage/:token — details for the manage page.
router.get('/manage/:token', async (req, res) => {
  try {
    const managed = await loadManaged(req.params.token)
    if (!managed) return res.status(404).json({ error: 'Booking not found' })
    const { appointment, eventType } = managed
    res.json({
      status: appointment.status,
      scheduledAt: appointment.scheduledAt,
      durationMinutes: appointment.duration,
      locationType: appointment.type,
      location: appointment.location,
      meetingUrl: appointment.meetingUrl,
      timezone: appointment.attorney.schedulingTimezone || DEFAULT_TZ,
      attorney: { name: appointment.attorney.name, firmName: appointment.attorney.lawFirm?.name || null },
      eventName: eventType?.name || 'Consultation',
      // Enough for the client to reuse the public slot picker for reschedule.
      bookingSlug: appointment.attorney.bookingSlug,
      eventSlug: eventType?.slug || null,
    })
  } catch (error) {
    logger.error('Failed to load managed booking', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /v1/public/booking/manage/:token/cancel
router.post('/manage/:token/cancel', async (req, res) => {
  try {
    const managed = await loadManaged(req.params.token)
    if (!managed) return res.status(404).json({ error: 'Booking not found' })
    const { appointment } = managed

    if (appointment.status === 'CANCELLED') return res.json({ ok: true, status: 'CANCELLED' })
    if (appointment.status === 'COMPLETED') {
      return res.status(409).json({ error: 'This consultation has already taken place.' })
    }

    await prisma.appointment.update({ where: { id: appointment.id }, data: { status: 'CANCELLED' } })

    deleteExternalCalendarEvent({
      attorneyId: appointment.attorneyId,
      provider: appointment.externalCalendarProvider,
      eventId: appointment.externalCalendarEventId,
    }).catch((err) => logger.warn('Calendar delete on cancel failed', { err, appointmentId: appointment.id }))

    notifyAppointmentEvent({
      appointmentId: appointment.id,
      userId: appointment.userId,
      attorneyId: appointment.attorneyId,
      type: 'cancelled',
      scheduledAt: appointment.scheduledAt,
    }).catch(() => {})

    notifyAttorneyInApp({
      attorneyId: appointment.attorneyId,
      eventType: ATTORNEY_EVENTS.consult_scheduled,
      subject: 'Booking cancelled',
      body: `A booking for ${appointment.scheduledAt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: appointment.attorney?.schedulingTimezone || DEFAULT_TZ, timeZoneName: 'short' })} was cancelled.`,
    }).catch(() => {})

    res.json({ ok: true, status: 'CANCELLED' })
  } catch (error) {
    logger.error('Failed to cancel managed booking', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

const RescheduleInput = z.object({ start: z.string().datetime() })

// POST /v1/public/booking/manage/:token/reschedule
router.post('/manage/:token/reschedule', async (req, res) => {
  try {
    const managed = await loadManaged(req.params.token)
    if (!managed) return res.status(404).json({ error: 'Booking not found' })
    const { appointment, eventType } = managed

    if (appointment.status === 'CANCELLED' || appointment.status === 'COMPLETED') {
      return res.status(409).json({ error: 'This booking can no longer be changed.' })
    }

    const parsed = RescheduleInput.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'A valid start time is required' })

    const startDate = new Date(parsed.data.start)
    const timezone = appointment.attorney.schedulingTimezone || DEFAULT_TZ
    const durationMinutes = eventType?.durationMinutes ?? appointment.duration

    // Validate the new slot, excluding THIS appointment from the busy set so the
    // holder can move freely (including near their current time).
    const dayBefore = new Date(startDate)
    dayBefore.setUTCDate(dayBefore.getUTCDate() - 1)
    const dayAfter = new Date(startDate)
    dayAfter.setUTCDate(dayAfter.getUTCDate() + 1)
    const iso = (d: Date) => d.toISOString().slice(0, 10)
    const rangeStart = new Date(dayBefore)
    rangeStart.setUTCHours(0, 0, 0, 0)
    const rangeEnd = new Date(dayAfter)
    rangeEnd.setUTCHours(23, 59, 59, 999)

    const [availability, appointments, busyBlocks] = await Promise.all([
      prisma.attorneyAvailability.findMany({ where: { attorneyId: appointment.attorneyId } }),
      prisma.appointment.findMany({
        where: {
          attorneyId: appointment.attorneyId,
          id: { not: appointment.id },
          scheduledAt: { gte: rangeStart, lte: rangeEnd },
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
        },
        select: { scheduledAt: true, duration: true },
      }),
      prisma.attorneyCalendarBusyBlock.findMany({
        where: { attorneyId: appointment.attorneyId, startTime: { lt: rangeEnd }, endTime: { gt: rangeStart } },
        select: { startTime: true, endTime: true },
      }),
    ])

    const validSlots = computeBookableSlots({
      timezone,
      from: iso(dayBefore),
      to: iso(dayAfter),
      durationMinutes,
      bufferBeforeMinutes: eventType?.bufferBeforeMinutes ?? 0,
      bufferAfterMinutes: eventType?.bufferAfterMinutes ?? 0,
      minNoticeMinutes: eventType?.minNoticeMinutes ?? 0,
      availability,
      busy: [...appointments, ...busyBlocksToBusy(busyBlocks)],
    })

    if (!validSlots.includes(startDate.toISOString())) {
      return res.status(409).json({ error: 'That time is not available. Please pick another slot.' })
    }

    // Move the old calendar event out of the way, then place a fresh one.
    deleteExternalCalendarEvent({
      attorneyId: appointment.attorneyId,
      provider: appointment.externalCalendarProvider,
      eventId: appointment.externalCalendarEventId,
    }).catch(() => {})

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        scheduledAt: startDate,
        externalCalendarProvider: null,
        externalCalendarEventId: null,
        externalCalendarSyncedAt: null,
      },
    })

    try {
      const externalEvent = await createExternalCalendarEvent({
        attorneyId: appointment.attorneyId,
        title: `ClearCaseIQ — ${eventType?.name || 'Consultation'}`,
        start: startDate,
        end: new Date(startDate.getTime() + durationMinutes * 60000),
        description: 'Rescheduled via public scheduling link.',
        createVideoLink: appointment.type === 'video' && !appointment.meetingUrl,
      })
      if (externalEvent) {
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: {
            externalCalendarProvider: externalEvent.provider,
            externalCalendarEventId: externalEvent.externalEventId,
            externalCalendarSyncedAt: new Date(),
            ...(externalEvent.meetingUrl && !appointment.meetingUrl ? { meetingUrl: externalEvent.meetingUrl } : {}),
          },
        })
      }
    } catch (err) {
      logger.warn('Calendar recreate on reschedule failed', { err, appointmentId: appointment.id })
    }

    notifyAppointmentEvent({
      appointmentId: appointment.id,
      userId: appointment.userId,
      attorneyId: appointment.attorneyId,
      type: 'rescheduled',
      scheduledAt: startDate,
    }).catch(() => {})

    notifyAttorneyInApp({
      attorneyId: appointment.attorneyId,
      eventType: ATTORNEY_EVENTS.consult_scheduled,
      subject: 'Booking rescheduled',
      body: `A booking moved to ${startDate.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: timezone, timeZoneName: 'short' })}.`,
    }).catch(() => {})

    res.json({ ok: true, status: 'SCHEDULED', scheduledAt: startDate })
  } catch (error) {
    logger.error('Failed to reschedule managed booking', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
