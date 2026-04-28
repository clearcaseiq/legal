import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { AssessmentWrite, AssessmentUpdate, SubmitCaseForReview } from '../lib/validators'
import { logger } from '../lib/logger'
import { optionalAuthMiddleware, authMiddleware, AuthRequest } from '../lib/auth'
import {
  requireClientConsentsMiddleware,
  requireVerifiedEmailMiddleware,
  isGuestCaseUserEmail,
} from '../lib/client-consent-guard'
import { analyzeCaseWithChatGPT, CaseAnalysisRequest } from '../services/chatgpt'
import { startAssessmentRouting } from '../lib/assessment-routing'
import { buildCaseCommandCenter } from '../lib/case-command-center'
import { runEscalationWave } from '../lib/routing-lifecycle'

const router = Router()

const DOCUMENT_REQUEST_LABELS: Record<string, string> = {
  police_report: 'Police report',
  medical_records: 'Medical records',
  injury_photos: 'Injury photos',
  wage_loss: 'Wage loss documentation',
  insurance: 'Insurance information',
  other: 'Other documents'
}

const DOCUMENT_REQUEST_CATEGORY_MAP: Record<string, string[]> = {
  police_report: ['police_report'],
  medical_records: ['medical_records', 'bills'],
  injury_photos: ['photos'],
  wage_loss: ['wage_loss'],
  insurance: ['insurance'],
  other: []
}

function parseRequestedDocs(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string' && item.length > 0) : []
  } catch {
    return []
  }
}

// Create new assessment
router.post('/', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const parsed = AssessmentWrite.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: parsed.error.flatten() 
      })
    }

    const assessment = await prisma.assessment.create({
      data: {
        userId: req.user?.id, // Associate with user if logged in
        claimType: parsed.data.claimType,
        venueState: parsed.data.venue.state,
        venueCounty: parsed.data.venue.county ?? null,
        status: 'DRAFT',
        facts: JSON.stringify(parsed.data)
      }
    })

    logger.info('Assessment created', { assessmentId: assessment.id, claimType: assessment.claimType })

    // Kick off LLM analysis on submission (non-blocking)
    void (async () => {
      try {
        const analysisRequest: CaseAnalysisRequest = {
          assessmentId: assessment.id,
          caseData: {
            ...parsed.data,
            evidence: []
          }
        }

        const analysisResult = await analyzeCaseWithChatGPT(analysisRequest)
        await prisma.assessment.update({
          where: { id: assessment.id },
          data: {
            chatgptAnalysis: JSON.stringify(analysisResult),
            chatgptAnalysisDate: new Date()
          }
        })
      } catch (analysisError: any) {
        logger.error('Failed to generate ChatGPT analysis on submission', { 
          error: analysisError.message,
          assessmentId: assessment.id 
        })
      }
    })()
    
    res.json({ 
      assessment_id: assessment.id,
      status: assessment.status,
      created_at: assessment.createdAt
    })
  } catch (error: any) {
    logger.error('Failed to create assessment', { error })
    const isDev = process.env.NODE_ENV !== 'production'
    const msg = error?.message || ''
    const isDbError = /connect|ECONNREFUSED|ETIMEDOUT|unknown database|Access denied/i.test(msg)
    res.status(500).json({
      error: isDev && isDbError
        ? 'Database unavailable. Start MySQL (e.g. docker-compose up -d db) and ensure DATABASE_URL in api/.env is correct.'
        : (isDev ? msg : 'Internal server error')
    })
  }
})

