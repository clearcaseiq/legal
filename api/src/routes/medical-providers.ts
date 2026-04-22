import { Router } from 'express'
import { authMiddleware } from '../lib/auth'
import { logger } from '../lib/logger'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

const router = Router()

// Medical Provider Management

// Get medical providers
router.get('/providers', authMiddleware, async (req: any, res) => {
  try {
    const { 
      specialty, 
      city, 
      state, 
      zipCode, 
      acceptsLien, 
      isVerified,
      maxDistance,
      page = 1,
      limit = 20
    } = req.query

    const whereClause: any = {}

    if (specialty) whereClause.specialty = specialty
    if (city) whereClause.city = { contains: city, mode: 'insensitive' }
    if (state) whereClause.state = state
    if (zipCode) whereClause.zipCode = zipCode
    if (acceptsLien !== undefined) whereClause.acceptsLien = acceptsLien === 'true'
    if (isVerified !== undefined) whereClause.isVerified = isVerified === 'true'

    const providers = await prisma.medicalProvider.findMany({
      where: whereClause,
      orderBy: [
        { isVerified: 'desc' },
        { rating: 'desc' }
      ],
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      take: parseInt(limit as string)
    })

    // Filter by distance if zipCode and maxDistance provided
    let filteredProviders = providers
    if (zipCode && maxDistance) {
      // In a real implementation, you would use a geolocation service
      // For now, we'll simulate distance filtering
      filteredProviders = providers.filter(provider => {
        const distance = calculateDistance(zipCode as string, provider.zipCode)
        return distance <= parseInt(maxDistance as string)
      })
    }

    res.json({
      providers: filteredProviders,
      totalCount: filteredProviders.length,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    })
  } catch (error: any) {
    logger.error('Failed to get medical providers', { error: error.message })
    res.status(500).json({ error: 'Failed to get medical providers' })
  }
})

