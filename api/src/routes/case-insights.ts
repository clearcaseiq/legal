/**
 * Case Insights - Medical Chronology, Case Preparation, Settlement Benchmarks
 * EvenUp-style features
 */

import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import {
  buildMedicalChronology,
  buildPlaintiffMedicalReview,
  computeCasePreparation,
  getSettlementBenchmarks,
} from '../lib/case-insights'
import { optionalAuthMiddleware, AuthRequest } from '../lib/auth'
import { logger } from '../lib/logger'

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

// Medical chronology - visual injury timeline
router.get('/assessments/:assessmentId/medical-chronology', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const { assessmentId } = req.params
    const userId = req.user?.id

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { userId: true }
    })

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' })
    }

    if (assessment.userId && userId && assessment.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to view this assessment' })
    }

    const chronology = await buildMedicalChronology(assessmentId)
    res.json({ chronology })
  } catch (error: any) {
    logger.error('Failed to build medical chronology', { error: error.message, assessmentId: req.params.assessmentId })
    res.status(500).json({ error: 'Failed to build medical chronology' })
  }
})

router.get('/assessments/:assessmentId/plaintiff-medical-review', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const { assessmentId } = req.params
    const userId = req.user?.id

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { userId: true },
    })

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' })
    }

    if (assessment.userId && userId && assessment.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to view this assessment' })
    }

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
    const userId = req.user?.id
    const parsed = PlaintiffMedicalReviewUpdate.safeParse(req.body)

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid plaintiff medical review payload',
        details: parsed.error.flatten(),
      })
    }

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { userId: true, facts: true },
    })

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' })
    }

    if (assessment.userId && userId && assessment.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to update this assessment' })
    }

    const facts = typeof assessment.facts === 'string' ? JSON.parse(assessment.facts) : {}
    const currentReview = (facts.plaintiffMedicalReview || {}) as Record<string, unknown>
    const nextStatus = parsed.data.status ?? currentReview.status ?? 'pending'
    const now = new Date().toISOString()

    facts.plaintiffMedicalReview = {
      ...currentReview,
      edits: parsed.data.edits ?? currentReview.edits ?? [],
      skipReason: parsed.data.skipReason ?? currentReview.skipReason,
      status: nextStatus,
      confirmedAt: nextStatus === 'confirmed' ? now : undefined,
      skippedAt: nextStatus === 'skipped' ? now : undefined,
      updatedAt: now,
    }

    await prisma.assessment.update({
      where: { id: assessmentId },
      data: { facts: JSON.stringify(facts) },
    })

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
    const userId = req.user?.id

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { userId: true }
    })

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' })
    }

    if (assessment.userId && userId && assessment.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to view this assessment' })
    }

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
    const userId = req.user?.id

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { userId: true }
    })

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' })
    }

    if (assessment.userId && userId && assessment.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to view this assessment' })
    }

    const benchmarks = await getSettlementBenchmarks(assessmentId)
    res.json({ benchmarks })
  } catch (error: any) {
    logger.error('Failed to get settlement benchmarks', { error: error.message, assessmentId: req.params.assessmentId })
    res.status(500).json({ error: 'Failed to get settlement benchmarks' })
  }
})

export default router
