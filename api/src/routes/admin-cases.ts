import { Router, type Router as ExpressRouter } from 'express'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { adminMiddleware, requireAdminCapability } from '../lib/admin-access'
import { writeAdminAudit } from '../lib/admin-audit'
import { parsePagination, paginated } from '../lib/pagination'
import { CaseForRouting, AttorneyForRouting, routeCaseToAttorneys, filterEligibleAttorneys } from '../lib/routing'
import { startAssessmentRouting } from '../lib/assessment-routing'
import { routeReleasedCaseRespectingConsumerSlate } from '../lib/routing-lifecycle'
import { runRoutingEscalationSweep } from '../lib/routing-escalation-sweep'
import { sendCaseOfferToAttorney } from '../lib/case-notifications'
import { getMatchingRules, getAttorneyResponseDeadlineMinutes } from '../lib/matching-rules-config'
import { CLAIM_INVITE_TTL_DAYS, claimUrl, generateClaimToken, sendClaimEmail } from '../lib/claims'
import { prismaAny, safeJsonParse } from './admin-shared'

const router: ExpressRouter = Router()

async function inviteNonRegisteredAttorney(email: string): Promise<{ attorneyId: string; emailSent: boolean; claimUrl?: string }> {
  const normalizedEmail = email.trim().toLowerCase()
  const derivedName = normalizedEmail.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Invited Attorney'

  // Reuse an existing unclaimed placeholder if this email was already invited.
  const existing = await prisma.attorney.findUnique({ where: { email: normalizedEmail }, select: { id: true } })
  const attorney = existing
    ? await prisma.attorney.update({ where: { id: existing.id }, data: { isActive: true } })
    : await prisma.attorney.create({
        data: {
          name: derivedName,
          email: normalizedEmail,
          specialties: '[]',
          venues: '[]',
          isActive: true,
          isVerified: false,
          claimStatus: 'unclaimed',
        },
      })

  const token = generateClaimToken()
  const expiresAt = new Date(Date.now() + CLAIM_INVITE_TTL_DAYS * 24 * 60 * 60 * 1000)
  await prismaAny.profileClaim.create({
    data: { attorneyId: attorney.id, token, email: normalizedEmail, status: 'sent', expiresAt },
  })

  const url = claimUrl(token)
  const emailSent = await sendClaimEmail({
    to: normalizedEmail,
    subject: 'You have a new case on ClearCaseIQ. Claim your profile',
    body: [
      `Hi ${derivedName},`,
      '',
      'An administrator has routed a personal-injury case to you on ClearCaseIQ.',
      'Create your account to review the case details and respond to the client.',
      '',
      `Get started: ${url}`,
      '',
      `This link expires in ${CLAIM_INVITE_TTL_DAYS} days. If this wasn't expected, you can ignore this email.`,
    ].join('\n'),
  })

  logger.info('Invited non-registered attorney for routing', { attorneyId: attorney.id, emailSent })
  return { attorneyId: attorney.id, emailSent, claimUrl: process.env.NODE_ENV === 'production' ? undefined : url }
}

type LeadScores = {
  viabilityScore: number
  liabilityScore: number
  causationScore: number
  damagesScore: number
}

function getLeadScores(prediction?: { viability?: any }): LeadScores {
  const viability = prediction?.viability || {}
  return {
    viabilityScore: viability.overall ?? 0,
    liabilityScore: viability.liability ?? 0,
    causationScore: viability.causation ?? 0,
    damagesScore: viability.damages ?? 0
  }
}

async function upsertLeadSubmission(
  assessmentId: string,
  attorneyId: string,
  prediction?: { viability?: any }
) {
  const scores = getLeadScores(prediction)
  const evidenceChecklist = JSON.stringify({ required: [] })

  const existing = await prisma.leadSubmission.findUnique({
    where: { assessmentId },
    select: { routingLocked: true, assignedAttorneyId: true },
  })

  // Routing a case offers it; it does not claim it. `routingLocked` is what
  // "an attorney accepted this" means everywhere else — the accept path sets it
  // alongside the assignee, and the decision endpoint and the payment guard both
  // read it to refuse a case that is genuinely gone. Setting it here told every
  // attorney an admin routed to, except whichever one this loop wrote last, that
  // the case was already taken, while still showing them a running clock and an
  // Accept button (CP-812).
  const claimed = !!existing?.routingLocked && !!existing.assignedAttorneyId

  const scoreFields = {
    viabilityScore: scores.viabilityScore,
    liabilityScore: scores.liabilityScore,
    causationScore: scores.causationScore,
    damagesScore: scores.damagesScore,
    evidenceChecklist,
    sourceType: 'admin',
    status: 'submitted',
  }

  await prisma.leadSubmission.upsert({
    where: { assessmentId },
    create: {
      assessmentId,
      ...scoreFields,
      isExclusive: true,
      assignedAttorneyId: attorneyId,
      assignmentType: 'exclusive',
      routingLocked: false,
    },
    // Re-routing never reopens a case an attorney already holds: leave their
    // claim, and the assignment it rests on, exactly as the accept left it.
    update: claimed
      ? scoreFields
      : { ...scoreFields, isExclusive: true, assignedAttorneyId: attorneyId, assignmentType: 'exclusive' },
  })
}

const MANUAL_REVIEW_REASONS = [
  'low_confidence', 'duplicate', 'conflicting_facts', 'suspicious_documents',
  'near_sol', 'unsupported_jurisdiction', 'premium_case', 'ocr_failure',
  'fraud_suspected', 'identity_mismatch', 'document_tampering'
] as const

