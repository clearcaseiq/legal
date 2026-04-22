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

// Pre-settlement funding partners
const FUNDING_PARTNERS = [
  {
    id: 'oasis_financial',
    name: 'Oasis Financial',
    minAmount: 1000,
    maxAmount: 50000,
    interestRate: 18,
    termMonths: 24,
    approvalRate: 0.75,
    fundingTime: '24-48 hours',
    description: 'Leading pre-settlement funding provider with fast approval',
    logo: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&h=100&fit=crop'
  },
  {
    id: 'law_cash',
    name: 'Law Cash',
    minAmount: 2500,
    maxAmount: 75000,
    interestRate: 22,
    termMonths: 36,
    approvalRate: 0.70,
    fundingTime: '12-24 hours',
    description: 'Specialized in personal injury case funding',
    logo: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=200&h=100&fit=crop'
  },
  {
    id: 'plaintiff_funding',
    name: 'Plaintiff Funding Corp',
    minAmount: 1000,
    maxAmount: 100000,
    interestRate: 20,
    termMonths: 30,
    approvalRate: 0.65,
    fundingTime: '48-72 hours',
    description: 'Comprehensive funding solutions for all case types',
    logo: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200&h=100&fit=crop'
  }
]

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

    // Create funding request record
    const fundingRequest = {
      id: `fund_${Date.now()}`,
      userId,
      assessmentId,
      requestedAmount,
      purpose: purpose || 'Case expenses and living costs',
      status: 'PENDING',
      suitablePartners: suitablePartners.map(p => ({
        partnerId: p.id,
        partnerName: p.name,
        estimatedTerms: {
          interestRate: p.interestRate,
          termMonths: p.termMonths,
          monthlyPayment: calculateMonthlyPayment(requestedAmount, p.interestRate, p.termMonths)
        }
      })),
      createdAt: new Date().toISOString()
    }

    logger.info('Funding request submitted', { 
      userId,
      assessmentId,
      requestedAmount,
      suitablePartners: suitablePartners.length
    })

    res.status(201).json({
      requestId: fundingRequest.id,
      status: 'PENDING',
      suitablePartners: fundingRequest.suitablePartners,
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

    // In a real app, this would query a funding_requests table
    // For now, return mock data
    const mockRequests = [
      {
        id: 'fund_1704067200000',
        assessmentId: 'assessment_123',
        requestedAmount: 15000,
        status: 'APPROVED',
        partner: 'Oasis Financial',
        approvedAmount: 12000,
        interestRate: 18,
        termMonths: 24,
        monthlyPayment: 587.50,
        submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]

    res.json({
      requests: mockRequests,
      totalRequests: mockRequests.length,
      totalApproved: mockRequests.filter(r => r.status === 'APPROVED').length
    })
  } catch (error) {
    logger.error('Failed to get funding requests', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Medical provider financing (lien-based treatment)
router.get('/medical-providers', async (req, res) => {
  try {
    const { location, specialty } = req.query

    // Mock medical providers who accept liens
    const medicalProviders = [
      {
        id: 'provider_1',
        name: 'Los Angeles Spine & Injury Center',
        specialty: 'Orthopedics',
        location: 'Los Angeles, CA',
        acceptsLiens: true,
        lienTerms: 'Treatment provided on lien basis, payment after settlement',
        specialties: ['Spinal injuries', 'Whiplash', 'Soft tissue injuries'],
        rating: 4.8,
        reviews: 1247,
        photo: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=300&h=200&fit=crop'
      },
      {
        id: 'provider_2',
        name: 'Premier Physical Therapy Group',
        specialty: 'Physical Therapy',
        location: 'Orange County, CA',
        acceptsLiens: true,
        lienTerms: 'No upfront payment required, lien agreement available',
        specialties: ['Post-accident rehabilitation', 'Pain management', 'Sports injuries'],
        rating: 4.6,
        reviews: 892,
        photo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=300&h=200&fit=crop'
      },
      {
        id: 'provider_3',
        name: 'Advanced Diagnostic Imaging',
        specialty: 'Radiology',
        location: 'San Francisco, CA',
        acceptsLiens: true,
        lienTerms: 'Imaging services on lien basis for personal injury cases',
        specialties: ['MRI', 'CT Scans', 'X-rays', 'Ultrasound'],
        rating: 4.9,
        reviews: 2156,
        photo: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=300&h=200&fit=crop'
      }
    ]

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
