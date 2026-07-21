import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { z } from 'zod'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { generateAvailableTimeSlots, getDayBounds } from '../lib/availability-slots'
import { buildAttorneyConversionMetrics, getResponseTimeBadge, maybeVerifyAttorneyReview } from '../lib/appointment-engagement'
import { computeAttorneyTrustMetrics } from '../lib/attorney-trust-metrics'
import { recomputeAttorneyRatingAggregates } from '../lib/attorney-rating-aggregates'

const router = Router()

// Public trust metrics — real response/acceptance/outcome/settlement numbers.
router.get('/:attorneyId/trust-metrics', async (req, res) => {
  try {
    const { attorneyId } = req.params
    const attorney = await prisma.attorney.findUnique({ where: { id: attorneyId }, select: { id: true } })
    if (!attorney) return res.status(404).json({ error: 'Attorney not found' })
    const metrics = await computeAttorneyTrustMetrics(attorneyId)
    res.json(metrics)
  } catch (error) {
    logger.error('Failed to get attorney trust metrics', { error, attorneyId: req.params.attorneyId })
    res.status(500).json({ error: 'Internal server error' })
  }
})

function busyBlocksToAppointments(busyBlocks: Array<{ startTime: Date; endTime: Date }>) {
  return busyBlocks.map((block) => ({
    scheduledAt: block.startTime,
    duration: Math.max(1, Math.round((block.endTime.getTime() - block.startTime.getTime()) / 60000)),
  }))
}

const ReviewCreate = z.object({
  attorneyId: z.string(),
  rating: z.number().min(1).max(5),
  title: z.string().optional(),
  review: z.string().optional()
})

