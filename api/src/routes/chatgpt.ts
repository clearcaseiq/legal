import express from 'express'
import { analyzeCaseWithChatGPT, CaseAnalysisRequest } from '../services/chatgpt'
import { logger } from '../lib/logger'
import { authMiddleware, optionalAuthMiddleware, AuthRequest } from '../lib/auth'
import { ENV } from '../env'
import { prisma } from '../lib/prisma'

const router = express.Router()

async function canAccessAssessment(assessmentId: string, userId?: string, userEmail?: string) {
  if (!userId) return false
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { userId: true }
  })
  if (!assessment) return false
  if (!assessment.userId || assessment.userId === userId) return true

  if (!userEmail) return false
  const attorney = await prisma.attorney.findFirst({ where: { email: userEmail } })
  if (!attorney) return false

  const intro = await prisma.introduction.findFirst({
    where: { assessmentId, attorneyId: attorney.id }
  })
  if (intro) return true

  const lead = await prisma.leadSubmission.findFirst({
    where: {
      assessmentId,
      OR: [
        { assignedAttorneyId: attorney.id },
        { assignmentType: 'shared' }
      ]
    }
  })
  return !!lead
}

// Analyze assessment with ChatGPT
router.post('/analyze/:assessmentId', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const { assessmentId } = req.params
    
    logger.info('ChatGPT analysis request', { 
      assessmentId, 
      userId: req.user?.id,
      hasAuth: !!req.user 
    })

    // Get the assessment
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        evidenceFiles: true
      }
    })

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'Assessment not found'
      })
    }

    // Check if user has permission (if assessment has a userId)
    if (assessment.userId && assessment.userId !== req.user?.id) {
      const allowed = await canAccessAssessment(assessmentId, req.user?.id, req.user?.email)
      if (!allowed) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized to analyze this assessment'
        })
      }
    }
    if (assessment.userId && !req.user?.id) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to analyze this assessment'
      })
    }

    // Parse the facts
    let caseData
    try {
      caseData = JSON.parse(assessment.facts)
    } catch (error) {
      logger.error('Failed to parse assessment facts', { assessmentId, error })
      return res.status(400).json({
        success: false,
        error: 'Invalid assessment data format'
      })
    }

    // Prepare evidence data
    const evidenceData = assessment.evidenceFiles.map(file => ({
      id: file.id,
      filename: file.filename,
      category: file.category,
      processingStatus: file.processingStatus,
      summary: file.aiSummary || null,
      highlights: file.aiHighlights ? JSON.parse(file.aiHighlights) : null
    }))

    // Create analysis request
    const analysisRequest: CaseAnalysisRequest = {
      assessmentId,
      caseData: {
        ...caseData,
        evidence: evidenceData
      }
    }

    // Perform ChatGPT analysis
    logger.info('Starting ChatGPT analysis', { assessmentId })
    const analysisResult = await analyzeCaseWithChatGPT(analysisRequest)

    // Store the analysis result in the database
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        chatgptAnalysis: JSON.stringify(analysisResult),
        chatgptAnalysisDate: new Date()
      }
    })

    logger.info('ChatGPT analysis completed and stored', { 
      assessmentId,
      confidence: analysisResult.confidence 
    })

    res.json({
      success: true,
      data: analysisResult
    })

  } catch (error: any) {
    logger.error('ChatGPT analysis failed', { 
      assessmentId: req.params.assessmentId,
      error: error.message 
    })
    
    res.status(500).json({
      success: false,
      error: 'Analysis failed. Please try again.',
      details: error.message
    })
  }
})

// Get ChatGPT analysis for an assessment
router.get('/analysis/:assessmentId', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const { assessmentId } = req.params

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        userId: true,
        chatgptAnalysis: true,
        chatgptAnalysisDate: true
      }
    })

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'Assessment not found'
      })
    }

    // Check if user has permission (if assessment has a userId)
    if (assessment.userId && assessment.userId !== req.user?.id) {
      const allowed = await canAccessAssessment(assessmentId, req.user?.id, req.user?.email)
      if (!allowed) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized to view this analysis'
        })
      }
    }
    if (assessment.userId && !req.user?.id) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to view this analysis'
      })
    }

    if (!assessment.chatgptAnalysis) {
      return res.status(404).json({
        success: false,
        error: 'No ChatGPT analysis found for this assessment'
      })
    }

    let analysis
    try {
      analysis = JSON.parse(assessment.chatgptAnalysis)
    } catch (error) {
      logger.error('Failed to parse ChatGPT analysis', { assessmentId, error })
      return res.status(500).json({
        success: false,
        error: 'Invalid analysis data format'
      })
    }

    res.json({
      success: true,
      data: {
        ...analysis,
        analysisDate: assessment.chatgptAnalysisDate
      }
    })

  } catch (error: any) {
    logger.error('Failed to retrieve ChatGPT analysis', { 
      assessmentId: req.params.assessmentId,
      error: error.message 
    })
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve analysis'
    })
  }
})

// Check ChatGPT configuration status
router.get('/status', async (req, res) => {
  try {
    const hasApiKey = !!(process.env.OPENAI_API_KEY || ENV.OPENAI_API_KEY)
    
    res.json({
      success: true,
      data: {
        configured: hasApiKey,
        model: hasApiKey ? 'gpt-4' : 'fallback',
        status: hasApiKey ? 'ready' : 'not_configured',
        message: hasApiKey 
          ? 'ChatGPT analysis is ready' 
          : 'ChatGPT not configured - using fallback analysis'
      }
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to check ChatGPT status'
    })
  }
})

export default router
