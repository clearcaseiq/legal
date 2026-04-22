import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { AttorneySearch } from '../lib/validators'
import { logger } from '../lib/logger'

const router: Router = Router()

// Search attorneys
// Optional: group_by_firm=true will group results by firm
router.get('/search', async (req: Request, res: Response) => {
  try {
    const parsed = AttorneySearch.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Invalid query parameters', 
        details: parsed.error.flatten() 
      })
    }

    const { venue, claim_type, limit } = parsed.data
    const groupByFirm = req.query.group_by_firm === 'true'
    
    // Get all attorneys (in a real app, you'd filter by venue/specialty)
    const attorneys = await prisma.attorney.findMany({
      take: limit,
      where: {
        // Add venue and specialty filtering here
        isActive: true
      },
      include: {
        lawFirm: true,
        attorneyProfile: true
      } as any
    })

    const verifiedReviewCounts = await prisma.attorneyReview.groupBy({
      by: ['attorneyId'],
      where: {
        attorneyId: { in: attorneys.map((attorney) => attorney.id) },
        isVerified: true,
      },
      _count: {
        _all: true,
      },
    })

    const verifiedReviewCountMap = new Map(
      verifiedReviewCounts.map((entry) => [entry.attorneyId, entry._count._all])
    )

    // Calculate fit scores and format response at attorney level
    const attorneyResults = attorneys.map(attorney => {
      const specialties = (() => { try { return JSON.parse(attorney.specialties || '[]') } catch { return [] } })()
      const venues = (() => { try { return JSON.parse(attorney.venues || '[]') } catch { return [] } })()
      
      // Calculate fit score based on venue and claim type match
      let fitScore = 0.6 // base score
      
      if (venue && venues?.includes?.(venue)) {
        fitScore += 0.2
      }
      
      if (claim_type && specialties?.includes?.(claim_type)) {
        fitScore += 0.15
      }
      
      // Add some randomness for demo purposes
      fitScore += (Math.random() - 0.5) * 0.1
      fitScore = Math.max(0.3, Math.min(0.95, fitScore))

      const rating = (attorney as any).attorneyProfile?.averageRating ?? (attorney as any).averageRating
      const reviewsCount = (attorney as any).attorneyProfile?.totalReviews ?? (attorney as any).totalReviews
      const verifiedReviewCount = verifiedReviewCountMap.get(attorney.id) || 0
      const meta = (attorney as any).meta ? (() => { try { return JSON.parse((attorney as any).meta) } catch { return {} } })() : {}
      const outcomes = meta?.outcomes ?? meta?.verified_outcomes ?? {}
      const fee = meta?.fee ?? { contingency_min: 0.3, contingency_max: 0.4 }
      const responseTimeHours = (attorney as any).responseTimeHours ?? 24
      const yearsExperience = (attorney as any).attorneyProfile?.yearsExperience ?? 0
      const responseBadge = responseTimeHours <= 2
        ? 'Fast responder'
        : responseTimeHours <= 8
          ? 'Same-day replies'
          : responseTimeHours <= 24
            ? 'Replies within 24h'
            : 'Replies within a few days'

      return {
        attorney_id: attorney.id,
        id: attorney.id,
        name: attorney.name,
        email: (attorney as any).email ?? null,
        phone: (attorney as any).phone ?? null,
        specialties: specialties || [],
        venues: venues || [],
        profile: (attorney as any).profile ?? null,
        meta: (attorney as any).meta ?? null,
        isVerified: (attorney as any).isVerified ?? false,
        isActive: (attorney as any).isActive ?? true,
        responseTimeHours,
        yearsExperience,
        responseBadge,
        fit_score: Math.round(fitScore * 100) / 100,
        rating: Math.round((rating || 0) * 10) / 10,
        averageRating: Math.round((rating || 0) * 10) / 10,
        reviews_count: reviewsCount || 0,
        totalReviews: reviewsCount || 0,
        verifiedReviewCount,
        law_firm: (attorney as any).lawFirm ? {
          id: (attorney as any).lawFirm.id,
          name: (attorney as any).lawFirm.name,
          slug: (attorney as any).lawFirm.slug,
          city: (attorney as any).lawFirm.city,
          state: (attorney as any).lawFirm.state
        } : {
          id: null,
          name: (attorney as any).attorneyProfile?.firmName || null
        },
        subscription_tier: (attorney as any).attorneyProfile?.subscriptionTier || null,
        verified_outcomes: {
          trials: outcomes?.trials ?? Math.floor(Math.random() * 20),
          settlements: outcomes?.settlements ?? Math.floor(Math.random() * 100),
          median_recovery: outcomes?.median_recovery ?? 50000 + Math.floor(Math.random() * 150000)
        },
        fee: {
          contingency_min: fee?.contingency_min ?? 0.3,
          contingency_max: fee?.contingency_max ?? 0.4
        },
        capacity: 'open',
        languages: (attorney as any).attorneyProfile?.languages ? (() => { try { return JSON.parse((attorney as any).attorneyProfile.languages) } catch { return ['English'] } })() : ['English']
      }
    })

    // Sort by fit score
    attorneyResults.sort((a, b) => b.fit_score - a.fit_score)

    if (!groupByFirm) {
      logger.info('Attorney search completed (individual)')
      return res.json(attorneyResults)
    }

    // Group by firm
    const firmsMap = new Map<string, any>()

    for (const a of attorneyResults) {
      const firmKey = a.law_firm?.id || a.law_firm?.name || 'Independent'
      if (!firmsMap.has(firmKey)) {
        firmsMap.set(firmKey, {
          firm_id: a.law_firm?.id || null,
          firm_name: a.law_firm?.name || 'Independent Attorney',
          slug: a.law_firm?.slug || null,
          city: a.law_firm?.city || null,
          state: a.law_firm?.state || null,
          attorneys: [],
          avg_fit_score: 0,
          avg_rating: 0,
          total_reviews: 0,
          verified_review_count: 0,
          attorney_count: 0
        })
      }
      const firm = firmsMap.get(firmKey)
      firm.attorneys.push(a)
      firm.attorney_count += 1
      firm.avg_fit_score += a.fit_score
      firm.avg_rating += a.rating || 0
      firm.total_reviews += a.reviews_count || 0
      firm.verified_review_count += a.verifiedReviewCount || 0
    }

    // Finalize firm-level averages
    const firmResults = Array.from(firmsMap.values()).map(firm => ({
      ...firm,
      avg_fit_score: firm.attorney_count > 0 ? Math.round((firm.avg_fit_score / firm.attorney_count) * 100) / 100 : 0,
      avg_rating: firm.attorney_count > 0 ? Math.round((firm.avg_rating / firm.attorney_count) * 10) / 10 : 0
    }))

    // Sort firms by avg_fit_score
    firmResults.sort((a, b) => b.avg_fit_score - a.avg_fit_score)

    logger.info('Attorney search completed (grouped by firm)')

    res.json(firmResults)
  } catch (error) {
    logger.error('Failed to search attorneys')
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get attorney details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    const attorney = await prisma.attorney.findUnique({
      where: { id }
    })
    
    if (!attorney) {
      return res.status(404).json({ error: 'Attorney not found' })
    }

    const specialties = JSON.parse(attorney.specialties)
    const venues = JSON.parse(attorney.venues)
    const meta = attorney.meta ? JSON.parse(attorney.meta) : null

    res.json({
      attorney_id: attorney.id,
      name: attorney.name,
      specialties: specialties || [],
      venues: venues || [],
      bio: meta?.bio || '',
      education: meta?.education || [],
      certifications: meta?.certifications || [],
      contact: meta?.contact || {},
      verified_outcomes: meta?.outcomes || {},
      fee: meta?.fee || { contingency_min: 0.3, contingency_max: 0.4 }
    })
  } catch (error) {
    logger.error('Failed to get attorney details')
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
