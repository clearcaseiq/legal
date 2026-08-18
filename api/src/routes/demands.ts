import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { recordCaseChange } from '../lib/data-authority'
import { z } from 'zod'
import { Document, Packer, Paragraph } from 'docx'
import { authMiddleware, optionalAuthMiddleware, AuthRequest } from '../lib/auth'
import { analyzeCaseWithChatGPT, CaseAnalysisRequest } from '../services/chatgpt'
import { generateDemandLetter } from '../lib/demand-letter'
import { extractAnalysisPayload, loadTreatmentLedger, parseAssessmentFacts } from '../lib/demand-drafting'
import { enforceAssessmentReadAccess } from '../lib/assessment-access'

const router = Router()

/**
 * Whether this user is on the case's firm.
 *
 * Case managers and paralegals have no Attorney row, so the attorney checks
 * below never match them. They do most of the demand assembly, and the
 * authenticated demand endpoints admit them via `allowFirmMember`, so without
 * this they could draft and edit a letter and then be refused the download.
 */
async function isFirmMemberOnAssessment(assessmentId: string, userId?: string) {
  if (!userId) return false

  const member = await (prisma as any).firmMember
    .findFirst({
      where: { userId, status: { in: ['active', 'invited'] } },
      select: { id: true, lawFirmId: true }
    })
    .catch(() => null)
  if (!member) return false

  const caseWorkflow = await (prisma as any).caseWorkflow
    .findUnique({
      where: { assessmentId },
      select: { lawFirmId: true, items: { select: { assignedFirmMemberId: true } } }
    })
    .catch(() => null)
  if (!caseWorkflow) return false

  const sameFirm = !!member.lawFirmId && caseWorkflow.lawFirmId === member.lawFirmId
  const assignedStep = (caseWorkflow.items || []).some((item: any) => item.assignedFirmMemberId === member.id)
  return sameFirm || assignedStep
}

async function canAccessAssessment(assessmentId: string, userId?: string, userEmail?: string) {
  if (!userId) return false
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { userId: true }
  })
  if (!assessment) return false
  if (!assessment.userId || assessment.userId === userId) return true

  const attorney = userEmail ? await prisma.attorney.findFirst({ where: { email: userEmail } }) : null
  if (!attorney) return isFirmMemberOnAssessment(assessmentId, userId)

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
  if (lead) return true

  return isFirmMemberOnAssessment(assessmentId, userId)
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
      const facts = parseAssessmentFacts(assessment.facts)
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

    const facts = parseAssessmentFacts(assessment.facts)
    const treatmentLedger = await loadTreatmentLedger(assessmentId)
    // Always build the structured, comprehensive letter so every required
    // section is present (accident summary, liability, treatment timeline,
    // bills, wages, pain & suffering, demand + deadline). The stored LLM
    // analysis supplies the liability and damages narrative content.
    const content = generateDemandLetter({
      assessment,
      facts,
      targetAmount,
      recipient,
      message: analysisPayload?.demandPackage?.liabilityOutline,
      treatmentLedger,
      analysis: analysisPayload,
    })

    const demand = await prisma.demandLetter.create({
      data: {
        assessmentId,
        targetAmount,
        recipient: JSON.stringify(recipient),
        content,
        status: 'DRAFT',
        origin: 'attorney',
        contentSource: 'deterministic',
        createdById: req.user?.id || null,
        versions: {
          create: { version: 1, content, source: 'deterministic', authorId: req.user?.id || null },
        },
      }
    })

    void recordCaseChange({
      assessmentId,
      source: 'attorney',
      action: 'demand_generated',
      entityType: 'demand',
      entityId: demand.id,
      summary: `Demand letter drafted (target ${targetAmount})`,
      actor: { type: 'user', id: req.user?.id ?? null },
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
    email: z.preprocess(
      value => typeof value === 'string' && value.trim() === '' ? undefined : value,
      z.string().email().optional()
    )
  }),
  message: z.string().optional(),
  mode: z.enum(['represented', 'pro_se']).optional()
})