// Get provider details
router.get('/providers/:providerId', authMiddleware, async (req: any, res) => {
  try {
    const { providerId } = req.params

    const provider = await prisma.medicalProvider.findUnique({
      where: { id: providerId },
      include: {
        referrals: {
          include: {
            lead: {
              include: {
                assessment: true
              }
            },
            attorney: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' })
    }

    res.json(provider)
  } catch (error: any) {
    logger.error('Failed to get provider details', { error: error.message })
    res.status(500).json({ error: 'Failed to get provider details' })
  }
})

// Create provider referral
router.post('/referrals', authMiddleware, async (req: any, res) => {
  try {
    const attorneyId = req.user.id
    const { leadId, providerId, referralType, notes } = req.body

    // Verify attorney has access to lead
    const lead = await prisma.leadSubmission.findFirst({
      where: {
        id: leadId,
        OR: [
          { assignedAttorneyId: attorneyId },
          { assignmentType: 'shared' }
        ]
      }
    })

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found or access denied' })
    }

    // Verify provider exists
    const provider = await prisma.medicalProvider.findUnique({
      where: { id: providerId }
    })

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' })
    }

    const referral = await prisma.providerReferral.create({
      data: {
        leadId,
        providerId,
        attorneyId,
        referralType,
        notes
      },
      include: {
        provider: true,
        lead: {
          include: {
            assessment: true
          }
        }
      }
    })

    res.json(referral)
  } catch (error: any) {
    logger.error('Failed to create provider referral', { error: error.message })
    res.status(500).json({ error: 'Failed to create provider referral' })
  }
})

// Get attorney's provider referrals
router.get('/referrals', authMiddleware, async (req: any, res) => {
  try {
    const attorneyId = req.user.id
    const { status, providerId, page = 1, limit = 20 } = req.query

    const whereClause: any = {
      attorneyId
    }

    if (status) whereClause.status = status
    if (providerId) whereClause.providerId = providerId

    const referrals = await prisma.providerReferral.findMany({
      where: whereClause,
      include: {
        provider: true,
        lead: {
          include: {
            assessment: true
          }
        }
      },
      orderBy: { referralDate: 'desc' },
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      take: parseInt(limit as string)
    })

    const totalCount = await prisma.providerReferral.count({
      where: whereClause
    })

    res.json({
      referrals,
      totalCount,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    })
  } catch (error: any) {
    logger.error('Failed to get provider referrals', { error: error.message })
    res.status(500).json({ error: 'Failed to get provider referrals' })
  }
})

// Update referral status
router.put('/referrals/:referralId', authMiddleware, async (req: any, res) => {
  try {
    const { referralId } = req.params
    const attorneyId = req.user.id
    const { status, notes, treatmentStartDate } = req.body

    const referral = await prisma.providerReferral.findFirst({
      where: {
        id: referralId,
        attorneyId
      }
    })

    if (!referral) {
      return res.status(404).json({ error: 'Referral not found' })
    }

    const updatedReferral = await prisma.providerReferral.update({
      where: { id: referralId },
      data: {
        status,
        notes,
        treatmentStartDate: treatmentStartDate ? new Date(treatmentStartDate) : null,
        responseDate: status !== 'pending' ? new Date() : null
      },
      include: {
        provider: true,
        lead: {
          include: {
            assessment: true
          }
        }
      }
    })

    res.json(updatedReferral)
  } catch (error: any) {
    logger.error('Failed to update referral', { error: error.message })
    res.status(500).json({ error: 'Failed to update referral' })
  }
})

// Get provider specialties
router.get('/specialties', async (req: any, res) => {
  try {
    const specialties = [
      'Orthopedics',
      'Neurology',
      'Physical Therapy',
      'Chiropractic',
      'Pain Management',
      'Radiology',
      'Emergency Medicine',
      'Internal Medicine',
      'Family Medicine',
      'Psychiatry',
      'Dermatology',
      'Cardiology',
      'Pulmonology',
      'Gastroenterology',
      'Urology',
      'Gynecology',
      'Ophthalmology',
      'ENT (Ear, Nose, Throat)',
      'Plastic Surgery',
      'General Surgery'
    ]

    res.json({ specialties })
  } catch (error: any) {
    logger.error('Failed to get specialties', { error: error.message })
    res.status(500).json({ error: 'Failed to get specialties' })
  }
})

// Provider search with advanced filters
router.post('/search', authMiddleware, async (req: any, res) => {
  try {
    const {
      location,
      specialty,
      acceptsLien,
      isVerified,
      maxDistance,
      minRating,
      languages,
      insuranceAccepted,
      page = 1,
      limit = 20
    } = req.body

    const whereClause: any = {}

    if (specialty) whereClause.specialty = specialty
    if (acceptsLien !== undefined) whereClause.acceptsLien = acceptsLien
    if (isVerified !== undefined) whereClause.isVerified = isVerified
    if (minRating) whereClause.rating = { gte: minRating }

    // Location-based filtering
    if (location?.city) whereClause.city = { contains: location.city, mode: 'insensitive' }
    if (location?.state) whereClause.state = location.state
    if (location?.zipCode) whereClause.zipCode = location.zipCode

    const providers = await prisma.medicalProvider.findMany({
      where: whereClause,
      orderBy: [
        { isVerified: 'desc' },
        { rating: 'desc' }
      ]
    })

    // Apply distance filtering if location provided
    let filteredProviders = providers
    if (location?.zipCode && maxDistance) {
      filteredProviders = providers.filter(provider => {
        const distance = calculateDistance(location.zipCode, provider.zipCode)
        return distance <= maxDistance
      })
    }

    // Apply language filtering (if provider had language field)
    if (languages && languages.length > 0) {
      filteredProviders = filteredProviders.filter(provider => {
        // In a real implementation, providers would have a languages field
        // For now, we'll assume all providers speak English
        return true
      })
    }

    // Pagination
    const startIndex = (parseInt(page as string) - 1) * parseInt(limit as string)
    const endIndex = startIndex + parseInt(limit as string)
    const paginatedProviders = filteredProviders.slice(startIndex, endIndex)

    res.json({
      providers: paginatedProviders,
      totalCount: filteredProviders.length,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      searchCriteria: {
        location,
        specialty,
        acceptsLien,
        isVerified,
        maxDistance,
        minRating,
        languages,
        insuranceAccepted
      }
    })
  } catch (error: any) {
    logger.error('Failed to search providers', { error: error.message })
    res.status(500).json({ error: 'Failed to search providers' })
  }
})

// Get referral analytics for attorney
router.get('/analytics', authMiddleware, async (req: any, res) => {
  try {
    const attorneyId = req.user.id
    const { period = 'monthly', startDate, endDate } = req.query

    const whereClause: any = {
      attorneyId
    }

    if (startDate && endDate) {
      whereClause.referralDate = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      }
    }

    const referrals = await prisma.providerReferral.findMany({
      where: whereClause,
      include: {
        provider: true
      },
      orderBy: { referralDate: 'desc' }
    })

    // Calculate analytics
    const totalReferrals = referrals.length
    const acceptedReferrals = referrals.filter(r => r.status === 'accepted').length
    const completedReferrals = referrals.filter(r => r.status === 'completed').length
    const declinedReferrals = referrals.filter(r => r.status === 'declined').length

    const specialtyBreakdown = referrals.reduce((acc, referral) => {
      const specialty = referral.provider.specialty
      acc[specialty] = (acc[specialty] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const statusBreakdown = {
      pending: referrals.filter(r => r.status === 'pending').length,
      accepted: acceptedReferrals,
      declined: declinedReferrals,
      completed: completedReferrals
    }

    const responseRate = totalReferrals > 0 ? (acceptedReferrals / totalReferrals) * 100 : 0
    const completionRate = acceptedReferrals > 0 ? (completedReferrals / acceptedReferrals) * 100 : 0

    res.json({
      overview: {
        totalReferrals,
        acceptedReferrals,
        completedReferrals,
        declinedReferrals,
        responseRate,
        completionRate
      },
      specialtyBreakdown,
      statusBreakdown,
      recentReferrals: referrals.slice(0, 10)
    })
  } catch (error: any) {
    logger.error('Failed to get referral analytics', { error: error.message })
    res.status(500).json({ error: 'Failed to get referral analytics' })
  }
})

// Helper functions

function calculateDistance(zipCode1: string, zipCode2: string): number {
  // Simplified distance calculation
  // In a real implementation, you would use a proper geolocation service
  // like Google Maps API or a ZIP code distance lookup service
  
  // For demo purposes, return a random distance between 0-50 miles
  return Math.floor(Math.random() * 50)
}

export default router
