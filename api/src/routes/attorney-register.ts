import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { z } from 'zod'
import { generateToken } from '../lib/auth'

const router = Router()

// Attorney registration schema (exported for tests / tooling)
export const AttorneyRegisterSchema = z.object({
  email: z.preprocess(
    (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v),
    z.string().email('Invalid email address')
  ),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  name: z.string().optional(), // Derived from firstName + lastName + " Esq." if not provided
  firmName: z.string().optional(),
  firmWebsite: z.union([z.string().url(), z.literal('')]).optional(),
  stateBarNumber: z.string().optional(),
  stateBarState: z.string().length(2).optional(),
  specialties: z.array(z.string()).min(1, 'At least one specialty is required'),
  secondaryCaseTypes: z.array(z.string()).optional(),
  venues: z.array(z.string()).min(1, 'At least one venue is required'),
  jurisdictions: z.array(z.object({
    state: z.string().length(2),
    counties: z.array(z.string()).optional(),
    cities: z.array(z.string()).optional()
  })).optional(),
  firmLocations: z.array(z.object({
    address: z.string(),
    city: z.string(),
    state: z.string().length(2),
    zip: z.string(),
    phone: z.string().optional()
  })).optional(),
  minInjurySeverity: z.number().min(0).max(4).optional(),
  excludedCaseTypes: z.array(z.string()).optional(),
  minDamagesRange: z.number().min(0).optional(),
  maxDamagesRange: z.number().min(0).optional(),
  insuranceRequired: z.boolean().optional(),
  mustHaveMedicalTreatment: z.boolean().optional(),
  requirePoliceReport: z.boolean().optional(),
  requireMedicalRecords: z.boolean().optional(),
  maxCasesPerWeek: z.number().int().min(0).optional(),
  maxCasesPerMonth: z.number().int().min(0).optional(),
  intakeHours: z.union([
    z.literal('24/7'),
    z.array(z.object({
      dayOfWeek: z.number().min(0).max(6),
      startTime: z.number().min(0).max(23),
      endTime: z.number().min(0).max(23)
    }))
  ]).optional(),
  intakeStatus: z.enum(['accept_immediately', 'pause', 'vacation']).optional(),
  preferredConsultationMethod: z.enum(['phone', 'zoom', 'in_person']).optional(),
  pricingModel: z.enum(['fixed_price', 'auction', 'both']).optional(),
  paymentModel: z.enum(['subscription', 'pay_per_case', 'both']).optional(),
  subscriptionTier: z.enum(['basic', 'premium', 'enterprise']).optional()
})

// Register attorney
router.post('/register', async (req, res) => {
  try {
    const parsed = AttorneyRegisterSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid registration data',
        details: parsed.error.flatten()
      })
    }

    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      name: providedName,
      firmName,
      firmWebsite,
      stateBarNumber,
      stateBarState,
      specialties,
      secondaryCaseTypes,
      venues,
      firmLocations,
      jurisdictions: rawJurisdictions,
      minInjurySeverity,
      excludedCaseTypes,
      minDamagesRange,
      maxDamagesRange,
      insuranceRequired,
      mustHaveMedicalTreatment,
      requirePoliceReport,
      requireMedicalRecords,
      maxCasesPerWeek,
      maxCasesPerMonth,
      intakeHours,
      intakeStatus,
      preferredConsultationMethod,
      pricingModel,
      paymentModel,
      subscriptionTier
    } = parsed.data

    const name = providedName || `${firstName} ${lastName}, Esq.`

    // Build jurisdictions from venues if not provided
    const jurisdictions = rawJurisdictions || venues.map((stateCode) => ({
      state: stateCode,
      counties: [] as string[],
      cities: [] as string[]
    }))

    // Check if user/attorney already exists
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' })
    }

    const existingAttorney = await prisma.attorney.findUnique({ where: { email } })
    if (existingAttorney) {
      return res.status(409).json({ error: 'Attorney with this email already exists' })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        phone,
        emailVerified: false,
        isActive: true,
        role: 'attorney'
      }
    })

    const intakeMeta =
      intakeStatus || preferredConsultationMethod
        ? JSON.stringify({
            intakeStatus: intakeStatus ?? null,
            preferredConsultationMethod: preferredConsultationMethod ?? null,
          })
        : null

    const attorney = await prisma.attorney.create({
      data: {
        name,
        email,
        phone,
        specialties: JSON.stringify(specialties),
        venues: JSON.stringify(venues),
        meta: intakeMeta,
        isActive: true,
        isVerified: false,
        responseTimeHours: 24,
        averageRating: 0,
        totalReviews: 0,
      },
    })

    logger.info('Attorney created', { attorneyId: attorney.id, attorneyEmail: attorney.email })

    const attorneyProfile = await prisma.attorneyProfile.create({
      data: {
        attorneyId: attorney.id,
        bio: '',
        specialties: JSON.stringify(specialties),
        secondaryCaseTypes: secondaryCaseTypes ? JSON.stringify(secondaryCaseTypes) : null,
        languages: JSON.stringify(['English']),
        yearsExperience: 0,
        totalCases: 0,
        totalSettlements: 0,
        averageSettlement: 0,
        successRate: 0,
        verifiedVerdicts: JSON.stringify([]),
        totalReviews: 0,
        averageRating: 0,
        firmName: firmName || null,
        firmWebsite: firmWebsite || null,
        firmLocations: firmLocations ? JSON.stringify(firmLocations) : null,
        jurisdictions: JSON.stringify(jurisdictions),
        minInjurySeverity: minInjurySeverity ?? null,
        excludedCaseTypes: excludedCaseTypes ? JSON.stringify(excludedCaseTypes) : null,
        minDamagesRange: minDamagesRange ?? null,
        maxDamagesRange: maxDamagesRange ?? null,
        insuranceRequired: insuranceRequired ?? null,
        mustHaveMedicalTreatment: mustHaveMedicalTreatment ?? null,
        requirePoliceReport: requirePoliceReport ?? null,
        requireMedicalRecords: requireMedicalRecords ?? null,
        maxCasesPerWeek: maxCasesPerWeek ?? null,
        maxCasesPerMonth: maxCasesPerMonth ?? null,
        intakeHours: intakeHours ? (intakeHours === '24/7' ? '24/7' : JSON.stringify(intakeHours)) : null,
        licenseNumber: stateBarNumber || null,
        licenseState: stateBarState || null,
        pricingModel: pricingModel || null,
        paymentModel: paymentModel || null,
        subscriptionTier: subscriptionTier || null
      }
    })

    const token = generateToken(user.id)

    logger.info('Attorney registered', { attorneyId: attorney.id, userId: user.id, email: attorney.email })

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone
      },
      attorney: {
        id: attorney.id,
        name: attorney.name,
        email: attorney.email,
        specialties,
        venues
      },
      profile: {
        firmName: attorneyProfile.firmName,
        jurisdictions,
        minInjurySeverity: attorneyProfile.minInjurySeverity,
        maxCasesPerWeek: attorneyProfile.maxCasesPerWeek,
        maxCasesPerMonth: attorneyProfile.maxCasesPerMonth,
        pricingModel: attorneyProfile.pricingModel,
        paymentModel: attorneyProfile.paymentModel
      },
      token
    })
  } catch (error: any) {
    logger.error('Attorney registration failed', { error: error.message, stack: error.stack })
    res.status(500).json({ error: 'Registration failed', details: error.message })
  }
})

export default router
