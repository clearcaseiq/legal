/**
 * Case Insights - Medical Chronology, Case Preparation, Settlement Benchmarks
 * EvenUp-style features
 */

import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import {
  buildMedicalChronology,
  buildMedicalChronologySummary,
  buildPlaintiffMedicalReview,
  computeCasePreparation,
  getSettlementBenchmarks,
} from '../lib/case-insights'
import { optionalAuthMiddleware, AuthRequest } from '../lib/auth'
import { enforceAssessmentReadAccess } from '../lib/assessment-access'
import { updateCaseFacts } from '../lib/case-facts'
import { logger } from '../lib/logger'
import { maybeVerifyAttorneyReview } from '../lib/appointment-engagement'
import { recomputeAttorneyRatingAggregates } from '../lib/attorney-rating-aggregates'

const router = Router()

const PlaintiffMedicalReviewUpdate = z.object({
  status: z.enum(['pending', 'confirmed', 'skipped']).optional(),
  skipReason: z.string().trim().max(500).optional(),
  edits: z.array(z.object({
    eventId: z.string().trim().min(1),
    correctedDate: z.string().trim().optional(),
    correctedProvider: z.string().trim().optional(),
    correctedLabel: z.string().trim().optional(),
    correctedDetails: z.string().trim().optional(),
    hideEvent: z.boolean().optional(),
    plaintiffNote: z.string().trim().max(1000).optional(),
  })).optional(),
})

/**
 * Every route here serves medical or valuation detail for one case, so they all
 * gate on `enforceAssessmentReadAccess`.
 *
 * They previously each rolled their own check of the shape
 * `assessment.userId && userId && assessment.userId !== userId`, which only
 * rejects when the caller is signed in as somebody else. An unauthenticated
 * caller has no `userId`, so the condition was false and the read went through —
 * meaning a registered plaintiff's chronology was readable by anyone holding the
 * assessment id. The shared guard distinguishes "no owner yet" (anonymous
 * intake, still reachable by id) from "owned by an account" (401 without a
 * session), which is the distinction the local checks were missing.
 */

// Medical chronology - visual injury timeline
router.get('/assessments/:assessmentId/medical-chronology', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const { assessmentId } = req.params

    const allowed = await enforceAssessmentReadAccess({
      assessmentId,
      user: req.user,
      res,
      route: 'case-insights.medical-chronology',
    })
    if (!allowed) return

    const [chronology, summary] = await Promise.all([
      buildMedicalChronology(assessmentId),
      buildMedicalChronologySummary(assessmentId),
    ])
    res.json({ chronology, summary })
  } catch (error: any) {
    logger.error('Failed to build medical chronology', { error: error.message, assessmentId: req.params.assessmentId })
    res.status(500).json({ error: 'Failed to build medical chronology' })
  }
})

router.get('/assessments/:assessmentId/plaintiff-medical-review', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const { assessmentId } = req.params

    const allowed = await enforceAssessmentReadAccess({
      assessmentId,
      user: req.user,
      res,
      route: 'case-insights.plaintiff-medical-review.read',
    })
    if (!allowed) return

    const review = await buildPlaintiffMedicalReview(assessmentId)
    res.json(review)
  } catch (error: any) {
    logger.error('Failed to build plaintiff medical review', { error: error.message, assessmentId: req.params.assessmentId })
    res.status(500).json({ error: 'Failed to build plaintiff medical review' })
  }
})

router.post('/assessments/:assessmentId/plaintiff-medical-review', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const { assessmentId } = req.params
    const parsed = PlaintiffMedicalReviewUpdate.safeParse(req.body)

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid plaintiff medical review payload',
        details: parsed.error.flatten(),
      })
    }

    const allowed = await enforceAssessmentReadAccess({
      assessmentId,
      user: req.user,
      res,
      route: 'case-insights.plaintiff-medical-review.write',
    })
    if (!allowed) return

    const now = new Date().toISOString()
    const written = await updateCaseFacts({
      assessmentId,
      source: 'web',
      action: 'medical_review_saved',
      entityType: 'medical',
      summary: `Claimant ${parsed.data.status ?? 'updated'} the medical chronology review`,
      actor: { type: 'user', id: req.user?.id ?? null },
      mutate: (facts) => {
        const currentReview = (facts.plaintiffMedicalReview || {}) as Record<string, unknown>
        const nextStatus = parsed.data.status ?? currentReview.status ?? 'pending'
        return {
          ...facts,
          plaintiffMedicalReview: {
            ...currentReview,
            edits: parsed.data.edits ?? currentReview.edits ?? [],
            skipReason: parsed.data.skipReason ?? currentReview.skipReason,
            status: nextStatus,
            // Undefined drops out of the serialized document, so switching
            // status clears the timestamp belonging to the other outcome.
            confirmedAt: nextStatus === 'confirmed' ? now : undefined,
            skippedAt: nextStatus === 'skipped' ? now : undefined,
            updatedAt: now,
          },
        }
      },
    })
    if (!written) {
      return res.status(404).json({ error: 'Assessment not found' })
    }

    const review = await buildPlaintiffMedicalReview(assessmentId)
    res.json(review)
  } catch (error: any) {
    logger.error('Failed to save plaintiff medical review', { error: error.message, assessmentId: req.params.assessmentId })
    res.status(500).json({ error: 'Failed to save plaintiff medical review' })
  }
})

// Case preparation - missing docs, treatment gaps, strengths/weaknesses
router.get('/assessments/:assessmentId/case-preparation', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const { assessmentId } = req.params

    const allowed = await enforceAssessmentReadAccess({
      assessmentId,
      user: req.user,
      res,
      route: 'case-insights.case-preparation',
    })
    if (!allowed) return

    const preparation = await computeCasePreparation(assessmentId)
    res.json(preparation)
  } catch (error: any) {
    logger.error('Failed to compute case preparation', { error: error.message, assessmentId: req.params.assessmentId })
    res.status(500).json({ error: 'Failed to compute case preparation' })
  }
})

