import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { z } from 'zod'
import { Document, Packer, Paragraph } from 'docx'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { analyzeCaseWithChatGPT, CaseAnalysisRequest } from '../services/chatgpt'

const router = Router()

function isValidDraft(content?: string | null) {
  if (!content) return false
  const trimmed = content.trim()
  if (!trimmed) return false
  const lower = trimmed.toLowerCase()
  if (['n/a', 'na', 'not available', 'not available.'].includes(lower)) return false
  return trimmed.length >= 50
}

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
    where: {
      assessmentId,
      attorneyId: attorney.id
    }
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

// Draft demand letter from stored LLM analysis
router.post('/draft/:assessmentId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { assessmentId } = req.params

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { evidenceFiles: true }
    })

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' })
    }

    if (assessment.userId && assessment.userId !== req.user?.id) {
      const allowed = await canAccessAssessment(assessmentId, req.user?.id, req.user?.email)
      if (!allowed) {
        return res.status(403).json({ error: 'Unauthorized to draft demand letter' })
      }
    }

    let analysisPayload: any = null
    if (assessment.chatgptAnalysis) {
      try {
        const parsed = JSON.parse(assessment.chatgptAnalysis)
        analysisPayload = parsed.analysis || parsed
      } catch (error) {
        logger.warn('Failed to parse chatgptAnalysis, re-running analysis', { assessmentId })
      }
    }

    if (!analysisPayload) {
      const facts = JSON.parse(assessment.facts)
      const evidenceData = (assessment.evidenceFiles || []).map((file: any) => ({
        id: file.id,
        filename: file.filename,
        category: file.category,
        processed: file.processed,
        extractedData: file.extractedData ? JSON.parse(file.extractedData) : null
      }))

      const analysisRequest: CaseAnalysisRequest = {
        assessmentId: assessment.id,
        caseData: {
          ...facts,
          evidence: evidenceData
        }
      }

      const analysisResult = await analyzeCaseWithChatGPT(analysisRequest)
      analysisPayload = analysisResult.analysis

      await prisma.assessment.update({
        where: { id: assessment.id },
        data: {
          chatgptAnalysis: JSON.stringify(analysisResult),
          chatgptAnalysisDate: new Date()
        }
      })
    }

    const targetAmount =
      analysisPayload?.expectedSettlementRange?.mid ??
      analysisPayload?.estimatedValue?.medium ??
      0

    const recipient = {
      name: 'Insurance Adjuster',
      address: 'To Whom It May Concern',
      email: ''
    }

    const facts = JSON.parse(assessment.facts)
    const demandDraft = analysisPayload?.demandPackage?.demandDraft
    const content = isValidDraft(demandDraft) ? demandDraft : generateDemandLetter({
      assessment,
      facts,
      targetAmount,
      recipient,
      message: analysisPayload?.demandPackage?.liabilityOutline
    })

    const demand = await prisma.demandLetter.create({
      data: {
        assessmentId,
        targetAmount,
        recipient: JSON.stringify(recipient),
        content,
        status: 'DRAFT'
      }
    })

    res.json({
      demand_id: demand.id,
      content,
      target_amount: targetAmount,
      recipient,
      status: demand.status,
      generated_at: demand.createdAt
    })
  } catch (error: any) {
    logger.error('Failed to draft demand letter', { error: error.message })
    res.status(500).json({ error: 'Failed to draft demand letter' })
  }
})

const DemandRequest = z.object({
  assessmentId: z.string(),
  targetAmount: z.number().min(0),
  recipient: z.object({
    name: z.string(),
    address: z.string(),
    email: z.string().email().optional()
  }),
  message: z.string().optional()
})

