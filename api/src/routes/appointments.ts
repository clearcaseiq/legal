import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { z } from 'zod'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { generateAvailableTimeSlots, getDayBounds, hasAppointmentConflict } from '../lib/availability-slots'
import { recordRoutingEvent } from '../lib/routing-lifecycle'
import { createExternalCalendarEvent, deleteExternalCalendarEvent } from '../lib/calendar-sync'
import {
  getAppointmentPreparation,
  joinAppointmentWaitlist,
  notifyAppointmentEvent,
  notifyWaitlistForFreedSlot,
  seedAppointmentPrepItems,
  updateAppointmentPreparation,
} from '../lib/appointment-engagement'

const router = Router()

const AppointmentCreate = z.object({
  attorneyId: z.string(),
  assessmentId: z.string().optional(),
  type: z.enum(['in_person', 'phone', 'video']),
  scheduledAt: z.string().datetime(),
  duration: z.number().min(15).max(240).default(30),
  notes: z.string().optional(),
  meetingUrl: z.string().optional(),
  location: z.string().optional(),
  phoneNumber: z.string().optional()
})

const AppointmentUpdate = z.object({
  type: z.enum(['in_person', 'phone', 'video']).optional(),
  scheduledAt: z.string().datetime().optional(),
  duration: z.number().min(15).max(240).optional(),
  notes: z.string().optional(),
  meetingUrl: z.string().optional(),
  location: z.string().optional(),
  phoneNumber: z.string().optional(),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional()
})

const AppointmentWaitlistCreate = z.object({
  attorneyId: z.string(),
  assessmentId: z.string().optional(),
  appointmentId: z.string().optional(),
  preferredDate: z.string().datetime().optional(),
})

const AppointmentPrepUpdate = z.object({
  preparationNotes: z.string().optional(),
  checkInStatus: z.enum(['pending', 'completed']).optional(),
  items: z.array(z.object({
    id: z.string(),
    status: z.enum(['pending', 'uploaded', 'completed', 'skipped']),
  })).optional(),
})

function busyBlocksToAppointments(busyBlocks: Array<{ startTime: Date; endTime: Date }>) {
  return busyBlocks.map((block) => ({
    scheduledAt: block.startTime,
    duration: Math.max(1, Math.round((block.endTime.getTime() - block.startTime.getTime()) / 60000)),
  }))
}

