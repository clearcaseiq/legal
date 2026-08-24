import { Router, type Request, type Response, type NextFunction } from 'express'
import { authMiddleware } from '../lib/auth'
import { logger } from '../lib/logger'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import {
  haversineMiles,
  isGeocodingConfigured,
  normalizeZip,
  resolveZipCentroids,
} from '../lib/geo-distance'

const router = Router()

/**
 * Ceiling on providers pulled into memory for a radius search. Radius filtering
 * cannot run in SQL while providers carry only a ZIP and no coordinates, so the
 * rows are scored in the API. Hitting this cap is reported to the client rather
 * than quietly truncating the result.
 */
const RADIUS_CANDIDATE_LIMIT = 1000

type RadiusUnavailableReason =
  | 'INVALID_ORIGIN_ZIP'
  | 'GEOCODING_NOT_CONFIGURED'
  | 'ORIGIN_ZIP_UNRESOLVED'

type ProviderWithDistance<T> = T & { distanceMiles: number | null }

type RadiusResult<T> = {
  providers: Array<ProviderWithDistance<T>>
  /** False means every candidate is returned and no radius was enforced. */
  applied: boolean
  reason: RadiusUnavailableReason | null
  /** Providers kept despite an unresolvable ZIP, so the caller can say so. */
  unresolvedProviderCount: number
}

/**
 * Annotates providers with their distance from `originZip` and drops those
 * outside `maxDistanceMiles`.
 *
 * A provider whose own ZIP cannot be resolved is kept with a null distance
 * rather than dropped: hiding a real provider because of a gap in our geocode
 * cache is worse than showing one that may be out of range, and the null makes
 * the gap visible instead of implying a measured distance.
 */
async function applyRadiusFilter<T extends { zipCode: string }>(
  providers: T[],
  originZip: string,
  maxDistanceMiles: number,
): Promise<RadiusResult<T>> {
  const unfiltered = (reason: RadiusUnavailableReason): RadiusResult<T> => ({
    providers: providers.map((provider) => ({ ...provider, distanceMiles: null })),
    applied: false,
    reason,
    unresolvedProviderCount: providers.length,
  })

  const origin = normalizeZip(originZip)
  if (!origin) return unfiltered('INVALID_ORIGIN_ZIP')
  if (!isGeocodingConfigured()) return unfiltered('GEOCODING_NOT_CONFIGURED')

  const centroids = await resolveZipCentroids([
    origin,
    ...providers.map((provider) => provider.zipCode),
  ])

  const originCoordinates = centroids.get(origin)
  if (!originCoordinates) return unfiltered('ORIGIN_ZIP_UNRESOLVED')

  let unresolvedProviderCount = 0

  const scored = providers.map((provider) => {
    const zip = normalizeZip(provider.zipCode)
    const coordinates = zip ? centroids.get(zip) : null
    if (!coordinates) {
      unresolvedProviderCount += 1
      return { ...provider, distanceMiles: null }
    }
    return { ...provider, distanceMiles: haversineMiles(originCoordinates, coordinates) }
  })

  const withinRadius = scored.filter(
    (provider) => provider.distanceMiles === null || provider.distanceMiles <= maxDistanceMiles,
  )

  withinRadius.sort((a, b) => {
    if (a.distanceMiles === null) return b.distanceMiles === null ? 0 : 1
    if (b.distanceMiles === null) return -1
    return a.distanceMiles - b.distanceMiles
  })

  return { providers: withinRadius, applied: true, reason: null, unresolvedProviderCount }
}

/** Clamps paging input so a bad query cannot ask for the whole table. */
function parsePaging(page: unknown, limit: unknown): { page: number; limit: number } {
  const parsedPage = Math.max(1, Number.parseInt(String(page ?? 1), 10) || 1)
  const parsedLimit = Math.min(100, Math.max(1, Number.parseInt(String(limit ?? 20), 10) || 20))
  return { page: parsedPage, limit: parsedLimit }
}

