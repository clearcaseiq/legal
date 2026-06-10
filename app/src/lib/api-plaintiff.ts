import api from './http'
import { apiDebug } from './debug'

const freshParams = () => ({ _: Date.now() })

export type PlaintiffMedicalReviewStatus = 'pending' | 'confirmed' | 'skipped'

export interface PlaintiffMedicalReviewEdit {
  eventId: string
  correctedDate?: string
  correctedProvider?: string
  correctedLabel?: string
  correctedDetails?: string
  hideEvent?: boolean
  plaintiffNote?: string
}

export interface PlaintiffMedicalReviewEvent {
  id: string
  date: string | null
  label: string
  source: 'incident' | 'treatment' | 'evidence' | 'medical_record'
  details?: string
  provider?: string
  amount?: number
  sourceFileId?: string
  sourceFileName?: string
  extractionConfidence?: 'documented' | 'estimated' | 'needs_review'
  confidence: 'documented' | 'estimated' | 'needs_review'
  uncertaintyNote?: string
  plaintiffNote?: string
}

export interface PlaintiffMedicalReviewItem {
  key: string
  label: string
  priority: 'high' | 'medium' | 'low'
  guidance: string
}

export interface PlaintiffMedicalReviewPayload {
  chronology: PlaintiffMedicalReviewEvent[]
  missingItems: {
    important: PlaintiffMedicalReviewItem[]
    helpful: PlaintiffMedicalReviewItem[]
  }
  review: {
    status: PlaintiffMedicalReviewStatus
    confirmedAt?: string
    skippedAt?: string
    skipReason?: string
    edits: PlaintiffMedicalReviewEdit[]
  }
}

export const analyzeCaseWithChatGPT = async (assessmentId: string) => {
  apiDebug.log('Starting ChatGPT analysis for assessment:', assessmentId)
  const response = await api.post(`/v1/chatgpt/analyze/${assessmentId}`)
  apiDebug.log('ChatGPT analysis completed:', response.data)
  return response.data
}

export const getSolRules = async (state: string) => {
  const response = await api.get(`/v1/sol/rules/${state}`)
  return response.data
}

function extractAssessmentId(payload: any): string | undefined {
  const rawId =
    payload?.assessment_id ??
    payload?.assessmentId ??
    payload?.id ??
    payload?.data?.assessment_id ??
    payload?.data?.assessmentId ??
    payload?.data?.id

  if (rawId == null) return undefined
  const id = String(rawId).trim()
  return id && id !== 'undefined' && id !== 'null' ? id : undefined
}

export interface IntakeLeadPayload {
  email?: string
  phone?: string
  injuryType?: string
  venueState?: string
  venueCounty?: string
  currentStep?: string
  formSnapshot?: Record<string, unknown>
  assessmentId?: string
  status?: 'in_progress' | 'completed'
}

export async function createIntakeLead(payload: IntakeLeadPayload): Promise<string> {
  const { data } = await api.post('/v1/intake-leads', payload)
  return data.id
}

export async function updateIntakeLead(id: string, payload: IntakeLeadPayload) {
  const { data } = await api.patch(`/v1/intake-leads/${id}`, payload)
  return data
}

export async function createAssessment(payload: any) {
  apiDebug.log('createAssessment called with payload:', payload)
  try {
    const { data } = await api.post('/v1/assessments', payload)
    apiDebug.log('createAssessment success:', data)
    const assessmentId = extractAssessmentId(data)
    if (!assessmentId) {
      apiDebug.error('createAssessment returned unexpected response shape:', data)
      throw new Error('Assessment was created but the API response did not include a valid ID.')
    }
    return assessmentId
  } catch (error: any) {
    apiDebug.error('createAssessment failed:', error)
    apiDebug.error('Error details:', error.response?.data)
    throw error
  }
}

export async function updateAssessment(id: string, patch: any) {
  apiDebug.log('updateAssessment called with:', { id, patch })
  try {
    const { data } = await api.patch(`/v1/assessments/${id}`, patch)
    apiDebug.log('updateAssessment success:', data)
    return data
  } catch (error: any) {
    apiDebug.error('updateAssessment error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText
    })
    throw error
  }
}

