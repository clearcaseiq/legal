import { Router } from 'express'
import { z } from 'zod'
import { routeTier1Case } from '../lib/tier1-routing'
import { routeTier2Case } from '../lib/tier2-routing'
import { routeTier3Case } from '../lib/tier3-routing'
import { routeTier4Case } from '../lib/tier4-routing'
import { logger } from '../lib/logger'
import { assignCaseTier } from '../lib/case-tier-classifier'
import { prisma } from '../lib/prisma'
import { authMiddleware, requireRole } from '../lib/auth'

const router = Router()

router.use(authMiddleware, requireRole(['admin']))

/**
 * Route a Tier 1 case
 * POST /v1/tier-routing/tier1/:caseId
 */
router.post('/tier1/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params

    if (!caseId) {
      return res.status(400).json({ error: 'Case ID is required' })
    }

    logger.info('Tier 1 routing requested', { caseId })

    const result = await routeTier1Case(caseId)

    if (result.error) {
      return res.status(400).json({
        routed: false,
        error: result.error
      })
    }

    if (result.routed) {
      return res.json({
        routed: true,
        caseId,
        firmId: result.routedToFirmId,
        introductionId: result.introductionId,
        method: result.method,
        attempts: result.attempts
      })
    }

    return res.json({
      routed: false,
      caseId,
      holdReason: result.holdReason,
      attempts: result.attempts
    })
  } catch (error) {
    logger.error('Error in Tier 1 routing endpoint', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Route a Tier 2 case
 * POST /v1/tier-routing/tier2/:caseId
 */
router.post('/tier2/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params

    if (!caseId) {
      return res.status(400).json({ error: 'Case ID is required' })
    }

    logger.info('Tier 2 routing requested', { caseId })

    const result = await routeTier2Case(caseId)

    if (result.error) {
      return res.status(400).json({
        routed: false,
        error: result.error
      })
    }

    if (result.routed) {
      return res.json({
        routed: true,
        caseId,
        firmId: result.routedToFirmId,
        introductionId: result.introductionId,
        method: result.method,
        attempts: result.attempts
      })
    }

    return res.json({
      routed: false,
      caseId,
      holdReason: result.holdReason,
      attempts: result.attempts
    })
  } catch (error) {
    logger.error('Error in Tier 2 routing endpoint', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Route a Tier 3 case
 * POST /v1/tier-routing/tier3/:caseId
 */
router.post('/tier3/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params

    if (!caseId) {
      return res.status(400).json({ error: 'Case ID is required' })
    }

    logger.info('Tier 3 routing requested', { caseId })

    const result = await routeTier3Case(caseId)

    if (result.error) {
      return res.status(400).json({
        routed: false,
        error: result.error
      })
    }

    if (result.routed) {
      return res.json({
        routed: true,
        caseId,
        firmId: result.routedToFirmId,
        introductionId: result.introductionId,
        method: result.method,
        attempts: result.attempts,
        price: result.price
      })
    }

    return res.json({
      routed: false,
      caseId,
      holdReason: result.holdReason,
      attempts: result.attempts
    })
  } catch (error) {
    logger.error('Error in Tier 3 routing endpoint', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Route a Tier 4 case
 * POST /v1/tier-routing/tier4/:caseId
 */
router.post('/tier4/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params

    if (!caseId) {
      return res.status(400).json({ error: 'Case ID is required' })
    }

    logger.info('Tier 4 routing requested', { caseId })

    const result = await routeTier4Case(caseId)

    if (result.error) {
      return res.status(400).json({
        routed: false,
        error: result.error
      })
    }

    if (result.routed) {
      return res.json({
        routed: true,
        caseId,
        firmId: result.routedToFirmId,
        introductionId: result.introductionId,
        method: result.method,
        attempts: result.attempts,
        price: result.price
      })
    }

    return res.json({
      routed: false,
      caseId,
      holdReason: result.holdReason,
      attempts: result.attempts
    })
  } catch (error) {
    logger.error('Error in Tier 4 routing endpoint', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Route a case based on its tier (auto-detect tier and route)
 * POST /v1/tier-routing/auto/:caseId
 */
router.post('/auto/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params

    if (!caseId) {
      return res.status(400).json({ error: 'Case ID is required' })
    }

    logger.info('Auto tier routing requested', { caseId })

    // Get assessment with tier
    const assessment = await prisma.assessment.findUnique({
      where: { id: caseId },
      include: {
        caseTier: true
      }
    })

    if (!assessment) {
      return res.status(404).json({ error: 'Case not found' })
    }

    // If no tier assigned, assign one
    if (!assessment.caseTier) {
      logger.info('No tier assigned, classifying case', { caseId })
      await assignCaseTier(caseId)
      
      // Reload assessment
      const updated = await prisma.assessment.findUnique({
        where: { id: caseId },
        include: { caseTier: true }
      })

      if (!updated?.caseTier) {
        return res.status(500).json({ error: 'Failed to classify case tier' })
      }

      // Use updated assessment
      const tierNumber = updated.caseTier.tierNumber

      if (tierNumber === 1) {
        const result = await routeTier1Case(caseId)
        return res.json({
          routed: result.routed,
          caseId,
          tier: 1,
          firmId: result.routedToFirmId,
          introductionId: result.introductionId,
          method: result.method,
          attempts: result.attempts,
          error: result.error,
          holdReason: result.holdReason
        })
      } else if (tierNumber === 2) {
        const result = await routeTier2Case(caseId)
        return res.json({
          routed: result.routed,
          caseId,
          tier: 2,
          firmId: result.routedToFirmId,
          introductionId: result.introductionId,
          method: result.method,
          attempts: result.attempts,
          error: result.error,
          holdReason: result.holdReason
        })
      } else if (tierNumber === 3) {
        const result = await routeTier3Case(caseId)
        return res.json({
          routed: result.routed,
          caseId,
          tier: 3,
          firmId: result.routedToFirmId,
          introductionId: result.introductionId,
          method: result.method,
          attempts: result.attempts,
          price: result.price,
          error: result.error,
          holdReason: result.holdReason
        })
      } else if (tierNumber === 4) {
        const result = await routeTier4Case(caseId)
        return res.json({
          routed: result.routed,
          caseId,
          tier: 4,
          firmId: result.routedToFirmId,
          introductionId: result.introductionId,
          method: result.method,
          attempts: result.attempts,
          price: result.price,
          error: result.error,
          holdReason: result.holdReason
        })
      } else {
        return res.json({
          routed: false,
          caseId,
          tier: tierNumber,
          error: `Tier ${tierNumber} routing not yet implemented`
        })
      }
    }

    // Route based on tier
    const tierNumber = assessment.caseTier.tierNumber

    if (tierNumber === 1) {
      const result = await routeTier1Case(caseId)
      return res.json({
        routed: result.routed,
        caseId,
        tier: 1,
        firmId: result.routedToFirmId,
        introductionId: result.introductionId,
        method: result.method,
        attempts: result.attempts,
        error: result.error,
        holdReason: result.holdReason
      })
    } else if (tierNumber === 2) {
      const result = await routeTier2Case(caseId)
      return res.json({
        routed: result.routed,
        caseId,
        tier: 2,
        firmId: result.routedToFirmId,
        introductionId: result.introductionId,
        method: result.method,
        attempts: result.attempts,
        error: result.error,
        holdReason: result.holdReason
      })
    } else if (tierNumber === 3) {
      const result = await routeTier3Case(caseId)
      return res.json({
        routed: result.routed,
        caseId,
        tier: 3,
        firmId: result.routedToFirmId,
        introductionId: result.introductionId,
        method: result.method,
        attempts: result.attempts,
        price: result.price,
        error: result.error,
        holdReason: result.holdReason
      })
    } else if (tierNumber === 4) {
      const result = await routeTier4Case(caseId)
      return res.json({
        routed: result.routed,
        caseId,
        tier: 4,
        firmId: result.routedToFirmId,
        introductionId: result.introductionId,
        method: result.method,
        attempts: result.attempts,
        price: result.price,
        error: result.error,
        holdReason: result.holdReason
      })
    } else {
      return res.json({
        routed: false,
        caseId,
        tier: tierNumber,
        error: `Tier ${tierNumber} routing not yet implemented`
      })
    }
  } catch (error) {
    logger.error('Error in auto tier routing endpoint', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
