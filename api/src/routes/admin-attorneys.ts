import { Router, type Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { adminMiddleware, requireAdminCapability } from '../lib/admin-access'
import { writeAdminAudit } from '../lib/admin-audit'
import { parsePagination, paginated } from '../lib/pagination'
import { CaseForRouting, AttorneyForRouting, filterEligibleAttorneys } from '../lib/routing'
import { safeJsonParse } from './admin-shared'

const router: ExpressRouter = Router()

router.get('/attorneys/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const [attorney, verifiedReviewCount, reviews] = await Promise.all([
      prisma.attorney.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          isActive: true,
          isVerified: true,
          responseTimeHours: true,
          averageRating: true,
          totalReviews: true,
          specialties: true,
          venues: true,
          lawFirm: {
            select: {
              id: true,
              name: true,
            },
          },
          attorneyProfile: {
            select: {
              jurisdictions: true,
            },
          },
          dashboard: {
            select: {
              id: true,
            },
          },
          introductions: {
            select: {
              status: true,
              createdAt: true,
              requestedAt: true,
              respondedAt: true,
              assessment: { select: { id: true, claimType: true, venueState: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 50
          },
          _count: { select: { introductions: true } }
        }
      }),
      prisma.attorneyReview.count({
        where: {
          attorneyId: id,
          isVerified: true,
        },
      }),
      // Surface the actual submitted reviews so admins can read them (CP-308).
      prisma.attorneyReview.findMany({
        where: { attorneyId: id },
        select: {
          id: true,
          rating: true,
          title: true,
          review: true,
          isVerified: true,
          createdAt: true,
          user: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ])

    if (!attorney) {
      return res.status(404).json({ error: 'Attorney not found' })
    }

    // Also fetch cases assigned via LeadSubmission (admin assign, etc.) - these may not have Introduction
    const assignedLeads = await prisma.leadSubmission.findMany({
      where: { assignedAttorneyId: id },
      select: {
        assessmentId: true,
        status: true,
        submittedAt: true,
        assessment: { select: { id: true, claimType: true, venueState: true } },
      },
      orderBy: { submittedAt: 'desc' },
      take: 50
    })

    // Firm team members (paralegals, case managers, intake specialists, etc.) so the
    // admin sees the whole firm — not just the attorney. Previously the admin view
    // surfaced attorney info only and firm staff were invisible (CP-334).
    const firmMembers = attorney.lawFirm?.id
      ? await prisma.firmMember.findMany({
          where: { lawFirmId: attorney.lawFirm.id },
          select: {
            id: true,
            role: true,
            title: true,
            status: true,
            joinedAt: true,
            createdAt: true,
            user: { select: { firstName: true, lastName: true, email: true } },
            office: { select: { name: true } },
          },
          orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
        }).catch(() => [])
      : []

    const totalIntros = attorney._count.introductions
    const accepted = attorney.introductions.filter(i => i.status === 'ACCEPTED').length
    const declined = attorney.introductions.filter(i => i.status === 'DECLINED').length
    const pending = attorney.introductions.filter(i => i.status === 'PENDING').length
    const responseTimes = attorney.introductions
      .filter(i => i.status === 'ACCEPTED' && i.respondedAt)
      .map(i => new Date(i.respondedAt!).getTime() - new Date(i.requestedAt).getTime())
    const medianResponseMs = responseTimes.length > 0
      ? responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length / 2)]
      : 0

    // Merge Introduction cases + LeadSubmission-assigned cases; dedupe by assessmentId; prefer Introduction status
    const seenIds = new Set<string>()
    const fromIntros = attorney.introductions.map(i => ({
      id: i.assessment.id,
      claimType: i.assessment.claimType,
      venueState: i.assessment.venueState,
      status: i.status,
      createdAt: i.createdAt
    }))
    for (const c of fromIntros) {
      seenIds.add(c.id)
    }
    const fromLeads = assignedLeads
      .filter(l => !seenIds.has(l.assessmentId))
      .map(l => ({
        id: l.assessment.id,
        claimType: l.assessment.claimType,
        venueState: l.assessment.venueState,
        status: l.status === 'contacted' || l.status === 'consulted' || l.status === 'retained' ? 'ACCEPTED' : l.status === 'rejected' ? 'DECLINED' : 'PENDING',
        createdAt: l.submittedAt
      }))
    for (const c of fromLeads) {
      seenIds.add(c.id)
    }
    const recentCases = [...fromIntros, ...fromLeads]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 25)

    res.json({
      ...attorney,
      specialties: attorney.specialties ? JSON.parse(attorney.specialties) : [],
      venues: attorney.venues ? JSON.parse(attorney.venues) : [],
      profile: attorney.attorneyProfile,
      attorneyDashboard: attorney.dashboard,
      verifiedReviewCount,
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        review: r.review,
        isVerified: r.isVerified,
        createdAt: r.createdAt,
        reviewerName: `${r.user?.firstName || ''} ${r.user?.lastName || ''}`.trim() || 'Anonymous',
      })),
      performance: {
        acceptanceRate: totalIntros > 0 ? Math.round((accepted / totalIntros) * 100) : 0,
        medianResponseMinutes: Math.round(medianResponseMs / 60000),
        totalRouted: totalIntros,
        accepted,
        declined,
        pending
      },
      recentCases,
      firmMembers: firmMembers.map((m) => ({
        id: m.id,
        role: m.role,
        title: m.title,
        status: m.status,
        joinedAt: m.joinedAt,
        name: `${m.user?.firstName || ''} ${m.user?.lastName || ''}`.trim() || m.user?.email || '—',
        email: m.user?.email || null,
        office: m.office?.name || null,
      })),
    })
  } catch (error) {
    logger.error('Failed to get attorney detail', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/attorney-debug', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const email = String(req.query.email || '').trim()
    if (!email) {
      return res.status(400).json({ error: 'Query param email is required (e.g. ?email=aaron.gomez31@lawfirm.com)' })
    }
    const emailLower = email.toLowerCase()
    const attorneys = await prisma.attorney.findMany({
      where: { isActive: true },
      select: { id: true, email: true, name: true }
    })
    const attorney = attorneys.find(a => a.email?.trim().toLowerCase() === emailLower)
    const user = await prisma.user.findUnique({
      where: { email: email },
      select: { id: true, email: true, firstName: true, lastName: true, role: true }
    })
    const userByInsensitive = !user && await prisma.$queryRaw<{ id: string; email: string }[]>`
      SELECT id, email
      FROM users
      WHERE LOWER(TRIM(email)) = ${emailLower}
      LIMIT 1
    `.then(r => r[0]).catch(() => null)
    const userRes = user || (userByInsensitive ? { id: userByInsensitive.id, email: userByInsensitive.email, firstName: '', lastName: '', role: '' } : null)
    if (!attorney) {
      return res.json({
        email,
        attorney: null,
        user: userRes,
        message: 'Attorney not found with this email. Check spelling and that the attorney completed registration.'
      })
    }
    const [introCount, assignedCount, introAssessmentRows] = await Promise.all([
      prisma.introduction.count({ where: { attorneyId: attorney.id } }),
      prisma.leadSubmission.count({ where: { assignedAttorneyId: attorney.id } }),
      prisma.introduction.findMany({
        where: { attorneyId: attorney.id },
        select: { assessmentId: true },
        distinct: ['assessmentId']
      })
    ])
    const assessmentIds = introAssessmentRows.map((row) => row.assessmentId)
    const [introLeadCount, sampleLeads] = assessmentIds.length > 0
      ? await Promise.all([
          prisma.leadSubmission.count({
            where: { assessmentId: { in: assessmentIds } }
          }),
          prisma.leadSubmission.findMany({
            where: { assessmentId: { in: assessmentIds } },
            select: { id: true, assessmentId: true, assignedAttorneyId: true, status: true, submittedAt: true },
            orderBy: { submittedAt: 'desc' },
            take: 5
          })
        ])
      : [0, []]
    return res.json({
      email,
      attorney: { id: attorney.id, email: attorney.email, name: attorney.name },
      user: userRes,
      emailMatch: userRes ? (userRes.email?.trim().toLowerCase() === emailLower) : null,
      introCount,
      assignedCount,
      totalLeadsFromIntroPath: introLeadCount,
      sampleLeads,
      message: !userRes
        ? 'No User with this email. Attorney must log in with the same email used for routing.'
        : userRes.email?.trim().toLowerCase() !== emailLower
          ? `User email "${userRes.email}" does not exactly match attorney email "${attorney.email}". Dashboard lookup may fail.`
          : 'OK'
    })
  } catch (error: any) {
    logger.error('Attorney debug failed', { error: error.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/attorneys', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { caseId, groupBy, search, status } = req.query // Optional: filter by case eligibility and grouping
    const groupByFirm = groupBy === 'firm'
    const paginate = !caseId && !groupByFirm && req.query.limit !== undefined
    const { take, skip } = parsePagination(req.query as Record<string, unknown>, {
      defaultLimit: 50,
      maxLimit: 200,
    })

    // Routing callers only ever want attorneys who can receive a case, so
    // active-only stays the default. The admin list opts into ?status=all
    // because otherwise a deactivated attorney is invisible and can never be
    // reactivated from the UI.
    const statusFilter = typeof status === 'string' ? status.trim().toLowerCase() : ''
    const where: Record<string, unknown> = {}
    if (statusFilter === 'inactive') where.isActive = false
    else if (statusFilter !== 'all') where.isActive = true

    if (statusFilter === 'verified') where.isVerified = true
    else if (statusFilter === 'unverified') where.isVerified = false

    const searchTerm = typeof search === 'string' ? search.trim() : ''
    if (searchTerm) {
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { lawFirm: { name: { contains: searchTerm, mode: 'insensitive' } } },
      ]
    }

    const attorneys = await prisma.attorney.findMany({
      where,
      ...(paginate ? { take, skip } : {}),
      select: {
        id: true,
        name: true,
        email: true,
        specialties: true,
        venues: true,
        isActive: true,
        isVerified: true,
        responseTimeHours: true,
        averageRating: true,
        totalReviews: true,
        lawFirm: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            state: true
          }
        },
        attorneyProfile: {
          select: {
            jurisdictions: true,
            excludedCaseTypes: true,
            minInjurySeverity: true,
            minDamagesRange: true,
            maxDamagesRange: true,
            maxCasesPerWeek: true,
            maxCasesPerMonth: true,
            subscriptionTier: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
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
    const attorneyEmails = attorneys
      .map((attorney) => attorney.email?.trim().toLowerCase())
      .filter((email): email is string => Boolean(email))
    const attorneyUsers = attorneyEmails.length
      ? await prisma.user.findMany({
          where: {
            email: { in: attorneyEmails },
            role: 'attorney',
          },
          select: {
            email: true,
            lastLoginAt: true,
            emailVerified: true,
          },
        })
      : []
    const lastLoginByEmail = new Map(
      attorneyUsers.map((user) => [user.email.trim().toLowerCase(), user.lastLoginAt])
    )
    // Distinct from isVerified: this only says the signup address was confirmed,
    // not that the attorney has been vetted. Attorneys with no login account
    // (bulk directory imports) have nothing to confirm, hence null rather than
    // false, so the admin table can show "—" instead of implying a problem.
    const emailVerifiedByEmail = new Map(
      attorneyUsers.map((user) => [user.email.trim().toLowerCase(), user.emailVerified])
    )

    let formattedAttorneys = attorneys.map(attorney => ({
      id: attorney.id,
      name: attorney.name,
      email: attorney.email,
      specialties: attorney.specialties ? JSON.parse(attorney.specialties) : [],
      venues: attorney.venues ? JSON.parse(attorney.venues) : [],
      isActive: attorney.isActive,
      isVerified: attorney.isVerified,
      responseTimeHours: attorney.responseTimeHours,
      averageRating: attorney.averageRating,
      totalReviews: attorney.totalReviews,
      verifiedReviewCount: verifiedReviewCountMap.get(attorney.id) || 0,
      lastActiveAt: attorney.email ? lastLoginByEmail.get(attorney.email.trim().toLowerCase()) || null : null,
      emailVerified: attorney.email
        ? emailVerifiedByEmail.get(attorney.email.trim().toLowerCase()) ?? null
        : null,
      lawFirm: attorney.lawFirm,
      subscriptionTier: attorney.attorneyProfile?.subscriptionTier || null,
      profile: attorney.attorneyProfile
    }))

    // If caseId provided, filter to only eligible attorneys
    if (caseId) {
      const assessment = await prisma.assessment.findUnique({
        where: { id: caseId as string },
        include: {
          predictions: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      })

      if (assessment) {
        const caseData: CaseForRouting = {
          id: assessment.id,
          claimType: assessment.claimType,
          venueState: assessment.venueState,
          venueCounty: assessment.venueCounty,
          facts: assessment.facts ? JSON.parse(assessment.facts) : undefined,
          prediction: assessment.predictions[0] ? {
            viability: JSON.parse(assessment.predictions[0].viability),
            bands: JSON.parse(assessment.predictions[0].bands)
          } : undefined
        }

      const attorneysForFiltering = attorneys.map(a => ({
          id: a.id,
          isActive: true,
        isVerified: a.isVerified,
        specialties: a.specialties,
        attorneyProfile: a.attorneyProfile
        }))

        const { eligible, ineligible } = await filterEligibleAttorneys(
          attorneysForFiltering,
          caseData
        )

        // Map back to formatted attorneys with eligibility info
        formattedAttorneys = formattedAttorneys.map(att => {
          const eligibleAttorney = eligible.find(e => e.id === att.id)
          const ineligibleInfo = ineligible.find(i => i.attorney.id === att.id)
          
          return {
            ...att,
            eligible: !!eligibleAttorney,
            ineligibilityReason: ineligibleInfo?.reason
          }
        })
      }
    }

    if (!groupByFirm) {
      if (!paginate) {
        return res.json({ attorneys: formattedAttorneys })
      }
      const total = await prisma.attorney.count({ where })
      return res.json({
        attorneys: formattedAttorneys,
        ...paginated(formattedAttorneys, total, { take, skip }),
      })
    }

    // Group by firm
    const firmsMap = new Map<string, any>()

    for (const att of formattedAttorneys) {
      const key = att.lawFirm?.id || att.lawFirm?.name || 'Independent'
      if (!firmsMap.has(key)) {
        firmsMap.set(key, {
          firmId: att.lawFirm?.id || null,
          firmName: att.lawFirm?.name || 'Independent Attorney',
          slug: att.lawFirm?.slug || null,
          city: att.lawFirm?.city || null,
          state: att.lawFirm?.state || null,
          attorneys: [],
          attorneyCount: 0
        })
      }
      const firm = firmsMap.get(key)
      firm.attorneys.push(att)
      firm.attorneyCount += 1
    }

    const firms = Array.from(firmsMap.values()).sort((a, b) => a.firmName.localeCompare(b.firmName))

    res.json({
      firms,
      totalFirms: firms.length,
      totalAttorneys: formattedAttorneys.length
    })
  } catch (error) {
    logger.error('Failed to get attorneys', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ===== Attorney management =====
// Until now the admin attorney surface was entirely read-only: there was no way
// to verify, deactivate, or reactivate an attorney from the platform side, even
// though routing eligibility depends on both flags.

const AttorneyStatusSchema = z.object({
  isActive: z.boolean(),
  reason: z.string().trim().max(500).optional(),
})

const AttorneyVerificationSchema = z.object({
  isVerified: z.boolean(),
  reason: z.string().trim().max(500).optional(),
})

/** Activate / deactivate an attorney. Deactivating removes them from routing. */
router.patch('/attorneys/:id/status', authMiddleware, adminMiddleware, requireAdminCapability('network'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const parsed = AttorneyStatusSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    }

    const existing = await prisma.attorney.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, isActive: true },
    })
    if (!existing) {
      return res.status(404).json({ error: 'Attorney not found' })
    }

    const attorney = await prisma.attorney.update({
      where: { id },
      data: { isActive: parsed.data.isActive },
      select: { id: true, name: true, email: true, isActive: true, isVerified: true },
    })

    // The attorney's login lives on the User table (matched by email). The auth
    // middleware gates every request on User.isActive, so flip it in lockstep —
    // otherwise a deactivated attorney keeps a valid session and stays logged in
    // until their token naturally expires (CP-580).
    if (existing.email) {
      await prisma.user.updateMany({
        where: { email: existing.email },
        data: { isActive: parsed.data.isActive },
      })
    }

    await writeAdminAudit(req, {
      action: parsed.data.isActive ? 'attorney_activated' : 'attorney_deactivated',
      entityType: 'attorney',
      entityId: id,
      metadata: {
        attorneyEmail: existing.email,
        fromActive: existing.isActive,
        toActive: parsed.data.isActive,
        reason: parsed.data.reason || null,
      },
    })

    res.json({ success: true, attorney })
  } catch (error) {
    logger.error('Failed to update attorney status', { error, attorneyId: req.params.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Mark an attorney verified / unverified.
 *
 * Verification state is split across two tables — `Attorney.isVerified` drives
 * routing eligibility while `AttorneyProfile.licenseVerified` is what the
 * profile UI shows — so both are written together to stop them drifting. The
 * profile is upserted because placeholder attorneys created by the invite flow
 * have no profile row yet.
 */
router.patch('/attorneys/:id/verification', authMiddleware, adminMiddleware, requireAdminCapability('network'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const parsed = AttorneyVerificationSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    }

    const existing = await prisma.attorney.findUnique({
      where: { id },
      select: { id: true, email: true, isVerified: true },
    })
    if (!existing) {
      return res.status(404).json({ error: 'Attorney not found' })
    }

    const { isVerified } = parsed.data
    const verifiedAt = isVerified ? new Date() : null

    const [attorney] = await prisma.$transaction([
      prisma.attorney.update({
        where: { id },
        data: { isVerified },
        select: { id: true, name: true, email: true, isActive: true, isVerified: true },
      }),
      prisma.attorneyProfile.upsert({
        where: { attorneyId: id },
        create: {
          attorneyId: id,
          licenseVerified: isVerified,
          licenseVerifiedAt: verifiedAt,
          licenseVerificationMethod: isVerified ? 'admin_review' : null,
        },
        update: {
          licenseVerified: isVerified,
          licenseVerifiedAt: verifiedAt,
          licenseVerificationMethod: isVerified ? 'admin_review' : null,
        },
      }),
    ])

    await writeAdminAudit(req, {
      action: isVerified ? 'attorney_verified' : 'attorney_unverified',
      entityType: 'attorney',
      entityId: id,
      metadata: {
        attorneyEmail: existing.email,
        fromVerified: existing.isVerified,
        toVerified: isVerified,
        reason: parsed.data.reason || null,
      },
    })

    res.json({ success: true, attorney })
  } catch (error) {
    logger.error('Failed to update attorney verification', { error, attorneyId: req.params.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})
export default router