// Update assessment
router.patch(
  '/:id',
  authMiddleware,
  requireClientConsentsMiddleware(),
  requireVerifiedEmailMiddleware(),
  async (req: AuthRequest, res) => {
  try {
    const id = req.params.id
    logger.info('Assessment update request', { assessmentId: id, userId: req.user.id, bodyKeys: Object.keys(req.body) })
    
    const parsed = AssessmentUpdate.safeParse(req.body)
    
    if (!parsed.success) {
      logger.error('Assessment update validation failed', { 
        assessmentId: id, 
        errors: parsed.error.flatten(),
        body: req.body 
      })
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: parsed.error.flatten() 
      })
    }

    // Get current facts and merge with updates
    const current = await prisma.assessment.findUnique({ where: { id } })
    if (!current) {
      return res.status(404).json({ error: 'Assessment not found' })
    }

    // Check if user owns this assessment (if assessment has a userId)
    if (current.userId && current.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to update this assessment' })
    }

    const currentFacts = JSON.parse(current.facts)
    const updatedFacts = { ...currentFacts, ...parsed.data }

    const assessment = await prisma.assessment.update({
      where: { id },
      data: { 
        facts: JSON.stringify(updatedFacts),
        status: 'IN_PROGRESS'
      }
    })

    logger.info('Assessment updated', { assessmentId: id })

    // Re-run LLM analysis after edits (non-blocking)
    void (async () => {
      try {
        const assessmentWithEvidence = await prisma.assessment.findUnique({
          where: { id },
          include: { evidenceFiles: true }
        })

        if (!assessmentWithEvidence) return

        const evidenceData = (assessmentWithEvidence.evidenceFiles || []).map((file: any) => ({
          id: file.id,
          filename: file.filename,
          category: file.category,
          processed: file.processed,
          extractedData: file.extractedData ? JSON.parse(file.extractedData) : null
        }))

        const analysisRequest: CaseAnalysisRequest = {
          assessmentId: assessmentWithEvidence.id,
          caseData: {
            ...updatedFacts,
            evidence: evidenceData
          }
        }

        const analysisResult = await analyzeCaseWithChatGPT(analysisRequest)
        await prisma.assessment.update({
          where: { id },
          data: {
            chatgptAnalysis: JSON.stringify(analysisResult),
            chatgptAnalysisDate: new Date()
          }
        })
      } catch (analysisError: any) {
        logger.error('Failed to generate ChatGPT analysis after assessment update', { 
          error: analysisError.message,
          assessmentId: id 
        })
      }
    })()
    
    res.json({ 
      ok: true, 
      assessment_id: assessment.id,
      status: assessment.status
    })
  } catch (error) {
    logger.error('Failed to update assessment', { error, assessmentId: req.params.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get assessment
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id
    const assessment = await prisma.assessment.findUnique({ 
      where: { id },
      include: {
        predictions: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        leadSubmission: { select: { id: true, submittedAt: true, status: true } }
      }
    })
    
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' })
    }

    const latest = assessment.predictions[0]
    const previous = assessment.predictions[1]
    const now = new Date()
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)
    const latestRecent = latest && new Date(latest.createdAt) > fortyEightHoursAgo
    let caseValueUpdated: { previousValue: { p25: number; median: number; p75: number }; newValue: { p25: number; median: number; p75: number }; reason?: string } | null = null
    if (latest && previous && latestRecent) {
      const prevBands = JSON.parse(previous.bands) as { p25: number; median: number; p75: number }
      const newBands = JSON.parse(latest.bands) as { p25: number; median: number; p75: number }
      if (newBands.median > prevBands.median) {
        const explain = JSON.parse(latest.explain) as { reason?: string }
        caseValueUpdated = { previousValue: prevBands, newValue: newBands, reason: explain?.reason }
      }
    }

    const caseValueHistory = assessment.predictions.map((p, i) => {
      const bands = JSON.parse(p.bands) as { p25: number; median: number; p75: number }
      const label = i === 0 ? 'Current' : i === 1 ? 'Previous' : `Version ${assessment.predictions.length - i}`
      return { label, value: bands.median, bands, createdAt: p.createdAt }
    })

    res.json({
      id: assessment.id,
      claimType: assessment.claimType,
      venue: {
        state: assessment.venueState,
        county: assessment.venueCounty
      },
      status: assessment.status,
      facts: JSON.parse(assessment.facts),
      created_at: assessment.createdAt,
      submittedForReview: !!assessment.leadSubmission,
      latest_prediction: latest ? {
        id: latest.id,
        model_version: latest.modelVersion,
        viability: JSON.parse(latest.viability),
        value_bands: JSON.parse(latest.bands),
        explainability: JSON.parse(latest.explain),
        created_at: latest.createdAt
      } : null,
      caseValueHistory,
      caseValueUpdated
    })
  } catch (error) {
    logger.error('Failed to get assessment', { error, assessmentId: req.params.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id/command-center', async (req, res) => {
  try {
    const summary = await buildCaseCommandCenter({ assessmentId: req.params.id })
    res.json(summary)
  } catch (error: any) {
    logger.error('Failed to get assessment command center', {
      error: error.message,
      assessmentId: req.params.id,
    })
    const statusCode = /not found/i.test(error.message) ? 404 : 500
    res.status(statusCode).json({ error: statusCode === 404 ? 'Assessment not found' : 'Internal server error' })
  }
})

router.get('/:id/document-requests', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const assessment = await prisma.assessment.findUnique({
      where: { id },
      select: {
        userId: true,
        evidenceFiles: {
          select: {
            id: true,
            category: true,
            originalName: true,
            createdAt: true
          }
        },
        leadSubmission: {
          select: {
            id: true,
            documentRequests: {
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                requestedDocs: true,
                customMessage: true,
                uploadLink: true,
                status: true,
                lastNudgeAt: true,
                createdAt: true,
                attorney: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' })
    }

    if (!assessment.userId || assessment.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to view this assessment' })
    }

    const uploadedCategories = new Set(
      (assessment.evidenceFiles || []).map((file) => file.category)
    )

    const requests = (assessment.leadSubmission?.documentRequests || []).map((request) => {
      const requestedDocs = parseRequestedDocs(request.requestedDocs)
      const items = requestedDocs.map((key) => {
        const acceptedCategories = DOCUMENT_REQUEST_CATEGORY_MAP[key] || []
        const fulfilled = acceptedCategories.length > 0 && acceptedCategories.some((category) => uploadedCategories.has(category))
        return {
          key,
          label: DOCUMENT_REQUEST_LABELS[key] || key.replace(/_/g, ' '),
          fulfilled
        }
      })
      const fulfilledCount = items.filter((item) => item.fulfilled).length
      const completionPercent = items.length > 0
        ? Math.round((fulfilledCount / items.length) * 100)
        : assessment.evidenceFiles.length > 0
          ? 50
          : 0
      const displayStatus = items.length > 0
        ? fulfilledCount === items.length
          ? 'completed'
          : fulfilledCount > 0
            ? 'partial'
            : request.status
        : request.status

      return {
        id: request.id,
        leadId: assessment.leadSubmission?.id || null,
        attorney: request.attorney,
        requestedDocs,
        items,
        fulfilledDocs: items.filter((item) => item.fulfilled).map((item) => item.key),
        remainingDocs: items.filter((item) => !item.fulfilled).map((item) => item.key),
        customMessage: request.customMessage,
        uploadLink: request.uploadLink,
        status: displayStatus,
        rawStatus: request.status,
        completionPercent,
        lastNudgeAt: request.lastNudgeAt,
        createdAt: request.createdAt
      }
    })

    res.json({
      assessmentId: id,
      evidenceCount: assessment.evidenceFiles.length,
      requests
    })
  } catch (error) {
    logger.error('Failed to load plaintiff document requests', { error, assessmentId: req.params.id })
    res.status(500).json({ error: 'Failed to load document requests' })
  }
})

// List assessments (for a user - simplified for now)
router.get('/', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const assessments = await prisma.assessment.findMany({
      where: req.user ? { userId: req.user.id } : {}, // Filter by user if authenticated
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        predictions: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        leadSubmission: { select: { id: true, submittedAt: true, status: true } }
      }
    })

    res.json(assessments.map(a => ({
      id: a.id,
      claimType: a.claimType,
      venue: { state: a.venueState, county: a.venueCounty },
      status: a.status,
      created_at: a.createdAt,
      submittedForReview: !!a.leadSubmission,
      latest_prediction: a.predictions[0] ? {
        id: a.predictions[0].id,
        model_version: a.predictions[0].modelVersion,
        viability: JSON.parse(a.predictions[0].viability),
        value_bands: JSON.parse(a.predictions[0].bands),
        explainability: JSON.parse(a.predictions[0].explain),
        created_at: a.predictions[0].createdAt
      } : null
    })))
  } catch (error) {
    logger.error('Failed to list assessments', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Submit case for attorney review (plaintiff self-submission)
router.post('/:id/submit-for-review', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id
    const parsed = SubmitCaseForReview.safeParse(req.body || {})
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: parsed.error.flatten()
      })
    }

    const {
      firstName,
      email,
      phone,
      preferredContactMethod,
      hipaa,
      rankedAttorneyIds: rawRankedAttorneyIds = []
    } = parsed.data
    const rankedAttorneyIds = [...new Set(rawRankedAttorneyIds)].slice(0, 3)

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        leadSubmission: true,
        predictions: { orderBy: { createdAt: 'desc' }, take: 1 }
      }
    })
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' })
    }
    if (assessment.leadSubmission) {
      return res.json({ ok: true, submitted: true, message: 'Case already submitted for review' })
    }

    // Associate assessment with user when logged in (so it appears on their dashboard)
    if (req.user) {
      await prisma.assessment.updateMany({
        where: { id, userId: null },
        data: { userId: req.user.id }
      })
    }

    const facts = typeof assessment.facts === 'string' ? JSON.parse(assessment.facts) : (assessment.facts || {})
    const plaintiffContext = (facts.plaintiffContext || {}) as Record<string, unknown>
    if (firstName) plaintiffContext.firstName = firstName
    if (email) plaintiffContext.email = email
    if (phone) plaintiffContext.phone = phone
    if (preferredContactMethod) plaintiffContext.preferredContactMethod = preferredContactMethod
    facts.plaintiffContext = plaintiffContext
    facts.plaintiffAttorneyPreferences = rankedAttorneyIds.length > 0
      ? {
          rankedAttorneyIds,
          mode: 'sequential_ranked_top3',
          source: 'plaintiff',
          batchNumber: 1,
          rankedAt: new Date().toISOString()
        }
      : undefined

    const consents = ((facts.consents as Record<string, unknown> | undefined) || {}) as Record<string, unknown>
    if (hipaa === true) {
      consents.hipaa = true
    }
    facts.consents = consents

    if (rankedAttorneyIds.length > 0) {
      const rankedAttorneys = await prisma.attorney.findMany({
        where: {
          id: { in: rankedAttorneyIds },
          isActive: true
        },
        select: { id: true }
      })
      const availableAttorneyIds = new Set(rankedAttorneys.map((attorney) => attorney.id))
      const missingAttorneyIds = rankedAttorneyIds.filter((attorneyId) => !availableAttorneyIds.has(attorneyId))
      if (missingAttorneyIds.length > 0) {
        return res.status(400).json({
          error: 'One or more ranked attorneys are no longer available.'
        })
      }
    }

    const requiredDisclosuresAccepted = Boolean(consents.hipaa)
    if (!requiredDisclosuresAccepted) {
      return res.status(400).json({
        error: 'HIPAA authorization is required before sending your case to attorneys.'
      })
    }

    await prisma.assessment.update({
      where: { id },
      data: { facts: JSON.stringify(facts) }
    })

    const prediction = assessment.predictions[0]
    const viability = prediction ? JSON.parse(prediction.viability) : {}
    const scores = {
      viabilityScore: viability.overall ?? 0.5,
      liabilityScore: viability.liability ?? 0.5,
      causationScore: viability.causation ?? 0.5,
      damagesScore: viability.damages ?? 0.5
    }
    await prisma.leadSubmission.create({
      data: {
        assessmentId: id,
        ...scores,
        evidenceChecklist: JSON.stringify({ required: [] }),
        isExclusive: false,
        sourceType: 'plaintiff',
        sourceDetails: JSON.stringify({
          ...(req.user ? { userId: req.user.id } : {}),
          plaintiffAttorneyPreferences: rankedAttorneyIds.length > 0
            ? {
                rankedAttorneyIds,
                mode: 'sequential_ranked_top3',
                source: 'plaintiff',
                batchNumber: 1,
                rankedAt: new Date().toISOString()
              }
            : undefined
        }),
        status: 'submitted'
      }
    })
    logger.info('Case submitted for review', { assessmentId: id, userId: req.user?.id })

    // Trigger unified routing orchestration: tier-first when available, classic engine as fallback.
    void startAssessmentRouting(id, {
      maxAttorneysPerWave: rankedAttorneyIds.length > 0 ? 1 : 3,
      preferTierRouting: rankedAttorneyIds.length === 0,
      fallbackToClassic: true,
      preferredAttorneyIds: rankedAttorneyIds.length > 0 ? rankedAttorneyIds : undefined
    }).then(async result => {
      if (result.success && result.routedTo?.length) {
        logger.info('Case auto-routed after submit', {
          assessmentId: id,
          strategy: result.strategy,
          tierNumber: result.tierNumber,
          attorneyIds: result.routedTo
        })
      } else if (rankedAttorneyIds.length > 0) {
        const escalationResult = await runEscalationWave(id)
        logger.info('Ranked attorney queue auto-expanded after submit', {
          assessmentId: id,
          errors: result.errors,
          escalationResult
        })
      } else if (!result.gatePassed) {
        logger.info('Case held at pre-routing gate', { assessmentId: id, reason: result.gateReason, status: result.gateStatus })
      } else {
        logger.info('Case was not placed during automatic routing', {
          assessmentId: id,
          strategy: result.strategy,
          tierNumber: result.tierNumber,
          errors: result.errors
        })
      }
    }).catch(err => logger.error('Unified routing failed on submit', { assessmentId: id, error: err.message }))

    res.json({ ok: true, submitted: true })
  } catch (error: any) {
    logger.error('Failed to submit case for review', { error, assessmentId: req.params.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Associate anonymous assessments with user
router.post('/associate', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { assessmentIds } = req.body
    
    if (!Array.isArray(assessmentIds)) {
      return res.status(400).json({ error: 'assessmentIds must be an array' })
    }

    const candidates = await prisma.assessment.findMany({
      where: { id: { in: assessmentIds } },
      select: {
        id: true,
        userId: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    })

    const transferableAssessmentIds = candidates
      .filter((assessment) => {
        if (!assessment.userId) return true
        return isGuestCaseUserEmail(assessment.user?.email || '')
      })
      .map((assessment) => assessment.id)

    const updatedAssessments = transferableAssessmentIds.length > 0
      ? await prisma.assessment.updateMany({
          where: {
            id: { in: transferableAssessmentIds },
          },
          data: {
            userId: req.user!.id,
          },
        })
      : { count: 0 }

    if (transferableAssessmentIds.length > 0) {
      await prisma.evidenceFile.updateMany({
        where: {
          assessmentId: { in: transferableAssessmentIds },
        },
        data: {
          userId: req.user!.id,
        },
      })
    }

    logger.info('Associated assessments with user', { 
      userId: req.user!.id, 
      assessmentIds,
      transferableAssessmentIds,
      updatedCount: updatedAssessments.count 
    })

    res.json({ 
      message: 'Assessments associated successfully',
      updatedCount: updatedAssessments.count 
    })
  } catch (error) {
    logger.error('Failed to associate assessments', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Failed to associate assessments' })
  }
})

export default router