/** Positive, finite mile count, or null when the caller did not ask for a radius. */
function parseMaxDistance(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null
  const miles = Number(value)
  return Number.isFinite(miles) && miles > 0 ? miles : null
}

/**
 * Attorney-to-provider referrals, off by default.
 *
 * Bus. & Prof. Code § 6155(f)(2)-(3) makes it cause for denial or revocation of
 * referral-service certification to share operations with any entity that refers
 * to health care providers, or to take direct or indirect consideration
 * regarding such referrals. No fee field exists on the provider record, so no
 * money changes hands here — but the statute speaks to operations, not only
 * payment, and this feature is exactly that: a lien-filtered provider directory,
 * a referral record, and a letter of protection carrying lien terms.
 *
 * Whether ClearCaseIQ pursues § 6155 certification is a business decision that
 * is not settled. Until it is, the referral-making surface stays disabled rather
 * than deleted, so a decision to certify does not require rebuilding it and a
 * decision not to certify is one env var away. History remains readable: only the
 * endpoints that find a provider to refer to, or that create or advance a
 * referral, are gated.
 */
export function areProviderReferralsEnabled(): boolean {
  return process.env.PROVIDER_REFERRALS_ENABLED === 'true'
}

function requireProviderReferralsEnabled(_req: Request, res: Response, next: NextFunction) {
  if (areProviderReferralsEnabled()) return next()
  return res.status(403).json({
    error:
      'Provider referrals are disabled pending review of referral-service certification requirements.',
    code: 'PROVIDER_REFERRALS_DISABLED',
  })
}

/** Lets the attorney UI explain the state instead of surfacing a bare 403. */
router.get('/config', authMiddleware, (_req: any, res) => {
  res.json({
    referralsEnabled: areProviderReferralsEnabled(),
    disabledReason: areProviderReferralsEnabled()
      ? null
      : 'Attorney-to-provider referrals are turned off while referral-service certification requirements under B&P § 6155(f) are reviewed. Existing referrals and treatment records stay visible.',
  })
})

// Medical Provider Management

// Get medical providers
router.get('/providers', authMiddleware, requireProviderReferralsEnabled, async (req: any, res) => {
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

    const paging = parsePaging(page, limit)
    const maxDistanceMiles = parseMaxDistance(maxDistance)
    // With a radius, the ZIP is where the attorney is searching from, so it must
    // not also narrow the query to providers sitting in that exact ZIP.
    const radiusOrigin = maxDistanceMiles !== null && zipCode ? String(zipCode) : null

    const whereClause: any = {}

    if (specialty) whereClause.specialty = specialty
    if (city) whereClause.city = { contains: city, mode: 'insensitive' }
    if (state) whereClause.state = state
    if (zipCode && !radiusOrigin) whereClause.zipCode = zipCode
    if (acceptsLien !== undefined) whereClause.acceptsLien = acceptsLien === 'true'
    if (isVerified !== undefined) whereClause.isVerified = isVerified === 'true'

    const orderBy = [{ isVerified: 'desc' as const }, { rating: 'desc' as const }]

    if (!radiusOrigin) {
      const [providers, totalCount] = await Promise.all([
        prisma.medicalProvider.findMany({
          where: whereClause,
          orderBy,
          skip: (paging.page - 1) * paging.limit,
          take: paging.limit,
        }),
        prisma.medicalProvider.count({ where: whereClause }),
      ])

      return res.json({
        providers,
        totalCount,
        page: paging.page,
        limit: paging.limit,
        distanceFilter: { requested: false, applied: false, reason: null },
      })
    }

    // Radius searches score in memory, so candidates are fetched before paging.
    const candidates = await prisma.medicalProvider.findMany({
      where: whereClause,
      orderBy,
      take: RADIUS_CANDIDATE_LIMIT + 1,
    })
    const truncated = candidates.length > RADIUS_CANDIDATE_LIMIT

    const radius = await applyRadiusFilter(
      truncated ? candidates.slice(0, RADIUS_CANDIDATE_LIMIT) : candidates,
      radiusOrigin,
      maxDistanceMiles as number,
    )

    const start = (paging.page - 1) * paging.limit

    res.json({
      providers: radius.providers.slice(start, start + paging.limit),
      totalCount: radius.providers.length,
      page: paging.page,
      limit: paging.limit,
      distanceFilter: {
        requested: true,
        applied: radius.applied,
        reason: radius.reason,
        originZip: radiusOrigin,
        maxDistanceMiles,
        unresolvedProviderCount: radius.unresolvedProviderCount,
        candidatesTruncated: truncated,
      },
    })
  } catch (error: any) {
    logger.error('Failed to get medical providers', { error: error.message })
    res.status(500).json({ error: 'Failed to get medical providers' })
  }
})

