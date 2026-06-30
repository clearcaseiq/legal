import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { z } from 'zod'
import { Document, Packer, Paragraph } from 'docx'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { analyzeCaseWithChatGPT, CaseAnalysisRequest } from '../services/chatgpt'

const router = Router()
type DemandMode = 'represented' | 'pro_se'

function parseAssessmentFacts(rawFacts: unknown) {
  if (typeof rawFacts === 'string') {
    try {
      return JSON.parse(rawFacts)
    } catch {
      return {}
    }
  }
  return rawFacts && typeof rawFacts === 'object' ? rawFacts : {}
}

// Pull the saved LLM analysis payload off an assessment, if present.
function extractAnalysisPayload(assessment: any): any | null {
  if (!assessment?.chatgptAnalysis) return null
  try {
    const parsed = JSON.parse(assessment.chatgptAnalysis)
    return parsed.analysis || parsed
  } catch {
    return null
  }
}

interface TreatmentLedgerEntry {
  visitDate: Date
  providerName: string
  visitType: string
  diagnosis: string | null
  diagnosisCode: string | null
  billedAmount: number | null
  status: string
}

interface TreatmentLedger {
  entries: TreatmentLedgerEntry[]
  totalBilled: number
  firstVisit: Date | null
  lastVisit: Date | null
  providerCount: number
}

// Load the treatment / diagnoses / bills ledger logged against this assessment's
// referrals so the demand letter can present a real visit-by-visit timeline and
// an itemized bill total instead of a single self-reported number.
async function loadTreatmentLedger(assessmentId: string): Promise<TreatmentLedger> {
  const empty: TreatmentLedger = {
    entries: [],
    totalBilled: 0,
    firstVisit: null,
    lastVisit: null,
    providerCount: 0,
  }

  const leads = await prisma.leadSubmission.findMany({
    where: { assessmentId },
    select: { id: true },
  })
  const leadIds = leads.map((l) => l.id)
  if (leadIds.length === 0) return empty

  const records = await prisma.treatmentRecord.findMany({
    where: { leadId: { in: leadIds }, status: { notIn: ['cancelled', 'no_show'] } },
    orderBy: { visitDate: 'asc' },
  })
  if (records.length === 0) return empty

  const providerIds = [...new Set(records.map((r) => r.providerId))]
  const providers = await prisma.medicalProvider.findMany({
    where: { id: { in: providerIds } },
    select: { id: true, name: true, specialty: true },
  })
  const providerById = new Map(providers.map((p) => [p.id, p]))

  const entries: TreatmentLedgerEntry[] = records.map((r) => {
    const provider = providerById.get(r.providerId)
    return {
      visitDate: r.visitDate,
      providerName: provider ? `${provider.name}${provider.specialty ? ` (${provider.specialty})` : ''}` : 'Provider',
      visitType: r.visitType,
      diagnosis: r.diagnosis,
      diagnosisCode: r.diagnosisCode,
      billedAmount: r.billedAmount,
      status: r.status,
    }
  })

  const totalBilled = entries.reduce((sum, e) => sum + (e.billedAmount || 0), 0)
  const visitDates = entries.map((e) => e.visitDate)

  return {
    entries,
    totalBilled,
    firstVisit: visitDates[0] ?? null,
    lastVisit: visitDates[visitDates.length - 1] ?? null,
    providerCount: providerIds.length,
  }
}

const money = (value: number) =>
  `$${Math.round(value).toLocaleString('en-US')}`

const longDate = (d: Date | string | null | undefined) => {
  if (!d) return null
  const date = typeof d === 'string' ? new Date(d) : d
  return isNaN(date.getTime())
    ? null
    : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

const labelizeVisitType = (value: string) =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())

// Render injuries (which may be strings or objects) as a readable list.
function describeInjuries(facts: any): string[] {
  const raw = facts?.injuries ?? facts?.injury ?? []
  const list = Array.isArray(raw) ? raw : raw ? [raw] : []
  return list
    .map((item: any) => {
      if (!item) return null
      if (typeof item === 'string') return item
      return item.name || item.bodyPart || item.description || item.type || null
    })
    .filter(Boolean)
    .map((s: string) => String(s).trim())
}

