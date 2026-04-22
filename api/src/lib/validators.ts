import { z } from 'zod'

export const Venue = z.object({ 
  state: z.string(), 
  county: z.string().optional() 
})

const IncidentBase = z.object({
  date: z.string().min(1),
  location: z.string().optional(),
  narrative: z.string().optional(),
  parties: z.array(z.string()).optional(),
  timeline: z.array(z.object({
    label: z.string(),
    order: z.number(),
    approxDate: z.string().optional()
  })).optional()
})

export const Incident = IncidentBase

export const Damages = z.object({
  med_charges: z.number().optional(),
  med_paid: z.number().optional(),
  wage_loss: z.number().optional(),
  services: z.number().optional(),
  workImpact: z.string().optional()
}).partial()

export const Consents = z.object({
  tos: z.boolean(),
  privacy: z.boolean(),
  ml_use: z.boolean(),
  hipaa: z.boolean().optional()
})

export const CaseAcceleration = z.object({
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

export const JurisdictionIntelligence = z.object({
  autoDetected: z.boolean().optional(),
  detectedAt: z.string().optional(),
  state: z.string().optional(),
  county: z.string().optional(),
  venueTendency: z.string().optional(),
  negligenceRule: z.string().optional(),
  statuteTimelines: z.record(z.any()).optional()
}).partial()

export const PlaintiffContext = z.object({
  employmentType: z.enum(['w2', '1099', 'self_employed']).optional(),
  primaryIncomeSource: z.string().optional(),
  dependents: z.enum(['yes', 'no']).optional()
}).partial()

export const ExpectationCheck = z.object({
  priority: z.enum(['fast_resolution', 'fair_compensation', 'understanding_rights', 'reducing_stress']).optional()
}).partial()

export const AssessmentWrite = z.object({
  userId: z.string().optional(),
  claimType: z.enum(['auto','slip_and_fall','dog_bite','medmal','product','nursing_home_abuse','wrongful_death','high_severity_surgery']),
  venue: Venue,
  incident: Incident,
  liability: z.record(z.any()).optional(),
  injuries: z.array(z.record(z.any())).optional(),
  treatment: z.array(z.record(z.any())).optional(),
  damages: Damages,
  insurance: z.record(z.any()).optional(),
  consents: Consents,
  caseAcceleration: CaseAcceleration.optional(),
  jurisdiction: JurisdictionIntelligence.optional(),
  plaintiffContext: PlaintiffContext.optional(),
  expectationCheck: ExpectationCheck.optional(),
  intakeData: z.record(z.any()).optional()
})

export const AssessmentUpdate = z.object({
  claimType: z.enum(['auto', 'slip_and_fall', 'dog_bite', 'medmal', 'product', 'nursing_home_abuse', 'wrongful_death', 'high_severity_surgery']).optional(),
  venue: Venue.optional(),
  incident: IncidentBase.partial().optional(),
  liability: z.record(z.any()).optional(),
  injuries: z.array(z.record(z.any())).optional(),
  treatment: z.array(z.record(z.any())).optional(),
  damages: Damages.optional(),
  insurance: z.record(z.any()).optional(),
  consents: Consents.optional(),
  caseAcceleration: CaseAcceleration.optional(),
  jurisdiction: JurisdictionIntelligence.optional(),
  plaintiffContext: PlaintiffContext.optional(),
  expectationCheck: ExpectationCheck.optional()
})

export const PredictionRequest = z.object({
  assessmentId: z.string()
})

export const SimulationRequest = z.object({
  base: z.record(z.any()),
  toggles: z.record(z.any())
})

export const AttorneySearch = z.object({
  venue: z.string().optional(),
  claim_type: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).optional().default(10)
})

export const IntroRequest = z.object({
  assessmentId: z.string(),
  attorneyId: z.string(),
  message: z.string().optional()
})

export const SubmitCaseForReview = z.object({
  firstName: z.string().trim().min(1).optional(),
  email: z.preprocess(
    (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v),
    z.string().email().optional()
  ),
  phone: z.string().trim().min(1).optional(),
  preferredContactMethod: z.enum(['phone', 'text', 'email']).optional(),
  hipaa: z.boolean().optional(),
  rankedAttorneyIds: z.array(z.string().trim().min(1)).min(1).max(3).optional(),
})

// Authentication schemas
export const UserRegister = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional()
})

export const UserLogin = z.object({
  email: z.preprocess(
    (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v),
    z.string().email()
  ),
  password: z.string().min(1),
})

export const UserUpdate = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional()
})

export const FavoriteAttorneyRequest = z.object({
  attorneyId: z.string(),
  notes: z.string().optional()
})

export type AssessmentWrite = z.infer<typeof AssessmentWrite>
export type AssessmentUpdate = z.infer<typeof AssessmentUpdate>
export type PredictionRequest = z.infer<typeof PredictionRequest>
export type SimulationRequest = z.infer<typeof SimulationRequest>
export type AttorneySearch = z.infer<typeof AttorneySearch>
export type IntroRequest = z.infer<typeof IntroRequest>
export type UserRegister = z.infer<typeof UserRegister>
export type UserLogin = z.infer<typeof UserLogin>
export type UserUpdate = z.infer<typeof UserUpdate>
export type FavoriteAttorneyRequest = z.infer<typeof FavoriteAttorneyRequest>
export type SubmitCaseForReview = z.infer<typeof SubmitCaseForReview>
