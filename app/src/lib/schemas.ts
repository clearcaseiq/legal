import { z } from 'zod'

// Assessment schemas
export const VenueSchema = z.object({
  state: z.string().min(2).max(2),
  county: z.string().min(1, 'County is required')
})

export const IncidentSchema = z.object({
  date: z.string().min(1, 'Incident date is required'),
  location: z.string().optional(),
  narrative: z.string().min(10, 'Please provide a detailed description'),
  parties: z.array(z.string()).optional(),
  timeline: z.array(z.object({
    label: z.string().min(1),
    order: z.number().min(1),
    approxDate: z.string().optional()
  })).optional()
})

export const DamagesSchema = z.object({
  med_charges: z.number().min(0).optional(),
  med_paid: z.number().min(0).optional(),
  wage_loss: z.number().min(0).optional(),
  services: z.number().min(0).optional()
}).partial()

export const ConsentsSchema = z.object({
  tos: z.boolean().refine(val => val === true, 'You must accept the terms of service'),
  privacy: z.boolean().refine(val => val === true, 'You must accept the privacy policy'),
  ml_use: z.boolean().refine(val => val === true, 'You must consent to ML processing'),
  hipaa: z.boolean().optional()
})

export const CaseAccelerationSchema = z.object({
  wageLoss: z.object({
    employerName: z.string().optional(),
    supervisorContact: z.string().optional(),
    positionTitle: z.string().optional(),
    datesMissed: z.string().optional(),
    reasonMissed: z.string().optional(),
    hourlyRate: z.string().optional(),
    typicalHours: z.string().optional(),
    notes: z.string().optional()
  }).optional()
}).partial()

export const JurisdictionIntelligenceSchema = z.object({
  autoDetected: z.boolean().optional(),
  detectedAt: z.string().optional(),
  state: z.string().optional(),
  county: z.string().optional(),
  venueTendency: z.string().optional(),
  negligenceRule: z.string().optional(),
  statuteTimelines: z.record(z.any()).optional()
}).partial()

export const PlaintiffContextSchema = z.object({
  employmentType: z.enum(['w2', '1099', 'self_employed']).optional(),
  primaryIncomeSource: z.string().optional(),
  dependents: z.enum(['yes', 'no']).optional()
}).partial()

export const ExpectationCheckSchema = z.object({
  priority: z.enum(['fast_resolution', 'fair_compensation', 'understanding_rights', 'reducing_stress']).optional()
}).partial()

export const AssessmentWriteSchema = z.object({
  userId: z.string().optional(),
  claimType: z.enum(['auto', 'slip_and_fall', 'dog_bite', 'medmal', 'product', 'nursing_home_abuse', 'wrongful_death', 'high_severity_surgery']),
  venue: VenueSchema,
  incident: IncidentSchema,
  liability: z.record(z.any()).optional(),
  injuries: z.array(z.record(z.any())).min(1, 'Please describe your injuries'),
  treatment: z.array(z.record(z.any())).optional(),
  damages: DamagesSchema,
  insurance: z.record(z.any()).optional(),
  consents: ConsentsSchema,
  caseAcceleration: CaseAccelerationSchema.optional(),
  jurisdiction: JurisdictionIntelligenceSchema.optional(),
  plaintiffContext: PlaintiffContextSchema.optional(),
  expectationCheck: ExpectationCheckSchema.optional()
})

// Attorney schemas
export const AttorneySummarySchema = z.object({
  attorney_id: z.string(),
  name: z.string(),
  specialties: z.array(z.string()),
  venues: z.array(z.string()),
  fit_score: z.number().min(0).max(1),
  verified_outcomes: z.object({
    trials: z.number(),
    settlements: z.number(),
    median_recovery: z.number()
  }),
  fee: z.object({
    contingency_min: z.number(),
    contingency_max: z.number()
  }),
  languages: z.array(z.string()),
  capacity: z.enum(['open', 'limited', 'closed']),
  rating: z.number().optional(),
  reviews_count: z.number().optional(),
  verifiedReviewCount: z.number().optional(),
  responseTimeHours: z.number().optional(),
  responseBadge: z.string().optional(),
  yearsExperience: z.number().optional()
})