// Generate demand letter.
//
// Every other demand route authorizes the caller, but this one looked the
// assessment up by id and drafted from its facts and treatment ledger with no
// check at all, so anyone holding an id could pull a case's medical and
// financial detail back out as a letter.
//
// It runs under optional auth rather than `authMiddleware` because `/demand/:id`
// is a public route: a pro-se claimant reaches it before creating an account.
// `enforceAssessmentReadAccess` draws that line already — it allows a case that
// has no real owner yet (pre-account intake, or the guest shadow user created by
// evidence upload) and requires ownership, an attorney introduction, firm
// membership or admin once the case belongs to someone.
router.post('/generate', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const parsed = DemandRequest.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: parsed.error.flatten() 
      })
    }

    const { assessmentId, targetAmount, recipient, message, mode } = parsed.data

    const permitted = await enforceAssessmentReadAccess({
      assessmentId,
      user: req.user,
      res,
      route: 'POST /v1/demands/generate',
    })
    if (!permitted) return

    // Get assessment details
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId }
    })
    
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' })
    }

    const facts = parseAssessmentFacts(assessment.facts)
    const treatmentLedger = await loadTreatmentLedger(assessmentId)
    const analysis = extractAnalysisPayload(assessment)

    // Generate demand letter content
    const demandLetter = generateDemandLetter({
      assessment,
      facts,
      targetAmount,
      recipient,
      message,
      mode,
      treatmentLedger,
      analysis,
    })

    // Store demand letter. A pro-se letter is tagged as such so the read routes
    // keep letting its logged-out author download it.
    const demand = await prisma.demandLetter.create({
      data: {
        assessmentId,
        targetAmount,
        recipient: JSON.stringify(recipient),
        content: demandLetter,
        status: 'DRAFT',
        origin: mode === 'pro_se' ? 'pro_se' : 'attorney',
        contentSource: 'deterministic',
        versions: {
          create: { version: 1, content: demandLetter, source: 'deterministic' },
        },
      }
    })

    logger.info('Demand letter generated', { 
      demandId: demand.id,
      assessmentId, 
      targetAmount 
    })

    void recordCaseChange({
      assessmentId,
      source: 'attorney',
      action: 'demand_generated',
      entityType: 'demand',
      entityId: demand.id,
      summary: `Demand letter generated (target ${targetAmount})`,
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
router.get('/assessment/:assessmentId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { assessmentId } = req.params

    if (!(await canAccessAssessment(assessmentId, req.user?.id, req.user?.email))) {
      return res.status(403).json({ error: 'Not authorized to view demand letters for this case' })
    }

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
//
// Optional auth rather than required: a claimant using the self-help demand
// builder at /demand/:assessmentId is frequently not logged in, and downloading
// the letter they just generated is the whole point of that page. So a pro-se
// letter stays reachable by id, while an attorney's work product does not.
router.get('/:demandId/docx', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const { demandId } = req.params

    const demand = await prisma.demandLetter.findUnique({
      where: { id: demandId }
    })

    if (!demand) {
      return res.status(404).json({ error: 'Demand letter not found' })
    }

    if (demand.origin !== 'pro_se') {
      const allowed = await canAccessAssessment(demand.assessmentId, req.user?.id, req.user?.email)
      if (!allowed) {
        return res.status(403).json({ error: 'Not authorized to download this demand letter' })
      }
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
router.get('/:demandId', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const { demandId } = req.params

    const demand = await prisma.demandLetter.findUnique({
      where: { id: demandId }
    })

    if (!demand) {
      return res.status(404).json({ error: 'Demand letter not found' })
    }

    // Same carve-out as the DOCX route: a logged-out claimant can read back the
    // self-help letter they just generated, but nothing else.
    if (demand.origin !== 'pro_se') {
      const allowed = await canAccessAssessment(demand.assessmentId, req.user?.id, req.user?.email)
      if (!allowed) {
        return res.status(403).json({ error: 'Not authorized to view this demand letter' })
      }
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

export default router
