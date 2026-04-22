import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { z } from 'zod'
import { authMiddleware, optionalAuthMiddleware, AuthRequest } from '../lib/auth'

const router = Router()

const RecommendationRequest = z.object({
  assessmentId: z.string(),
  userId: z.string().optional(),
  preferences: z.object({
    maxDistance: z.number().optional(),
    preferredLanguages: z.array(z.string()).optional(),
    consultationTypes: z.array(z.enum(['in_person', 'phone', 'video'])).optional(),
    maxResponseTime: z.number().optional(), // hours
    minRating: z.number().optional(),
    specialties: z.array(z.string()).optional()
  }).optional()
})

// Get smart attorney recommendations
router.post('/attorneys', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const parsed = RecommendationRequest.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: parsed.error.flatten() 
      })
    }

    const { assessmentId, preferences } = parsed.data
    const userId = req.user!.id

    // Get assessment details
    const assessment = await prisma.assessment.findFirst({
      where: { 
        id: assessmentId,
        userId 
      }
    })

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' })
    }

    const facts = JSON.parse(assessment.facts)
    
    // Generate smart recommendations based on ML-like scoring
    const recommendations = await generateSmartRecommendations(facts, preferences)

    logger.info('Smart attorney recommendations generated', { 
      userId,
      assessmentId,
      recommendationsCount: recommendations.length
    })

    res.json({
      recommendations,
      total: recommendations.length,
      assessment: {
        id: assessment.id,
        claimType: assessment.claimType,
        venue: `${assessment.venueState}${assessment.venueCounty ? `, ${assessment.venueCounty}` : ''}`
      },
      generatedAt: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Failed to generate smart recommendations', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get personalized case insights
router.get('/insights/:assessmentId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { assessmentId } = req.params
    const userId = req.user!.id

    // Verify user owns this assessment
    const assessment = await prisma.assessment.findFirst({
      where: { 
        id: assessmentId,
        userId 
      }
    })

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' })
    }

    const facts = JSON.parse(assessment.facts)
    
    // Generate personalized insights
    const insights = await generateCaseInsights(facts, assessment)

    res.json({
      insights,
      assessment: {
        id: assessment.id,
        claimType: assessment.claimType,
        venue: `${assessment.venueState}${assessment.venueCounty ? `, ${assessment.venueCounty}` : ''}`
      }
    })
  } catch (error) {
    logger.error('Failed to generate case insights', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get treatment recommendations
router.get('/treatment/:assessmentId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { assessmentId } = req.params
    const userId = req.user!.id

    // Verify user owns this assessment
    const assessment = await prisma.assessment.findFirst({
      where: { 
        id: assessmentId,
        userId 
      }
    })

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' })
    }

    const facts = JSON.parse(assessment.facts)
    
    // Generate treatment recommendations based on injury type and severity
    const treatmentRecommendations = await generateTreatmentRecommendations(facts)

    res.json({
      recommendations: treatmentRecommendations,
      assessment: {
        id: assessment.id,
        claimType: assessment.claimType
      }
    })
  } catch (error) {
    logger.error('Failed to generate treatment recommendations', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get similar case outcomes
router.get('/similar-cases/:assessmentId', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const { assessmentId } = req.params
    const userId = req.user?.id

    // Verify user owns this assessment if authenticated
    const assessment = await prisma.assessment.findFirst({
      where: { 
        id: assessmentId,
        ...(userId ? { userId } : {})
      }
    })

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' })
    }

    const facts = JSON.parse(assessment.facts)
    const cachedSimilarCases = assessment.similarCases ? JSON.parse(assessment.similarCases) : null

    if (cachedSimilarCases?.length) {
      return res.json({
        similarCases: cachedSimilarCases,
        assessment: {
          id: assessment.id,
          claimType: assessment.claimType,
          venue: `${assessment.venueState}${assessment.venueCounty ? `, ${assessment.venueCounty}` : ''}`
        },
        cached: true
      })
    }
    
    // Generate similar case outcomes
    const similarCases = await generateSimilarCaseOutcomes(facts, assessment)

    await prisma.assessment.update({
      where: { id: assessment.id },
      data: {
        similarCases: JSON.stringify(similarCases),
        similarCasesUpdatedAt: new Date()
      }
    })

    res.json({
      similarCases,
      assessment: {
        id: assessment.id,
        claimType: assessment.claimType,
        venue: `${assessment.venueState}${assessment.venueCounty ? `, ${assessment.venueCounty}` : ''}`
      },
      cached: false
    })
  } catch (error) {
    logger.error('Failed to generate similar case outcomes', { error, userId: req.user?.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Helper functions
async function generateSmartRecommendations(facts: any, preferences?: any) {
  // Get all attorneys from database with their profiles
  const attorneys = await prisma.attorney.findMany({
    where: { isActive: true },
    include: {
      availability: true,
      attorneyProfile: true, // Include profile for routing preferences
      reviews: {
        include: {
          user: {
            select: { firstName: true, lastName: true }
          }
        }
      }
    }
  })

  // Score each attorney based on multiple factors
  const scoredAttorneys = await Promise.all(attorneys.map(async (attorney) => {
    let score = 0
    const reasons = []
    const rejectReasons: string[] = []

    // Parse attorney data
    const specialties = JSON.parse(attorney.specialties || '[]')
    const venues = JSON.parse(attorney.venues || '[]')
    const profile = attorney.profile ? JSON.parse(attorney.profile) : {}
    const attorneyProfile = attorney.attorneyProfile
    
    // ===== ROUTING PREFERENCES CHECK =====
    // Check if attorney should receive this case based on preferences
    
    // 1. Check excluded case types
    if (attorneyProfile?.excludedCaseTypes) {
      const excludedTypes = JSON.parse(attorneyProfile.excludedCaseTypes)
      if (excludedTypes.includes(facts.claimType)) {
        rejectReasons.push(`Case type ${facts.claimType} is excluded`)
        return { attorney, score: -1000, reasons: [], rejectReasons } // Negative score = exclude
      }
    }
    
    // 2. Check minimum injury severity
    if (attorneyProfile?.minInjurySeverity !== null && attorneyProfile?.minInjurySeverity !== undefined) {
      const caseSeverity = facts.severity || 0 // Get from facts if available
      if (caseSeverity < attorneyProfile.minInjurySeverity) {
        rejectReasons.push(`Case severity ${caseSeverity} below minimum ${attorneyProfile.minInjurySeverity}`)
        return { attorney, score: -1000, reasons: [], rejectReasons }
      }
    }
    
    // 3. Check damages range
    const caseDamages = facts.damages?.med_charges || facts.damages?.med_paid || 0
    if (attorneyProfile?.minDamagesRange && caseDamages < attorneyProfile.minDamagesRange) {
      rejectReasons.push(`Case damages $${caseDamages} below minimum $${attorneyProfile.minDamagesRange}`)
      return { attorney, score: -1000, reasons: [], rejectReasons }
    }
    if (attorneyProfile?.maxDamagesRange && caseDamages > attorneyProfile.maxDamagesRange) {
      rejectReasons.push(`Case damages $${caseDamages} above maximum $${attorneyProfile.maxDamagesRange}`)
      return { attorney, score: -1000, reasons: [], rejectReasons }
    }
    
    // 4. Check capacity (max cases per week/month)
    // Only check if values are explicitly set (not null/undefined)
    if (attorneyProfile?.maxCasesPerWeek != null || attorneyProfile?.maxCasesPerMonth != null) {
      // Count cases assigned to this attorney in the last 7 days
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      
      const casesThisWeek = await prisma.leadSubmission.count({
        where: {
          assignedAttorneyId: attorney.id,
          submittedAt: {
            gte: weekAgo
          },
          status: {
            in: ['submitted', 'contacted', 'consulted', 'retained'] // Count active cases
          }
        }
      })
      
      // Count cases assigned in the last 30 days
      const monthAgo = new Date()
      monthAgo.setDate(monthAgo.getDate() - 30)
      
      const casesThisMonth = await prisma.leadSubmission.count({
        where: {
          assignedAttorneyId: attorney.id,
          submittedAt: {
            gte: monthAgo
          },
          status: {
            in: ['submitted', 'contacted', 'consulted', 'retained']
          }
        }
      })
      
      // Check weekly capacity
      if (attorneyProfile.maxCasesPerWeek && casesThisWeek >= attorneyProfile.maxCasesPerWeek) {
        rejectReasons.push(`Weekly capacity reached (${casesThisWeek}/${attorneyProfile.maxCasesPerWeek} cases)`)
        return { attorney, score: -1000, reasons: [], rejectReasons }
      }
      
      // Check monthly capacity
      if (attorneyProfile.maxCasesPerMonth && casesThisMonth >= attorneyProfile.maxCasesPerMonth) {
        rejectReasons.push(`Monthly capacity reached (${casesThisMonth}/${attorneyProfile.maxCasesPerMonth} cases)`)
        return { attorney, score: -1000, reasons: [], rejectReasons }
      }
      
      // Add capacity info to reasons if close to limit
      if (attorneyProfile.maxCasesPerWeek && casesThisWeek >= attorneyProfile.maxCasesPerWeek * 0.8) {
        reasons.push(`Approaching weekly capacity (${casesThisWeek}/${attorneyProfile.maxCasesPerWeek})`)
      }
      if (attorneyProfile.maxCasesPerMonth && casesThisMonth >= attorneyProfile.maxCasesPerMonth * 0.8) {
        reasons.push(`Approaching monthly capacity (${casesThisMonth}/${attorneyProfile.maxCasesPerMonth})`)
      }
    }
    
    // 5. Check intake hours
    if (attorneyProfile?.intakeHours) {
      let intakeHours: any
      try {
        intakeHours = attorneyProfile.intakeHours === '24/7' ? '24/7' : JSON.parse(attorneyProfile.intakeHours)
      } catch {
        intakeHours = '24/7' // Default to 24/7 if parsing fails
      }
      if (intakeHours !== '24/7') {
        const now = new Date()
        const currentDay = now.getDay() // 0 = Sunday, 6 = Saturday
        const currentHour = now.getHours()
        
        const todayHours = intakeHours.find((h: any) => h.dayOfWeek === currentDay)
        if (!todayHours || currentHour < todayHours.startTime || currentHour >= todayHours.endTime) {
          // Not during intake hours, but don't reject - just reduce score
          score -= 5
          reasons.push('Currently outside intake hours')
        }
      }
    }
    
    // 6. Check jurisdiction match (with counties)
    let jurisdictionMatch = false
    if (attorneyProfile?.jurisdictions) {
      const jurisdictions = JSON.parse(attorneyProfile.jurisdictions)
      const caseState = facts.venue?.state
      const caseCounty = facts.venue?.county
      
      const stateMatch = jurisdictions.find((j: any) => j.state === caseState)
      if (stateMatch) {
        jurisdictionMatch = true
        // Check county if specified
        if (caseCounty && stateMatch.counties && stateMatch.counties.length > 0) {
          if (!stateMatch.counties.includes(caseCounty)) {
            // State matches but county doesn't - reduce score but don't reject
            score -= 10
            reasons.push(`State matches but county ${caseCounty} not in covered counties`)
          } else {
            score += 5
            reasons.push(`Exact jurisdiction match: ${caseState}, ${caseCounty}`)
          }
        } else {
          score += 5
          reasons.push(`State jurisdiction match: ${caseState}`)
        }
      }
    } else {
      // Fallback to old venues field
      if (venues.includes(facts.venue?.state)) {
        jurisdictionMatch = true
      }
    }

    // Jurisdiction fit (40 points max) - only if not already handled above
    if (!jurisdictionMatch) {
      if (venues.includes(facts.venue?.state)) {
        score += 40
        reasons.push(`Practices in ${facts.venue?.state}`)
      } else {
        score -= 10
        reasons.push(`Limited experience in ${facts.venue?.state}`)
      }
    } else {
      // Already scored above, just add base points
      score += 40
    }

    // Case type match (30 points max)
    if (specialties.includes(facts.claimType)) {
      score += 30
      reasons.push(`Specializes in ${facts.claimType} cases`)
    } else {
      score -= 15
      reasons.push(`Not specialized in ${facts.claimType}`)
    }

    // Success rate and experience (20 points max)
    if (attorney.averageRating >= 4.5) {
      score += 20
      reasons.push('Excellent rating (4.5+ stars)')
    } else if (attorney.averageRating >= 4.0) {
      score += 15
      reasons.push('Good rating (4.0+ stars)')
    } else if (attorney.averageRating >= 3.5) {
      score += 10
      reasons.push('Above average rating (3.5+ stars)')
    }

    // Response time (10 points max)
    if (attorney.responseTimeHours <= 4) {
      score += 10
      reasons.push('Quick response time (< 4 hours)')
    } else if (attorney.responseTimeHours <= 24) {
      score += 7
      reasons.push('Good response time (< 24 hours)')
    } else {
      score += 3
      reasons.push('Standard response time')
    }

    // Language match (bonus points)
    if (preferences?.preferredLanguages && profile.languages) {
      const matchingLanguages = preferences.preferredLanguages.filter((lang: string) => 
        profile.languages.includes(lang)
      )
      if (matchingLanguages.length > 0) {
        score += 5
        reasons.push(`Speaks ${matchingLanguages.join(', ')}`)
      }
    }

    // Consultation type availability (bonus points)
    if (preferences?.consultationTypes && profile.consultationTypes) {
      const availableTypes = preferences.consultationTypes.filter((type: string) =>
        profile.consultationTypes.includes(type)
      )
      if (availableTypes.length > 0) {
        score += 5
        reasons.push(`Offers ${availableTypes.join(', ')} consultations`)
      }
    }

    // Free consultation (bonus points)
    if (profile.freeConsultation) {
      score += 3
      reasons.push('Offers free consultation')
    }

    // Verified status (bonus points)
    if (attorney.isVerified) {
      score += 2
      reasons.push('Verified attorney')
    }

    return {
      attorney: {
        id: attorney.id,
        name: attorney.name,
        email: attorney.email,
        phone: attorney.phone,
        specialties: specialties,
        venues: venues,
        profile: profile,
        attorneyProfile: attorneyProfile ? {
          firmName: attorneyProfile.firmName,
          firmLocations: attorneyProfile.firmLocations ? JSON.parse(attorneyProfile.firmLocations) : null,
          jurisdictions: attorneyProfile.jurisdictions ? JSON.parse(attorneyProfile.jurisdictions) : null,
          minInjurySeverity: attorneyProfile.minInjurySeverity,
          excludedCaseTypes: attorneyProfile.excludedCaseTypes ? JSON.parse(attorneyProfile.excludedCaseTypes) : null,
          minDamagesRange: attorneyProfile.minDamagesRange,
          maxDamagesRange: attorneyProfile.maxDamagesRange,
          maxCasesPerWeek: attorneyProfile.maxCasesPerWeek,
          maxCasesPerMonth: attorneyProfile.maxCasesPerMonth,
          intakeHours: attorneyProfile.intakeHours ? JSON.parse(attorneyProfile.intakeHours) : null,
          pricingModel: attorneyProfile.pricingModel,
          paymentModel: attorneyProfile.paymentModel,
          subscriptionTier: attorneyProfile.subscriptionTier
        } : null,
        isVerified: attorney.isVerified,
        responseTimeHours: attorney.responseTimeHours,
        averageRating: attorney.averageRating,
        totalReviews: attorney.totalReviews,
        verifiedReviewCount: attorney.reviews.filter((review) => review.isVerified).length
      },
      score: Math.max(0, score),
      matchPercentage: Math.min(100, Math.max(0, (score / 100) * 100)),
      reasons,
      rejectReasons: rejectReasons.length > 0 ? rejectReasons : undefined,
      availability: attorney.availability,
      recentReviews: attorney.reviews.slice(0, 3).map(review => ({
        rating: review.rating,
        title: review.title,
        review: review.review,
        reviewer: `${review.user.firstName} ${review.user.lastName}`,
        date: review.createdAt
      }))
    }
  }))

  // Filter out rejected attorneys (negative scores) and sort by score
  return scoredAttorneys
    .filter(rec => rec.score >= 0) // Only include attorneys that passed routing preferences
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((rec, index) => ({
      ...rec,
      rank: index + 1
    }))
}

async function generateCaseInsights(facts: any, assessment: any) {
  const insights = []

  // Jurisdiction insights
  if (facts.venue?.state === 'CA') {
    insights.push({
      type: 'jurisdiction',
      title: 'California Personal Injury Law',
      description: 'California has a 2-year statute of limitations for personal injury cases. The state follows comparative negligence rules.',
      importance: 'high',
      action: 'File your case within 2 years of the incident date'
    })
  }

  // Injury type insights
  if (facts.claimType === 'auto') {
    insights.push({
      type: 'case_type',
      title: 'Auto Accident Case Strength',
      description: 'Auto accident cases typically have strong evidence through police reports and insurance investigations.',
      importance: 'medium',
      action: 'Gather police reports and witness statements'
    })
  }

  // Damages insights
  if (facts.damages?.med_charges > 10000) {
    insights.push({
      type: 'damages',
      title: 'Significant Medical Expenses',
      description: 'High medical bills strengthen your case value and demonstrate the severity of your injuries.',
      importance: 'high',
      action: 'Continue documenting all medical expenses'
    })
  }

  // Treatment insights
  if (facts.treatment && facts.treatment.length > 0) {
    insights.push({
      type: 'treatment',
      title: 'Ongoing Treatment',
      description: 'Continuing treatment shows the ongoing impact of your injuries and may increase case value.',
      importance: 'medium',
      action: 'Keep detailed records of all treatments and appointments'
    })
  }

  // Liability insights
  if (facts.incident?.narrative?.toLowerCase().includes('rear-end')) {
    insights.push({
      type: 'liability',
      title: 'Strong Liability Case',
      description: 'Rear-end collisions typically have clear liability in favor of the rear-ended driver.',
      importance: 'high',
      action: 'This is a strong liability case with good settlement potential'
    })
  }

  return insights
}

async function generateTreatmentRecommendations(facts: any) {
  const recommendations = []

  // Analyze injury types and recommend treatments
  if (facts.injuries) {
    facts.injuries.forEach((injury: any) => {
      switch (injury.type) {
        case 'whiplash':
          recommendations.push({
            type: 'physical_therapy',
            title: 'Physical Therapy for Whiplash',
            description: 'Structured PT program focusing on cervical spine mobility and strengthening',
            urgency: 'medium',
            provider: 'Licensed Physical Therapist',
            expectedDuration: '6-12 weeks',
            benefits: ['Improved range of motion', 'Reduced pain', 'Strengthened neck muscles']
          })
          break
        case 'back_injury':
          recommendations.push({
            type: 'specialist_consultation',
            title: 'Orthopedic Spine Consultation',
            description: 'Evaluation by spine specialist for comprehensive treatment plan',
            urgency: 'high',
            provider: 'Board-certified Orthopedic Spine Surgeon',
            expectedDuration: 'Ongoing',
            benefits: ['Accurate diagnosis', 'Specialized treatment', 'Surgical evaluation if needed']
          })
          break
        case 'soft_tissue':
          recommendations.push({
            type: 'chiropractic_care',
            title: 'Chiropractic Treatment',
            description: 'Manual therapy and spinal adjustments for soft tissue injuries',
            urgency: 'medium',
            provider: 'Licensed Chiropractor',
            expectedDuration: '4-8 weeks',
            benefits: ['Pain relief', 'Improved mobility', 'Faster healing']
          })
          break
      }
    })
  }

  // Add general recommendations
  recommendations.push({
    type: 'pain_management',
    title: 'Pain Management Program',
    description: 'Comprehensive approach to managing chronic pain',
    urgency: 'medium',
    provider: 'Pain Management Specialist',
    expectedDuration: '3-6 months',
    benefits: ['Reduced reliance on medication', 'Improved quality of life', 'Better sleep']
  })

  return recommendations
}

async function generateSimilarCaseOutcomes(facts: any, assessment: any) {
  // Mock similar case outcomes based on case characteristics
  const similarCases = [
    {
      id: 'case_1',
      description: 'Similar auto accident with whiplash injury',
      venue: `${assessment.venueState}`,
      injuryType: facts.claimType,
      medicalBills: 8500,
      settlementAmount: 45000,
      duration: '8 months',
      keyFactors: ['Clear liability', 'Ongoing treatment', 'Strong documentation']
    },
    {
      id: 'case_2',
      description: 'Comparable rear-end collision case',
      venue: `${assessment.venueState}`,
      injuryType: facts.claimType,
      medicalBills: 12000,
      settlementAmount: 65000,
      duration: '12 months',
      keyFactors: ['Defendant admitted fault', 'Multiple treatment providers', 'Lost wages documented']
    },
    {
      id: 'case_3',
      description: 'Similar soft tissue injury case',
      venue: `${assessment.venueState}`,
      injuryType: facts.claimType,
      medicalBills: 6200,
      settlementAmount: 28000,
      duration: '6 months',
      keyFactors: ['Conservative treatment', 'Good recovery', 'Insurance cooperation']
    }
  ]

  // Filter cases based on similar characteristics
  return similarCases.filter(caseData => {
    return caseData.injuryType === assessment.claimType && 
           caseData.venue === assessment.venueState
  }).slice(0, 5)
}

export default router
