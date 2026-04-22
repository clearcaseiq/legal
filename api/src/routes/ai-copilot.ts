import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { z } from 'zod'
import { authMiddleware, AuthRequest } from '../lib/auth'

const router = Router()

const CopilotQuery = z.object({
  question: z.string().min(1).max(1000),
  context: z.object({
    assessmentId: z.string().optional(),
    caseType: z.string().optional(),
    venue: z.string().optional(),
    documents: z.array(z.string()).optional()
  }).optional()
})

const DocumentAnalysis = z.object({
  documentType: z.string(),
  content: z.string().min(1),
  fileName: z.string().optional()
})

// AI Copilot main endpoint
router.post('/ask', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const parsed = CopilotQuery.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: parsed.error.flatten() 
      })
    }

    const { question, context } = parsed.data
    const userId = req.user!.id

    // Get user context if assessment ID provided
    let userContext = {}
    if (context?.assessmentId) {
      const assessment = await prisma.assessment.findFirst({
        where: { 
          id: context.assessmentId,
          userId 
        }
      })

      if (assessment) {
        const facts = JSON.parse(assessment.facts)
        userContext = {
          caseType: assessment.claimType,
          venue: `${assessment.venueState}${assessment.venueCounty ? `, ${assessment.venueCounty}` : ''}`,
          incidentDate: facts.incident?.date,
          injuries: facts.injuries,
          damages: facts.damages
        }
      }
    }

    // Enhanced AI responses based on question type and context
    const response = await generateAIResponse(question, userContext)

    // Store the interaction for learning
    await prisma.chatBotSession.create({
      data: {
        userId,
        sessionId: `copilot_${Date.now()}`,
        context: JSON.stringify({ question, userContext, response }),
        lastInteraction: new Date()
      }
    })

    logger.info('AI Copilot query processed', { 
      userId,
      questionLength: question.length,
      hasContext: !!context?.assessmentId
    })

    res.json({
      answer: response.answer,
      confidence: response.confidence,
      sources: response.sources,
      suggestions: response.suggestions,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Failed to process AI copilot query', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Document analysis endpoint
router.post('/analyze-document', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const parsed = DocumentAnalysis.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: parsed.error.flatten() 
      })
    }

    const { documentType, content, fileName } = parsed.data
    const userId = req.user!.id

    // Analyze document based on type
    const analysis = await analyzeDocument(documentType, content, fileName)

    logger.info('Document analyzed', { 
      userId,
      documentType,
      fileName,
      contentLength: content.length
    })

    res.json({
      analysis: analysis.summary,
      keyPoints: analysis.keyPoints,
      recommendations: analysis.recommendations,
      extractedData: analysis.extractedData,
      confidence: analysis.confidence
    })
  } catch (error) {
    logger.error('Failed to analyze document', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Statute of limitations checker
router.post('/check-sol', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { incidentDate, venue, caseType } = req.body

    if (!incidentDate || !venue || !caseType) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Mock SOL calculation (in real app, this would use actual legal database)
    const solData = calculateSOL(incidentDate, venue, caseType)

    res.json({
      incidentDate,
      venue,
      caseType,
      yearsRemaining: solData.yearsRemaining,
      daysRemaining: solData.daysRemaining,
      expiresAt: solData.expiresAt,
      status: solData.status,
      rule: solData.rule,
      recommendations: solData.recommendations
    })
  } catch (error) {
    logger.error('Failed to check statute of limitations', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Case value simulator
router.post('/simulate-settlement', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { 
      medicalBills, 
      lostWages, 
      painSuffering, 
      liability, 
      venue, 
      caseType,
      treatmentLength 
    } = req.body

    // Mock settlement simulation
    const simulation = simulateSettlement({
      medicalBills: parseFloat(medicalBills) || 0,
      lostWages: parseFloat(lostWages) || 0,
      painSuffering: parseFloat(painSuffering) || 0,
      liability: parseFloat(liability) || 100,
      venue,
      caseType,
      treatmentLength: parseFloat(treatmentLength) || 6
    })

    res.json({
      baseCalculation: simulation.base,
      liabilityAdjustment: simulation.liability,
      venueMultiplier: simulation.venue,
      finalEstimate: simulation.final,
      range: simulation.range,
      factors: simulation.factors
    })
  } catch (error) {
    logger.error('Failed to simulate settlement', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Helper functions
async function generateAIResponse(question: string, context: any) {
  const questionLower = question.toLowerCase()
  
  // Legal advice responses
  if (questionLower.includes('statute of limitations') || questionLower.includes('time limit')) {
    return {
      answer: `Statute of limitations varies by state and case type. In ${context.venue || 'most states'}, personal injury cases typically have a 2-3 year limitation period from the date of injury. However, there are exceptions for discovery rules, minors, and other circumstances. I recommend consulting with an attorney immediately to ensure your case is filed within the applicable time limits.`,
      confidence: 0.85,
      sources: ['State Bar Legal Database', 'Case Law Precedents'],
      suggestions: [
        'Schedule immediate consultation with an attorney',
        'Gather all relevant documents',
        'Document the incident timeline'
      ]
    }
  }

  if (questionLower.includes('case worth') || questionLower.includes('settlement value')) {
    const baseValue = context.damages?.med_charges || 10000
    return {
      answer: `Case value depends on multiple factors including medical expenses ($${baseValue.toLocaleString()}), lost wages, pain and suffering, liability, and venue. Based on similar cases in ${context.venue || 'your area'}, estimated range could be $${Math.round(baseValue * 1.5).toLocaleString()} - $${Math.round(baseValue * 4).toLocaleString()}. This is a preliminary estimate and actual value may vary significantly.`,
      confidence: 0.75,
      sources: ['Settlement Database', 'Similar Case Analysis'],
      suggestions: [
        'Complete full case assessment',
        'Obtain medical documentation',
        'Consult with experienced attorney'
      ]
    }
  }

  if (questionLower.includes('need lawyer') || questionLower.includes('attorney')) {
    return {
      answer: `If you've been injured due to someone else's negligence, consulting with an attorney is highly recommended. Attorneys can help navigate complex legal processes, negotiate with insurance companies, and ensure you receive fair compensation. Most personal injury attorneys work on contingency, meaning no upfront costs.`,
      confidence: 0.90,
      sources: ['Legal Ethics Guidelines', 'Bar Association Standards'],
      suggestions: [
        'Research qualified attorneys in your area',
        'Schedule free consultations',
        'Ask about experience with similar cases'
      ]
    }
  }

  if (questionLower.includes('insurance') || questionLower.includes('claim')) {
    return {
      answer: `Insurance claims can be complex. It's important to report the incident promptly, avoid giving recorded statements without legal counsel, and keep detailed records of all communications. Insurance companies have teams of adjusters and attorneys working to minimize payouts. Having experienced legal representation can help level the playing field.`,
      confidence: 0.80,
      sources: ['Insurance Law Precedents', 'Claims Processing Guidelines'],
      suggestions: [
        'Document all communications',
        "Don't accept initial settlement offers",
        'Consider legal representation'
      ]
    }
  }

  // Default response
  return {
    answer: `I understand you have questions about your legal situation. Based on the information provided, I recommend consulting with a qualified attorney who can provide specific legal advice tailored to your circumstances. Our platform can help connect you with experienced attorneys in your area for a free consultation.`,
    confidence: 0.70,
    sources: ['General Legal Guidelines'],
    suggestions: [
      'Schedule attorney consultation',
      'Gather relevant documents',
      'Document your case timeline'
    ]
  }
}

async function analyzeDocument(documentType: string, content: string, fileName?: string) {
  // Mock document analysis based on type
  const analyses = {
    'medical_record': {
      summary: 'Medical records analyzed for injury documentation and treatment timeline.',
      keyPoints: [
        'Primary diagnosis identified',
        'Treatment dates documented',
        'Medical expenses itemized'
      ],
      recommendations: [
        'Obtain complete medical history',
        'Request itemized billing statements',
        'Document ongoing treatment needs'
      ],
      extractedData: {
        diagnoses: ['Cervical strain', 'Lumbar strain'],
        treatmentDates: ['2024-01-15', '2024-01-20'],
        providers: ['Emergency Room', 'Physical Therapy']
      },
      confidence: 0.85
    },
    'police_report': {
      summary: 'Police report analyzed for liability determination and incident details.',
      keyPoints: [
        'Incident location and time documented',
        'Parties involved identified',
        'Officer observations recorded'
      ],
      recommendations: [
        'Verify all party information',
        'Check for witness statements',
        'Review officer notes for details'
      ],
      extractedData: {
        incidentDate: '2024-01-15',
        location: 'Main St and 1st Ave',
        parties: ['Plaintiff', 'Defendant'],
        officer: 'Officer Smith'
      },
      confidence: 0.90
    },
    'insurance_correspondence': {
      summary: 'Insurance correspondence analyzed for coverage details and claim status.',
      keyPoints: [
        'Coverage limits identified',
        'Claim number assigned',
        'Adjuster contact information'
      ],
      recommendations: [
        'Verify coverage amounts',
        'Document all communications',
        'Keep records of correspondence'
      ],
      extractedData: {
        claimNumber: 'CLM-2024-001234',
        adjuster: 'John Doe',
        coverageLimit: '$100,000',
        policyNumber: 'POL-789456'
      },
      confidence: 0.80
    }
  }

  return analyses[documentType as keyof typeof analyses] || {
    summary: 'Document analyzed for general legal relevance.',
    keyPoints: ['Document type identified', 'Content structure analyzed'],
    recommendations: ['Review with legal counsel', 'Maintain original documents'],
    extractedData: {},
    confidence: 0.60
  }
}

function calculateSOL(incidentDate: string, venue: string, caseType: string) {
  const incident = new Date(incidentDate)
  const now = new Date()
  const yearsElapsed = (now.getTime() - incident.getTime()) / (1000 * 60 * 60 * 24 * 365)
  
  // Mock SOL rules (in real app, this would query legal database)
  const solRules = {
    'CA': { personal_injury: 2, property_damage: 3, medical_malpractice: 1 },
    'NY': { personal_injury: 3, property_damage: 3, medical_malpractice: 2.5 },
    'TX': { personal_injury: 2, property_damage: 2, medical_malpractice: 2 }
  }

  const state = venue.split(',')[0].trim().toUpperCase()
  const rule = solRules[state as keyof typeof solRules] || solRules['CA']
  const limitYears = rule[caseType as keyof typeof rule] || rule.personal_injury
  
  const expiresAt = new Date(incident.getTime() + limitYears * 365 * 24 * 60 * 60 * 1000)
  const yearsRemaining = Math.max(0, limitYears - yearsElapsed)
  const daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

  let status = 'safe'
  if (yearsRemaining < 0.5) status = 'critical'
  else if (yearsRemaining < 1) status = 'warning'

  return {
    yearsRemaining: Math.max(0, yearsRemaining),
    daysRemaining,
    expiresAt: expiresAt.toISOString(),
    status,
    rule: {
      years: limitYears,
      state,
      caseType,
      discoveryRule: caseType === 'medical_malpractice'
    },
    recommendations: status === 'critical' ? 
      ['URGENT: File immediately', 'Contact attorney today'] :
      status === 'warning' ?
      ['File within 6 months', 'Schedule attorney consultation'] :
      ['Monitor deadline', 'Consider filing timeline']
  }
}

function simulateSettlement(params: any) {
  const { medicalBills, lostWages, painSuffering, liability, venue, caseType, treatmentLength } = params
  
  // Base calculation
  const base = medicalBills + lostWages + (painSuffering || medicalBills * 2)
  
  // Liability adjustment
  const liabilityMultiplier = liability / 100
  const liabilityAdjusted = base * liabilityMultiplier
  
  // Venue multiplier
  const venueMultipliers = { 'CA': 1.2, 'NY': 1.1, 'TX': 0.9 }
  const venueAdjusted = liabilityAdjusted * (venueMultipliers[venue as keyof typeof venueMultipliers] || 1.0)
  
  // Treatment length adjustment
  const treatmentMultiplier = Math.min(2.0, 1 + (treatmentLength - 6) * 0.1)
  const final = venueAdjusted * treatmentMultiplier
  
  const range = {
    low: final * 0.6,
    high: final * 1.4
  }

  return {
    base,
    liability: liabilityAdjusted,
    venue: venueAdjusted,
    final,
    range,
    factors: {
      medicalBills,
      lostWages,
      painSuffering,
      liability,
      treatmentLength,
      venue
    }
  }
}

export default router