function parseFraudSignals(raw: string | null): unknown[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

router.get('/manual-review', authMiddleware, adminMiddleware, async (_req: AuthRequest, res) => {
  try {
    const assessments = await prisma.assessment.findMany({
      where: { manualReviewStatus: 'pending' },
      select: {
        id: true,
        claimType: true,
        venueState: true,
        venueCounty: true,
        manualReviewReason: true,
        manualReviewHeldAt: true,
        manualReviewNote: true,
        fraudScore: true,
        fraudSignals: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        predictions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { viability: true, bands: true }
        },
        _count: { select: { introductions: true, files: true } }
      },
      orderBy: [{ fraudScore: 'desc' }, { manualReviewHeldAt: 'asc' }]
    })

    const cases = assessments.map(a => {
      const pred = a.predictions[0]
      const viability = pred?.viability ? JSON.parse(pred.viability) : {}
      const bands = pred?.bands ? JSON.parse(pred.bands) : {}
      return {
        id: a.id,
        claimType: a.claimType,
        venueState: a.venueState,
        venueCounty: a.venueCounty,
        manualReviewReason: a.manualReviewReason,
        manualReviewHeldAt: a.manualReviewHeldAt,
        manualReviewNote: a.manualReviewNote,
        fraudScore: a.fraudScore,
        fraudSignals: parseFraudSignals(a.fraudSignals),
        caseScore: viability.overall ?? 0,
        valueEstimate: bands.median,
        user: a.user,
        counts: { introductions: a._count.introductions, files: a._count.files }
      }
    })

    res.json({ cases })
  } catch (error) {
    logger.error('Failed to get manual review queue', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/manual-review/:caseId/action', authMiddleware, adminMiddleware, requireAdminCapability('ops'), async (req: AuthRequest, res) => {
  try {
    const { caseId } = req.params
    const { action, note } = req.body as { action: string; note?: string }
    const validActions = ['release', 'reject', 'request_info', 'compliance']
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Use: release, reject, request_info, compliance' })
    }

    const assessment = await prisma.assessment.findUnique({
      where: { id: caseId },
      include: { leadSubmission: true }
    })
    if (!assessment) {
      return res.status(404).json({ error: 'Case not found' })
    }
    if (assessment.manualReviewStatus !== 'pending') {
      return res.status(400).json({ error: 'Case is not in manual review queue' })
    }

    const updateData: any = {
      manualReviewStatus: action === 'release' ? 'released' : action === 'reject' ? 'rejected' : action === 'request_info' ? 'request_info' : 'compliance',
      manualReviewNote: note || assessment.manualReviewNote,
      reviewedBy: req.user?.id || null,
      reviewedAt: new Date()
    }

    await prisma.assessment.update({
      where: { id: caseId },
      data: updateData
    })

    await writeAdminAudit(req, {
      action: `case_manual_review_${action}`,
      entityType: 'assessment',
      entityId: caseId,
      metadata: {
        note: note || null,
        previousStatus: assessment.manualReviewStatus,
        nextStatus: updateData.manualReviewStatus,
      },
    })

    if (action === 'release') {
      // Ensure case can enter routing - clear routing lock if any, create lead submission if needed
      await prisma.leadSubmission.upsert({
        where: { assessmentId: caseId },
        create: {
          assessmentId: caseId,
          viabilityScore: 0.5,
          liabilityScore: 0.5,
          causationScore: 0.5,
          damagesScore: 0.5,
          evidenceChecklist: '{}',
          isExclusive: false,
          sourceType: 'admin',
          lifecycleState: 'routing_active',
          routingLocked: false
        },
        update: { lifecycleState: 'routing_active', routingLocked: false }
      })

      // Re-trigger routing now that a human has cleared the case. We skip the
      // pre-routing (fraud) gate here — otherwise the same signals that flagged
      // it would immediately re-hold it, creating a loop. The admin decision IS
      // the override of the FRAUD signal.
      //
      // It is NOT an override of the consumer's contact decision (SB 37 /
      // § 6155). If the consumer curated their slate — ranked some attorneys or
      // explicitly removed some — releasing must not route to firms they never
      // approved. Instead we advance their approved queue, or propose a fresh
      // batch (excluding everyone they removed) and hold for their approval.
      // Only cases with no consumer selection route straight through.
      let releaseRouting: { mode: string; error?: string } = { mode: 'no_consumer_slate' }
      try {
        releaseRouting = await routeReleasedCaseRespectingConsumerSlate(caseId)
      } catch (err: any) {
        logger.error('Consumer-slate release routing failed', { caseId, error: err?.message })
      }

      if (releaseRouting.mode === 'no_consumer_slate') {
        // Fire-and-forget so the response is fast for the operational-only case.
        void startAssessmentRouting(caseId, {
          skipPreRoutingGate: true,
          preferTierRouting: true,
          fallbackToClassic: true,
        }).catch((err: any) =>
          logger.error('Failed to re-route case after manual review release', {
            caseId,
            error: err?.message,
          }),
        )
      }

      await writeAdminAudit(req, {
        action: 'case_release_routing_mode',
        entityType: 'assessment',
        entityId: caseId,
        metadata: { mode: releaseRouting.mode, error: releaseRouting.error ?? null },
      })

      return res.json({ ok: true, action, routing: releaseRouting.mode })
    }

    res.json({ ok: true, action })
  } catch (error) {
    logger.error('Failed to process manual review action', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/manual-review/:caseId/hold', authMiddleware, adminMiddleware, requireAdminCapability('ops'), async (req: AuthRequest, res) => {
  try {
    const { caseId } = req.params
    const { reason, note } = req.body as { reason: string; note?: string }
    if (!MANUAL_REVIEW_REASONS.includes(reason as any)) {
      return res.status(400).json({ error: `Invalid reason. Use one of: ${MANUAL_REVIEW_REASONS.join(', ')}` })
    }

    const assessment = await prisma.assessment.findUnique({ where: { id: caseId } })
    if (!assessment) {
      return res.status(404).json({ error: 'Case not found' })
    }

    await prisma.assessment.update({
      where: { id: caseId },
      data: {
        manualReviewStatus: 'pending',
        manualReviewReason: reason,
        manualReviewHeldAt: new Date(),
        manualReviewNote: note || null
      }
    })

    await writeAdminAudit(req, {
      action: 'case_manual_review_held',
      entityType: 'assessment',
      entityId: caseId,
      metadata: {
        reason,
        note: note || null,
      },
    })

    res.json({ ok: true })
  } catch (error) {
    logger.error('Failed to hold case for manual review', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get routing queue (cases currently in routing - have introductions, not yet accepted)
router.get('/routing-queue', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const assessments = await prisma.assessment.findMany({
      where: {
        status: 'COMPLETED',
        introductions: { some: {} },
        OR: [
          { leadSubmission: { is: null } },
          { leadSubmission: { routingLocked: false } }
        ]
      },
      select: {
        id: true,
        claimType: true,
        venueState: true,
        venueCounty: true,
        createdAt: true,
        predictions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { bands: true, viability: true }
        },
        introductions: {
          orderBy: { createdAt: 'desc' },
          select: {
            status: true,
            createdAt: true,
            attorney: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          }
        },
        routingWaves: {
          orderBy: { waveNumber: 'desc' },
          take: 1,
          select: { waveNumber: true, nextEscalationAt: true }
        },
        _count: { select: { introductions: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    const queue = assessments.map(a => {
      const pred = a.predictions[0]
      const bands = pred?.bands ? JSON.parse(pred.bands) : {}
      const viability = pred?.viability ? JSON.parse(pred.viability) : {}
      const latestWave = a.routingWaves[0]
      const responses = a.introductions.filter(i => i.status !== 'PENDING').length
      const latestIntroduction = a.introductions[0]

      return {
        id: a.id,
        claimType: a.claimType,
        venueState: a.venueState,
        venueCounty: a.venueCounty,
        valueEstimate: bands.median,
        caseScore: viability.overall ?? 0,
        currentWave: latestWave?.waveNumber ?? 1,
        attorneysContacted: a._count.introductions,
        responsesReceived: responses,
        latestAttorneyContacted: latestIntroduction?.attorney
          ? {
              id: latestIntroduction.attorney.id,
              name: latestIntroduction.attorney.name,
              email: latestIntroduction.attorney.email,
              status: latestIntroduction.status,
              contactedAt: latestIntroduction.createdAt,
            }
          : null,
        timeInQueue: a.createdAt,
        nextEscalationTime: latestWave?.nextEscalationAt,
        adminStatus: 'active'
      }
    })

    res.json({ cases: queue })
  } catch (error) {
    logger.error('Failed to get routing queue', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/cases/queue', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const assessments = await prisma.assessment.findMany({
      where: {
        status: {
          in: ['DRAFT', 'COMPLETED'] // Cases that are ready but not yet routed
        },
        introductions: { none: {} }
      },
      select: {
        id: true,
        claimType: true,
        venueState: true,
        venueCounty: true,
        status: true,
        facts: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true
          }
        },
        predictions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            viability: true,
            bands: true,
            explain: true
          }
        },
        _count: {
          select: {
            files: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const queueCases = assessments.map(assessment => {
        const facts = assessment.facts ? JSON.parse(assessment.facts) : {}
        const latestPrediction = assessment.predictions[0] ? {
          ...assessment.predictions[0],
          viability: JSON.parse(assessment.predictions[0].viability),
          bands: JSON.parse(assessment.predictions[0].bands),
          explain: JSON.parse(assessment.predictions[0].explain)
        } : null

        return {
          id: assessment.id,
          claimType: assessment.claimType,
          venueState: assessment.venueState,
          venueCounty: assessment.venueCounty,
          status: assessment.status,
          facts,
          prediction: latestPrediction,
          user: assessment.user,
          createdAt: assessment.createdAt,
          updatedAt: assessment.updatedAt,
          fileCount: assessment._count.files
        }
      })

    res.json({
      total: queueCases.length,
      cases: queueCases
    })
  } catch (error) {
    logger.error('Failed to get admin queue cases', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get all cases (not just queue) - with extended filters
router.get('/cases/all', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const {
      status,
      claimType,
      state,
      county,
      routingStatus,
      createdToday,
      search,
    } = req.query
    const { take, skip } = parsePagination(req.query as Record<string, unknown>, {
      defaultLimit: 100,
      maxLimit: 200,
    })

    const where: any = {}
    if (status) {
      where.status = status as string
    }
    // Server-side so the admin list searches every matching case, not just the
    // rows already loaded into the current page.
    const searchTerm = typeof search === 'string' ? search.trim() : ''
    if (searchTerm) {
      where.OR = [
        { id: { contains: searchTerm, mode: 'insensitive' } },
        { claimType: { contains: searchTerm, mode: 'insensitive' } },
        { venueState: { contains: searchTerm, mode: 'insensitive' } },
        { venueCounty: { contains: searchTerm, mode: 'insensitive' } },
        { user: { email: { contains: searchTerm, mode: 'insensitive' } } },
        { user: { firstName: { contains: searchTerm, mode: 'insensitive' } } },
        { user: { lastName: { contains: searchTerm, mode: 'insensitive' } } },
      ]
    }
    if (claimType) {
      // The UI sends every slug that reads as the chosen label (auto, vehicle,
      // car_accident … are all "Motor vehicle"), so one menu entry matches rows
      // stored under any of its historical spellings.
      const values = String(claimType)
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
      if (values.length === 1) where.claimType = values[0]
      else if (values.length > 1) where.claimType = { in: values }
    }
    if (state) {
      where.venueState = (state as string).toUpperCase()
    }
    if (county) {
      where.venueCounty = { contains: county as string, mode: 'insensitive' }
    }
    // Prefer the caller's explicit local start-of-day (createdAfter) so "New today"
    // reflects the admin's calendar day rather than the server's timezone (CP-324).
    const createdAfter = req.query.createdAfter
    if (typeof createdAfter === 'string' && createdAfter) {
      const after = new Date(createdAfter)
      if (!isNaN(after.getTime())) where.createdAt = { gte: after }
    } else if (createdToday === '1' || createdToday === 'true') {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      where.createdAt = { gte: todayStart }
    }
    if (routingStatus === 'routed') {
      where.introductions = { some: {} }
    } else if (routingStatus === 'queue') {
      where.introductions = { none: {} }
    } else if (routingStatus === 'accepted') {
      // "Accepted" must mean an attorney actually accepted the intro, not merely
      // that the lead was routing-locked (which also happens on ranked routing
      // and admin assignment). This now matches the case-list column and the
      // /stats acceptance counts (#36).
      where.introductions = { some: { status: 'ACCEPTED' } }
    } else if (routingStatus === 'waiting') {
      // At least one intro sent, but none accepted yet.
      where.AND = [
        { introductions: { some: {} } },
        { introductions: { none: { status: 'ACCEPTED' } } },
      ]
    }

    const assessments = await prisma.assessment.findMany({
      where,
      select: {
        id: true,
        claimType: true,
        venueState: true,
        venueCounty: true,
        status: true,
        facts: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true
          }
        },
        predictions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            viability: true,
            bands: true,
            explain: true
          }
        },
        introductions: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            attorney: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        leadSubmission: {
          select: {
            assignmentType: true,
            routingLocked: true,
            assignedAttorney: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        _count: {
          select: {
            introductions: true,
            files: true,
            appointments: true,
            chatRooms: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    })

    const cases = assessments.map(assessment => {
      const facts = assessment.facts ? JSON.parse(assessment.facts) : {}
      const latestPrediction = assessment.predictions[0] ? {
        ...assessment.predictions[0],
        viability: JSON.parse(assessment.predictions[0].viability),
        bands: JSON.parse(assessment.predictions[0].bands),
        explain: JSON.parse(assessment.predictions[0].explain)
      } : null

      return {
        id: assessment.id,
        claimType: assessment.claimType,
        venueState: assessment.venueState,
        venueCounty: assessment.venueCounty,
        status: assessment.status,
        facts,
        prediction: latestPrediction,
        user: assessment.user,
        introductions: assessment.introductions.map(intro => ({
          id: intro.id,
          attorney: intro.attorney,
          status: intro.status,
          createdAt: intro.createdAt
        })),
        leadSubmission: assessment.leadSubmission ? {
          assignedAttorney: assessment.leadSubmission.assignedAttorney,
          assignmentType: assessment.leadSubmission.assignmentType,
          routingLocked: assessment.leadSubmission.routingLocked,
        } : null,
        createdAt: assessment.createdAt,
        updatedAt: assessment.updatedAt,
        counts: {
          files: assessment._count.files,
          introductions: assessment._count.introductions,
          appointments: assessment._count.appointments,
          chatRooms: assessment._count.chatRooms
        }
      }
    })

    // `total` used to be cases.length (the page size), so the client could
    // never distinguish a full last page from a truncated list.
    const total = await prisma.assessment.count({ where })

    res.json({ cases, ...paginated(cases, total, { take, skip }) })
  } catch (error) {
    logger.error('Failed to get all admin cases', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get single case detail for admin (must be after /cases/queue and /cases/all)
router.get('/cases/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const assessment = await prisma.assessment.findUnique({
      where: { id },
      select: {
        id: true,
        claimType: true,
        venueState: true,
        venueCounty: true,
        status: true,
        facts: true,
        manualReviewStatus: true,
        manualReviewReason: true,
        manualReviewHeldAt: true,
        manualReviewNote: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            createdAt: true,
          }
        },
        predictions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            viability: true,
            bands: true,
            explain: true,
          }
        },
        introductions: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            waveNumber: true,
            declineReason: true,
            attorney: { select: { id: true, name: true, email: true } },
          },
          orderBy: { waveNumber: 'asc' }
        },
        leadSubmission: {
          select: {
            id: true,
            assignedAttorneyId: true,
            assignmentType: true,
            sourceType: true,
            routingLocked: true,
            submittedAt: true,
            assignedAttorney: { select: { id: true, name: true, email: true } }
          }
        },
        routingWaves: {
          orderBy: { waveNumber: 'asc' },
          select: {
            id: true,
            waveNumber: true,
            attorneyIds: true,
            sentAt: true,
            nextEscalationAt: true,
            escalatedAt: true,
            createdAt: true,
            updatedAt: true,
          }
        },
        files: {
          select: {
            id: true,
            originalName: true,
            status: true,
            createdAt: true,
          }
        },
        // Documents uploaded during intake are stored as EvidenceFile records,
        // not legacy File records. Admins were always shown "No documents
        // uploaded" because only the File[] relation was read (#44).
        evidenceFiles: {
          select: {
            id: true,
            originalName: true,
            category: true,
            processingStatus: true,
            createdAt: true,
          }
        }
      }
    })

    if (!assessment) {
      return res.status(404).json({ error: 'Case not found' })
    }

    const routingAudit = await prisma.auditLog.findMany({
      where: {
        entityType: 'assessment',
        entityId: assessment.id,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    const routingAnalytics = await prisma.routingAnalytics.findMany({
      where: { assessmentId: assessment.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // Resolve the attorney IDs on the diagnostics rows to human-readable names so
    // the admin panel can show "Jane Lawyer — Firm LLC" instead of a raw CUID.
    const diagnosticAttorneyIds = Array.from(
      new Set(routingAnalytics.map((entry) => entry.attorneyId).filter((id): id is string => !!id))
    )
    const diagnosticAttorneys = diagnosticAttorneyIds.length
      ? await prisma.attorney.findMany({
          where: { id: { in: diagnosticAttorneyIds } },
          select: { id: true, name: true, lawFirm: { select: { name: true } } },
        })
      : []
    const attorneyNameById = new Map(
      diagnosticAttorneys.map((a) => [a.id, { name: a.name, firmName: a.lawFirm?.name ?? null }])
    )

    const pred = assessment.predictions[0]
    const facts = assessment.facts ? JSON.parse(assessment.facts) : {}
    const viability = pred?.viability ? JSON.parse(pred.viability) : {}
    const bands = pred?.bands ? JSON.parse(pred.bands) : {}
    const explain = pred?.explain ? JSON.parse(pred.explain) : {}

    res.json({
      id: assessment.id,
      claimType: assessment.claimType,
      venueState: assessment.venueState,
      venueCounty: assessment.venueCounty,
      status: assessment.status,
      facts,
      user: assessment.user,
      prediction: { viability, bands, explain },
      introductions: assessment.introductions,
      leadSubmission: assessment.leadSubmission,
      routingWaves: assessment.routingWaves,
      files: [
        ...assessment.files,
        ...assessment.evidenceFiles.map((f) => ({
          id: f.id,
          originalName: f.originalName,
          status: f.processingStatus,
          category: f.category,
          createdAt: f.createdAt,
        })),
      ],
      manualReviewStatus: assessment.manualReviewStatus,
      manualReviewReason: assessment.manualReviewReason,
      manualReviewHeldAt: assessment.manualReviewHeldAt,
      manualReviewNote: assessment.manualReviewNote,
      routingAudit: routingAudit.map((entry) => ({
        id: entry.id,
        action: entry.action,
        statusCode: entry.statusCode,
        createdAt: entry.createdAt,
        metadata: safeJsonParse(entry.metadata),
      })),
      routingDiagnostics: routingAnalytics.map((entry) => ({
        id: entry.id,
        attorneyId: entry.attorneyId,
        attorneyName: entry.attorneyId ? attorneyNameById.get(entry.attorneyId)?.name ?? null : null,
        attorneyFirm: entry.attorneyId ? attorneyNameById.get(entry.attorneyId)?.firmName ?? null : null,
        introductionId: entry.introductionId,
        eventType: entry.eventType,
        eventData: safeJsonParse(entry.eventData),
        createdAt: entry.createdAt,
      })),
      createdAt: assessment.createdAt,
      updatedAt: assessment.updatedAt
    })
  } catch (error) {
    logger.error('Failed to get case detail', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Bulk route cases to attorneys
router.post('/cases/route', authMiddleware, adminMiddleware, requireAdminCapability('ops'), async (req: AuthRequest, res) => {
  try {
    let { caseIds, attorneyId, attorneyEmail, message, skipEligibilityCheck, autoRoute, inviteIfMissing } = req.body
    let invitedAttorney: { emailSent: boolean; claimUrl?: string; email: string } | null = null

    if (!Array.isArray(caseIds) || caseIds.length === 0) {
      return res.status(400).json({ error: 'caseIds must be a non-empty array' })
    }

    // Resolve attorney by email if attorneyId not provided
    if (!attorneyId && attorneyEmail) {
      const attorneys = await prisma.attorney.findMany({
        where: { isActive: true },
        select: { id: true, email: true, name: true }
      })
      const attorneyByEmail = attorneys.find(
        a => a.email && a.email.toLowerCase() === String(attorneyEmail).toLowerCase()
      )
      if (!attorneyByEmail) {
        // The email isn't tied to a registered attorney. Rather than failing
        // outright, an admin can invite them: we create an unclaimed placeholder
        // attorney, route the case to it, and email a claim link (#40). To avoid
        // creating records from typos, this only happens when the admin opts in
        // via `inviteIfMissing`; otherwise we tell the client an invite is needed.
        if (!inviteIfMissing) {
          return res.status(200).json({
            success: false,
            requiresInvite: true,
            email: String(attorneyEmail),
            message: `No registered attorney uses ${attorneyEmail}. You can invite them to join and claim this case.`,
          })
        }
        const invite = await inviteNonRegisteredAttorney(String(attorneyEmail))
        attorneyId = invite.attorneyId
        invitedAttorney = { emailSent: invite.emailSent, claimUrl: invite.claimUrl, email: String(attorneyEmail).trim().toLowerCase() }
        skipEligibilityCheck = true
        logger.info('Routing to invited (non-registered) attorney', { attorneyEmail, attorneyId })
      } else {
        attorneyId = attorneyByEmail.id
        logger.info('Resolved attorney by email', { attorneyEmail, attorneyId, attorneyName: attorneyByEmail.name })
      }
    }

    // Admin manual routing always skips eligibility - admin can force route to any attorney
    if (!autoRoute && attorneyId) {
      skipEligibilityCheck = true
    }

    // If autoRoute is true, use the controlled routing engine (case underwriting + matching + waves)
    if (autoRoute && !attorneyId) {
      const maxPerWave = req.body.maxAttorneysPerWave ?? 3
      const routingResults: Array<{
        caseId: string
        routed: boolean
        attorneyId?: string
        attorneyIds?: string[]
        introductionIds?: string[]
        matchScore?: number
        strategy?: string
        tierNumber?: number | null
        error?: string
        gateReason?: string
        gateStatus?: string
        routingStats?: Record<string, number>
      }> = []

      for (const caseId of caseIds) {
        try {
          const result = await startAssessmentRouting(caseId, {
            maxAttorneysPerWave: maxPerWave,
            skipPreRoutingGate: false,
            dryRun: false
          })

          if (!result.success) {
            routingResults.push({
              caseId,
              routed: false,
              error: result.errors?.[0] ?? 'Routing failed',
              gateReason: result.gateReason,
              gateStatus: result.gateStatus
            })
            continue
          }

          if (!result.routedTo || result.routedTo.length === 0) {
            routingResults.push({
              caseId,
              routed: false,
              error: 'No attorneys routed (wave may be empty)',
              routingStats: {
                candidates: result.candidatesEligible ?? 0,
                qualified: result.candidatesQualified ?? 0
              }
            })
            continue
          }

          routingResults.push({
            caseId,
            routed: true,
            attorneyId: result.routedTo[0],
            attorneyIds: result.routedTo,
            introductionIds: result.introductionIds,
            strategy: result.strategy,
            tierNumber: result.tierNumber,
            routingStats: {
              candidates: result.candidatesEligible ?? 0,
              qualified: result.candidatesQualified ?? 0,
              waveSize: result.waveSize ?? 0
            }
          })
        } catch (error: any) {
          routingResults.push({ caseId, error: error.message, routed: false })
        }
      }

      const successful = routingResults.filter(r => r.routed).length
      const failed = routingResults.filter(r => !r.routed).length

      logger.info('Routing engine completed', {
        totalCases: caseIds.length,
        successful,
        failed
      })

      await Promise.all(routingResults.map((result) =>
        writeAdminAudit(req, {
          action: result.routed ? 'case_auto_routed' : 'case_auto_route_failed',
          entityType: 'assessment',
          entityId: result.caseId,
          metadata: {
            mode: 'auto_route',
            strategy: result.strategy || 'classic',
            tierNumber: result.tierNumber ?? null,
            attorneyIds: result.attorneyIds || [],
            introductionIds: result.introductionIds || [],
            gateReason: result.gateReason || null,
            gateStatus: result.gateStatus || null,
            error: result.error || null,
            routingStats: result.routingStats || null,
          },
        })
      ))

      return res.json({
        success: true,
        autoRouted: true,
        routingEngine: true,
        routed: successful,
        failed,
        results: routingResults
      })
    }

    // Manual routing (existing logic)
    if (!attorneyId) {
      return res.status(400).json({ error: 'attorneyId is required when autoRoute is false' })
    }

    // Verify attorney exists with profile
    const attorney = await prisma.attorney.findUnique({
      where: { id: attorneyId },
      include: {
        attorneyProfile: true
      }
    })

    if (!attorney) {
      return res.status(404).json({ error: 'Attorney not found' })
    }

    const uniqueCaseIds = [...new Set(caseIds.map((caseId) => String(caseId)))]
    let assessments: any[] = []
    let existingIntros: Array<{ assessmentId: string }> = []
    if (skipEligibilityCheck) {
      ;[assessments, existingIntros] = await Promise.all([
        prisma.assessment.findMany({
          where: { id: { in: uniqueCaseIds } },
          // Same shape as the eligibility-checked branch below: skipping the
          // check skips the check, not the offer notification, which needs the
          // claim type, venue and value bands to describe the case.
          select: {
            id: true,
            claimType: true,
            venueState: true,
            venueCounty: true,
            facts: true,
            predictions: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { viability: true, bands: true }
            }
          }
        }),
        prisma.introduction.findMany({
          where: {
            assessmentId: { in: uniqueCaseIds },
            attorneyId,
            // An offer that lapsed must not block a fresh one. This used to
            // match any prior introduction at all, so a single expired offer
            // permanently burned that attorney for that case — and expiry is
            // precisely when you want to re-offer, especially while attorneys
            // had no working way to answer. A live (PENDING), won (ACCEPTED)
            // or refused (DECLINED) offer still blocks: those are genuine
            // "already routed" states.
            status: { not: 'EXPIRED' }
          },
          select: { assessmentId: true }
        })
      ])
    } else {
      ;[assessments, existingIntros] = await Promise.all([
        prisma.assessment.findMany({
          where: { id: { in: uniqueCaseIds } },
          select: {
            id: true,
            claimType: true,
            venueState: true,
            venueCounty: true,
            facts: true,
            predictions: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { viability: true, bands: true }
            }
          }
        }),
        prisma.introduction.findMany({
          where: {
            assessmentId: { in: uniqueCaseIds },
            attorneyId,
            // An offer that lapsed must not block a fresh one. This used to
            // match any prior introduction at all, so a single expired offer
            // permanently burned that attorney for that case — and expiry is
            // precisely when you want to re-offer, especially while attorneys
            // had no working way to answer. A live (PENDING), won (ACCEPTED)
            // or refused (DECLINED) offer still blocks: those are genuine
            // "already routed" states.
            status: { not: 'EXPIRED' }
          },
          select: { assessmentId: true }
        })
      ])
    }
    const assessmentById = new Map(assessments.map((assessment) => [assessment.id, assessment]))
    const existingIntroCaseIds = new Set(existingIntros.map((intro) => intro.assessmentId))

    // Create introductions for all cases
    const introductions = []
    const errors = []

    for (const caseId of caseIds) {
      try {
        const assessment = assessmentById.get(caseId)

        if (!assessment) {
          errors.push({ caseId, error: 'Assessment not found' })
          continue
        }

        // Step 0: Hard Eligibility Check (unless skipped)
        if (!skipEligibilityCheck) {
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

          const attorneyForCheck = {
            id: attorney.id,
            isActive: attorney.isActive,
            isVerified: attorney.isVerified,
            specialties: attorney.specialties,
            attorneyProfile: attorney.attorneyProfile
          }

          const { eligible } = await filterEligibleAttorneys([attorneyForCheck], caseData)

          if (eligible.length === 0) {
            errors.push({ 
              caseId, 
              error: 'Attorney does not meet eligibility requirements for this case' 
            })
            continue
          }
        }

        // Check if introduction already exists
        if (existingIntroCaseIds.has(caseId)) {
          errors.push({ caseId, error: 'Already routed to this attorney' })
          continue
        }

        // Create introduction
        const intro = await prisma.introduction.create({
          data: {
            assessmentId: caseId,
            attorneyId: attorneyId,
            status: 'PENDING',
            message: message || 'Routed by admin',
            requestedAt: new Date()
          }
        })

        const prediction = assessment.predictions?.[0]
        const viability = prediction ? JSON.parse(prediction.viability) : {}
        await upsertLeadSubmission(caseId, attorneyId, { viability })

        // An admin-routed case is the same offer the matching engine makes, so it
        // has to reach the attorney the same way. This previously sent SMS alone,
        // which left no email and — because the in-app record is written by the
        // shared notifier — an empty notification bell, so a case routed by hand
        // was invisible to an attorney who does not read texts (CP-812).
        // No explicit window: the offer expires on the configured deadline like
        // any other, so the message must quote that rather than a number here.
        // Value bands are optional on a prediction, so parse defensively: an
        // absent band should cost the offer its dollar figures, not the notification.
        const bands = safeJsonParse<{ p25?: number; p75?: number }>(prediction?.bands) || {}
        // Best-effort, like the matching engine: the introduction is the record
        // that matters, so a notification failure is logged rather than reported
        // as a case that failed to route.
        await sendCaseOfferToAttorney(attorneyId, intro.id, {
          claimType: assessment.claimType,
          jurisdiction: [assessment.venueState, assessment.venueCounty].filter(Boolean).join(', '),
          estimatedValueLow: bands.p25 ?? 0,
          estimatedValueHigh: bands.p75 ?? 0,
          evidenceSummary: 'See case file',
          liabilityConfidence:
            (viability.liability ?? 0.5) >= 0.7 ? 'Strong' : (viability.liability ?? 0.5) >= 0.4 ? 'Moderate' : 'Weak',
          introductionId: intro.id,
          assessmentId: caseId,
        }).catch((err) => {
          logger.error('Admin routing: failed to notify attorney of case offer', {
            caseId,
            attorneyId,
            introductionId: intro.id,
            error: err instanceof Error ? err.message : String(err),
          })
        })
        existingIntroCaseIds.add(caseId)

        introductions.push(intro)
      } catch (error: any) {
        errors.push({ caseId, error: error.message })
      }
    }

    logger.info('Bulk route cases', { 
      totalCases: caseIds.length,
      successful: introductions.length,
      failed: errors.length,
      attorneyId
    })

    await Promise.all([
      ...introductions.map((intro) =>
        writeAdminAudit(req, {
          action: 'case_manual_routed',
          entityType: 'assessment',
          entityId: intro.assessmentId,
          metadata: {
            attorneyId,
            introductionId: intro.id,
            skipEligibilityCheck: Boolean(skipEligibilityCheck),
            message: message || 'Routed by admin',
          },
        })
      ),
      ...errors.map((entry: any) =>
        writeAdminAudit(req, {
          action: 'case_manual_route_failed',
          entityType: 'assessment',
          entityId: entry.caseId,
          metadata: {
            attorneyId,
            error: entry.error || 'Unknown error',
            skipEligibilityCheck: Boolean(skipEligibilityCheck),
          },
        })
      ),
    ])

    res.json({
      success: true,
      routed: introductions.length,
      failed: errors.length,
      invited: invitedAttorney
        ? { email: invitedAttorney.email, emailSent: invitedAttorney.emailSent, claimUrl: invitedAttorney.claimUrl }
        : undefined,
      introductions: introductions.map(i => ({
        id: i.id,
        assessmentId: i.assessmentId,
        attorneyId,
        status: i.status
      })),
      errors
    })
  } catch (error) {
    logger.error('Failed to bulk route cases', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Diagnostic: verify routing state for a case (admin debugging)
router.get('/cases/:caseId/routing-state', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { caseId } = req.params
    const { attorneyEmail } = req.query
    const assessment = await prisma.assessment.findUnique({
      where: { id: caseId },
      select: {
        leadSubmission: {
          select: {
            id: true,
            assignedAttorneyId: true,
            assignmentType: true,
          },
        },
        introductions: {
          select: {
            id: true,
            attorneyId: true,
            status: true,
            attorney: { select: { id: true, name: true, email: true } },
          },
        },
      }
    })
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' })
    }
    let attorneyByEmail = null
    if (attorneyEmail) {
      const attorneys = await prisma.attorney.findMany({ where: { isActive: true }, select: { id: true, email: true, name: true } })
      attorneyByEmail = attorneys.find(a => a.email?.toLowerCase() === String(attorneyEmail).toLowerCase())
    }
    return res.json({
      assessmentId: caseId,
      hasLeadSubmission: !!assessment.leadSubmission,
      leadSubmission: assessment.leadSubmission ? {
        id: assessment.leadSubmission.id,
        assignedAttorneyId: assessment.leadSubmission.assignedAttorneyId,
        assignmentType: assessment.leadSubmission.assignmentType
      } : null,
      introductions: assessment.introductions.map(i => ({
        id: i.id,
        attorneyId: i.attorneyId,
        attorneyEmail: i.attorney?.email,
        attorneyName: i.attorney?.name,
        status: i.status
      })),
      attorneyLookupByEmail: attorneyEmail ? (attorneyByEmail ? { id: attorneyByEmail.id, email: attorneyByEmail.email, name: attorneyByEmail.name } : { error: 'Not found' }) : null
    })
  } catch (error: any) {
    logger.error('Routing state diagnostic failed', { error: error.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/cases/escalate-due', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    // Shared with the in-process escalation scheduler (lib/routing-escalation-sweep.ts),
    // so automatic routing advances whether triggered by cron or the background loop.
    const sweep = await runRoutingEscalationSweep()
    if (sweep.skipped) {
      return res.json({
        processed: 0,
        skipped: true,
        reason: sweep.reason,
        results: []
      })
    }
    return res.json({
      processed: sweep.processed,
      overdueCount: sweep.overdueCount,
      overdueCases: sweep.overdueCases,
      results: sweep.results
    })
  } catch (error: any) {
    logger.error('Escalation error', { error: error.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Run routing engine on a single case (controlled matching: normalize → gate → rank → wave)
router.post('/cases/:id/route-engine', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id: caseId } = req.params
    const { maxAttorneysPerWave = 3, skipPreRoutingGate = false, dryRun = false } = req.body

    const result = await startAssessmentRouting(caseId, {
      maxAttorneysPerWave,
      skipPreRoutingGate,
      dryRun
    })

    await writeAdminAudit(req, {
      action: dryRun ? 'case_routing_simulated' : 'case_route_engine_executed',
      entityType: 'assessment',
      entityId: caseId,
      metadata: {
        maxAttorneysPerWave,
        skipPreRoutingGate,
        dryRun,
        success: result.success,
        gatePassed: result.gatePassed,
        gateReason: result.gateReason || null,
        gateStatus: result.gateStatus || null,
        strategy: result.strategy || 'classic',
        tierNumber: result.tierNumber ?? null,
        routedTo: result.routedTo || [],
        introductionIds: result.introductionIds || [],
        candidatesEligible: result.candidatesEligible ?? 0,
        candidatesQualified: result.candidatesQualified ?? 0,
        waveSize: result.waveSize ?? 0,
        diagnostics: result.diagnostics || null,
        errors: result.errors || [],
      },
    })

    return res.json(result)
  } catch (error: any) {
    logger.error('Routing engine error', { caseId: req.params.id, error: error.message })
    res.status(500).json({ success: false, errors: [error.message] })
  }
})

// Get scored attorney recommendations for a case
router.get('/cases/:caseId/recommendations', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { caseId } = req.params
    const { limit = 10 } = req.query
    const parsedLimit = Number.parseInt(String(limit), 10) || 10

    // Get assessment
    const assessment = await prisma.assessment.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        claimType: true,
        venueState: true,
        venueCounty: true,
        facts: true,
        predictions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { viability: true, bands: true }
        }
      }
    })

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' })
    }

    // Build case data
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

    // Get all active attorneys with profiles
    const attorneys = await prisma.attorney.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        isVerified: true,
        specialties: true,
        responseTimeHours: true,
        averageRating: true,
        totalReviews: true,
        attorneyProfile: {
          select: {
            subscriptionTier: true,
            pricingModel: true,
            paymentModel: true,
            jurisdictions: true,
            excludedCaseTypes: true,
            minInjurySeverity: true,
            minDamagesRange: true,
            maxDamagesRange: true,
            maxCasesPerWeek: true,
            maxCasesPerMonth: true,
            successRate: true,
            averageSettlement: true,
            totalCases: true,
            yearsExperience: true
          }
        }
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
    const attorneyById = new Map(attorneys.map((attorney) => [attorney.id, attorney]))

    // Convert to AttorneyForRouting format
    const attorneysForRouting: AttorneyForRouting[] = attorneys.map(a => ({
      id: a.id,
      isActive: a.isActive,
      isVerified: a.isVerified,
      specialties: a.specialties,
      responseTimeHours: a.responseTimeHours,
      averageRating: a.averageRating,
      totalReviews: a.totalReviews,
      subscriptionTier: a.attorneyProfile?.subscriptionTier || null,
      pricingModel: a.attorneyProfile?.pricingModel || null,
      paymentModel: a.attorneyProfile?.paymentModel || null,
      attorneyProfile: a.attorneyProfile ? {
        jurisdictions: a.attorneyProfile.jurisdictions,
        excludedCaseTypes: a.attorneyProfile.excludedCaseTypes,
        minInjurySeverity: a.attorneyProfile.minInjurySeverity,
        minDamagesRange: a.attorneyProfile.minDamagesRange,
        maxDamagesRange: a.attorneyProfile.maxDamagesRange,
        maxCasesPerWeek: a.attorneyProfile.maxCasesPerWeek,
        maxCasesPerMonth: a.attorneyProfile.maxCasesPerMonth,
        successRate: a.attorneyProfile.successRate,
        averageSettlement: a.attorneyProfile.averageSettlement,
        totalCases: a.attorneyProfile.totalCases,
        yearsExperience: a.attorneyProfile.yearsExperience
      } : null
    }))

    // Complete routing pipeline: Step 0 → Step 1 → Step 2
    const routingResult = await routeCaseToAttorneys(attorneysForRouting, caseData)

    if (routingResult.qualified.length === 0) {
      return res.json({
        caseId,
        eligibleCount: routingResult.eligible.length,
        qualifiedCount: 0,
        recommendations: [],
        message: routingResult.eligible.length === 0 
          ? 'No eligible attorneys found for this case'
          : 'No attorneys passed quality gate for this case'
      })
    }

    // Use scored attorneys from routing pipeline
    const scored = routingResult.scored

    // Limit results
    const recommendations = scored.slice(0, parsedLimit)

    // Format response
    const formatted = recommendations.map((item, index) => ({
      rank: index + 1,
      attorney: {
        id: item.attorney.id,
        name: attorneyById.get(item.attorney.id)?.name,
        email: attorneyById.get(item.attorney.id)?.email,
        isVerified: attorneyById.get(item.attorney.id)?.isVerified,
        responseTimeHours: attorneyById.get(item.attorney.id)?.responseTimeHours,
        averageRating: attorneyById.get(item.attorney.id)?.averageRating,
        totalReviews: attorneyById.get(item.attorney.id)?.totalReviews,
        verifiedReviewCount: verifiedReviewCountMap.get(item.attorney.id) || 0,
        subscriptionTier: attorneyById.get(item.attorney.id)?.attorneyProfile?.subscriptionTier || null,
      },
      matchScore: {
        overall: Math.round(item.score.overall * 100) / 100,
        fitScore: Math.round(item.score.fitScore * 100) / 100,
        outcomeScore: Math.round(item.score.outcomeScore * 100) / 100,
        trustScore: Math.round(item.score.trustScore * 100) / 100,
        valueScore: Math.round(item.score.valueScore * 100) / 100
      },
      breakdown: item.score.breakdown
    }))

    res.json({
      caseId,
      eligibleCount: routingResult.eligible.length,
      qualifiedCount: routingResult.qualified.length,
      stats: routingResult.stats,
      recommendations: formatted
    })
  } catch (error) {
    logger.error('Failed to get attorney recommendations', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

const CASE_FLOW_STAGES = [
  { key: 'intake', label: 'Intake / not routed' },
  { key: 'routing', label: 'In routing' },
  { key: 'awaiting_approval', label: 'Awaiting plaintiff approval' },
  { key: 'manual_review', label: 'Manual review' },
  { key: 'matched', label: 'Attorney matched' },
  { key: 'engaged', label: 'Engaged / consult' },
  { key: 'closed', label: 'Closed' },
] as const
type CaseFlowStageKey = (typeof CASE_FLOW_STAGES)[number]['key']

// Stage and stuck are derived in JS from a cascade of lead + assessment fields,
// so they can't be expressed as a Prisma where clause. Every case therefore has
// to be scanned to produce honest funnel counts, and only then can the response
// be paged. This is the ceiling on that scan; `meta.truncated` tells the console
// when it was hit so the counts are never quietly understated.
const CASE_FLOW_SCAN_LIMIT = 5000
const CASE_FLOW_DEFAULT_LIMIT = 50
const CASE_FLOW_MAX_LIMIT = 200

const CASE_FLOW_SORTS = ['age', 'value', 'plaintiff', 'stage'] as const
type CaseFlowSort = (typeof CASE_FLOW_SORTS)[number]

router.get('/case-flow', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const stageParam = String(req.query.stage || '').trim()
    const stageFilter = CASE_FLOW_STAGES.some((s) => s.key === stageParam)
      ? (stageParam as CaseFlowStageKey)
      : null
    const stuckOnly = String(req.query.stuckOnly || '') === 'true'
    const search = String(req.query.search || '').trim().toLowerCase()
    const sort: CaseFlowSort = CASE_FLOW_SORTS.includes(req.query.sort as CaseFlowSort)
      ? (req.query.sort as CaseFlowSort)
      : 'age'
    const direction = String(req.query.direction || '') === 'asc' ? 'asc' : 'desc'
    const limit = Math.min(
      CASE_FLOW_MAX_LIMIT,
      Math.max(1, Number.parseInt(String(req.query.limit || ''), 10) || CASE_FLOW_DEFAULT_LIMIT),
    )
    const offset = Math.max(0, Number.parseInt(String(req.query.offset || ''), 10) || 0)

    const matchingRules = await getMatchingRules()
    const responseDeadlineMinutes = getAttorneyResponseDeadlineMinutes(matchingRules)
    const now = Date.now()

    // Stage-specific "how long is too long" thresholds, in hours. A case past its
    // stage's threshold is flagged stuck. Routing uses the configured attorney
    // response window rather than a fixed number.
    const STUCK_AWAITING_APPROVAL_HOURS = 48
    const STUCK_MANUAL_REVIEW_HOURS = 24
    const STUCK_INTAKE_HOURS = 24
    const ESCALATION_GRACE_HOURS = Math.max(24, (responseDeadlineMinutes / 60) * 2)

    const leads = await prisma.leadSubmission.findMany({
      orderBy: { updatedAt: 'desc' },
      take: CASE_FLOW_SCAN_LIMIT,
      select: {
        status: true,
        lifecycleState: true,
        routingLocked: true,
        assignedAttorneyId: true,
        assignedAttorney: { select: { name: true } },
        submittedAt: true,
        lastContactAt: true,
        updatedAt: true,
        sourceDetails: true,
        assessment: {
          select: {
            id: true,
            status: true,
            caseStage: true,
            claimType: true,
            venueState: true,
            referenceCode: true,
            createdAt: true,
            manualReviewStatus: true,
            manualReviewReason: true,
            manualReviewHeldAt: true,
            user: { select: { firstName: true, lastName: true } },
            predictions: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { bands: true },
            },
            introductions: {
              orderBy: { requestedAt: 'desc' },
              take: 1,
              select: { status: true, requestedAt: true, waveNumber: true, attorney: { select: { name: true } } },
            },
            routingWaves: {
              orderBy: { waveNumber: 'desc' },
              take: 1,
              select: { waveNumber: true, nextEscalationAt: true },
            },
          },
        },
      },
    })

    const hoursSince = (d: Date | string | null | undefined): number | null => {
      if (!d) return null
      const t = new Date(d).getTime()
      if (Number.isNaN(t)) return null
      return (now - t) / 3_600_000
    }
    const fmtAge = (h: number | null): string => {
      if (h == null) return '—'
      if (h < 1) return `${Math.max(0, Math.round(h * 60))}m`
      if (h < 48) return `${Math.round(h)}h`
      return `${Math.round(h / 24)}d`
    }

    const cases = leads
      .filter((l) => l.assessment)
      .map((l) => {
        const a = l.assessment!
        const intro = a.introductions[0] || null
        const wave = a.routingWaves[0] || null
        const bands = a.predictions[0]?.bands ? (JSON.parse(a.predictions[0].bands) as { median?: number }) : {}
        const manualPending = a.manualReviewStatus === 'pending' || l.lifecycleState === 'manual_review_needed'
        const introAccepted = intro?.status === 'ACCEPTED'

        // Parse the proposed-batch timestamp (awaiting-approval clock) out of the
        // lead's sourceDetails blob without importing the lifecycle module.
        let proposedAt: string | null = null
        try {
          const parsed = l.sourceDetails ? JSON.parse(l.sourceDetails) : null
          const pending = parsed?.plaintiffAttorneyPreferences?.pendingBatch
          if (pending?.proposedAt) proposedAt = String(pending.proposedAt)
        } catch {
          /* sourceDetails is best-effort */
        }

        // Bucket into exactly one stage, most-terminal first.
        //
        // Closure lives on the Assessment (close sets assessment.status='closed'
        // and caseStage='CLOSED'); the leadSubmission lifecycle is NOT updated on
        // close, so keying off the lead alone left the "Closed" column empty
        // (CP: "Closed count showing 0 after I closed a case"). Read the
        // authoritative signal from the assessment too.
        let stage: CaseFlowStageKey
        if (
          l.lifecycleState === 'closed' ||
          l.status === 'closed' ||
          a.status === 'closed' ||
          a.caseStage === 'CLOSED'
        )
          stage = 'closed'
        else if (l.lifecycleState === 'consultation_scheduled' || l.lifecycleState === 'engaged') stage = 'engaged'
        else if (introAccepted || l.routingLocked || l.lifecycleState === 'attorney_matched') stage = 'matched'
        else if (manualPending) stage = 'manual_review'
        else if (l.lifecycleState === 'awaiting_plaintiff_batch_approval') stage = 'awaiting_approval'
        else if (
          l.status === 'submitted' &&
          !l.routingLocked &&
          (intro?.status === 'PENDING' || l.lifecycleState === 'routing_active' || l.lifecycleState === 'attorney_review')
        )
          stage = 'routing'
        else stage = 'intake'

        // When did the case enter its current stage (best-effort).
        let enteredStageAt: Date | string | null
        switch (stage) {
          case 'routing':
            enteredStageAt = intro?.requestedAt || l.submittedAt || a.createdAt
            break
          case 'awaiting_approval':
            enteredStageAt = proposedAt || l.lastContactAt || l.updatedAt
            break
          case 'manual_review':
            enteredStageAt = a.manualReviewHeldAt || l.updatedAt
            break
          case 'matched':
          case 'engaged':
            enteredStageAt = l.lastContactAt || l.updatedAt
            break
          case 'closed':
            enteredStageAt = l.updatedAt
            break
          default:
            enteredStageAt = a.createdAt
        }
        const ageHours = hoursSince(enteredStageAt)

        // Stage-specific stuck detection.
        let stuck = false
        let stuckReason: string | null = null
        if (stage === 'routing') {
          const offerLapsed =
            intro?.status === 'PENDING' &&
            intro.requestedAt &&
            new Date(intro.requestedAt).getTime() + responseDeadlineMinutes * 60_000 < now
          const escalationOverdue =
            wave?.nextEscalationAt && new Date(wave.nextEscalationAt).getTime() + ESCALATION_GRACE_HOURS * 3_600_000 < now
          const noLiveOffer = !intro && ageHours != null && ageHours > responseDeadlineMinutes / 60
          if (offerLapsed) {
            stuck = true
            stuckReason = 'Attorney offer window lapsed — not re-routed'
          } else if (escalationOverdue) {
            stuck = true
            stuckReason = `Escalation overdue (wave ${wave?.waveNumber ?? '?'})`
          } else if (noLiveOffer) {
            stuck = true
            stuckReason = 'In routing with no live attorney offer'
          }
        } else if (stage === 'awaiting_approval') {
          if (ageHours != null && ageHours > STUCK_AWAITING_APPROVAL_HOURS) {
            stuck = true
            stuckReason = `Awaiting plaintiff approval for ${fmtAge(ageHours)}`
          }
        } else if (stage === 'manual_review') {
          if (ageHours != null && ageHours > STUCK_MANUAL_REVIEW_HOURS) {
            stuck = true
            stuckReason = `Un-actioned in manual review for ${fmtAge(ageHours)}`
          }
        } else if (stage === 'intake') {
          if (ageHours != null && ageHours > STUCK_INTAKE_HOURS) {
            stuck = true
            stuckReason = `Not routed ${fmtAge(ageHours)} after intake`
          }
        }

        const plaintiff = `${a.user?.firstName || ''} ${a.user?.lastName || ''}`.trim()

        return {
          id: a.id,
          referenceCode: a.referenceCode || null,
          plaintiffName: plaintiff || null,
          claimType: a.claimType,
          venueState: a.venueState,
          valueEstimate: bands.median ?? null,
          stage,
          stageLabel: CASE_FLOW_STAGES.find((s) => s.key === stage)?.label || stage,
          enteredStageAt: enteredStageAt ? new Date(enteredStageAt).toISOString() : null,
          ageHours: ageHours != null ? Math.round(ageHours * 10) / 10 : null,
          ageLabel: fmtAge(ageHours),
          stuck,
          stuckReason,
          waveNumber: wave?.waveNumber ?? null,
          assignedAttorneyName: l.assignedAttorney?.name || null,
          latestIntro: intro?.attorney
            ? { name: intro.attorney.name, status: intro.status, waveNumber: intro.waveNumber }
            : null,
          manualReviewReason: stage === 'manual_review' ? a.manualReviewReason || null : null,
        }
      })

    // Counts are always computed across every scanned case, never across the page
    // being returned — the funnel header has to describe the whole pipeline even
    // when the table below it is showing 50 rows of one stage.
    const stages = CASE_FLOW_STAGES.map((s) => {
      const inStage = cases.filter((c) => c.stage === s.key)
      return {
        key: s.key,
        label: s.label,
        count: inStage.length,
        stuckCount: inStage.filter((c) => c.stuck).length,
      }
    })

    const filtered = cases.filter((c) => {
      if (stageFilter && c.stage !== stageFilter) return false
      if (stuckOnly && !c.stuck) return false
      if (search) {
        const haystack = [
          c.plaintiffName,
          c.referenceCode,
          c.claimType,
          c.venueState,
          c.assignedAttorneyName,
          c.latestIntro?.name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(search)) return false
      }
      return true
    })

    // Sorting runs over the whole filtered set before slicing, so "oldest first"
    // means oldest in the pipeline rather than oldest on the current page.
    const stageOrder = new Map(CASE_FLOW_STAGES.map((s, i) => [s.key, i]))
    const sign = direction === 'asc' ? 1 : -1
    const sorted = [...filtered].sort((a, b) => {
      switch (sort) {
        case 'value':
          return sign * ((a.valueEstimate ?? -1) - (b.valueEstimate ?? -1))
        case 'plaintiff':
          return sign * (a.plaintiffName || '').localeCompare(b.plaintiffName || '')
        case 'stage':
          return sign * ((stageOrder.get(a.stage) ?? 0) - (stageOrder.get(b.stage) ?? 0))
        default:
          return sign * ((a.ageHours ?? -1) - (b.ageHours ?? -1))
      }
    })

    res.json({
      stages,
      cases: sorted.slice(offset, offset + limit),
      meta: {
        totalCases: cases.length,
        stuckCases: cases.filter((c) => c.stuck).length,
        /** Rows matching the active stage/stuck/search filters — what the pager counts. */
        filteredCases: sorted.length,
        limit,
        offset,
        truncated: leads.length >= CASE_FLOW_SCAN_LIMIT,
        responseDeadlineMinutes,
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    logger.error('Failed to build case flow', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get single attorney detail for admin

export default router