export async function saveDamageEstimates(id: string, payload: {
  medicalBillsEstimate?: number
  lostWagesEstimate?: number
  outOfPocketEstimate?: number
  propertyDamageEstimate?: number
  futureTreatmentEstimate?: number
  notes?: string
}) {
  const { data } = await api.post(`/v1/assessments/${id}/damage-estimates`, payload)
  return data
}

export async function getAssessment(id: string) {
  const { data } = await api.get(`/v1/assessments/${id}`, { params: freshParams() })
  return data
}

export async function getAssessmentCommandCenter(id: string) {
  const { data } = await api.get(`/v1/assessments/${id}/command-center`, { params: freshParams() })
  return data
}

export async function getMedicalChronology(assessmentId: string) {
  const { data } = await api.get(`/v1/case-insights/assessments/${assessmentId}/medical-chronology`, { params: freshParams() })
  return data.chronology
}

export async function getCasePreparation(assessmentId: string) {
  const { data } = await api.get(`/v1/case-insights/assessments/${assessmentId}/case-preparation`, { params: freshParams() })
  return data
}

export async function getPlaintiffMedicalReview(assessmentId: string): Promise<PlaintiffMedicalReviewPayload> {
  const { data } = await api.get(`/v1/case-insights/assessments/${assessmentId}/plaintiff-medical-review`, { params: freshParams() })
  return data
}

export async function savePlaintiffMedicalReview(
  assessmentId: string,
  payload: {
    status?: PlaintiffMedicalReviewStatus
    skipReason?: string
    edits?: PlaintiffMedicalReviewEdit[]
  },
): Promise<PlaintiffMedicalReviewPayload> {
  const { data } = await api.post(`/v1/case-insights/assessments/${assessmentId}/plaintiff-medical-review`, payload)
  return data
}

export async function getSettlementBenchmarks(assessmentId: string) {
  const { data } = await api.get(`/v1/case-insights/assessments/${assessmentId}/settlement-benchmarks`, { params: freshParams() })
  return data.benchmarks
}

export async function listAssessments() {
  const { data } = await api.get('/v1/assessments')
  return data
}

export async function associateAssessments(assessmentIds: string[]) {
  const { data } = await api.post('/v1/assessments/associate', { assessmentIds })
  return data
}

export async function submitCaseForReview(
  assessmentId: string,
  contactInfo?: {
    firstName: string
    email: string
    phone: string
    preferredContactMethod?: 'phone' | 'text' | 'email'
    hipaa?: boolean
    rankedAttorneyIds?: string[]
  }
) {
  const { data } = await api.post(`/v1/assessments/${assessmentId}/submit-for-review`, contactInfo || {})
  return data
}

export async function predict(assessmentId: string) {
  const { data } = await api.post('/v1/predict', { assessmentId })
  return data
}

export async function searchAttorneys(params: { venue?: string; claim_type?: string; limit?: number }) {
  const { data } = await api.get('/v1/attorneys/search', {
    params: { ...params, _: Date.now() },
    headers: { 'Cache-Control': 'no-cache' },
  })
  return data
}

export async function calculateSOL(incidentDate: string, venue: { state: string; county?: string }, claimType: string) {
  const { data } = await api.post('/v1/sol/calculate', { incidentDate, venue, claimType })
  return data
}

export async function getSimilarCaseOutcomes(assessmentId: string) {
  const { data } = await api.get(`/v1/smart-recommendations/similar-cases/${assessmentId}`)
  return data
}

export async function uploadEvidenceFile(formData: FormData) {
  const { data } = await api.post('/v1/evidence/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return data
}

export async function getEvidenceFiles(assessmentId?: string, category?: string, processingStatus?: string, query?: string) {
  const params = new URLSearchParams()
  if (assessmentId) params.append('assessmentId', assessmentId)
  if (category) params.append('category', category)
  if (processingStatus) params.append('processingStatus', processingStatus)
  if (query) params.append('query', query)
  params.append('_', String(Date.now()))

  const { data } = await api.get(`/v1/evidence?${params.toString()}`)
  return data
}

export async function processEvidenceFile(fileId: string) {
  const { data } = await api.post(`/v1/evidence/${fileId}/process`)
  return data
}
