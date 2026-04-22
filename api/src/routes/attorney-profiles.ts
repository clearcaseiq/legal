import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { z } from 'zod'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { generateAvailableTimeSlots, getDayBounds } from '../lib/availability-slots'
import { buildAttorneyConversionMetrics, getResponseTimeBadge, maybeVerifyAttorneyReview } from '../lib/appointment-engagement'

const router = Router()

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

    if (existingReview) {
      return res.status(409).json({ error: 'You have already reviewed this attorney' })
    }

    const isVerified = await maybeVerifyAttorneyReview({
      attorneyId,
      userId: req.user!.id,
    })

    // Create review
    const newReview = await prisma.attorneyReview.create({
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

    // Update attorney's average rating and review count
    const allReviews = await prisma.attorneyReview.findMany({
      where: { attorneyId },
      select: { rating: true }
    })

    const averageRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
    const totalReviews = allReviews.length

    await prisma.attorney.update({
      where: { id: attorneyId },
      data: {
        averageRating,
        totalReviews
      }
    })

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

    // Get attorney's availability for this day
    const availability = await prisma.attorneyAvailability.findUnique({
      where: {
        attorneyId_dayOfWeek: {
          attorneyId,
          dayOfWeek
        }
      }
    })

    if (!availability || !availability.isAvailable) {
      return res.json({ 
        available: false,
        message: 'Attorney is not available on this day'
      })
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

    res.json({
      available: true,
      dayOfWeek,
      workingHours: {
        start: availability.startTime,
        end: availability.endTime
      },
      slots
    })
  } catch (error) {
    logger.error('Failed to get attorney availability', { error, attorneyId: req.params.attorneyId })
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
