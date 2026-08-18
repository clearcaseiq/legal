import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { z } from 'zod'
import { authMiddleware, AuthRequest } from '../lib/auth'

const router = Router()

const FundingRequest = z.object({
  assessmentId: z.string(),
  requestedAmount: z.number().min(1000).max(100000),
  purpose: z.string().optional(),
  repaymentTerms: z.object({
    interestRate: z.number().min(0).max(50),
    termMonths: z.number().min(6).max(60)
  }).optional()
})

const CostCalculator = z.object({
  loanAmount: z.number().min(1000).max(100000),
  interestRate: z.number().min(0).max(50),
  termMonths: z.number().min(6).max(60),
  settlementAmount: z.number().min(1000).optional()
})

// Platform monetization: referral fee (% of funded amount) paid by the funding
// partner when a plaintiff we refer is funded. Overridable via env.
const PLATFORM_FUNDING_REFERRAL_PCT = Number(process.env.FINANCING_REFERRAL_FEE_PCT ?? 8)

/**
 * Pre-settlement funding partners.
 *
 * Deliberately empty. This list previously held three real, named companies
 * (Oasis Financial, Law Cash, Plaintiff Funding Corp) with interest rates,
 * approval rates, funding times and stock-photo logos that were all invented —
 * there is no agreement with any of them and none of those terms were quoted
 * from a real rate sheet. Publishing specific APRs on behalf of a named lender
 * is an advertising claim, so this stays empty until each partner is under
 * contract and its terms come from that contract.
 */
type FundingPartner = {
  id: string
  name: string
  minAmount: number
  maxAmount: number
  interestRate: number
  termMonths: number
  approvalRate: number
  fundingTime: string
  description: string
  logo: string
}

const FUNDING_PARTNERS: FundingPartner[] = []