// Create new appointment
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const parsed = AppointmentCreate.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: parsed.error.flatten() 
      })
    }

    const { attorneyId, assessmentId, type, scheduledAt, duration, notes, meetingUrl, location, phoneNumber } = parsed.data
    const scheduledStart = new Date(scheduledAt)
    const { startOfDay, endOfDay } = getDayBounds(scheduledStart)

    // Check if attorney exists and is available
    const attorney = await prisma.attorney.findFirst({
      where: { id: attorneyId, isActive: true }
    })

    if (!attorney) {
      return res.status(404).json({ error: 'Attorney not found or not available' })
    }

    if (assessmentId) {
      const assessment = await prisma.assessment.findFirst({
        where: {
          id: assessmentId,
          userId: req.user!.id
        },
        select: { id: true }
      })

      if (!assessment) {
        return res.status(404).json({ error: 'Assessment not found for this user' })
      }

      const acceptedIntroduction = await prisma.introduction.findFirst({
        where: {
          assessmentId,
          attorneyId,
          status: 'ACCEPTED'
        },
        select: { id: true }
      })

      if (!acceptedIntroduction) {
        return res.status(409).json({ error: 'Booking is only available after the matched attorney accepts your case.' })
      }
    }

    const [existingAppointments, calendarBusyBlocks] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          attorneyId,
          scheduledAt: {
            gte: startOfDay,
            lte: endOfDay
          },
          status: {
            in: ['SCHEDULED', 'CONFIRMED']
          }
        }
      }),
      prisma.attorneyCalendarBusyBlock.findMany({
        where: {
          attorneyId,
          startTime: { lt: endOfDay },
          endTime: { gt: startOfDay }
        },
        select: {
          startTime: true,
          endTime: true
        }
      })
    ])

    if (hasAppointmentConflict(scheduledStart, duration, [
      ...existingAppointments,
      ...busyBlocksToAppointments(calendarBusyBlocks)
    ])) {
      return res.status(409).json({ error: 'Time slot is not available' })
    }

    const appointment = await prisma.appointment.create({
      data: {
        userId: req.user!.id,
        attorneyId,
        assessmentId,
        type,
        scheduledAt: scheduledStart,
        duration,
        notes,
        meetingUrl,
        location,
        phoneNumber,
        status: 'SCHEDULED'
      },
      include: {
        attorney: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    })

    logger.info('Appointment created', { 
      appointmentId: appointment.id,
      userId: req.user!.id,
      attorneyId 
    })

    await seedAppointmentPrepItems(appointment.id, assessmentId)
    await notifyAppointmentEvent({
      appointmentId: appointment.id,
      userId: req.user!.id,
      attorneyId,
      assessmentId,
      type: 'scheduled',
      scheduledAt: appointment.scheduledAt,
    }).catch((notificationError) => {
      logger.warn('Appointment scheduled notification failed', { notificationError, appointmentId: appointment.id })
    })

    try {
      const externalEvent = await createExternalCalendarEvent({
        attorneyId,
        title: `ClearCaseIQ Consultation (${type.replace('_', ' ')})`,
        start: appointment.scheduledAt,
        end: new Date(appointment.scheduledAt.getTime() + appointment.duration * 60000),
        description: assessmentId
          ? `Consultation booked in ClearCaseIQ for assessment ${assessmentId}.`
          : 'Consultation booked in ClearCaseIQ.',
      })

      if (externalEvent) {
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: {
            externalCalendarProvider: externalEvent.provider,
            externalCalendarEventId: externalEvent.externalEventId,
            externalCalendarSyncedAt: new Date(),
          },
        })
      }
    } catch (calendarError) {
      logger.warn('External calendar event creation failed', {
        calendarError,
        appointmentId: appointment.id,
        attorneyId,
      })
    }

    if (assessmentId) {
      await Promise.all([
        prisma.leadSubmission.updateMany({
          where: { assessmentId },
          data: {
            lifecycleState: 'consultation_scheduled',
            lastContactAt: new Date()
          }
        }),
        recordRoutingEvent(assessmentId, null, attorneyId, 'consultation_scheduled', {
          appointmentId: appointment.id,
          scheduledAt: appointment.scheduledAt.toISOString(),
          type
        })
      ])
    }

    res.status(201).json({
      appointment_id: appointment.id,
      attorney: appointment.attorney,
      type: appointment.type,
      scheduled_at: appointment.scheduledAt,
      duration: appointment.duration,
      status: appointment.status,
      meeting_url: appointment.meetingUrl,
      location: appointment.location,
      phone_number: appointment.phoneNumber
    })
  } catch (error) {
    logger.error('Failed to create appointment', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get user's appointments
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: { userId: req.user!.id },
      include: {
        attorney: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            specialties: true,
            averageRating: true,
            totalReviews: true
          }
        },
        assessment: {
          select: {
            id: true,
            claimType: true,
            venueState: true
          }
        }
      },
      orderBy: { scheduledAt: 'asc' }
    })

    // Parse specialties for each attorney
    const parsedAppointments = appointments.map(apt => ({
      ...apt,
      attorney: {
        ...apt.attorney,
        specialties: JSON.parse(apt.attorney.specialties)
      }
    }))

    res.json(parsedAppointments)
  } catch (error) {
    logger.error('Failed to get appointments', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get specific appointment
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params

    const appointment = await prisma.appointment.findFirst({
      where: { 
        id,
        userId: req.user!.id 
      },
      include: {
        attorney: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            specialties: true,
            averageRating: true,
            totalReviews: true
          }
        },
        assessment: {
          select: {
            id: true,
            claimType: true,
            venueState: true,
            facts: true
          }
        }
      }
    })

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' })
    }

    // Parse JSON fields
    const parsedAppointment = {
      ...appointment,
      attorney: {
        ...appointment.attorney,
        specialties: JSON.parse(appointment.attorney.specialties)
      },
      assessment: appointment.assessment ? {
        ...appointment.assessment,
        facts: JSON.parse(appointment.assessment.facts)
      } : null
    }

    res.json(parsedAppointment)
  } catch (error) {
    logger.error('Failed to get appointment', { error, appointmentId: req.params.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update appointment
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const parsed = AppointmentUpdate.safeParse(req.body)
    
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: parsed.error.flatten() 
      })
    }

    // Check if appointment belongs to user
    const existing = await prisma.appointment.findFirst({
      where: { 
        id,
        userId: req.user!.id 
      }
    })

    if (!existing) {
      return res.status(404).json({ error: 'Appointment not found' })
    }

    const updateData: any = { ...parsed.data }
    if (updateData.scheduledAt) {
      updateData.scheduledAt = new Date(updateData.scheduledAt)
    }

    if (updateData.scheduledAt || updateData.duration) {
      const nextStart = updateData.scheduledAt || existing.scheduledAt
      const nextDuration = updateData.duration || existing.duration
      const { startOfDay, endOfDay } = getDayBounds(nextStart)
      const [sameDayAppointments, calendarBusyBlocks] = await Promise.all([
        prisma.appointment.findMany({
          where: {
            attorneyId: existing.attorneyId,
            id: { not: existing.id },
            scheduledAt: { gte: startOfDay, lte: endOfDay },
            status: { in: ['SCHEDULED', 'CONFIRMED'] },
          }
        }),
        prisma.attorneyCalendarBusyBlock.findMany({
          where: {
            attorneyId: existing.attorneyId,
            startTime: { lt: endOfDay },
            endTime: { gt: startOfDay }
          },
          select: {
            startTime: true,
            endTime: true
          }
        }),
      ])

      if (hasAppointmentConflict(nextStart, nextDuration, [
        ...sameDayAppointments,
        ...busyBlocksToAppointments(calendarBusyBlocks),
      ])) {
        return res.status(409).json({ error: 'Rescheduled time is not available' })
      }
    }

    if (parsed.data.status === 'CANCELLED') {
      await deleteExternalCalendarEvent({
        attorneyId: existing.attorneyId,
        provider: existing.externalCalendarProvider,
        eventId: existing.externalCalendarEventId,
      }).catch((calendarError) => {
        logger.warn('External calendar event deletion failed during update', {
          calendarError,
          appointmentId: existing.id,
        })
      })

      updateData.externalCalendarEventId = null
      updateData.externalCalendarSyncedAt = new Date()
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        attorney: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    })

    logger.info('Appointment updated', { 
      appointmentId: id,
      userId: req.user!.id,
      updates: Object.keys(parsed.data)
    })

    if (parsed.data.status === 'CANCELLED') {
      await Promise.allSettled([
        notifyAppointmentEvent({
          appointmentId: existing.id,
          userId: req.user!.id,
          attorneyId: existing.attorneyId,
          assessmentId: existing.assessmentId,
          type: 'cancelled',
        }),
        notifyWaitlistForFreedSlot({
          attorneyId: existing.attorneyId,
          slotStart: existing.scheduledAt,
          appointmentId: existing.id,
        }),
      ])
    } else if (parsed.data.scheduledAt) {
      await Promise.allSettled([
        notifyAppointmentEvent({
          appointmentId: existing.id,
          userId: req.user!.id,
          attorneyId: existing.attorneyId,
          assessmentId: existing.assessmentId,
          type: 'rescheduled',
          scheduledAt: updateData.scheduledAt,
        }),
        notifyWaitlistForFreedSlot({
          attorneyId: existing.attorneyId,
          slotStart: existing.scheduledAt,
          appointmentId: existing.id,
        }),
      ])
    }

    res.json({
      appointment_id: appointment.id,
      attorney: appointment.attorney,
      type: appointment.type,
      scheduled_at: appointment.scheduledAt,
      duration: appointment.duration,
      status: appointment.status,
      meeting_url: appointment.meetingUrl,
      location: appointment.location,
      phone_number: appointment.phoneNumber
    })
  } catch (error) {
    logger.error('Failed to update appointment', { error, appointmentId: req.params.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Cancel appointment
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params

    // Check if appointment belongs to user
    const appointment = await prisma.appointment.findFirst({
      where: { 
        id,
        userId: req.user!.id 
      }
    })

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' })
    }

    await deleteExternalCalendarEvent({
      attorneyId: appointment.attorneyId,
      provider: appointment.externalCalendarProvider,
      eventId: appointment.externalCalendarEventId,
    }).catch((calendarError) => {
      logger.warn('External calendar event deletion failed during cancel', {
        calendarError,
        appointmentId: appointment.id,
      })
    })

    await prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        externalCalendarEventId: null,
        externalCalendarSyncedAt: new Date(),
      }
    })

    logger.info('Appointment cancelled', { 
      appointmentId: id,
      userId: req.user!.id
    })

    await Promise.allSettled([
      notifyAppointmentEvent({
        appointmentId: appointment.id,
        userId: req.user!.id,
        attorneyId: appointment.attorneyId,
        assessmentId: appointment.assessmentId,
        type: 'cancelled',
      }),
      notifyWaitlistForFreedSlot({
        attorneyId: appointment.attorneyId,
        slotStart: appointment.scheduledAt,
        appointmentId: appointment.id,
      }),
    ])

    res.status(204).send()
  } catch (error) {
    logger.error('Failed to cancel appointment', { error, appointmentId: req.params.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/waitlist', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const parsed = AppointmentWaitlistCreate.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: parsed.error.flatten(),
      })
    }

    const entry = await joinAppointmentWaitlist({
      attorneyId: parsed.data.attorneyId,
      userId: req.user!.id,
      assessmentId: parsed.data.assessmentId,
      appointmentId: parsed.data.appointmentId,
      preferredDate: parsed.data.preferredDate ? new Date(parsed.data.preferredDate) : null,
    })

    res.status(201).json({
      waitlistId: entry.id,
      status: entry.status,
    })
  } catch (error) {
    logger.error('Failed to join appointment waitlist', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id/prep', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const data = await getAppointmentPreparation(req.params.id, req.user!.id)
    if (!data) {
      return res.status(404).json({ error: 'Appointment not found' })
    }
    res.json(data)
  } catch (error) {
    logger.error('Failed to get appointment prep', { error, appointmentId: req.params.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:id/prep', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const parsed = AppointmentPrepUpdate.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: parsed.error.flatten(),
      })
    }
    const data = await updateAppointmentPreparation({
      appointmentId: req.params.id,
      userId: req.user!.id,
      preparationNotes: parsed.data.preparationNotes,
      checkInStatus: parsed.data.checkInStatus,
      items: parsed.data.items,
    })
    if (!data) {
      return res.status(404).json({ error: 'Appointment not found' })
    }
    res.json(data)
  } catch (error) {
    logger.error('Failed to update appointment prep', { error, appointmentId: req.params.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get available time slots for an attorney
router.get('/attorney/:attorneyId/availability', async (req, res) => {
  try {
    const { attorneyId } = req.params
    const { date, duration = 30 } = req.query

    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' })
    }

    const targetDate = new Date(date as string)
    const dayOfWeek = targetDate.getUTCDay()

    // Get attorney's general availability for this day
    const availability = await prisma.attorneyAvailability.findUnique({
      where: {
        attorneyId_dayOfWeek: {
          attorneyId,
          dayOfWeek
        }
      }
    })

    if (!availability || !availability.isAvailable) {
      return res.json({ slots: [] })
    }

    // Get existing appointments for this date
    const { startOfDay, endOfDay } = getDayBounds(targetDate)

    const [existingAppointments, calendarBusyBlocks] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          attorneyId,
          scheduledAt: {
            gte: startOfDay,
            lte: endOfDay
          },
          status: {
            in: ['SCHEDULED', 'CONFIRMED']
          }
        }
      }),
      prisma.attorneyCalendarBusyBlock.findMany({
        where: {
          attorneyId,
          startTime: { lt: endOfDay },
          endTime: { gt: startOfDay }
        },
        select: {
          startTime: true,
          endTime: true
        }
      })
    ])

    // Generate available slots
    const slots = generateAvailableTimeSlots({
      targetDate,
      startTime: availability.startTime,
      endTime: availability.endTime,
      duration: parseInt(duration as string),
      existingAppointments: [
        ...existingAppointments,
        ...busyBlocksToAppointments(calendarBusyBlocks)
      ]
    })

    res.json({ slots })
  } catch (error) {
    logger.error('Failed to get attorney availability', { error, attorneyId: req.params.attorneyId })
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