// Get provider details
router.get('/providers/:providerId', authMiddleware, requireProviderReferralsEnabled, async (req: any, res) => {
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
router.post('/referrals', authMiddleware, requireProviderReferralsEnabled, async (req: any, res) => {
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
        },
        lettersOfProtection: {
          orderBy: { createdAt: 'desc' },
          take: 1
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
router.put('/referrals/:referralId', authMiddleware, requireProviderReferralsEnabled, async (req: any, res) => {
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
router.post('/search', authMiddleware, requireProviderReferralsEnabled, async (req: any, res) => {
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

    const paging = parsePaging(page, limit)
    const maxDistanceMiles = parseMaxDistance(maxDistance)
    // As on GET /providers, a radius makes the ZIP an origin rather than a filter.
    const radiusOrigin =
      maxDistanceMiles !== null && location?.zipCode ? String(location.zipCode) : null

    const whereClause: any = {}

    if (specialty) whereClause.specialty = specialty
    if (acceptsLien !== undefined) whereClause.acceptsLien = acceptsLien
    if (isVerified !== undefined) whereClause.isVerified = isVerified
    if (minRating) whereClause.rating = { gte: minRating }

    // Location-based filtering
    if (location?.city) whereClause.city = { contains: location.city, mode: 'insensitive' }
    if (location?.state) whereClause.state = location.state
    if (location?.zipCode && !radiusOrigin) whereClause.zipCode = location.zipCode

    const candidates = await prisma.medicalProvider.findMany({
      where: whereClause,
      orderBy: [
        { isVerified: 'desc' },
        { rating: 'desc' }
      ],
      take: RADIUS_CANDIDATE_LIMIT + 1
    })
    const truncated = candidates.length > RADIUS_CANDIDATE_LIMIT
    const providers = truncated ? candidates.slice(0, RADIUS_CANDIDATE_LIMIT) : candidates

    const radius = radiusOrigin
      ? await applyRadiusFilter(providers, radiusOrigin, maxDistanceMiles as number)
      : null

    const filteredProviders = radius ? radius.providers : providers

    // `languages` and `insuranceAccepted` are accepted by this endpoint's contract
    // but MedicalProvider stores neither, so they cannot be honoured. They used to
    // run through a filter callback that returned true for every provider, which
    // read as a working filter. The request is now reported back as unsupported
    // instead of being silently dropped.
    const unsupportedFilters: string[] = []
    if (Array.isArray(languages) && languages.length > 0) unsupportedFilters.push('languages')
    if (Array.isArray(insuranceAccepted) && insuranceAccepted.length > 0) {
      unsupportedFilters.push('insuranceAccepted')
    }

    // Pagination
    const startIndex = (paging.page - 1) * paging.limit
    const endIndex = startIndex + paging.limit
    const paginatedProviders = filteredProviders.slice(startIndex, endIndex)

    res.json({
      providers: paginatedProviders,
      totalCount: filteredProviders.length,
      page: paging.page,
      limit: paging.limit,
      distanceFilter: {
        requested: maxDistanceMiles !== null,
        applied: radius?.applied ?? false,
        reason: radius?.reason ?? null,
        originZip: radiusOrigin,
        maxDistanceMiles,
        unresolvedProviderCount: radius?.unresolvedProviderCount ?? 0,
        candidatesTruncated: truncated
      },
      unsupportedFilters,
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

// ---------------------------------------------------------------------------
// Letters of Protection (LOP)
//
// The lien instrument an attorney sends a provider: "this is a PI case, treat
// the client now, you'll be paid from the settlement." Generated from a
// provider referral, optionally emailed to the provider, and linked to the
// LienHolder it creates so the lien is tracked from the moment it is issued.
// ---------------------------------------------------------------------------

function parseAssessmentFacts(raw?: string | null): Record<string, any> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function resolveClientName(lead: any): string {
  const user = lead?.assessment?.user
  if (user?.firstName || user?.lastName) {
    return [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  }
  const facts = parseAssessmentFacts(lead?.assessment?.facts)
  const fromFacts =
    facts.clientName ||
    facts.fullName ||
    [facts.firstName, facts.lastName].filter(Boolean).join(' ').trim() ||
    [facts?.contact?.firstName, facts?.contact?.lastName].filter(Boolean).join(' ').trim()
  return (String(fromFacts || '')).trim() || 'the client'
}

function resolveIncidentDate(lead: any): string | null {
  const facts = parseAssessmentFacts(lead?.assessment?.facts)
  const raw =
    facts.incidentDate ||
    facts.dateOfLoss ||
    facts?.incident?.date ||
    facts?.accident?.date ||
    null
  if (!raw) return null
  const d = new Date(raw)
  return isNaN(d.getTime())
    ? String(raw)
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function composeLetterOfProtection(opts: {
  attorney: { name: string; email?: string | null; phone?: string | null; firmName?: string | null }
  provider: { name: string; specialty?: string | null }
  clientName: string
  claimType?: string | null
  incidentDate?: string | null
}): string {
  const { attorney, provider, clientName, claimType, incidentDate } = opts
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const firmLine = attorney.firmName ? `${attorney.firmName}\n` : ''
  const contactLines = [attorney.email, attorney.phone].filter(Boolean).join(' | ')
  const matterLine = [
    claimType ? `Matter: ${claimType}` : null,
    incidentDate ? `Date of incident: ${incidentDate}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  return `${today}

${provider.name}
${provider.specialty || ''}

RE: Letter of Protection / Lien — ${clientName}
${matterLine}

Dear ${provider.name},

Please be advised that this office represents ${clientName} in connection with a personal injury claim. We are writing to confirm our client's treatment with your practice and to provide our assurance of payment.

This letter authorizes you to provide medical treatment to ${clientName} on a lien basis. In consideration of your agreement to treat our client and to defer payment, this office agrees to protect your interest and to pay your reasonable and necessary charges for services rendered out of any settlement, judgment, or recovery obtained on our client's behalf, to the extent of such recovery.

Our client authorizes and directs this office to pay you directly from the proceeds of any such recovery before any funds are disbursed to the client. This office will withhold sufficient funds from any settlement or judgment to satisfy your outstanding balance.

Please note:
- This is a personal injury (PI) matter and your account should be handled accordingly.
- Payment is contingent upon recovery and is not a personal guarantee by this office.
- Please forward all bills, records, and reports for ${clientName} to our office.
- Notify us promptly of the treatment plan and any material change to the outstanding balance.

Thank you for your assistance in providing care to our client. Please sign and return a copy of this letter to acknowledge your agreement.

Sincerely,

${attorney.name}
${firmLine}${contactLines}

Acknowledged and agreed:

_____________________________   Date: ____________
${provider.name}`
}

async function queueProviderEmail(
  recipient: string | null | undefined,
  subject: string,
  message: string,
  metadata?: Record<string, unknown>
) {
  if (!recipient) return
  await prisma.notification.create({
    data: {
      type: 'email',
      recipient,
      subject,
      message,
      metadata: metadata ? JSON.stringify(metadata) : null,
      status: 'SENT',
    },
  })
}

// Generate (or regenerate) a draft Letter of Protection for a referral.
// Accepts an optional `content` override so attorneys can edit before sending.
router.post('/referrals/:referralId/letter-of-protection', authMiddleware, requireProviderReferralsEnabled, async (req: any, res) => {
  try {
    const attorneyId = req.user.id
    const { referralId } = req.params

    const referral = await prisma.providerReferral.findFirst({
      where: { id: referralId, attorneyId },
      include: {
        provider: true,
        attorney: { include: { lawFirm: true } },
        lead: { include: { assessment: { include: { user: true } } } },
      },
    })

    if (!referral) {
      return res.status(404).json({ error: 'Referral not found or access denied' })
    }

    const override = typeof req.body?.content === 'string' ? req.body.content.trim() : ''
    const content = override
      ? override
      : composeLetterOfProtection({
          attorney: {
            name: referral.attorney.name,
            email: referral.attorney.email,
            phone: referral.attorney.phone,
            firmName: referral.attorney.lawFirm?.name,
          },
          provider: { name: referral.provider.name, specialty: referral.provider.specialty },
          clientName: resolveClientName(referral.lead),
          claimType: referral.lead.assessment?.claimType,
          incidentDate: resolveIncidentDate(referral.lead),
        })

    // One active draft per referral: reuse it if present, otherwise create.
    const existingDraft = await prisma.letterOfProtection.findFirst({
      where: { referralId, status: 'draft' },
      orderBy: { createdAt: 'desc' },
    })

    const lop = existingDraft
      ? await prisma.letterOfProtection.update({ where: { id: existingDraft.id }, data: { content } })
      : await prisma.letterOfProtection.create({
          data: {
            referralId,
            leadId: referral.leadId,
            providerId: referral.providerId,
            attorneyId,
            content,
            status: 'draft',
          },
        })

    res.json(lop)
  } catch (error: any) {
    logger.error('Failed to generate letter of protection', { error: error.message })
    res.status(500).json({ error: 'Failed to generate letter of protection' })
  }
})

// Get the most recent Letter of Protection for a referral (or null).
router.get('/referrals/:referralId/letter-of-protection', authMiddleware, async (req: any, res) => {
  try {
    const attorneyId = req.user.id
    const { referralId } = req.params

    const referral = await prisma.providerReferral.findFirst({
      where: { id: referralId, attorneyId },
    })
    if (!referral) {
      return res.status(404).json({ error: 'Referral not found or access denied' })
    }

    const lop = await prisma.letterOfProtection.findFirst({
      where: { referralId },
      orderBy: { createdAt: 'desc' },
    })
    res.json(lop)
  } catch (error: any) {
    logger.error('Failed to load letter of protection', { error: error.message })
    res.status(500).json({ error: 'Failed to load letter of protection' })
  }
})

// Send the Letter of Protection to the provider. This emails the provider a
// PI-case notice + the letter, and auto-creates a linked LienHolder so the
// lien is tracked from the moment it is issued.
router.post('/letters-of-protection/:id/send', authMiddleware, requireProviderReferralsEnabled, async (req: any, res) => {
  try {
    const attorneyId = req.user.id
    const { id } = req.params

    const lop = await prisma.letterOfProtection.findFirst({
      where: { id, attorneyId },
      include: { provider: true, lead: true },
    })
    if (!lop) {
      return res.status(404).json({ error: 'Letter of protection not found or access denied' })
    }

    const recipientEmail = (req.body?.recipientEmail || lop.provider.email || '').trim()

    // Establish the lien holder (once) so it is tracked from issuance.
    let lienHolderId = lop.lienHolderId
    const assessmentId = lop.lead.assessmentId
    if (!lienHolderId && assessmentId) {
      const lien = await prisma.lienHolder.create({
        data: {
          assessmentId,
          name: lop.provider.name,
          type: 'medical',
          amount: null,
          status: 'open',
          notes: `Lien established via Letter of Protection on ${new Date().toLocaleDateString('en-US')}.`,
        },
      })
      lienHolderId = lien.id
    }

    const updated = await prisma.letterOfProtection.update({
      where: { id },
      data: { status: 'sent', sentAt: new Date(), lienHolderId },
    })

    await queueProviderEmail(
      recipientEmail,
      `Letter of Protection — ${lop.provider.name}`,
      lop.content,
      { letterOfProtectionId: lop.id, providerId: lop.providerId, leadId: lop.leadId }
    )

    res.json({ ...updated, emailQueued: Boolean(recipientEmail), lienHolderId })
  } catch (error: any) {
    logger.error('Failed to send letter of protection', { error: error.message })
    res.status(500).json({ error: 'Failed to send letter of protection' })
  }
})

// ---------------------------------------------------------------------------
// Treatment records (treatment / diagnoses / bills ledger)
//
// The running ledger an attorney keeps for a referral while the client treats
// on a lien: each encounter (visit type), any diagnosis (free text + ICD-10),
// and the amount the provider billed. Access is scoped through the parent
// referral so attorneys only see their own clients' records.
// ---------------------------------------------------------------------------

const treatmentRecordSchema = z.object({
  visitDate: z.string().min(1, 'visitDate is required'),
  visitType: z
    .enum(['initial_eval', 'follow_up', 'procedure', 'imaging', 'therapy', 'other'])
    .optional(),
  diagnosis: z.string().trim().max(2000).optional().nullable(),
  diagnosisCode: z.string().trim().max(20).optional().nullable(),
  billedAmount: z.number().nonnegative().optional().nullable(),
  status: z.enum(['scheduled', 'completed', 'no_show', 'cancelled']).optional(),
  notes: z.string().trim().max(4000).optional().nullable(),
})

function summarizeTreatment(records: Array<{ billedAmount: number | null; status: string; visitDate: Date }>) {
  const billable = records.filter((r) => r.status !== 'cancelled' && r.status !== 'no_show')
  const totalBilled = billable.reduce((sum, r) => sum + (r.billedAmount || 0), 0)
  const visitDates = records
    .filter((r) => r.status === 'completed')
    .map((r) => r.visitDate)
    .sort((a, b) => a.getTime() - b.getTime())
  return {
    totalRecords: records.length,
    completedVisits: records.filter((r) => r.status === 'completed').length,
    totalBilled,
    firstVisitDate: visitDates[0] ?? null,
    lastVisitDate: visitDates[visitDates.length - 1] ?? null,
  }
}

// Confirm the attorney owns the referral before touching its treatment records.
async function findOwnedReferral(referralId: string, attorneyId: string) {
  return prisma.providerReferral.findFirst({ where: { id: referralId, attorneyId } })
}

// Aggregate treatment summary for a whole lead/case (across all referrals).
// Used by the demand workstream to show itemized medical specials on screen.
router.get('/leads/:leadId/treatment-summary', authMiddleware, async (req: any, res) => {
  try {
    const attorneyId = req.user.id
    const { leadId } = req.params

    const lead = await prisma.leadSubmission.findFirst({
      where: {
        id: leadId,
        OR: [{ assignedAttorneyId: attorneyId }, { assignmentType: 'shared' }],
      },
    })
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found or access denied' })
    }

    const records = await prisma.treatmentRecord.findMany({ where: { leadId } })
    res.json({ summary: summarizeTreatment(records) })
  } catch (error: any) {
    logger.error('Failed to load lead treatment summary', { error: error.message })
    res.status(500).json({ error: 'Failed to load lead treatment summary' })
  }
})

// List treatment records for a referral, plus an aggregate summary.
router.get('/referrals/:referralId/treatment-records', authMiddleware, async (req: any, res) => {
  try {
    const attorneyId = req.user.id
    const { referralId } = req.params

    const referral = await findOwnedReferral(referralId, attorneyId)
    if (!referral) {
      return res.status(404).json({ error: 'Referral not found or access denied' })
    }

    const records = await prisma.treatmentRecord.findMany({
      where: { referralId },
      orderBy: { visitDate: 'desc' },
    })

    res.json({ records, summary: summarizeTreatment(records) })
  } catch (error: any) {
    logger.error('Failed to list treatment records', { error: error.message })
    res.status(500).json({ error: 'Failed to list treatment records' })
  }
})

// Add a treatment record (a visit, diagnosis, and/or bill) to a referral.
router.post('/referrals/:referralId/treatment-records', authMiddleware, async (req: any, res) => {
  try {
    const attorneyId = req.user.id
    const { referralId } = req.params

    const referral = await findOwnedReferral(referralId, attorneyId)
    if (!referral) {
      return res.status(404).json({ error: 'Referral not found or access denied' })
    }

    const parsed = treatmentRecordSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid treatment record', details: parsed.error.flatten() })
    }

    const visitDate = new Date(parsed.data.visitDate)
    if (isNaN(visitDate.getTime())) {
      return res.status(400).json({ error: 'Invalid visitDate' })
    }

    const record = await prisma.treatmentRecord.create({
      data: {
        referralId,
        leadId: referral.leadId,
        providerId: referral.providerId,
        attorneyId,
        visitDate,
        visitType: parsed.data.visitType ?? 'follow_up',
        diagnosis: parsed.data.diagnosis ?? null,
        diagnosisCode: parsed.data.diagnosisCode ?? null,
        billedAmount: parsed.data.billedAmount ?? null,
        status: parsed.data.status ?? 'completed',
        notes: parsed.data.notes ?? null,
      },
    })

    res.json(record)
  } catch (error: any) {
    logger.error('Failed to create treatment record', { error: error.message })
    res.status(500).json({ error: 'Failed to create treatment record' })
  }
})

// Update a treatment record.
router.put('/treatment-records/:id', authMiddleware, async (req: any, res) => {
  try {
    const attorneyId = req.user.id
    const { id } = req.params

    const existing = await prisma.treatmentRecord.findFirst({ where: { id, attorneyId } })
    if (!existing) {
      return res.status(404).json({ error: 'Treatment record not found or access denied' })
    }

    const parsed = treatmentRecordSchema.partial().safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid treatment record', details: parsed.error.flatten() })
    }

    const data: any = {}
    if (parsed.data.visitDate !== undefined) {
      const visitDate = new Date(parsed.data.visitDate)
      if (isNaN(visitDate.getTime())) {
        return res.status(400).json({ error: 'Invalid visitDate' })
      }
      data.visitDate = visitDate
    }
    if (parsed.data.visitType !== undefined) data.visitType = parsed.data.visitType
    if (parsed.data.diagnosis !== undefined) data.diagnosis = parsed.data.diagnosis ?? null
    if (parsed.data.diagnosisCode !== undefined) data.diagnosisCode = parsed.data.diagnosisCode ?? null
    if (parsed.data.billedAmount !== undefined) data.billedAmount = parsed.data.billedAmount ?? null
    if (parsed.data.status !== undefined) data.status = parsed.data.status
    if (parsed.data.notes !== undefined) data.notes = parsed.data.notes ?? null

    const record = await prisma.treatmentRecord.update({ where: { id }, data })
    res.json(record)
  } catch (error: any) {
    logger.error('Failed to update treatment record', { error: error.message })
    res.status(500).json({ error: 'Failed to update treatment record' })
  }
})

// Delete a treatment record.
router.delete('/treatment-records/:id', authMiddleware, async (req: any, res) => {
  try {
    const attorneyId = req.user.id
    const { id } = req.params

    const existing = await prisma.treatmentRecord.findFirst({ where: { id, attorneyId } })
    if (!existing) {
      return res.status(404).json({ error: 'Treatment record not found or access denied' })
    }

    await prisma.treatmentRecord.delete({ where: { id } })
    res.json({ success: true })
  } catch (error: any) {
    logger.error('Failed to delete treatment record', { error: error.message })
    res.status(500).json({ error: 'Failed to delete treatment record' })
  }
})

export default router