// Get attorney profile with reviews
router.get('/:attorneyId', async (req, res) => {
  try {
    const { attorneyId } = req.params

    const attorney = await prisma.attorney.findUnique({
      where: { id: attorneyId },
      include: {
        reviews: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        availability: {
          orderBy: { dayOfWeek: 'asc' }
        }
      }
    })

    if (!attorney) {
      return res.status(404).json({ error: 'Attorney not found' })
    }

    // Parse JSON fields
    const profile = attorney.profile ? JSON.parse(attorney.profile) : {}
    const specialties = JSON.parse(attorney.specialties)
    const venues = JSON.parse(attorney.venues)
    const meta = attorney.meta ? JSON.parse(attorney.meta) : {}

    const [responseBadge, conversionMetrics] = await Promise.all([
      getResponseTimeBadge(attorney.id, attorney.responseTimeHours ?? 24),
      buildAttorneyConversionMetrics(attorney.id),
    ])

    // Calculate response metrics
    const responseMetrics = {
      averageResponseTime: responseBadge.hours,
      responseBadge: responseBadge.badge,
      responseRate: conversionMetrics.acceptanceRate,
      averageRating: attorney.averageRating,
      totalReviews: attorney.totalReviews,
      completionRate: conversionMetrics.completionRate,
      conversionMetrics
    }

    res.json({
      id: attorney.id,
      name: attorney.name,
      email: attorney.email,
      phone: attorney.phone,
      specialties,
      venues,
      profile,
      meta,
      isVerified: attorney.isVerified,
      isActive: attorney.isActive,
      responseMetrics,
      reviews: attorney.reviews.map(r => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        review: r.review,
        isVerified: r.isVerified,
        user: {
          name: `${r.user.firstName} ${r.user.lastName}`.trim()
        },
        createdAt: r.createdAt
      })),
      availability: attorney.availability.map(a => ({
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
        isAvailable: a.isAvailable
      })),
      createdAt: attorney.createdAt,
      updatedAt: attorney.updatedAt
    })
  } catch (error) {
    logger.error('Failed to get attorney profile', { error, attorneyId: req.params.attorneyId })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create attorney review
router.post('/:attorneyId/reviews', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { attorneyId } = req.params
    const parsed = ReviewCreate.safeParse(req.body)
    
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: parsed.error.flatten() 
      })
    }

    const { rating, title, review } = parsed.data

    // Check if attorney exists
    const attorney = await prisma.attorney.findUnique({
      where: { id: attorneyId }
    })

    if (!attorney) {
      return res.status(404).json({ error: 'Attorney not found' })
    }

    // Check if user has already reviewed this attorney
    const existingReview = await prisma.attorneyReview.findUnique({
      where: {
        attorneyId_userId: {
          attorneyId,
          userId: req.user!.id
        }
      }
    })

    const isVerified = await maybeVerifyAttorneyReview({
      attorneyId,
      userId: req.user!.id,
    })

    // Create the review, or update it in place if this user already rated this
    // attorney. Updating (rather than rejecting with 409) lets clients revise a
    // rating and keeps the recomputed aggregate current on every resubmit.
    const newReview = existingReview
      ? await prisma.attorneyReview.update({
          where: { id: existingReview.id },
          data: { rating, title, review, isVerified },
          include: { user: { select: { firstName: true, lastName: true } } }
        })
      : await prisma.attorneyReview.create({
          data: {
            attorneyId,
            userId: req.user!.id,
            rating,
            title,
            review,
            isVerified
          },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        })

    // Recompute the attorney's stored rating aggregates from source so the
    // Attorney row and its AttorneyProfile stay consistent for every reader
    // (admin views, firm dashboard Team & Roles, public list) — CP-308/321/326.
    await recomputeAttorneyRatingAggregates(attorneyId)

    logger.info('Attorney review created', { 
      reviewId: newReview.id,
      attorneyId,
      userId: req.user!.id,
      rating
    })

    res.status(201).json({
      review_id: newReview.id,
      rating: newReview.rating,
      title: newReview.title,
      review: newReview.review,
      isVerified: newReview.isVerified,
      user: {
        name: `${newReview.user.firstName} ${newReview.user.lastName}`.trim()
      },
      createdAt: newReview.createdAt
    })
  } catch (error) {
    logger.error('Failed to create attorney review', { error, attorneyId: req.params.attorneyId })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get attorney's availability
router.get('/:attorneyId/availability', async (req, res) => {
  try {
    const { attorneyId } = req.params
    const { date, duration = 30 } = req.query

    const targetDate = new Date(date as string)
    const dayOfWeek = targetDate.getUTCDay()

    // Get attorney's availability for this day. Multiple windows per weekday are
    // supported (e.g. 09:00–12:00 and 13:00–17:00).
    const availabilityRows = await prisma.attorneyAvailability.findMany({
      where: { attorneyId, dayOfWeek },
    })

    // Resolve the bookable window(s). Honor an explicit schedule (including an
    // explicit "unavailable"); when there is NO configuration at all, fall back
    // to standard weekday business hours so plaintiffs can still book. Attorneys
    // rarely set a weekly schedule, so without this fallback every day shows
    // zero slots and consultations can never be scheduled.
    const DEFAULT_START_TIME = '09:00'
    const DEFAULT_END_TIME = '17:00'
    let windows: { startTime: string; endTime: string }[]
    if (availabilityRows.length > 0) {
      windows = availabilityRows
        .filter((r) => r.isAvailable && r.startTime < r.endTime)
        .map((r) => ({ startTime: r.startTime, endTime: r.endTime }))
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
      if (windows.length === 0) {
        return res.json({
          available: false,
          message: 'Attorney is not available on this day'
        })
      }
    } else {
      // No explicit schedule: weekdays default to business hours, weekends closed.
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return res.json({
          available: false,
          message: 'Attorney is not available on this day'
        })
      }
      windows = [{ startTime: DEFAULT_START_TIME, endTime: DEFAULT_END_TIME }]
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

    // Generate available slots across every window (pre-sorted, non-overlapping).
    const busy = [...existingAppointments, ...busyBlocksToAppointments(calendarBusyBlocks)]
    const slots = windows.flatMap((w) =>
      generateAvailableTimeSlots({
        targetDate,
        startTime: w.startTime,
        endTime: w.endTime,
        duration: parseInt(duration as string),
        existingAppointments: busy,
      }),
    )

    res.json({
      available: true,
      dayOfWeek,
      workingHours: {
        start: windows[0].startTime,
        end: windows[windows.length - 1].endTime
      },
      slots
    })
  } catch (error) {
    logger.error('Failed to get attorney availability', { error, attorneyId: req.params.attorneyId })
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
