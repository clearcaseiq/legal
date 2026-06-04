import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { computeFeatures, predictViability, simulateScenario } from '../lib/prediction'
import { PredictionRequest, SimulationRequest } from '../lib/validators'
import { logger } from '../lib/logger'
import { authMiddleware, optionalAuthMiddleware, type AuthRequest } from '../lib/auth'
import { underwriteCase } from '../lib/underwriting-engine'

const router = Router()

function canAccessAssessment(req: AuthRequest, assessmentUserId: string | null | undefined) {
  return req.user?.role === 'admin' || (!!req.user?.id && req.user.id === assessmentUserId)
}

/** Guest intake shadow user created when uploading evidence; same id is stored on the assessment. */
function isGuestShadowOwner(assessmentId: string, ownerEmail: string | null | undefined) {
  if (!ownerEmail) return false
  return ownerEmail.toLowerCase() === `guest+${assessmentId}@caseiq.local`.toLowerCase()
}

// Predict viability and value.
// Guest intake creates assessments with no userId; allow prediction without auth so the web client can reach /results
// without being redirected to login by the fetch 401 handler (assessment id is the capability).
router.post('/', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const parsed = PredictionRequest.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: parsed.error.flatten() 
      })
    }

    const { assessmentId } = parsed.data
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        user: { select: { email: true } },
        evidenceFiles: {
          select: {
            category: true,
            originalName: true,
            aiClassification: true,
            aiSummary: true,
          }
        }
      },
    })

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' })
    }

    if (assessment.userId) {
      const guestShadow = isGuestShadowOwner(assessment.id, assessment.user?.email)
      if (!guestShadow) {
        if (!req.user) {
          return res.status(401).json({ error: 'Authentication required' })
        }
        if (!canAccessAssessment(req, assessment.userId)) {
          return res.status(403).json({ error: 'Unauthorized' })
        }
      }
    }

    const features = computeFeatures(assessment)
    const result = await predictViability(features)
    const facts = typeof assessment.facts === 'string' ? JSON.parse(assessment.facts) : assessment.facts
    const underwriting = underwriteCase({
      id: assessment.id,
      claimType: assessment.claimType,
      venueState: assessment.venueState,
      venueCounty: assessment.venueCounty,
      facts,
      evidenceFiles: assessment.evidenceFiles,
    })
    const legacyValueBands = result.value_bands as any
    const underwritingValueBands = {
      ...legacyValueBands,
      p25: underwriting.settlement.low,
      median: underwriting.settlement.expected,
      p75: underwriting.settlement.high,
      settlement: {
        ...(legacyValueBands?.settlement || {}),
        p25: underwriting.settlement.low,
        median: underwriting.settlement.expected,
        p75: underwriting.settlement.high,
        formula: underwriting.settlement.formula,
      },
      economics: {
        ...(legacyValueBands?.economics || {}),
        medicalBills: underwriting.settlement.economicDamages.medicalBills,
        lostWages: underwriting.settlement.economicDamages.lostWages,
        outOfPocket: underwriting.settlement.economicDamages.outOfPocket,
        futureMedicalAdjusted: underwriting.settlement.economicDamages.futureMedicalAdjusted,
        economicDamages: underwriting.settlement.economicDamages.total,
        baseInjuryValue: underwriting.settlement.baseInjuryValue,
      }
    }
    const underwritingResult = {
      ...result,
      viability: {
        ...result.viability,
        overall: underwriting.scores.caseStrength / 100,
        liability: underwriting.scores.liability / 100,
        damages: Math.max(result.viability.damages, underwriting.scores.severity / 100),
        attorneyAcceptance: underwriting.attorneyAcceptance.probability / 100,
      },
      value_bands: underwritingValueBands,
      underwriting,
      severity: {
        ...(result.severity || {}),
        score: underwriting.scores.severity / 100,
        underwritingScore: underwriting.scores.severity,
        label: underwriting.severity.tier,
        primaryInjury: underwriting.severity.primaryInjury,
        factors: underwriting.severity.factors,
      },
      liability: {
        ...(result.liability || {}),
        score: underwriting.scores.liability / 100,
        underwritingScore: underwriting.scores.liability,
        strength: underwriting.liability.grade.toLowerCase().replace(/\s+/g, '_'),
        factors: [...underwriting.liability.positives, ...underwriting.liability.negatives],
      },
      explainability: [
        ...(Array.isArray(result.explainability) ? result.explainability : []),
        { feature: 'attorney_acceptance_roi', direction: '+', impact: underwriting.attorneyAcceptance.roi },
        { feature: 'documentation_score', direction: underwriting.documentation.score >= 55 ? '+' : '-', impact: underwriting.documentation.score / 100 },
        { feature: 'treatment_quality', direction: underwriting.treatment.score >= 50 ? '+' : '-', impact: underwriting.treatment.score / 100 },
      ],
      modelVersion: 'ca-pi-underwriting-v1',
      inferenceSource: 'underwriting_engine',
    }
    const resolvedModelVersion = result.modelVersion || 'heuristic-v1.0'
    const storedModelVersion = underwritingResult.modelVersion
    const shadowModelVersion =
      'shadowPrediction' in result ? result.shadowPrediction?.modelVersion : undefined
    
    // Store prediction in database
    await prisma.prediction.create({
      data: {
        assessmentId: assessment.id,
        modelVersion: storedModelVersion,
        viability: JSON.stringify(underwritingResult.viability),
        bands: JSON.stringify(underwritingResult.value_bands),
        explain: JSON.stringify({
          explainability: underwritingResult.explainability,
          underwriting,
        })
      }
    })

    // Update assessment status
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: { status: 'COMPLETED' }
    })

    logger.info('Prediction completed', { 
      assessmentId, 
      viability: underwritingResult.viability.overall,
      severityLevel: underwritingResult.severity?.level,
      severityLabel: underwritingResult.severity?.label,
      attorneyAcceptance: underwriting.attorneyAcceptance.probability,
      modelVersion: storedModelVersion,
      inferenceSource: underwritingResult.inferenceSource,
      shadowModelVersion,
    })

    res.json({
      ...underwritingResult,
      assessment_id: assessmentId,
      model_version: storedModelVersion,
      previous_model_version: resolvedModelVersion,
    })
  } catch (error) {
    logger.error('Failed to predict', { error, assessmentId: req.body.assessmentId })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Simulate scenario changes
router.post('/simulate', async (req, res) => {
  try {
    const parsed = SimulationRequest.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: parsed.error.flatten() 
      })
    }

    const { base, toggles } = parsed.data
    const result = simulateScenario(base, toggles)
    
    res.json(result)
  } catch (error) {
    logger.error('Failed to simulate scenario', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get prediction history for an assessment
router.get('/:assessmentId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { assessmentId } = req.params

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { userId: true }
    })

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' })
    }

    if (!canAccessAssessment(req, assessment.userId)) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const predictions = await prisma.prediction.findMany({
      where: { assessmentId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        modelVersion: true,
        viability: true,
        bands: true,
        explain: true,
        createdAt: true
      }
    })

    res.json(predictions.map(p => ({
      id: p.id,
      model_version: p.modelVersion,
      viability: JSON.parse(p.viability),
      value_bands: JSON.parse(p.bands),
      explainability: JSON.parse(p.explain),
      created_at: p.createdAt
    })))
  } catch (error) {
    logger.error('Failed to get predictions', { error, assessmentId: req.params.assessmentId })
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
