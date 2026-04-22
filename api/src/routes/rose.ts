/**
 * Rose Virtual AI Intake - API contract
 * - POST /v1/rose/intake - legacy form payload → assessment
 * - POST /v1/rose/conversation/start - start new conversational intake
 * - POST /v1/rose/conversation/:id/turn - process user message, return next question or final summary
 */
import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { optionalAuthMiddleware, AuthRequest } from '../lib/auth'
import {
  RoseIntakePayload,
  roseToAssessmentPayload,
  enginePayloadToAssessment,
} from '../lib/rose-schema'
import {
  createConversationState,
  processUserTurn,
  type ConversationState,
  type ConversationReview,
} from '../lib/rose-engine'
import { analyzeCaseWithChatGPT, CaseAnalysisRequest } from '../services/chatgpt'

const router = Router()

// In-memory conversation store (use Redis/DB for production)
const conversationStore = new Map<string, ConversationState>()

function serializeReview(review?: ConversationReview) {
  if (!review) return undefined

  return {
    plaintiff_summary: review.plaintiff_summary,
    attorney_summary: review.attorney_summary,
    missing_required_fields: review.missing_required_fields,
    disposition: review.disposition,
    confirmation_prompt: review.confirmation_prompt,
  }
}

/**
 * POST /v1/rose/intake
 * Accepts Rose virtual AI intake payload; maps to ClearCaseIQ schema and creates assessment.
 * Every spoken answer maps directly into the intake schema.
 */
router.post('/intake', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const parsed = RoseIntakePayload.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid Rose intake payload',
        details: parsed.error.flatten()
      })
    }

    const assessmentPayload = roseToAssessmentPayload(parsed.data)

    const assessment = await prisma.assessment.create({
      data: {
        userId: req.user?.id,
        claimType: assessmentPayload.claimType,
        venueState: assessmentPayload.venue.state,
        venueCounty: assessmentPayload.venue.county ?? null,
        status: 'DRAFT',
        facts: JSON.stringify(assessmentPayload)
      }
    })

    logger.info('Rose intake → assessment created', {
      assessmentId: assessment.id,
      claimType: assessment.claimType,
      source: 'rose_virtual_ai_widget'
    })

    // Kick off LLM analysis (non-blocking)
    void (async () => {
      try {
        const analysisRequest: CaseAnalysisRequest = {
          assessmentId: assessment.id,
          caseData: { ...assessmentPayload, evidence: [] }
        }
        const analysisResult = await analyzeCaseWithChatGPT(analysisRequest)
        await prisma.assessment.update({
          where: { id: assessment.id },
          data: {
            chatgptAnalysis: JSON.stringify(analysisResult),
            chatgptAnalysisDate: new Date()
          }
        })
      } catch (err: any) {
        logger.error('Rose intake: ChatGPT analysis failed', {
          error: err.message,
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
    logger.error('Rose intake failed', { error })
    const isDev = process.env.NODE_ENV !== 'production'
    const msg = error?.message || ''
    const isDbError = /connect|ECONNREFUSED|ETIMEDOUT|unknown database|Access denied/i.test(msg)
    res.status(500).json({
      error: isDev && isDbError
        ? 'Database unavailable. Start MySQL and ensure DATABASE_URL is correct.'
        : (isDev ? msg : 'Internal server error')
    })
  }
})

/**
 * POST /v1/rose/conversation/start
 * Start a new Rose conversational intake session.
 */
router.post('/conversation/start', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const conversationId = `rose_${uuidv4()}`
    const state = createConversationState(conversationId)
    conversationStore.set(conversationId, state)

    const firstQuestion =
      "Hi, I'm Rose. Tell me what happened in your own words, and I'll help turn it into a complete intake."

    res.json({
      conversation_id: conversationId,
      message: firstQuestion,
      completion_score: 0,
      ready_for_submission: false,
      phase: state.current_step,
    })
  } catch (error: any) {
    logger.error('Rose conversation start failed', { error })
    res.status(500).json({ error: error?.message ?? 'Internal server error' })
  }
})

/**
 * POST /v1/rose/conversation/:id/turn
 * Process user message; return Rose's next question or final summary + assessment_id when ready.
 */
router.post('/conversation/:id/turn', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const conversationId = req.params.id
    const { message } = req.body ?? {}

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'message is required' })
    }

    let state = conversationStore.get(conversationId)
    if (!state) {
      return res.status(404).json({ error: 'Conversation not found' })
    }

    const result = await processUserTurn(state, message.trim())
    conversationStore.set(conversationId, result.state)

    if (result.finalSummary) {
      const assessmentPayload = enginePayloadToAssessment(result.finalSummary.structured_payload as any)
      const assessment = await prisma.assessment.create({
        data: {
          userId: req.user?.id,
          claimType: assessmentPayload.claimType,
          venueState: assessmentPayload.venue.state,
          venueCounty: assessmentPayload.venue.county ?? null,
          status: 'DRAFT',
          facts: JSON.stringify(assessmentPayload),
        },
      })

      logger.info('Rose engine intake → assessment created', {
        assessmentId: assessment.id,
        conversationId,
        claimType: assessment.claimType,
      })

      void (async () => {
        try {
          const analysisRequest: CaseAnalysisRequest = {
            assessmentId: assessment.id,
            caseData: { ...assessmentPayload, evidence: [] },
          }
          const analysisResult = await analyzeCaseWithChatGPT(analysisRequest)
          await prisma.assessment.update({
            where: { id: assessment.id },
            data: {
              chatgptAnalysis: JSON.stringify(analysisResult),
              chatgptAnalysisDate: new Date(),
            },
          })
        } catch (err: any) {
          logger.error('Rose engine: ChatGPT analysis failed', { error: err.message, assessmentId: assessment.id })
        }
      })()

      return res.json({
        message: 'Thank you. I have everything I need, and your intake is ready.',
        ready_for_submission: true,
        completion_score: 1,
        phase: result.state.current_step,
        assessment_id: assessment.id,
        plaintiff_summary: result.finalSummary.plaintiff_summary,
        attorney_summary: result.finalSummary.attorney_summary,
        disposition: result.escalation.disposition,
        review: serializeReview(result.state.pending_review),
      })
    }

    const nextMessage =
      result.review?.confirmation_prompt ??
      result.nextQuestion?.next_question ??
      "Is there anything else you'd like to share?"

    return res.json({
      message: nextMessage,
      ready_for_submission: result.state.ready_for_submission,
      completion_score: result.state.completion_score,
      phase: result.state.current_step,
      disposition: result.escalation.disposition,
      review: serializeReview(result.review ?? result.state.pending_review),
    })
  } catch (error: any) {
    logger.error('Rose conversation turn failed', { error, conversationId: req.params.id })
    res.status(500).json({ error: error?.message ?? 'Internal server error' })
  }
})

export default router