// Generate demand letter
router.post('/generate', async (req, res) => {
  try {
    const parsed = DemandRequest.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: parsed.error.flatten() 
      })
    }

    const { assessmentId, targetAmount, recipient, message } = parsed.data
    
    // Get assessment details
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId }
    })
    
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' })
    }

    const facts = assessment.facts as any
    
    // Generate demand letter content
    const demandLetter = generateDemandLetter({
      assessment,
      facts,
      targetAmount,
      recipient,
      message
    })

    // Store demand letter
    const demand = await prisma.demandLetter.create({
      data: {
        assessmentId,
        targetAmount,
        recipient: JSON.stringify(recipient),
        content: demandLetter,
        status: 'DRAFT'
      }
    })

    logger.info('Demand letter generated', { 
      demandId: demand.id,
      assessmentId, 
      targetAmount 
    })

    res.json({
      demand_id: demand.id,
      content: demandLetter,
      target_amount: targetAmount,
      recipient: recipient,
      status: 'DRAFT',
      generated_at: demand.createdAt
    })
  } catch (error) {
    logger.error('Failed to generate demand letter', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// List demand letters for an assessment
router.get('/assessment/:assessmentId', async (req, res) => {
  try {
    const { assessmentId } = req.params
    
    const demands = await prisma.demandLetter.findMany({
      where: { assessmentId },
      orderBy: { createdAt: 'desc' }
    })

    res.json(demands.map(d => ({
      demand_id: d.id,
      target_amount: d.targetAmount,
      status: d.status,
      created_at: d.createdAt,
      sent_at: d.sentAt
    })))
  } catch (error) {
    logger.error('Failed to list demand letters', { error, assessmentId: req.params.assessmentId })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Download demand letter as .docx
router.get('/:demandId/docx', async (req, res) => {
  try {
    const { demandId } = req.params

    const demand = await prisma.demandLetter.findUnique({
      where: { id: demandId }
    })

    if (!demand) {
      return res.status(404).json({ error: 'Demand letter not found' })
    }

    const lines = (demand.content || '').split(/\r?\n/)
    const doc = new Document({
      sections: [
        {
          children: lines.map(line => new Paragraph(line))
        }
      ]
    })

    const buffer = await Packer.toBuffer(doc)

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', `attachment; filename="demand-letter-${demand.id}.docx"`)
    res.send(buffer)
  } catch (error) {
    logger.error('Failed to generate demand letter docx', { error, demandId: req.params.demandId })
    res.status(500).json({ error: 'Failed to generate demand letter docx' })
  }
})

// Get demand letter
router.get('/:demandId', async (req, res) => {
  try {
    const { demandId } = req.params
    
    const demand = await prisma.demandLetter.findUnique({
      where: { id: demandId }
    })
    
    if (!demand) {
      return res.status(404).json({ error: 'Demand letter not found' })
    }

    res.json({
      demand_id: demand.id,
      assessment_id: demand.assessmentId,
      target_amount: demand.targetAmount,
      recipient: JSON.parse(demand.recipient),
      content: demand.content,
      status: demand.status,
      created_at: demand.createdAt,
      sent_at: demand.sentAt
    })
  } catch (error) {
    logger.error('Failed to get demand letter', { error, demandId: req.params.demandId })
    res.status(500).json({ error: 'Internal server error' })
  }
})

function generateDemandLetter({
  assessment,
  facts,
  targetAmount,
  recipient,
  message
}: {
  assessment: any
  facts: any
  targetAmount: number
  recipient: any
  message?: string
}) {
  const incidentDate = facts.incident?.date || 'the date of the incident'
  const narrative = facts.incident?.narrative || 'the incident'
  const venue = `${assessment.venueState}${assessment.venueCounty ? `, ${assessment.venueCounty}` : ''}`
  
  return `
DEMAND LETTER

${recipient.name}
${recipient.address}

Re: Personal Injury Claim - ${incidentDate}

Dear ${recipient.name},

We represent the above-referenced client in connection with a personal injury claim arising from an incident that occurred on or about ${incidentDate} in ${venue}.

INCIDENT SUMMARY
${narrative}

DAMAGES CLAIMED
Our client has suffered significant injuries and damages as a result of this incident, including but not limited to:

- Medical expenses: $${facts.damages?.med_charges?.toLocaleString() || 'To be determined'}
- Lost wages: $${facts.damages?.wage_loss?.toLocaleString() || 'To be determined'}
- Pain and suffering
- Future medical expenses
- Loss of earning capacity

DEMAND
Based on the severity of our client's injuries and the extent of damages suffered, we demand the sum of $${targetAmount.toLocaleString()} to resolve this matter.

${message ? `\nADDITIONAL COMMENTS\n${message}` : ''}

This demand is made in good faith and represents a reasonable assessment of our client's damages. We trust you will give this matter your immediate attention.

If this matter cannot be resolved through negotiation, we are prepared to pursue all available legal remedies on behalf of our client.

Please respond within thirty (30) days of receipt of this letter.

Very truly yours,

[Attorney Name]
[Law Firm Name]
[Contact Information]

This letter is for settlement purposes only and is not admissible in any subsequent litigation.
  `.trim()
}

export default router