// Settlement benchmarks - comparable case valuations
router.get('/assessments/:assessmentId/settlement-benchmarks', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const { assessmentId } = req.params

    const allowed = await enforceAssessmentReadAccess({
      assessmentId,
      user: req.user,
      res,
      route: 'case-insights.settlement-benchmarks',
    })
    if (!allowed) return

    const benchmarks = await getSettlementBenchmarks(assessmentId)
    res.json({ benchmarks })
  } catch (error: any) {
    logger.error('Failed to get settlement benchmarks', { error: error.message, assessmentId: req.params.assessmentId })
    res.status(500).json({ error: 'Failed to get settlement benchmarks' })
  }
})

const PlaintiffSatisfactionUpdate = z.object({
  satisfaction: z.number().int().min(1).max(5),
  notes: z.string().trim().max(2000).optional(),
})

// Plaintiff-reported satisfaction with their attorney/experience. Stored on the
// case's DecisionMemory record so it sits alongside the accept/decline/outcome data.
router.get('/assessments/:assessmentId/satisfaction', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const { assessmentId } = req.params

    const allowed = await enforceAssessmentReadAccess({
      assessmentId,
      user: req.user,
      res,
      route: 'case-insights.satisfaction.read',
    })
    if (!allowed) return

    const memory = await prisma.decisionMemory.findFirst({
      where: { assessmentId },
      orderBy: { updatedAt: 'desc' },
      select: {
        plaintiffSatisfaction: true,
        plaintiffSatisfactionNotes: true,
        plaintiffSatisfactionAt: true,
      },
    })
    res.json(memory || { plaintiffSatisfaction: null, plaintiffSatisfactionNotes: null, plaintiffSatisfactionAt: null })
  } catch (error: any) {
    logger.error('Failed to get plaintiff satisfaction', { error: error.message, assessmentId: req.params.assessmentId })
    res.status(500).json({ error: 'Failed to get plaintiff satisfaction' })
  }
})

router.post('/assessments/:assessmentId/satisfaction', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const { assessmentId } = req.params
    const userId = req.user?.id
    const parsed = PlaintiffSatisfactionUpdate.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid satisfaction payload', details: parsed.error.flatten() })
    }

    const allowed = await enforceAssessmentReadAccess({
      assessmentId,
      user: req.user,
      res,
      route: 'case-insights.satisfaction.write',
    })
    if (!allowed) return

    const lead = await prisma.leadSubmission.findFirst({
      where: { assessmentId },
      select: { id: true, assignedAttorneyId: true },
    })

    const satisfactionData = {
      plaintiffSatisfaction: parsed.data.satisfaction,
      plaintiffSatisfactionNotes: parsed.data.notes ?? null,
      plaintiffSatisfactionAt: new Date(),
    }

    const existing = lead
      ? await prisma.decisionMemory.findUnique({ where: { leadId: lead.id }, select: { id: true } })
      : await prisma.decisionMemory.findFirst({ where: { assessmentId }, select: { id: true } })

    if (existing) {
      await prisma.decisionMemory.update({ where: { id: existing.id }, data: satisfactionData })
    } else if (lead?.assignedAttorneyId) {
      // No decision record yet, but a matched attorney exists — create one to hold the rating.
      await prisma.decisionMemory.create({
        data: {
          leadId: lead.id,
          assessmentId,
          attorneyId: lead.assignedAttorneyId,
          recommendedDecision: 'accept',
          recommendedConfidence: 50,
          ...satisfactionData,
        },
      })
    } else {
      return res.status(409).json({ error: 'No matched attorney yet. Satisfaction can be recorded once a case is engaged.' })
    }

    // This widget asks the plaintiff to rate their attorney, so it has to count as
    // one. It previously only wrote DecisionMemory, which no admin or firm screen
    // reads — so a submitted rating appeared nowhere (CP-308/321/326). Mirror the
    // stars onto the attorney's review record, leaving any written review intact.
    if (userId && lead?.assignedAttorneyId) {
      try {
        const isVerified = await maybeVerifyAttorneyReview({ attorneyId: lead.assignedAttorneyId, userId })
        // Scoped to this case, so satisfaction recorded on a second matter with
        // the same attorney does not overwrite the rating from the first
        // (CP-480). findFirst rather than upsert because the unique key now
        // includes a nullable column, which Postgres will not match on.
        const existingReview = await prisma.attorneyReview.findFirst({
          where: { attorneyId: lead.assignedAttorneyId, userId, assessmentId },
          select: { id: true },
        })
        if (existingReview) {
          await prisma.attorneyReview.update({
            where: { id: existingReview.id },
            data: { rating: parsed.data.satisfaction, isVerified },
          })
        } else {
          await prisma.attorneyReview.create({
            data: {
              attorneyId: lead.assignedAttorneyId,
              userId,
              assessmentId,
              rating: parsed.data.satisfaction,
              review: parsed.data.notes ?? null,
              isVerified,
            },
          })
        }
        await recomputeAttorneyRatingAggregates(lead.assignedAttorneyId)
      } catch (reviewError: any) {
        logger.warn('Failed to mirror satisfaction onto attorney rating', {
          error: reviewError?.message,
          attorneyId: lead.assignedAttorneyId,
        })
      }
    }

    res.json({ ok: true, ...satisfactionData })
  } catch (error: any) {
    logger.error('Failed to save plaintiff satisfaction', { error: error.message, assessmentId: req.params.assessmentId })
    res.status(500).json({ error: 'Failed to save plaintiff satisfaction' })
  }
})

export default router
