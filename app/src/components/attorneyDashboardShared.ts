export type AttorneyDashboardFile = {
  id?: string
  originalName?: string
  filename?: string
  mimetype?: string
  category?: string
  [key: string]: any
}

export type AttorneyDashboardAssessment = {
  id?: string
  createdAt?: string
  venueCounty?: string
  venueState?: string
  files?: AttorneyDashboardFile[]
  user?: {
    id?: string
    firstName?: string
    lastName?: string
    [key: string]: any
  } | null
  [key: string]: any
}

export type AttorneyDashboardLead = {
  id: string
  viabilityScore: number
  liabilityScore: number
  causationScore: number
  damagesScore: number
  isExclusive: boolean
  sourceType: string
  hotnessLevel: string
  submittedAt: string
  status: string
  assignedAttorneyId?: string | null
  assessment: AttorneyDashboardAssessment
  contactAttempts: any[]
  conflictChecks: any[]
  qualityReports: any[]
  [key: string]: any
}

export type AttorneyDashboardLeadFacts = Record<string, any>

export type AttorneyDashboardLeadPrediction = Record<string, any> | null

export type AttorneyDashboardLeadAnalysis = Record<string, any> | null

export type AttorneyDashboardContactCommandPayload = {
  contactType: string
  contactMethod?: string
  scheduledAt?: string
  notes?: string
}
