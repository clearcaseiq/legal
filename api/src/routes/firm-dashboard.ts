import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { authMiddleware, AuthRequest } from '../lib/auth'

const router: Router = Router()

// Add an attorney to the current attorney's firm
router.post('/attorneys', authMiddleware as any, async (req: any, res: Response) => {
  try {
    if (!req.user?.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const {
      email,
      name,
      firstName,
      middleName,
      lastName,
      specialties,
      venues,
      jurisdictions
    } = req.body || {}
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Attorney email is required' })
    }

    const currentAttorney: any = await prisma.attorney.findFirst({
      where: { email: req.user.email }
    })

    if (!currentAttorney) {
      return res.status(404).json({ error: 'Attorney account not found for this user' })
    }

    if (!currentAttorney.lawFirmId) {
      return res.status(404).json({ error: 'No law firm associated with this attorney' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    let attorney = await prisma.attorney.findUnique({
      where: { email: normalizedEmail }
    })

    const parsedSpecialties = Array.isArray(specialties)
      ? specialties.filter((item: any) => typeof item === 'string' && item.trim())
      : []
    const parsedVenues = Array.isArray(venues)
      ? venues.filter((item: any) => typeof item === 'string' && item.trim())
      : []
    const parsedJurisdictions = Array.isArray(jurisdictions)
      ? jurisdictions.filter((item: any) => item && typeof item.state === 'string' && item.state.trim())
      : parsedVenues.map((state: string) => ({ state }))

    if (parsedSpecialties.length === 0) {
      return res.status(400).json({ error: 'At least one specialty is required' })
    }
    if (parsedVenues.length === 0 && parsedJurisdictions.length === 0) {
      return res.status(400).json({ error: 'At least one jurisdiction is required' })
    }

    const derivedName = [
      typeof firstName === 'string' ? firstName.trim() : '',
      typeof middleName === 'string' ? middleName.trim() : '',
      typeof lastName === 'string' ? lastName.trim() : ''
    ].filter(Boolean).join(' ')

    const fallbackName =
      typeof name === 'string' && name.trim()
        ? name.trim()
        : derivedName || normalizedEmail

    if (attorney) {
      if (attorney.lawFirmId && attorney.lawFirmId !== currentAttorney.lawFirmId) {
        return res.status(409).json({
          error: 'Attorney already belongs to another law firm'
        })
      }
      attorney = await prisma.attorney.update({
        where: { id: attorney.id },
        data: {
          lawFirmId: currentAttorney.lawFirmId,
          specialties: JSON.stringify(parsedSpecialties),
          venues: JSON.stringify(parsedVenues)
        }
      })
    } else {
      attorney = await prisma.attorney.create({
        data: {
          name: fallbackName,
          email: normalizedEmail,
          specialties: JSON.stringify(parsedSpecialties),
          venues: JSON.stringify(parsedVenues)
        }
      })
      attorney = await prisma.attorney.update({
        where: { id: attorney.id },
        data: { lawFirmId: currentAttorney.lawFirmId }
      })
    }

    await prisma.attorneyProfile.upsert({
      where: { attorneyId: attorney.id },
      update: {
        specialties: JSON.stringify(parsedSpecialties),
        jurisdictions: JSON.stringify(parsedJurisdictions)
      },
      create: {
        attorneyId: attorney.id,
        bio: '',
        specialties: JSON.stringify(parsedSpecialties),
        languages: JSON.stringify(['English']),
        yearsExperience: 0,
        totalCases: 0,
        totalSettlements: 0,
        averageSettlement: 0,
        successRate: 0,
        verifiedVerdicts: JSON.stringify([]),
        totalReviews: 0,
        averageRating: 0,
        jurisdictions: JSON.stringify(parsedJurisdictions)
      }
    })

    res.json({ attorney })
  } catch (error: any) {
    logger.error('Failed to add attorney to firm', {
      error: error?.message || String(error),
      stack: error?.stack
    })
    res.status(500).json({ error: 'Failed to add attorney to firm' })
  }
})

// Update an attorney in the current attorney's firm
router.put('/attorneys/:attorneyId', authMiddleware as any, async (req: any, res: Response) => {
  try {
    if (!req.user?.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const { attorneyId } = req.params
    const { firstName, middleName, lastName, specialties, venues, jurisdictions } = req.body || {}

    const currentAttorney: any = await prisma.attorney.findFirst({
      where: { email: req.user.email }
    })

    if (!currentAttorney) {
      return res.status(404).json({ error: 'Attorney account not found for this user' })
    }

    if (!currentAttorney.lawFirmId) {
      return res.status(404).json({ error: 'No law firm associated with this attorney' })
    }

    const targetAttorney = await prisma.attorney.findUnique({
      where: { id: attorneyId }
    })

    if (!targetAttorney || targetAttorney.lawFirmId !== currentAttorney.lawFirmId) {
      return res.status(404).json({ error: 'Attorney not found in your firm' })
    }

    const parsedSpecialties = Array.isArray(specialties)
      ? specialties.filter((item: any) => typeof item === 'string' && item.trim())
      : []
    const parsedVenues = Array.isArray(venues)
      ? venues.filter((item: any) => typeof item === 'string' && item.trim())
      : []
    const parsedJurisdictions = Array.isArray(jurisdictions)
      ? jurisdictions.filter((item: any) => item && typeof item.state === 'string' && item.state.trim())
      : parsedVenues.map((state: string) => ({ state }))

    if (parsedSpecialties.length === 0) {
      return res.status(400).json({ error: 'At least one specialty is required' })
    }
    if (parsedVenues.length === 0 && parsedJurisdictions.length === 0) {
      return res.status(400).json({ error: 'At least one jurisdiction is required' })
    }

    const derivedName = [
      typeof firstName === 'string' ? firstName.trim() : '',
      typeof middleName === 'string' ? middleName.trim() : '',
      typeof lastName === 'string' ? lastName.trim() : ''
    ].filter(Boolean).join(' ')

    const updatedAttorney = await prisma.attorney.update({
      where: { id: attorneyId },
      data: {
        name: derivedName || targetAttorney.name,
        specialties: JSON.stringify(parsedSpecialties),
        venues: JSON.stringify(parsedVenues)
      }
    })

    await prisma.attorneyProfile.upsert({
      where: { attorneyId },
      update: {
        specialties: JSON.stringify(parsedSpecialties),
        jurisdictions: JSON.stringify(parsedJurisdictions)
      },
      create: {
        attorneyId,
        bio: '',
        specialties: JSON.stringify(parsedSpecialties),
        languages: JSON.stringify(['English']),
        yearsExperience: 0,
        totalCases: 0,
        totalSettlements: 0,
        averageSettlement: 0,
        successRate: 0,
        verifiedVerdicts: JSON.stringify([]),
        totalReviews: 0,
        averageRating: 0,
        jurisdictions: JSON.stringify(parsedJurisdictions)
      }
    })

    res.json({ attorney: updatedAttorney })
  } catch (error: any) {
    logger.error('Failed to update attorney in firm', {
      error: error?.message || String(error),
      stack: error?.stack
    })
    res.status(500).json({ error: 'Failed to update attorney in firm' })
  }
})

// Get firm-level dashboard for the current attorney's firm
router.get('/', authMiddleware as any, async (req: any, res: Response) => {
  try {
    if (!req.user?.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    // Find attorney by user email
    const attorney: any = await prisma.attorney.findFirst({
      where: {
        email: req.user.email
      }
    })

    if (!attorney) {
      return res.status(404).json({ error: 'Attorney account not found for this user' })
    }

    if (!(attorney as any).lawFirmId) {
      return res.status(404).json({ error: 'No law firm associated with this attorney' })
    }

    // Get firm with all attorneys
    const firm = await (prisma as any).lawFirm.findUnique({
      where: { id: (attorney as any).lawFirmId },
      include: {
        attorneys: {
          include: {
            attorneyProfile: true,
            dashboard: true
          }
        }
      }
    })

    if (!firm) {
      return res.status(404).json({ error: 'Law firm not found' })
    }

    const attorneys: any[] = (firm as any).attorneys || []
    const attorneyIds = attorneys.map((a: any) => a.id).filter(Boolean)
    const verifiedReviewCounts = attorneyIds.length > 0
      ? await prisma.attorneyReview.groupBy({
          by: ['attorneyId'],
          where: {
            attorneyId: { in: attorneyIds },
            isVerified: true,
          },
          _count: {
            _all: true,
          },
        })
      : []
    const verifiedReviewCountMap = new Map(
      verifiedReviewCounts.map((entry) => [entry.attorneyId, entry._count._all])
    )

    // Aggregate metrics from attorney dashboards
    let totalLeadsReceived = 0
    let totalLeadsAccepted = 0
    let feesCollectedFromPayments = 0
    let totalPlatformSpend = 0
    const totalFeesByAttorneyId = new Map<string, number>()

    if (attorneyIds.length > 0) {
      try {
        const payments = await prisma.billingPayment.findMany({
          where: {
            assessment: {
              OR: [
                { leadSubmission: { assignedAttorneyId: { in: attorneyIds } } },
                { introductions: { some: { attorneyId: { in: attorneyIds } } } }
              ]
            }
          },
          select: {
            amount: true,
            assessment: {
              select: {
                leadSubmission: {
                  select: {
                    assignedAttorneyId: true
                  }
                },
                introductions: {
                  select: {
                    attorneyId: true
                  }
                }
              }
            }
          }
        })

        payments.forEach((payment: any) => {
          const amount = Number(payment.amount ?? 0)
          feesCollectedFromPayments += amount

          const relatedAttorneyIds = new Set<string>()
          const assignedAttorneyId = payment.assessment?.leadSubmission?.assignedAttorneyId
          if (assignedAttorneyId && attorneyIds.includes(assignedAttorneyId)) {
            relatedAttorneyIds.add(assignedAttorneyId)
          }
          for (const intro of payment.assessment?.introductions || []) {
            if (intro?.attorneyId && attorneyIds.includes(intro.attorneyId)) {
              relatedAttorneyIds.add(intro.attorneyId)
            }
          }

          relatedAttorneyIds.forEach((id) => {
            totalFeesByAttorneyId.set(id, (totalFeesByAttorneyId.get(id) || 0) + amount)
          })
        })
      } catch (billingError: any) {
        logger.warn('Failed to aggregate firm billing payments', {
          error: billingError?.message,
          lawFirmId: firm.id
        })
      }
    }

    attorneys.forEach((a: any) => {
      if (a.dashboard) {
        totalLeadsReceived += a.dashboard.totalLeadsReceived
        totalLeadsAccepted += a.dashboard.totalLeadsAccepted
        totalPlatformSpend += a.dashboard.totalPlatformSpend
      }
    })

    const attorneyCount = attorneys.length

    // Aggregate ratings
    let totalRating = 0
    let totalReviews = 0
    let verifiedReviewCount = 0

    attorneys.forEach((a: any) => {
      if (a.attorneyProfile) {
        totalRating += a.attorneyProfile.averageRating || 0
        totalReviews += a.attorneyProfile.totalReviews || 0
      }
      verifiedReviewCount += verifiedReviewCountMap.get(a.id) || 0
    })

    const avgAttorneyRating = attorneyCount > 0 ? totalRating / attorneyCount : 0

    // Build response
    const response = {
      firm: {
        id: firm.id,
        name: firm.name,
        slug: firm.slug,
        primaryEmail: firm.primaryEmail,
        phone: firm.phone,
        website: firm.website,
        address: firm.address,
        city: firm.city,
        state: firm.state,
        zip: firm.zip,
        createdAt: firm.createdAt,
      },
      metrics: {
        attorneyCount,
        totalLeadsReceived,
        totalLeadsAccepted,
        feesCollectedFromPayments,
        totalPlatformSpend,
        avgAttorneyRating,
        totalReviews,
        verifiedReviewCount,
        firmROI: totalPlatformSpend > 0 ? (feesCollectedFromPayments / totalPlatformSpend) : null
      },
      attorneys: attorneys.map(a => ({
        id: a.id,
        name: a.name,
        email: a.email,
        isVerified: a.isVerified,
        responseTimeHours: a.responseTimeHours,
        averageRating: a.attorneyProfile?.averageRating || 0,
        totalReviews: a.attorneyProfile?.totalReviews || 0,
        verifiedReviewCount: verifiedReviewCountMap.get(a.id) || 0,
        subscriptionTier: a.attorneyProfile?.subscriptionTier || null,
        specialties: a.attorneyProfile?.specialties ? JSON.parse(a.attorneyProfile.specialties) : [],
        jurisdictions: a.attorneyProfile?.jurisdictions ? JSON.parse(a.attorneyProfile.jurisdictions) : [],
        dashboard: a.dashboard ? {
          totalLeadsReceived: a.dashboard.totalLeadsReceived,
          totalLeadsAccepted: a.dashboard.totalLeadsAccepted,
          feesCollectedFromPayments: totalFeesByAttorneyId.get(a.id) || 0,
          totalPlatformSpend: a.dashboard.totalPlatformSpend
        } : null
      }))
    }

    res.json(response)
  } catch (error: any) {
    logger.error('Failed to get firm dashboard')
    res.status(500).json({ error: 'Failed to load firm dashboard' })
  }
})

export default router

