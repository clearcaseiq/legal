/**
 * Public firm profiles for the marketplace.
 *
 * Read-only, unauthenticated endpoints so plaintiffs (and attorneys evaluating
 * the marketplace) can browse firms and see real trust metrics. Firm management
 * lives in the auth-gated /v1/firm-dashboard route.
 */

import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { computeFirmTrustMetrics } from '../lib/attorney-trust-metrics'

const router = Router()

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : []
  } catch {
    return []
  }
}

// Public firm directory.
router.get('/', async (req, res) => {
  try {
    const { state, q } = req.query as { state?: string; q?: string }
    const firms = await prisma.lawFirm.findMany({
      where: {
        isPublic: true,
        ...(state ? { state } : {}),
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        tagline: true,
        logoUrl: true,
        city: true,
        state: true,
        practiceAreas: true,
        _count: { select: { attorneys: true } },
      },
      orderBy: { name: 'asc' },
      take: 100,
    })

    res.json({
      firms: firms.map((f) => ({
        id: f.id,
        name: f.name,
        slug: f.slug,
        tagline: f.tagline,
        logoUrl: f.logoUrl,
        city: f.city,
        state: f.state,
        practiceAreas: parseJsonArray(f.practiceAreas),
        attorneyCount: f._count.attorneys,
      })),
    })
  } catch (error) {
    logger.error('Failed to list public firms', { error })
    res.status(500).json({ error: 'Failed to list firms' })
  }
})

// Public firm profile by slug.
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params
    const firm = await prisma.lawFirm.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        tagline: true,
        description: true,
        logoUrl: true,
        website: true,
        phone: true,
        city: true,
        state: true,
        zip: true,
        practiceAreas: true,
        foundedYear: true,
        isPublic: true,
        offices: {
          where: { isActive: true },
          select: { id: true, name: true, city: true, state: true, practiceAreas: true },
        },
        attorneys: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            specialties: true,
            averageRating: true,
            totalReviews: true,
            isVerified: true,
            responseTimeHours: true,
          },
        },
      },
    })

    if (!firm || !firm.isPublic) {
      return res.status(404).json({ error: 'Firm not found' })
    }

    const metrics = await computeFirmTrustMetrics(firm.id)

    res.json({
      firm: {
        id: firm.id,
        name: firm.name,
        slug: firm.slug,
        tagline: firm.tagline,
        description: firm.description,
        logoUrl: firm.logoUrl,
        website: firm.website,
        phone: firm.phone,
        city: firm.city,
        state: firm.state,
        zip: firm.zip,
        foundedYear: firm.foundedYear,
        practiceAreas: parseJsonArray(firm.practiceAreas),
        offices: firm.offices.map((o) => ({
          ...o,
          practiceAreas: parseJsonArray(o.practiceAreas),
        })),
        attorneys: firm.attorneys.map((a) => ({
          id: a.id,
          name: a.name,
          specialties: parseJsonArray(a.specialties),
          averageRating: a.averageRating,
          totalReviews: a.totalReviews,
          isVerified: a.isVerified,
          responseTimeHours: a.responseTimeHours,
        })),
      },
      metrics,
    })
  } catch (error) {
    logger.error('Failed to get firm profile', { error, slug: req.params.slug })
    res.status(500).json({ error: 'Failed to get firm profile' })
  }
})

export default router