// Prediction schemas
export const ViabilitySchema = z.object({
  overall: z.number().min(0).max(1),
  liability: z.number().min(0).max(1),
  causation: z.number().min(0).max(1),
  damages: z.number().min(0).max(1),
  ci: z.array(z.number().min(0).max(1))
})

export const ValueBandsSchema = z.object({
  p25: z.number(),
  median: z.number(),
  p75: z.number()
})

export const PredictionResultSchema = z.object({
  viability: ViabilitySchema,
  value_bands: ValueBandsSchema,
  explainability: z.array(z.object({
    feature: z.string(),
    direction: z.enum(['+', '-']),
    impact: z.number()
  })),
  caveats: z.array(z.string()),
  assessment_id: z.string(),
  model_version: z.string()
})

// SOL schemas
export const SOLResultSchema = z.object({
  expiresAt: z.string(),
  yearsRemaining: z.number(),
  daysRemaining: z.number(),
  status: z.enum(['safe', 'warning', 'critical']),
  incident_date: z.string(),
  venue: VenueSchema,
  claim_type: z.string(),
  rule: z.object({
    years: z.number(),
    discoveryRule: z.boolean().optional(),
    minorTolling: z.boolean().optional(),
    notes: z.string().optional()
  })
})

// File schemas
export const FileUploadSchema = z.object({
  file_id: z.string(),
  original_name: z.string(),
  size: z.number(),
  status: z.string()
})

// Introduction schemas
export const IntroRequestSchema = z.object({
  assessmentId: z.string(),
  attorneyId: z.string(),
  message: z.string().optional()
})

// Demand letter schemas
export const DemandLetterSchema = z.object({
  demand_id: z.string(),
  content: z.string(),
  target_amount: z.number(),
  status: z.string(),
  generated_at: z.string()
})

// Type exports
export type Venue = z.infer<typeof VenueSchema>
export type Incident = z.infer<typeof IncidentSchema>
export type Damages = z.infer<typeof DamagesSchema>
export type Consents = z.infer<typeof ConsentsSchema>
export type CaseAcceleration = z.infer<typeof CaseAccelerationSchema>
export type JurisdictionIntelligence = z.infer<typeof JurisdictionIntelligenceSchema>
export type PlaintiffContext = z.infer<typeof PlaintiffContextSchema>
export type ExpectationCheck = z.infer<typeof ExpectationCheckSchema>
export type AssessmentWrite = z.infer<typeof AssessmentWriteSchema>
export type AttorneySummary = z.infer<typeof AttorneySummarySchema>
export type Viability = z.infer<typeof ViabilitySchema>
export type ValueBands = z.infer<typeof ValueBandsSchema>
export type PredictionResult = z.infer<typeof PredictionResultSchema>
export type SOLResult = z.infer<typeof SOLResultSchema>
export type FileUpload = z.infer<typeof FileUploadSchema>
export type IntroRequest = z.infer<typeof IntroRequestSchema>
export type DemandLetter = z.infer<typeof DemandLetterSchema>

// Utility functions
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

export function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'draft':
      return 'text-gray-600 bg-gray-100'
    case 'in_progress':
      return 'text-yellow-600 bg-yellow-100'
    case 'completed':
      return 'text-green-600 bg-green-100'
    case 'safe':
      return 'text-green-600 bg-green-100'
    case 'warning':
      return 'text-yellow-600 bg-yellow-100'
    case 'critical':
      return 'text-red-600 bg-red-100'
    default:
      return 'text-gray-600 bg-gray-100'
  }
}

// Authentication schemas
export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional()
})

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
})

export const UpdateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional()
})

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

// Authentication types
export type Register = z.infer<typeof RegisterSchema>
export type Login = z.infer<typeof LoginSchema>
export type UpdateProfile = z.infer<typeof UpdateProfileSchema>
export type ChangePassword = z.infer<typeof ChangePasswordSchema>
