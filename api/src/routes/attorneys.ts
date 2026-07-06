import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { AttorneySearch } from '../lib/validators'
import { logger } from '../lib/logger'
import { getHeuristics, computeAttorneyFitScore, getResponseBadge } from '../lib/heuristics-config'
import { getFieldMappings, resolveMatchValues } from '../lib/field-mappings-config'
import { getMatchingRules, getConfiguredWaveSize } from '../lib/matching-rules-config'

const router: Router = Router()

// Public, non-sensitive routing sizing so the plaintiff Case Snapshot popup can
// cap the number of attorney choices to the admin-configured wave-1 size.
// Previously the popup always showed 3 choices even when Wave 1 was set to 1 (#219).
router.get('/wave-config', async (_req: Request, res: Response) => {
  try {
    const config = await getMatchingRules()
    res.json({
      maxAttorneysWave1: getConfiguredWaveSize(config, 1),
      maxAttorneysWave2: getConfiguredWaveSize(config, 2),
      maxAttorneysWave3: getConfiguredWaveSize(config, 3),
    })
  } catch (error) {
    logger.error('Failed to load wave config', { error: error instanceof Error ? error.message : error })
    // Fall back to the default wave-1 size so the popup still renders.
    res.json({ maxAttorneysWave1: 3, maxAttorneysWave2: 5, maxAttorneysWave3: 10 })
  }
})

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

    // Search exposes plaintiff-facing claim-type slugs, but attorney specialties are
    // stored in the attorney vocabulary (ATTORNEY_CASE_TYPES) and older profiles use
    // legacy slugs. The admin-configured field mappings resolve each searchable claim
    // type to every equivalent specialty slug so filtering/scoring works across
    // vocabularies (aligned with #49) and can be tuned without a deploy.
    const fieldMappings = claim_type ? await getFieldMappings() : null
    const claimTypeMatchSlugs =
      claim_type && fieldMappings ? resolveMatchValues(fieldMappings, 'claimType', claim_type) : []
    const specialtiesMatchClaim = (list: string[]) =>
      Array.isArray(list) && claimTypeMatchSlugs.some((slug) => list.includes(slug))
    
    // Score a broad candidate pool first, then apply the requested limit.
    const attorneys = await prisma.attorney.findMany({
      take: Math.max(limit * 10, 50),
      where: {
        isActive: true
      },
      include: {
        lawFirm: true
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

    // Admin-configurable scoring/labeling heuristics
    const heuristics = await getHeuristics()

    // Calculate fit scores and format response at attorney level
    const attorneyResults = attorneys.map(attorney => {
      const specialties = (() => { try { return JSON.parse(attorney.specialties || '[]') } catch { return [] } })()
      const venues = (() => { try { return JSON.parse(attorney.venues || '[]') } catch { return [] } })()

      const rating = (attorney as any).attorneyProfile?.averageRating ?? (attorney as any).averageRating
      const reviewsCount = (attorney as any).attorneyProfile?.totalReviews ?? (attorney as any).totalReviews
      const responseTimeHours = (attorney as any).responseTimeHours ?? 24

      // Deterministic fit score from admin-configurable heuristics
      const fitScore = computeAttorneyFitScore(heuristics, {
        venueMatch: Boolean(venue && venues?.includes?.(venue)),
        claimTypeMatch: Boolean(claim_type && specialtiesMatchClaim(specialties)),
        isVerified: Boolean((attorney as any).isVerified),
        rating,
        responseTimeHours,
      })

      const verifiedReviewCount = verifiedReviewCountMap.get(attorney.id) || 0
      const meta = (attorney as any).meta ? (() => { try { return JSON.parse((attorney as any).meta) } catch { return {} } })() : {}
      const outcomes = meta?.outcomes ?? meta?.verified_outcomes ?? {}
      const fee = meta?.fee ?? { contingency_min: 0.3, contingency_max: 0.4 }
      const yearsExperience = (attorney as any).attorneyProfile?.yearsExperience ?? 0
      const responseBadge = getResponseBadge(heuristics, responseTimeHours)

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
        // Only report outcomes that actually exist on the attorney record — never fabricate stats.
        verified_outcomes: {
          trials: outcomes?.trials ?? null,
          settlements: outcomes?.settlements ?? null,
          median_recovery: outcomes?.median_recovery ?? null
        },
        fee: {
          contingency_min: fee?.contingency_min ?? 0.3,
          contingency_max: fee?.contingency_max ?? 0.4
        },
        capacity: 'open',
        languages: (attorney as any).attorneyProfile?.languages ? (() => { try { return JSON.parse((attorney as any).attorneyProfile.languages) } catch { return ['English'] } })() : ['English']
      }
    })

    // When a state (venue) and/or case type is selected, actually filter results
    // rather than only boosting fit score. Previously these were scoring-only, so
    // the State/Case Type selectors appeared to do nothing and unrelated attorneys
    // were still listed for the chosen filters.
    const filteredResults = attorneyResults.filter((a) => {
      const venueOk =
        !venue ||
        (Array.isArray(a.venues) && a.venues.includes(venue)) ||
        (a.law_firm as { state?: string } | undefined)?.state === venue
      const claimOk = !claim_type || specialtiesMatchClaim(a.specialties)
      return venueOk && claimOk
    })

    // Sort by fit score
    filteredResults.sort((a, b) => b.fit_score - a.fit_score)
    const limitedAttorneyResults = filteredResults.slice(0, limit)

    if (!groupByFirm) {
      logger.info('Attorney search completed (individual)')
      return res.json(limitedAttorneyResults)
    }

    // Group by firm
    const firmsMap = new Map<string, any>()

    for (const a of limitedAttorneyResults) {
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
