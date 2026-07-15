import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware, type AuthRequest } from '../lib/auth'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { slugify } from '../lib/booking-slots'

/**
 * Attorney-facing management for the public ("Calendly-style") booking page:
 * weekly availability, bookable event types, timezone, and the shareable slug.
 */

const router = Router()

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

function webBaseUrl(): string {
  return (
    process.env.APP_URL ||
    process.env.FRONTEND_URL ||
    process.env.WEB_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '')
}

async function getAttorneyByUser(req: AuthRequest) {
  if (!req.user?.email) return null
  return prisma.attorney.findFirst({
    where: { email: req.user.email },
    select: { id: true, name: true, email: true, bookingSlug: true, schedulingTimezone: true },
  })
}

/** Ensure the attorney has a booking slug; derive a unique one from their name. */
async function ensureBookingSlug(attorneyId: string, name: string, existing: string | null) {
  if (existing) return existing
  const base = slugify(name || 'attorney') || 'attorney'
  let candidate = base
  let n = 1
  // Avoid collisions with other attorneys.
  while (
    await prisma.attorney.findFirst({
      where: { bookingSlug: candidate, id: { not: attorneyId } },
      select: { id: true },
    })
  ) {
    n += 1
    candidate = `${base}-${n}`
  }
  await prisma.attorney.update({ where: { id: attorneyId }, data: { bookingSlug: candidate } })
  return candidate
}

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// GET /v1/scheduling/settings — full scheduling config for the current attorney.
router.get('/settings', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const attorney = await getAttorneyByUser(req)
    if (!attorney) return res.status(404).json({ error: 'Attorney profile not found' })

    const slug = await ensureBookingSlug(attorney.id, attorney.name, attorney.bookingSlug)
    const timezone = attorney.schedulingTimezone || 'America/Los_Angeles'

    const [availabilityRows, eventTypes] = await Promise.all([
      prisma.attorneyAvailability.findMany({ where: { attorneyId: attorney.id } }),
      prisma.attorneyEventType.findMany({
        where: { attorneyId: attorney.id },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
    ])

    // Group all windows per weekday (multiple windows per day are supported).
    const byDow = new Map<number, typeof availabilityRows>()
    for (const row of availabilityRows) {
      const list = byDow.get(row.dayOfWeek)
      if (list) list.push(row)
      else byDow.set(row.dayOfWeek, [row])
    }
    const availability = DAY_LABELS.map((label, dayOfWeek) => {
      const rows = byDow.get(dayOfWeek) || []
      const openRows = rows
        .filter((r) => r.isAvailable && r.startTime < r.endTime)
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
      const hasConfig = rows.length > 0
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5
      const isAvailable = hasConfig ? openRows.length > 0 : isWeekday
      const slots =
        openRows.length > 0
          ? openRows.map((r) => ({ startTime: r.startTime, endTime: r.endTime }))
          : isAvailable
            ? [{ startTime: '09:00', endTime: '17:00' }]
            : []
      return { dayOfWeek, label, isAvailable, slots }
    })

    res.json({
      attorney: {
        id: attorney.id,
        name: attorney.name,
        bookingSlug: slug,
        timezone,
        publicUrl: `${webBaseUrl()}/book/${slug}`,
      },
      availability,
      eventTypes,
    })
  } catch (error) {
    logger.error('Failed to load scheduling settings', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

const SettingsUpdate = z.object({
  timezone: z.string().min(1).max(64).optional(),
  bookingSlug: z
    .string()
    .min(3)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and dashes only')
    .optional(),
})

// PATCH /v1/scheduling/settings — update timezone and/or booking slug.
router.patch('/settings', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const attorney = await getAttorneyByUser(req)
    if (!attorney) return res.status(404).json({ error: 'Attorney profile not found' })

    const parsed = SettingsUpdate.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    }

    const data: Record<string, unknown> = {}
    if (parsed.data.timezone) data.schedulingTimezone = parsed.data.timezone
    if (parsed.data.bookingSlug) {
      const RESERVED = new Set(['manage', 'book', 'api', 'admin', 'team'])
      if (RESERVED.has(parsed.data.bookingSlug)) {
        return res.status(409).json({ error: 'That booking link is reserved. Please choose another.' })
      }
      const taken = await prisma.attorney.findFirst({
        where: { bookingSlug: parsed.data.bookingSlug, id: { not: attorney.id } },
        select: { id: true },
      })
      if (taken) return res.status(409).json({ error: 'That booking link is already taken' })
      data.bookingSlug = parsed.data.bookingSlug
    }

    const updated = await prisma.attorney.update({
      where: { id: attorney.id },
      data,
      select: { bookingSlug: true, schedulingTimezone: true },
    })

    res.json({
      bookingSlug: updated.bookingSlug,
      timezone: updated.schedulingTimezone,
      publicUrl: `${webBaseUrl()}/book/${updated.bookingSlug}`,
    })
  } catch (error) {
    logger.error('Failed to update scheduling settings', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

const SlotInput = z.object({
  startTime: z.string().regex(HHMM),
  endTime: z.string().regex(HHMM),
})

const AvailabilityUpdate = z.object({
  days: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        isAvailable: z.boolean(),
        // New multi-slot shape. `startTime`/`endTime` still accepted for
        // backward compatibility (treated as a single slot).
        slots: z.array(SlotInput).max(12).optional(),
        startTime: z.string().regex(HHMM).optional(),
        endTime: z.string().regex(HHMM).optional(),
      }),
    )
    .min(1)
    .max(7),
})

// PUT /v1/scheduling/availability — replace the weekly availability grid. Each
// day may carry MULTIPLE time windows; closed days store a sentinel row so the
// slot engine treats them as explicitly closed (not "unset → business hours").
router.put('/availability', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const attorney = await getAttorneyByUser(req)
    if (!attorney) return res.status(404).json({ error: 'Attorney profile not found' })

    const parsed = AvailabilityUpdate.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    }

    // Normalize each day to a list of {startTime,endTime} windows and validate.
    type Row = { dayOfWeek: number; startTime: string; endTime: string; isAvailable: boolean }
    const rows: Row[] = []
    for (const day of parsed.data.days) {
      const label = DAY_LABELS[day.dayOfWeek]
      const rawSlots =
        day.slots && day.slots.length > 0
          ? day.slots
          : day.startTime && day.endTime
            ? [{ startTime: day.startTime, endTime: day.endTime }]
            : []

      if (!day.isAvailable || rawSlots.length === 0) {
        // Closed day — persist a sentinel so the day reads as explicitly closed.
        rows.push({ dayOfWeek: day.dayOfWeek, startTime: '00:00', endTime: '00:00', isAvailable: false })
        continue
      }

      // Sort + validate windows: each must be well-formed and not overlap.
      const sorted = [...rawSlots].sort((a, b) => a.startTime.localeCompare(b.startTime))
      let prevEnd = ''
      for (const s of sorted) {
        if (s.startTime >= s.endTime) {
          return res.status(400).json({ error: `${label}: each slot's start must be before its end` })
        }
        if (prevEnd && s.startTime < prevEnd) {
          return res.status(400).json({ error: `${label}: time slots overlap` })
        }
        prevEnd = s.endTime
        rows.push({
          dayOfWeek: day.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          isAvailable: true,
        })
      }
    }

    // Replace the whole grid atomically.
    await prisma.$transaction([
      prisma.attorneyAvailability.deleteMany({ where: { attorneyId: attorney.id } }),
      prisma.attorneyAvailability.createMany({
        data: rows.map((r) => ({ attorneyId: attorney.id, ...r })),
      }),
    ])

    res.json({ ok: true })
  } catch (error) {
    logger.error('Failed to update availability', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

const EventTypeInput = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  durationMinutes: z.number().int().min(10).max(240),
  locationType: z.enum(['video', 'phone', 'in_person']),
  location: z.string().max(400).optional(),
  color: z.string().max(16).optional(),
  bufferBeforeMinutes: z.number().int().min(0).max(120).optional(),
  bufferAfterMinutes: z.number().int().min(0).max(120).optional(),
  minNoticeMinutes: z.number().int().min(0).max(20160).optional(),
  isActive: z.boolean().optional(),
})

async function uniqueEventSlug(attorneyId: string, name: string, ignoreId?: string) {
  const base = slugify(name) || 'meeting'
  let candidate = base
  let n = 1
  while (
    await prisma.attorneyEventType.findFirst({
      where: { attorneyId, slug: candidate, ...(ignoreId ? { id: { not: ignoreId } } : {}) },
      select: { id: true },
    })
  ) {
    n += 1
    candidate = `${base}-${n}`
  }
  return candidate
}

// POST /v1/scheduling/event-types — create a bookable event type.
router.post('/event-types', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const attorney = await getAttorneyByUser(req)
    if (!attorney) return res.status(404).json({ error: 'Attorney profile not found' })

    const parsed = EventTypeInput.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    }

    const slug = await uniqueEventSlug(attorney.id, parsed.data.name)
    const count = await prisma.attorneyEventType.count({ where: { attorneyId: attorney.id } })

    const created = await prisma.attorneyEventType.create({
      data: {
        attorneyId: attorney.id,
        name: parsed.data.name,
        slug,
        description: parsed.data.description || null,
        durationMinutes: parsed.data.durationMinutes,
        locationType: parsed.data.locationType,
        location: parsed.data.location || null,
        color: parsed.data.color || null,
        bufferBeforeMinutes: parsed.data.bufferBeforeMinutes ?? 0,
        bufferAfterMinutes: parsed.data.bufferAfterMinutes ?? 0,
        minNoticeMinutes: parsed.data.minNoticeMinutes ?? 120,
        isActive: parsed.data.isActive ?? true,
        sortOrder: count,
      },
    })

    res.status(201).json(created)
  } catch (error) {
    logger.error('Failed to create event type', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PATCH /v1/scheduling/event-types/:id — update an event type.
router.patch('/event-types/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const attorney = await getAttorneyByUser(req)
    if (!attorney) return res.status(404).json({ error: 'Attorney profile not found' })

    const existing = await prisma.attorneyEventType.findFirst({
      where: { id: req.params.id, attorneyId: attorney.id },
    })
    if (!existing) return res.status(404).json({ error: 'Event type not found' })

    const parsed = EventTypeInput.partial().safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    }

    const data: Record<string, unknown> = { ...parsed.data }
    if (parsed.data.name && parsed.data.name !== existing.name) {
      data.slug = await uniqueEventSlug(attorney.id, parsed.data.name, existing.id)
    }

    const updated = await prisma.attorneyEventType.update({
      where: { id: existing.id },
      data,
    })

    res.json(updated)
  } catch (error) {
    logger.error('Failed to update event type', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /v1/scheduling/event-types/:id — remove an event type.
router.delete('/event-types/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const attorney = await getAttorneyByUser(req)
    if (!attorney) return res.status(404).json({ error: 'Attorney profile not found' })

    const existing = await prisma.attorneyEventType.findFirst({
      where: { id: req.params.id, attorneyId: attorney.id },
      select: { id: true },
    })
    if (!existing) return res.status(404).json({ error: 'Event type not found' })

    await prisma.attorneyEventType.delete({ where: { id: existing.id } })
    res.json({ ok: true })
  } catch (error) {
    logger.error('Failed to delete event type', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