// Build the medical treatment timeline section from the ledger (preferred) or
// fall back to the LLM medical chronology / self-reported summary.
function buildTreatmentTimelineSection(ledger: TreatmentLedger, analysis: any): string {
  if (ledger.entries.length > 0) {
    const span =
      ledger.firstVisit && ledger.lastVisit
        ? `Treatment spanned ${longDate(ledger.firstVisit)} through ${longDate(ledger.lastVisit)} across ${ledger.providerCount} provider${ledger.providerCount === 1 ? '' : 's'}.`
        : ''
    const lines = ledger.entries.map((e) => {
      const parts = [
        `- ${longDate(e.visitDate)} — ${e.providerName}: ${labelizeVisitType(e.visitType)}`,
      ]
      if (e.diagnosis) {
        parts.push(` — Dx: ${e.diagnosis}${e.diagnosisCode ? ` (${e.diagnosisCode})` : ''}`)
      }
      if (e.billedAmount != null) {
        parts.push(` — ${money(e.billedAmount)}`)
      }
      return parts.join('')
    })
    return ['MEDICAL TREATMENT TIMELINE AND RECORDS', span, '', ...lines]
      .filter((l) => l !== undefined)
      .join('\n')
  }

  const chronology = analysis?.medicalChronology
  if (chronology?.timeline?.length) {
    const lines = chronology.timeline.map((t: string) => `- ${t}`)
    return ['MEDICAL TREATMENT TIMELINE AND RECORDS', chronology.summary || '', '', ...lines]
      .filter(Boolean)
      .join('\n')
  }

  return [
    'MEDICAL TREATMENT TIMELINE AND RECORDS',
    'Our client received medical treatment for injuries sustained in this incident. A complete set of treatment records and itemized bills is available upon request and incorporated herein by reference.',
  ].join('\n')
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
    email: z.preprocess(
      value => typeof value === 'string' && value.trim() === '' ? undefined : value,
      z.string().email().optional()
    )
  }),
  message: z.string().optional(),
  mode: z.enum(['represented', 'pro_se']).optional()
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

    const { assessmentId, targetAmount, recipient, message, mode } = parsed.data
    
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
  message,
  mode = 'represented',
  treatmentLedger,
  analysis,
}: {
  assessment: any
  facts: any
  targetAmount: number
  recipient: any
  message?: string
  mode?: DemandMode
  treatmentLedger?: TreatmentLedger
  analysis?: any
}) {
  const ledger: TreatmentLedger =
    treatmentLedger ?? { entries: [], totalBilled: 0, firstVisit: null, lastVisit: null, providerCount: 0 }

  const incidentDate = facts.incident?.date || 'the date of the incident'
  const narrative = facts.incident?.narrative || 'the incident described in our client\u2019s claim'
  const venue = `${assessment.venueState || ''}${assessment.venueCounty ? `, ${assessment.venueCounty}` : ''}`.trim() || 'the applicable jurisdiction'

  // Medical specials: prefer the itemized ledger total, fall back to self-reported.
  const reportedMedical = Number(facts.damages?.med_charges || 0)
  const medicalTotal = ledger.totalBilled > 0 ? ledger.totalBilled : reportedMedical
  const lostWages = Number(facts.damages?.wage_loss || facts.damages?.estimated_wage_loss || 0)
  const futureMedical = Number(facts.damages?.estimated_future_med_charges || 0)

  // General (pain & suffering) damages: derive from the demand less specials,
  // or fall back to the analysis's pain/suffering valuation split.
  const specials = medicalTotal + lostWages + futureMedical
  const painSufferingSplit = Number(analysis?.valuationBreakdown?.damageSplits?.painSuffering || 0)
  const generalDamages =
    targetAmount > specials ? targetAmount - specials : painSufferingSplit > 0 ? painSufferingSplit : 0

  // --- Section: liability / why the defendant is at fault ---
  const liabilityText =
    (message && message.trim()) ||
    (analysis?.liabilityOutline && String(analysis.liabilityOutline).trim()) ||
    (analysis?.liabilityModel?.reasoning && String(analysis.liabilityModel.reasoning).trim()) ||
    `The incident and resulting injuries were directly and proximately caused by the negligence of your insured. Your insured owed our client a duty of care, breached that duty, and that breach was the direct cause of the injuries and damages described below. Liability is clear.`

  // --- Section: medical treatment timeline & records ---
  const treatmentSection = buildTreatmentTimelineSection(ledger, analysis)

  // --- Section: pain & suffering justification ---
  const injuries = describeInjuries(facts)
  const injuryClause = injuries.length
    ? `As a result of this incident, our client sustained ${injuries.join(', ')}.`
    : `As a result of this incident, our client sustained painful injuries requiring medical care.`
  const treatmentSpanClause =
    ledger.firstVisit && ledger.lastVisit
      ? ` Our client underwent ${ledger.entries.length} documented treatment encounter${ledger.entries.length === 1 ? '' : 's'} between ${longDate(ledger.firstVisit)} and ${longDate(ledger.lastVisit)}.`
      : ''
  const painSufferingNarrative =
    (analysis?.demandPackage?.damageSummary && String(analysis.demandPackage.damageSummary).trim()) || ''
  const painSufferingSection = [
    'PAIN AND SUFFERING',
    `${injuryClause}${treatmentSpanClause} These injuries caused our client substantial physical pain, emotional distress, and disruption to daily activities, work, and quality of life. The course of treatment, the nature of the injuries, and their ongoing effects fully justify a meaningful award for non-economic damages.`,
    painSufferingNarrative,
  ]
    .filter((s) => s && s.trim())
    .join('\n\n')

  // --- Section: itemized damages summary ---
  const medicalLine =
    ledger.totalBilled > 0
      ? `- Medical bills (itemized from ${ledger.entries.length} encounter${ledger.entries.length === 1 ? '' : 's'}): ${money(medicalTotal)}`
      : `- Medical expenses: ${medicalTotal > 0 ? money(medicalTotal) : 'To be documented'}`
  const damagesLines = [
    medicalLine,
    `- Lost wages: ${lostWages > 0 ? money(lostWages) : 'To be documented'}`,
    futureMedical > 0 ? `- Future medical expenses: ${money(futureMedical)}` : null,
    `- Pain and suffering (general damages): ${generalDamages > 0 ? money(generalDamages) : 'See above'}`,
  ].filter(Boolean)

  const isPro = mode === 'pro_se'
  const voice = {
    weI: isPro ? 'I' : 'we',
    ourMy: isPro ? 'my' : 'our client\u2019s',
    clientPossessive: isPro ? 'my' : 'our client\u2019s',
    clientSubject: isPro ? 'I' : 'our client',
  }

  const intro = isPro
    ? `I am writing on my own behalf regarding my personal injury claim arising from an incident that occurred on or about ${incidentDate} in ${venue}.`
    : `We represent the above-referenced client in connection with a personal injury claim arising from an incident that occurred on or about ${incidentDate} in ${venue}. This letter constitutes our formal demand for settlement.`

  const wageSection = [
    'LOST WAGES',
    lostWages > 0
      ? `${voice.clientSubject} incurred ${money(lostWages)} in lost earnings as a result of this incident and the resulting treatment and recovery. Wage-loss documentation (employer verification and/or pay records) is available upon request and incorporated herein by reference.`
      : `${voice.clientSubject} experienced lost time from work as a result of this incident. Supporting wage-loss documentation will be provided.`,
  ].join('\n')

  const medicalBillsSection = [
    'TOTAL MEDICAL BILLS',
    ledger.totalBilled > 0
      ? `The itemized treatment records above reflect total medical charges of ${money(ledger.totalBilled)} to date. Complete billing statements and records are enclosed or available upon request.`
      : `Total medical charges to date are ${medicalTotal > 0 ? money(medicalTotal) : 'being compiled'}. Itemized billing statements and records are available upon request.`,
  ].join('\n')

  const deadlineClause = `Please respond within thirty (30) days of receipt of this letter.`

  const header = isPro ? 'SETTLEMENT DEMAND' : 'DEMAND LETTER'
  const closing = isPro
    ? `Sincerely,\n\n[Your Name]\n[Your Contact Information]`
    : `Very truly yours,\n\n[Attorney Name]\n[Law Firm Name]\n[Contact Information]`
  const disclaimer = isPro
    ? `This letter is for settlement purposes only. I understand I should consider attorney review before signing any release or resolving claims involving serious injury, minors, disputed liability, government entities, liens, permanent disability, or approaching legal deadlines.`
    : `This letter is for settlement purposes only and is not admissible in any subsequent litigation.`

  return [
    header,
    '',
    `${recipient.name}`,
    `${recipient.address}`,
    '',
    `Re: Personal Injury Claim — Date of Incident ${incidentDate}`,
    '',
    `Dear ${recipient.name},`,
    '',
    intro,
    '',
    'ACCIDENT SUMMARY',
    narrative,
    '',
    'LIABILITY',
    liabilityText,
    '',
    treatmentSection,
    '',
    medicalBillsSection,
    '',
    wageSection,
    '',
    painSufferingSection,
    '',
    'SUMMARY OF DAMAGES',
    ...damagesLines,
    '',
    'DEMAND',
    `Based on the liability of your insured and the nature and extent of ${voice.ourMy} injuries and damages, ${voice.weI} demand the sum of ${money(targetAmount)} to resolve this matter in full.`,
    '',
    `This demand is made in good faith and represents a reasonable assessment of the damages. ${deadlineClause} If this matter cannot be resolved through negotiation, ${voice.weI} ${isPro ? 'reserve' : 'are prepared to pursue'} all available legal remedies.`,
    '',
    closing,
    '',
    disclaimer,
  ].join('\n').trim()
}

export default router