// Get available funding partners
router.get('/partners', async (req, res) => {
  try {
    const { amount, caseType } = req.query

    let partners = FUNDING_PARTNERS

    // Filter partners based on requested amount
    if (amount) {
      const requestedAmount = parseInt(amount as string)
      partners = partners.filter(p => 
        requestedAmount >= p.minAmount && requestedAmount <= p.maxAmount
      )
    }

    // Sort by approval rate and interest rate
    partners.sort((a, b) => {
      if (a.approvalRate !== b.approvalRate) {
        return b.approvalRate - a.approvalRate
      }
      return a.interestRate - b.interestRate
    })

    res.json({
      partners: partners.map(partner => ({
        ...partner,
        monthlyPayment: calculateMonthlyPayment(
          partner.maxAmount, 
          partner.interestRate, 
          partner.termMonths
        )
      })),
      totalPartners: partners.length
    })
  } catch (error) {
    logger.error('Failed to get funding partners', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Calculate funding costs
router.post('/calculate', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const parsed = CostCalculator.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: parsed.error.flatten() 
      })
    }

    const { loanAmount, interestRate, termMonths, settlementAmount } = parsed.data

    const calculations = calculateFundingCosts(loanAmount, interestRate, termMonths, settlementAmount)

    res.json({
      loanDetails: {
        amount: loanAmount,
        interestRate,
        termMonths,
        monthlyPayment: calculations.monthlyPayment
      },
      costBreakdown: {
        totalInterest: calculations.totalInterest,
        totalPayback: calculations.totalPayback,
        effectiveRate: calculations.effectiveRate
      },
      settlementAnalysis: settlementAmount ? {
        settlementAmount,
        netAfterRepayment: settlementAmount - calculations.totalPayback,
        percentageOfSettlement: (calculations.totalPayback / settlementAmount) * 100
      } : null,
      recommendations: generateFundingRecommendations(calculations, settlementAmount)
    })
  } catch (error) {
    logger.error('Failed to calculate funding costs', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Submit funding request
router.post('/request', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const parsed = FundingRequest.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: parsed.error.flatten() 
      })
    }

    const { assessmentId, requestedAmount, purpose, repaymentTerms } = parsed.data
    const userId = req.user!.id

    // Verify assessment belongs to user
    const assessment = await prisma.assessment.findFirst({
      where: { 
        id: assessmentId,
        userId 
      }
    })

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' })
    }

    // Find suitable funding partners
    const suitablePartners = FUNDING_PARTNERS.filter(p => 
      requestedAmount >= p.minAmount && requestedAmount <= p.maxAmount
    )

    if (suitablePartners.length === 0) {
      return res.status(400).json({ 
        error: 'No funding partners available for this amount',
        availableRange: {
          min: Math.min(...FUNDING_PARTNERS.map(p => p.minAmount)),
          max: Math.max(...FUNDING_PARTNERS.map(p => p.maxAmount))
        }
      })
    }

    const matchedPartners = suitablePartners.map(p => ({
      partnerId: p.id,
      partnerName: p.name,
      estimatedTerms: {
        interestRate: p.interestRate,
        termMonths: p.termMonths,
        monthlyPayment: calculateMonthlyPayment(requestedAmount, p.interestRate, p.termMonths)
      }
    }))

    // Persist the funding request so the plaintiff can track it and the platform
    // can report on referral volume.
    const fundingRequest = await prisma.fundingRequest.create({
      data: {
        userId,
        assessmentId,
        requestedAmount,
        purpose: purpose || 'Case expenses and living costs',
        status: 'pending',
        suitablePartners: JSON.stringify(matchedPartners),
        referralFeePct: PLATFORM_FUNDING_REFERRAL_PCT,
      }
    })

    logger.info('Funding request submitted', {
      userId,
      assessmentId,
      requestedAmount,
      requestId: fundingRequest.id,
      suitablePartners: suitablePartners.length
    })

    res.status(201).json({
      requestId: fundingRequest.id,
      status: fundingRequest.status,
      suitablePartners: matchedPartners,
      nextSteps: [
        'Review funding partner options',
        'Compare terms and rates',
        'Submit application to preferred partner',
        'Provide required documentation'
      ],
      estimatedTimeline: '24-48 hours for partner response'
    })
  } catch (error) {
    logger.error('Failed to submit funding request', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get user's funding requests
router.get('/requests', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id

    const records = await prisma.fundingRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    const requests = records.map(r => ({
      id: r.id,
      assessmentId: r.assessmentId,
      requestedAmount: r.requestedAmount,
      purpose: r.purpose,
      status: r.status,
      partner: r.selectedPartnerName,
      selectedPartnerId: r.selectedPartnerId,
      approvedAmount: r.approvedAmount,
      interestRate: r.interestRate,
      termMonths: r.termMonths,
      monthlyPayment: r.monthlyPayment,
      suitablePartners: safeParseJson(r.suitablePartners),
      submittedAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString()
    }))

    res.json({
      requests,
      totalRequests: requests.length,
      totalApproved: requests.filter(r => ['approved', 'funded'].includes(r.status)).length
    })
  } catch (error) {
    logger.error('Failed to get funding requests', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

const FundingRequestUpdate = z.object({
  status: z.enum(['pending', 'submitted', 'approved', 'funded', 'declined', 'cancelled']).optional(),
  selectedPartnerId: z.string().optional(),
  approvedAmount: z.number().min(0).optional(),
  interestRate: z.number().min(0).max(50).optional(),
  termMonths: z.number().min(1).max(60).optional()
})

// Update a funding request (e.g. select a partner, submit, or cancel).
router.patch('/requests/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id
    const parsed = FundingRequestUpdate.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    }

    const existing = await prisma.fundingRequest.findFirst({ where: { id: req.params.id, userId } })
    if (!existing) {
      return res.status(404).json({ error: 'Funding request not found' })
    }

    const { status, selectedPartnerId, approvedAmount, interestRate, termMonths } = parsed.data
    const data: Record<string, unknown> = {}
    if (status) data.status = status
    if (approvedAmount != null) data.approvedAmount = approvedAmount
    if (interestRate != null) data.interestRate = interestRate
    if (termMonths != null) data.termMonths = termMonths

    if (selectedPartnerId) {
      const partner = FUNDING_PARTNERS.find(p => p.id === selectedPartnerId)
      if (!partner) return res.status(400).json({ error: 'Unknown funding partner' })
      data.selectedPartnerId = partner.id
      data.selectedPartnerName = partner.name
      const rate = interestRate ?? partner.interestRate
      const term = termMonths ?? partner.termMonths
      const amount = approvedAmount ?? existing.requestedAmount
      data.interestRate = rate
      data.termMonths = term
      data.monthlyPayment = calculateMonthlyPayment(amount, rate, term)
    }

    const updated = await prisma.fundingRequest.update({ where: { id: existing.id }, data })

    res.json({
      id: updated.id,
      status: updated.status,
      partner: updated.selectedPartnerName,
      selectedPartnerId: updated.selectedPartnerId,
      approvedAmount: updated.approvedAmount,
      interestRate: updated.interestRate,
      termMonths: updated.termMonths,
      monthlyPayment: updated.monthlyPayment
    })
  } catch (error) {
    logger.error('Failed to update funding request', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Medical provider financing (lien-based treatment)
router.get('/medical-providers', async (req, res) => {
  try {
    const { location, specialty } = req.query

    // Deliberately empty, for the same reason as FUNDING_PARTNERS above: the
    // three clinics listed here were invented, down to their star ratings and
    // review counts, and naming a real practice as a lien partner it has not
    // agreed to be is a claim we cannot support. Populate from a real
    // provider-agreement table before turning this back on.
    const medicalProviders: Array<{
      id: string
      name: string
      specialty: string
      location: string
      acceptsLiens: boolean
      lienTerms: string
      specialties: string[]
      rating: number
      reviews: number
      photo: string
    }> = []

    let providers = medicalProviders

    // Filter by location
    if (location) {
      providers = providers.filter(p => 
        p.location.toLowerCase().includes((location as string).toLowerCase())
      )
    }

    // Filter by specialty
    if (specialty) {
      providers = providers.filter(p => 
        p.specialty.toLowerCase() === (specialty as string).toLowerCase() ||
        p.specialties.some(s => s.toLowerCase().includes((specialty as string).toLowerCase()))
      )
    }

    res.json({
      providers,
      totalProviders: providers.length,
      lienInfo: {
        description: 'Medical lien allows you to receive treatment now and pay after your case settles',
        benefits: [
          'No upfront medical costs',
          'Access to quality care',
          'Payment only after settlement',
          'Reduced financial stress'
        ],
        requirements: [
          'Valid personal injury case',
          'Attorney representation',
          'Lien agreement signed',
          'Insurance information provided'
        ]
      }
    })
  } catch (error) {
    logger.error('Failed to get medical providers', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Helper functions
function safeParseJson(value: string | null | undefined) {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function calculateMonthlyPayment(principal: number, annualRate: number, months: number): number {
  const monthlyRate = annualRate / 100 / 12
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / 
                 (Math.pow(1 + monthlyRate, months) - 1)
  return Math.round(payment * 100) / 100
}

function calculateFundingCosts(amount: number, rate: number, months: number, settlement?: number) {
  const monthlyPayment = calculateMonthlyPayment(amount, rate, months)
  const totalPayback = monthlyPayment * months
  const totalInterest = totalPayback - amount
  const effectiveRate = (totalInterest / amount) * 100

  return {
    monthlyPayment,
    totalPayback,
    totalInterest,
    effectiveRate
  }
}

function generateFundingRecommendations(calculations: any, settlementAmount?: number): string[] {
  const recommendations = []

  if (calculations.effectiveRate > 30) {
    recommendations.push('Consider lower amount or shorter term to reduce costs')
  }

  if (settlementAmount && calculations.totalPayback > settlementAmount * 0.5) {
    recommendations.push('Funding may consume significant portion of settlement')
  }

  if (calculations.monthlyPayment > 1000) {
    recommendations.push('High monthly payment - ensure you can afford repayment')
  }

  recommendations.push('Compare multiple funding partners for best terms')
  recommendations.push('Consider partial funding to minimize costs')

  return recommendations
}

export default router
