import api from './http'
import { clearStoredAuth } from './auth'
import { apiDebug } from './debug'
import type { AttorneyDashboardResponse } from '../../../shared/api-contracts'
import type { HeuristicsConfig } from './heuristics'
import type { FieldMappingsConfig } from './field-mappings'

export type { HeuristicsConfig }

// Test authentication
export async function testAuth() {
  try {
    const { data } = await api.get('/v1/auth/me')
    apiDebug.log('Auth test successful:', data)
    return data
  } catch (error: any) {
    apiDebug.error('Auth test failed:', error.response?.data || error.message)
    throw error
  }
}

// Clear authentication data
export function clearAuth() {
  clearStoredAuth()
  apiDebug.log('Authentication data cleared')
}

// Check authentication status
export function getAuthStatus() {
  const token = localStorage.getItem('auth_token')
  const user = localStorage.getItem('user')
  
  apiDebug.log('Auth status check:', {
    hasToken: !!token,
    hasUser: !!user,
    hasValidTokenFormat: token ? token.split('.').length === 3 : false,
  })
  
  if (user) {
    try {
      const userData = JSON.parse(user)
      apiDebug.log('User data:', userData)
    } catch {
      apiDebug.log('User data invalid JSON')
    }
  }
  
  return { hasToken: !!token, hasUser: !!user }
}

// Consent Management API
export const getConsentTemplates = async (type: string) => {
  const response = await api.get(`/v1/consent/templates/${type}`)
  return response.data
}

export const createConsent = async (consentData: {
  consentType: string
  version: string
  documentId: string
  granted: boolean
  signatureData?: string
  signatureMethod?: 'drawn' | 'typed' | 'clicked'
  consentText: string
  expiresAt?: string
}) => {
  const response = await api.post('/v1/consent', consentData)
  return response.data
}

export const getUserConsents = async () => {
  const response = await api.get('/v1/consent/my-consents')
  return response.data
}

export const getConsentStatus = async (userId: string) => {
  const response = await api.get(`/v1/consent/status/${userId}`)
  return response.data
}

export type PublicConsentTemplate = {
  version: string
  documentId: string
  title: string
  effectiveDate: string
  plainLanguageSummary: string
  content: string
}

export async function fetchPublicConsentTemplate(type: string): Promise<PublicConsentTemplate> {
  const response = await api.get(`/v1/consent/templates/${type}`)
  const body = response.data as { success?: boolean; data?: PublicConsentTemplate }
  if (body?.data) return body.data
  throw new Error('Consent template not available')
}

export type PlaintiffConsentCompliance = {
  allRequiredConsentsGranted: boolean
  missingConsents?: string[]
  needsReconsent?: boolean
  missing?: string[]
  outdated?: string[]
}

export async function getPlaintiffConsentCompliance(userId: string): Promise<PlaintiffConsentCompliance> {
  const response = await api.get(`/v1/consent/status/${userId}`)
  const body = response.data as { success?: boolean; data?: PlaintiffConsentCompliance }
  const data = body.data
  if (!data) {
    throw new Error('Consent status unavailable')
  }
  return data
}

export function requestEmailVerification() {
  return api.post('/v1/auth/request-email-verification')
}

export async function verifyEmail(token: string) {
  const { data } = await api.post('/v1/auth/verify-email', { token })
  return data as { ok: boolean; message?: string; error?: string }
}

export const updateConsent = async (consentId: string, updates: {
  granted?: boolean
  revokedAt?: string
  signatureData?: string
  signatureMethod?: 'drawn' | 'typed' | 'clicked'
}) => {
  const response = await api.patch(`/v1/consent/${consentId}`, updates)
  return response.data
}

// ChatGPT Analysis API
export const analyzeCaseWithChatGPT = async (assessmentId: string) => {
  apiDebug.log('Starting ChatGPT analysis for assessment:', assessmentId)
  const response = await api.post(`/v1/chatgpt/analyze/${assessmentId}`)
  apiDebug.log('ChatGPT analysis completed:', response.data)
  return response.data
}

export const getChatGPTAnalysis = async (assessmentId: string) => {
  const response = await api.get(`/v1/chatgpt/analysis/${assessmentId}`)
  return response.data
}

export const getChatGPTStatus = async () => {
  const response = await api.get('/v1/chatgpt/status')
  return response.data
}

// SOL rules API
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

// Assessment API
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

/** Rose Virtual AI intake - maps spoken answers to ClearCaseIQ assessment (legacy form) */
export async function submitRoseIntake(payload: {
  intakeVersion?: string
  source: 'rose_virtual_ai_widget'
  submittedAtClient?: string
  caseType: string
  incidentDate: string
  incidentLocation: string
  incidentSummary: string
  injuries: string
  treatment: string
  evidence?: Array<{ id: string; name: string; size: number; type: string }>
  contact: { fullName: string; phone: string; email?: string; city: string; state: string }
}) {
  const { data } = await api.post('/v1/rose/intake', payload)
  return { assessment_id: data.assessment_id as string, status: data.status, created_at: data.created_at }
}

/** Rose conversational engine - start new intake session */
export type RoseConversationPhase =
  | 'story_capture'
  | 'targeted_followup'
  | 'recap_confirmation'
  | 'completed'

export type RoseConversationReview = {
  plaintiff_summary: string
  attorney_summary: string
  missing_required_fields: string[]
  disposition: string
  confirmation_prompt: string
}

export async function startRoseConversation() {
  const { data } = await api.post('/v1/rose/conversation/start')
  return {
    conversation_id: data.conversation_id as string,
    message: data.message as string,
    completion_score: data.completion_score as number,
    ready_for_submission: data.ready_for_submission as boolean,
    phase: data.phase as RoseConversationPhase,
  }
}

/** Rose conversational engine - send user message, get next question or assessment */
export async function sendRoseTurn(conversationId: string, message: string) {
  const { data } = await api.post(`/v1/rose/conversation/${conversationId}/turn`, { message })
  return {
    message: data.message as string,
    ready_for_submission: data.ready_for_submission as boolean,
    completion_score: data.completion_score as number,
    phase: data.phase as RoseConversationPhase,
    assessment_id: data.assessment_id as string | undefined,
    plaintiff_summary: data.plaintiff_summary as string | undefined,
    attorney_summary: data.attorney_summary as string | undefined,
    disposition: data.disposition as string | undefined,
    review: data.review as RoseConversationReview | undefined,
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

export async function getAssessment(id: string) {
  const { data } = await api.get(`/v1/assessments/${id}`)
  return data
}

export type PlaintiffDocumentRequest = {
  id: string
  leadId: string | null
  attorney?: {
    id: string
    name?: string | null
    email?: string | null
  } | null
  requestedDocs: string[]
  items: Array<{
    key: string
    label: string
    fulfilled: boolean
  }>
  fulfilledDocs: string[]
  remainingDocs: string[]
  customMessage?: string | null
  uploadLink?: string | null
  status: string
  rawStatus: string
  completionPercent: number
  lastNudgeAt?: string | null
  createdAt: string
}

export async function getPlaintiffDocumentRequests(assessmentId: string): Promise<{
  assessmentId: string
  evidenceCount: number
  requests: PlaintiffDocumentRequest[]
}> {
  const { data } = await api.get(`/v1/assessments/${assessmentId}/document-requests`)
  return data
}

export type PlaintiffCaseTask = {
  id: string
  title: string
  notes?: string | null
  status: string
  priority: string
  dueDate?: string | null
  taskType?: string
}

export async function getPlaintiffCaseTasks(assessmentId: string): Promise<{
  assessmentId: string
  tasks: PlaintiffCaseTask[]
}> {
  const { data } = await api.get(`/v1/assessments/${assessmentId}/tasks`)
  return data
}

// Case Insights - Medical Chronology, Case Preparation, Settlement Benchmarks
export async function getMedicalChronology(assessmentId: string) {
  const { data } = await api.get(`/v1/case-insights/assessments/${assessmentId}/medical-chronology`)
  return data.chronology
}

export async function getCasePreparation(assessmentId: string) {
  const { data } = await api.get(`/v1/case-insights/assessments/${assessmentId}/case-preparation`)
  return data
}

export async function getSettlementBenchmarks(assessmentId: string) {
  const { data } = await api.get(`/v1/case-insights/assessments/${assessmentId}/settlement-benchmarks`)
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

/** Step 18: Plaintiff dashboard - routing status (attorneys reviewing, matched, etc.) */
export async function getRoutingStatus(assessmentId: string) {
  const { data } = await api.get(`/v1/case-routing/assessment/${assessmentId}/status`)
  return data
}

// Prediction API
export async function predict(assessmentId: string) {
  const { data } = await api.post('/v1/predict', { assessmentId })
  return data
}

export async function simulateScenario(base: any, toggles: any) {
  const { data } = await api.post('/v1/predict/simulate', { base, toggles })
  return data
}

export async function getPredictions(assessmentId: string) {
  const { data } = await api.get(`/v1/predict/${assessmentId}`)
  return data
}

// Attorney API
export async function searchAttorneys(params: { venue?: string; claim_type?: string; limit?: number }) {
  const { data } = await api.get('/v1/attorneys/search', { params })
  return data
}

export async function getAttorney(id: string) {
  const { data } = await api.get(`/v1/attorneys/${id}`)
  return data
}

// Introduction API
export async function requestIntroduction(assessmentId: string, attorneyId: string, message?: string) {
  const { data } = await api.post('/v1/intros/request', { assessmentId, attorneyId, message })
  return data
}

export async function getIntroduction(id: string) {
  const { data } = await api.get(`/v1/intros/${id}`)
  return data
}

export async function listIntroductions(assessmentId: string) {
  const { data } = await api.get(`/v1/intros/assessment/${assessmentId}`)
  return data
}

// Files API
export async function uploadFile(file: File, assessmentId?: string) {
  const formData = new FormData()
  formData.append('file', file)
  if (assessmentId) {
    formData.append('assessmentId', assessmentId)
  }
  
  const { data } = await api.post('/v1/files/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return data
}

export async function getFile(fileId: string) {
  const { data } = await api.get(`/v1/files/${fileId}`)
  return data
}

export async function listFiles(assessmentId: string) {
  const { data } = await api.get(`/v1/files/assessment/${assessmentId}`)
  return data
}

// SOL API
export async function calculateSOL(incidentDate: string, venue: { state: string; county?: string }, claimType: string) {
  const { data } = await api.post('/v1/sol/calculate', { incidentDate, venue, claimType })
  return data
}

export async function getSOLRules(state: string) {
  const { data } = await api.get(`/v1/sol/rules/${state}`)
  return data
}

// Demand Letter API
export async function generateDemandLetter(
  assessmentId: string,
  targetAmount: number,
  recipient: any,
  message?: string,
  mode?: 'represented' | 'pro_se'
) {
  const { data } = await api.post('/v1/demands/generate', { assessmentId, targetAmount, recipient, message, mode })
  return data
}

export async function getDemandLetter(demandId: string) {
  const { data } = await api.get(`/v1/demands/${demandId}`, {
    params: { ts: Date.now() }
  })
  return data
}

export async function listDemandLetters(assessmentId: string) {
  const { data } = await api.get(`/v1/demands/assessment/${assessmentId}`, {
    params: { ts: Date.now() }
  })
  return data
}

export async function draftDemandLetter(assessmentId: string) {
  const { data } = await api.post(`/v1/demands/draft/${assessmentId}`)
  return data
}

export async function downloadDemandLetterDocx(demandId: string) {
  const { data } = await api.get(`/v1/demands/${demandId}/docx`, {
    responseType: 'blob',
    params: { ts: Date.now() }
  })
  return data
}

// Notifications API
export async function sendNotification(type: 'email' | 'sms' | 'push', recipient: string, message: string, subject?: string, metadata?: any) {
  const { data } = await api.post('/v1/notify/send', { type, recipient, subject, message, metadata })
  return data
}

export async function getNotification(id: string) {
  const { data } = await api.get(`/v1/notify/${id}`)
  return data
}

export async function listNotifications(recipient: string) {
  const { data } = await api.get(`/v1/notify/recipient/${recipient}`)
  return data
}

// Authentication API
export async function register(payload: any) {
  const { data } = await api.post('/v1/auth/register', payload)
  return data
}

export async function login(payload: any) {
  const { data } = await api.post('/v1/auth/login', payload)
  return data
}

// Attorney login
export async function loginAttorney(payload: any) {
  const { data } = await api.post('/v1/auth/attorney-login', payload)
  return data
}

export async function getCurrentUser() {
  const { data } = await api.get('/v1/auth/me')
  return data
}

export async function updateProfile(payload: any) {
  const { data } = await api.put('/v1/auth/me', payload)
  return data
}

export async function changePassword(payload: any) {
  const { data } = await api.put('/v1/auth/change-password', payload)
  return data
}

// Favorites API
export async function getFavoriteAttorneys() {
  const { data } = await api.get('/v1/favorites')
  return data
}

export async function addFavoriteAttorney(attorneyId: string, notes?: string) {
  const { data } = await api.post('/v1/favorites', { attorneyId, notes })
  return data
}

export async function updateFavoriteAttorney(favoriteId: string, notes: string) {
  const { data } = await api.put(`/v1/favorites/${favoriteId}`, { notes })
  return data
}

export async function removeFavoriteAttorney(favoriteId: string) {
  const { data } = await api.delete(`/v1/favorites/${favoriteId}`)
  return data
}

// Appointments API
export async function createAppointment(appointmentData: any) {
  const { data } = await api.post('/v1/appointments', appointmentData)
  return data
}

export async function getAppointments() {
  const { data } = await api.get('/v1/appointments')
  return data
}

export async function getAppointment(appointmentId: string) {
  const { data } = await api.get(`/v1/appointments/${appointmentId}`)
  return data
}

export async function updateAppointment(appointmentId: string, updates: any) {
  const { data } = await api.put(`/v1/appointments/${appointmentId}`, updates)
  return data
}

export async function cancelAppointment(appointmentId: string) {
  const { data } = await api.delete(`/v1/appointments/${appointmentId}`)
  return data
}

export async function joinAppointmentWaitlist(payload: {
  attorneyId: string
  assessmentId?: string
  appointmentId?: string
  preferredDate?: string
}) {
  const { data } = await api.post('/v1/appointments/waitlist', payload)
  return data
}

export async function getAppointmentPreparation(appointmentId: string) {
  const { data } = await api.get(`/v1/appointments/${appointmentId}/prep`)
  return data
}

export async function updateAppointmentPreparation(appointmentId: string, payload: {
  preparationNotes?: string
  checkInStatus?: 'pending' | 'completed'
  items?: Array<{ id: string; status: 'pending' | 'uploaded' | 'completed' | 'skipped' }>
}) {
  const { data } = await api.put(`/v1/appointments/${appointmentId}/prep`, payload)
  return data
}

export async function getAttorneyAvailability(attorneyId: string, date: string, duration = 30) {
  const { data } = await api.get(`/v1/appointments/attorney/${attorneyId}/availability?date=${date}&duration=${duration}`)
  return data
}

// Attorney Profiles API
export async function getAttorneyProfile(attorneyId: string) {
  const { data } = await api.get(`/v1/attorney-profiles/${attorneyId}`)
  return data
}

export interface AttorneyTrustMetrics {
  attorneyId: string
  averageRating: number
  totalReviews: number
  averageResponseHours: number | null
  responseBadge: string
  introductionsCount: number
  respondedCount: number
  acceptanceRate: number
  casesHandled: number
  resolvedCount: number
  retainRate: number
  favorableRate: number
  outcomeBreakdown: { retained: number; settled: number; won: number; lost: number; consulted: number }
  averageSettlement: number
  totalSettlements: number
  settlementCount: number
  wentToTrialCount: number
  plaintiffSatisfaction: number | null
  attorneySatisfaction: number | null
}

export async function getAttorneyTrustMetrics(attorneyId: string): Promise<AttorneyTrustMetrics> {
  const { data } = await api.get(`/v1/attorney-profiles/${attorneyId}/trust-metrics`)
  return data
}

export interface FirmTrustMetrics {
  firmId: string
  attorneyCount: number
  averageRating: number
  totalReviews: number
  acceptanceRate: number
  retainRate: number
  favorableRate: number
  averageSettlement: number
  totalSettlements: number
  settlementCount: number
  casesHandled: number
  plaintiffSatisfaction: number | null
  averageResponseHours: number | null
}

export interface FirmProfile {
  id: string
  name: string
  slug: string
  tagline: string | null
  description: string | null
  logoUrl: string | null
  website: string | null
  phone: string | null
  city: string | null
  state: string | null
  zip: string | null
  foundedYear: number | null
  practiceAreas: string[]
  offices: { id: string; name: string; city: string | null; state: string | null; practiceAreas: string[] }[]
  attorneys: {
    id: string
    name: string
    specialties: string[]
    averageRating: number
    totalReviews: number
    isVerified: boolean
    responseTimeHours: number
  }[]
}

export async function getPublicFirms(params?: { state?: string; q?: string }) {
  const search = new URLSearchParams()
  if (params?.state) search.append('state', params.state)
  if (params?.q) search.append('q', params.q)
  const { data } = await api.get<{ firms: Array<{ id: string; name: string; slug: string; tagline: string | null; logoUrl: string | null; city: string | null; state: string | null; practiceAreas: string[]; attorneyCount: number }> }>(
    `/v1/firms?${search.toString()}`,
  )
  return data.firms
}

export async function getFirmProfile(slug: string): Promise<{ firm: FirmProfile; metrics: FirmTrustMetrics }> {
  const { data } = await api.get(`/v1/firms/${slug}`)
  return data
}

export async function createAttorneyReview(attorneyId: string, reviewData: any) {
  const { data } = await api.post(`/v1/attorney-profiles/${attorneyId}/reviews`, reviewData)
  return data
}

export async function getAttorneyAvailabilityProfile(attorneyId: string, date: string, duration = 30) {
  const { data } = await api.get(`/v1/attorney-profiles/${attorneyId}/availability?date=${date}&duration=${duration}`)
  return data
}

// Messaging API
export async function getOrCreateChatRoom(attorneyId: string, assessmentId?: string) {
  const { data } = await api.post('/v1/messaging/chat-room', { attorneyId, assessmentId })
  return data
}

export async function getChatRooms() {
  const { data } = await api.get('/v1/messaging/chat-rooms')
  return data
}

// Unread message summary for the plaintiff notification bell
export async function getPlaintiffMessageSummary() {
  const { data } = await api.get('/v1/messaging/unread-summary')
  return data
}

export async function sendMessage(messageData: any) {
  const { data } = await api.post('/v1/messaging/send', messageData)
  return data
}

export async function getChatRoomMessages(chatRoomId: string, limit = 50, offset = 0) {
  const { data } = await api.get(`/v1/messaging/chat-room/${chatRoomId}/messages?limit=${limit}&offset=${offset}`)
  return data
}

export async function markMessagesAsRead(chatRoomId: string) {
  const { data } = await api.put(`/v1/messaging/chat-room/${chatRoomId}/read`)
  return data
}

export async function askChatBot(message: string, sessionId?: string, context?: string) {
  const { data } = await api.post('/v1/messaging/chatbot', { message, sessionId, context })
  return data
}

export async function getChatBotSessions() {
  const { data } = await api.get('/v1/messaging/chatbot/sessions')
  return data
}

// Attorney Messaging API (attorney-dashboard routes)
export async function getAttorneyChatRooms() {
  const { data } = await api.get('/v1/attorney-dashboard/messaging/chat-rooms')
  return data
}

export async function getAttorneyUnreadCount() {
  const { data } = await api.get('/v1/attorney-dashboard/messaging/unread-count')
  return data
}

// Consolidated attorney messaging summary: total unread + awaiting-reply counts
// plus a per-conversation breakdown, in a single call (see messaging route).
export async function getAttorneyUnreadSummary() {
  const { data } = await api.get('/v1/messaging/attorney/unread-summary')
  return data
}

// Attorney notifications feed (new matches, expiring/expired, evidence, messages, consults).
export interface AttorneyNotification {
  id: string
  type: string
  title: string
  body: string
  link: string | null
  leadId: string | null
  read: boolean
  createdAt: string
}

export async function getAttorneyNotifications(limit = 30): Promise<{ notifications: AttorneyNotification[]; unreadCount: number }> {
  const { data } = await api.get(`/v1/attorney-dashboard/notifications?limit=${limit}`)
  return data
}

export async function getAttorneyNotificationUnreadCount(): Promise<{ count: number }> {
  const { data } = await api.get('/v1/attorney-dashboard/notifications/unread-count')
  return data
}

export async function markAttorneyNotificationRead(id: string): Promise<{ updated: number; unreadCount: number }> {
  const { data } = await api.post(`/v1/attorney-dashboard/notifications/${id}/read`, {})
  return data
}

export async function markAllAttorneyNotificationsRead(): Promise<{ updated: number; unreadCount: number }> {
  const { data } = await api.post('/v1/attorney-dashboard/notifications/read-all', {})
  return data
}

export async function getOrCreateAttorneyChatRoom(userId: string | null | undefined, assessmentId?: string) {
  const { data } = await api.post('/v1/attorney-dashboard/messaging/chat-room', { userId: userId || undefined, assessmentId })
  return data
}

export async function getAttorneyChatRoomMessages(chatRoomId: string, limit = 50, offset = 0) {
  const { data } = await api.get(`/v1/attorney-dashboard/messaging/chat-room/${chatRoomId}/messages?limit=${limit}&offset=${offset}`)
  return data
}

export async function sendAttorneyMessage(chatRoomId: string, content: string, messageType = 'text') {
  const { data } = await api.post('/v1/attorney-dashboard/messaging/send', { chatRoomId, content, messageType })
  return data
}

export async function markAttorneyMessagesRead(chatRoomId: string) {
  const { data } = await api.put(`/v1/attorney-dashboard/messaging/chat-room/${chatRoomId}/read`)
  return data
}

export async function getAttorneyMessageTemplates(leadId?: string) {
  const { data } = await api.get('/v1/attorney-dashboard/messaging/templates', {
    params: leadId ? { leadId } : undefined,
  })
  return data
}

// Case Tracker API
export async function getCaseDashboard() {
  const { data } = await api.get('/v1/case-tracker/dashboard')
  return data
}

export async function getCaseDetails(caseId: string) {
  const { data } = await api.get(`/v1/case-tracker/case/${caseId}`)
  return data
}

export async function updateCaseStatus(caseId: string, updates: any) {
  const { data } = await api.put(`/v1/case-tracker/case/${caseId}`, updates)
  return data
}

export async function getCaseTimeline(caseId: string) {
  const { data } = await api.get(`/v1/case-tracker/case/${caseId}/timeline`)
  return data
}

export type CaseCommandCenter = {
  assessmentId: string
  leadId: string | null
  stage: {
    key: string
    title: string
    detail: string
    plaintiffTitle: string
    plaintiffDetail: string
    progressPercent: number
  }
  readiness: {
    score: number
    label: string
    detail: string
    factors: Array<{ key: string; label: string; points: number; max: number; hint?: string }>
  }
  valueStory: {
    median: number
    low: number
    high: number
    detail: string
  }
  liabilityStory: {
    label: string
    detail: string
  }
  coverageStory: {
    label: string
    detail: string
    policyLimit: number | null
  }
  negotiationSummary: {
    eventCount: number
    latestEventType: string | null
    latestStatus: string | null
    latestEventDate: string | null
    latestDemand: number | null
    latestOffer: number | null
    gapToDemand: number | null
    posture: string
    recommendedMove: string
  }
  treatmentMonitor: {
    chronologyCount: number
    providerCount: number
    providers: string[]
    latestTreatmentDate: string | null
    largestGapDays: number
    status: string
    recommendedAction: string
  }
  medicalCostBenchmark: {
    status: 'available' | 'limited' | 'unavailable'
    matchedEventCount: number
    totalChronologyEvents: number
    matchedCategories: Array<{
      categoryLabel: string
      specialtyBucket: string
      piCategory: string
      benchmarkCode: string
      benchmarkDescription: string
      providerMonthRows: number
      medianPaidPerPatient: number
      p90PaidPerPatient: number
      weightedPaidPerPatient: number
    }>
    unmatchedLabels: string[]
    benchmarkTypicalTotal: number | null
    benchmarkHighTotal: number | null
    medCharges: number | null
    detail: string
    caution: string
  }
  strengths: Array<{ title: string; detail: string; severity: 'high' | 'medium' | 'low' }>
  weaknesses: Array<{ title: string; detail: string; severity: 'high' | 'medium' | 'low' }>
  defenseRisks: Array<{ title: string; detail: string; severity: 'high' | 'medium' | 'low' }>
  missingItems: Array<{ key: string; label: string; priority: 'high' | 'medium' | 'low'; plaintiffReason: string }>
  nextBestAction: {
    actionType: 'request_documents' | 'schedule_consult' | 'client_follow_up' | 'prepare_demand' | 'review_negotiation'
    title: string
    detail: string
  }
  suggestedDocumentRequest: {
    requestedDocs: string[]
    customMessage: string
  } | null
  suggestedPlaintiffUpdate: string
  copilot: {
    suggestedPrompts: string[]
    evidenceContext: Array<{ label: string; detail: string }>
  }
  sources: Array<{ label: string; detail: string }>
}

export async function getCaseCommandCenter(caseId: string) {
  const { data } = await api.get<CaseCommandCenter>(`/v1/case-tracker/case/${caseId}/command-center`)
  return data
}

// AI Copilot API
export async function askAICopilot(question: string, context?: any) {
  const { data } = await api.post('/v1/ai-copilot/ask', { question, context })
  return data
}

export async function analyzeDocument(documentData: any) {
  const { data } = await api.post('/v1/ai-copilot/analyze-document', documentData)
  return data
}

export async function checkSOL(solData: any) {
  const { data } = await api.post('/v1/ai-copilot/check-sol', solData)
  return data
}

export async function simulateSettlement(simulationData: any) {
  const { data } = await api.post('/v1/ai-copilot/simulate-settlement', simulationData)
  return data
}

// Financing API
export async function getFundingPartners(amount?: number, caseType?: string) {
  const params = new URLSearchParams()
  if (amount) params.append('amount', amount.toString())
  if (caseType) params.append('caseType', caseType)
  
  const { data } = await api.get(`/v1/financing/partners?${params.toString()}`)
  return data
}

export async function calculateFundingCosts(calculationData: any) {
  const { data } = await api.post('/v1/financing/calculate', calculationData)
  return data
}

export async function submitFundingRequest(requestData: any) {
  const { data } = await api.post('/v1/financing/request', requestData)
  return data
}

export async function getFundingRequests() {
  const { data } = await api.get('/v1/financing/requests')
  return data
}

export async function getMedicalProviders(location?: string, specialty?: string) {
  const params = new URLSearchParams()
  if (location) params.append('location', location)
  if (specialty) params.append('specialty', specialty)
  
  const { data } = await api.get(`/v1/financing/medical-providers?${params.toString()}`)
  return data
}

// Recovery Hub API
export async function getRecoveryDashboard() {
  const { data } = await api.get('/v1/recovery-hub/dashboard')
  return data
}

export async function getRecoveryEntries(type?: string, startDate?: string, endDate?: string, limit = 50) {
  const params = new URLSearchParams()
  if (type) params.append('type', type)
  if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)
  params.append('limit', limit.toString())
  
  const { data } = await api.get(`/v1/recovery-hub/entries?${params.toString()}`)
  return data
}

export async function addRecoveryEntry(entryData: any) {
  const { data } = await api.post('/v1/recovery-hub/entries', entryData)
  return data
}

export async function getRecoveryGoals() {
  const { data } = await api.get('/v1/recovery-hub/goals')
  return data
}

export async function addRecoveryGoal(goalData: any) {
  const { data } = await api.post('/v1/recovery-hub/goals', goalData)
  return data
}

export async function getPainTrends(days = 30) {
  const { data } = await api.get(`/v1/recovery-hub/pain-trends?days=${days}`)
  return data
}

export async function getTreatmentRecommendations() {
  const { data } = await api.get('/v1/recovery-hub/recommendations')
  return data
}

// Smart Recommendations API
export async function getSmartAttorneyRecommendations(assessmentId: string, preferences?: any) {
  const { data } = await api.post('/v1/smart-recommendations/attorneys', { assessmentId, preferences })
  return data
}

export async function getCaseInsights(assessmentId: string) {
  const { data } = await api.get(`/v1/smart-recommendations/insights/${assessmentId}`)
  return data
}

export async function getSmartTreatmentRecommendations(assessmentId: string) {
  const { data } = await api.get(`/v1/smart-recommendations/treatment/${assessmentId}`)
  return data
}

export async function getSimilarCaseOutcomes(assessmentId: string) {
  const { data } = await api.get(`/v1/smart-recommendations/similar-cases/${assessmentId}`)
  return data
}

// Evidence Upload API
export async function testUpload(formData: FormData) {
  const { data } = await api.post('/v1/evidence/test-upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return data
}

export async function simpleTestUpload(formData: FormData) {
  const { data } = await api.post('/v1/evidence/simple-test', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
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

export async function uploadMultipleEvidenceFiles(formData: FormData) {
  const { data } = await api.post('/v1/evidence/upload-multiple', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return data
}

/** Lightweight image relevance pre-check (no persistence). Returns { vision: {...} }. */
export async function precheckEvidenceImage(formData: FormData) {
  const { data } = await api.post('/v1/evidence/vision-precheck', formData, {
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
  
  const { data } = await api.get(`/v1/evidence?${params.toString()}`)
  return data
}

export async function getEvidenceFile(fileId: string) {
  const { data } = await api.get(`/v1/evidence/${fileId}`)
  return data
}

export async function processEvidenceFile(fileId: string) {
  const { data } = await api.post(`/v1/evidence/${fileId}/process`)
  return data
}

export async function updateEvidenceFile(fileId: string, updates: {
  category?: string
    subcategory?: string
  description?: string
  accessLevel?: 'private' | 'attorney' | 'shared'
  isVerified?: boolean
  tags?: string[] | string
  relevanceScore?: number
  provenanceSource?: string
  provenanceNotes?: string
  provenanceActor?: string
  provenanceDate?: string
}) {
  const { data } = await api.put(`/v1/evidence/${fileId}`, updates)
  return data
}

export async function getEvidenceInsights(assessmentId?: string) {
  const params = new URLSearchParams()
  if (assessmentId) params.append('assessmentId', assessmentId)
  const { data } = await api.get(`/v1/evidence/insights/summary?${params.toString()}`)
  return data
}

export async function getEvidenceAnnotations(fileId: string) {
  const { data } = await api.get(`/v1/evidence/${fileId}/annotations`)
  return data
}

export async function createEvidenceAnnotation(fileId: string, payload: {
  content: string
  anchor?: string
  pageNumber?: number
}) {
  const { data } = await api.post(`/v1/evidence/${fileId}/annotations`, payload)
  return data
}

export async function deleteEvidenceFile(fileId: string) {
  const { data } = await api.delete(`/v1/evidence/${fileId}`)
  return data
}

export async function getEvidenceProcessingJobs(fileId: string) {
  const { data } = await api.get(`/v1/evidence/${fileId}/jobs`)
  return data
}

// Attorney registration
export async function registerAttorney(data: any) {
  const { data: response } = await api.post('/v1/attorney-register/register', data)
  return response
}

// Update attorney profile preferences
export async function updateAttorneyProfile(data: any) {
  const { data: response } = await api.put('/v1/attorney-profile/profile', data)
  return response
}

// Upload attorney profile photo (avatar). Returns the updated profile record.
export async function uploadAttorneyProfilePhoto(file: File) {
  const form = new FormData()
  form.append('photo', file)
  const { data: response } = await api.post('/v1/attorney-profile/photo', form)
  return response
}

export async function getAttorneyProfilePerformance(params: {
  period?: string
  startDate?: string
  endDate?: string
} = {}) {
  const { data } = await api.get('/v1/attorney-profile/performance', {
    params: {
      ...params,
      t: Date.now(),
    },
    headers: {
      'Cache-Control': 'no-store',
    },
  })
  return data
}

export async function addAttorneyVerifiedVerdict(payload: {
  caseType: string
  settlementAmount: number
  caseDescription?: string
  date?: string
  venue?: string
}) {
  const { data } = await api.post('/v1/attorney-profile/verified-verdicts', payload)
  return data
}

// Get current authenticated attorney's profile
export async function getMyAttorneyProfile() {
  try {
    const { data: response } = await api.get('/v1/attorney-profile/profile', {
      headers: {
        'Cache-Control': 'no-store'
      },
      params: {
        t: Date.now()
      }
    })
    return response
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return null
    }
    throw error
  }
}

// Get attorney dashboard data
export async function getAttorneyDashboard(): Promise<AttorneyDashboardResponse> {
  try {
    apiDebug.log('Calling getAttorneyDashboard API...')
    const { data: response } = await api.get('/v1/attorney-dashboard/dashboard')
    apiDebug.log('getAttorneyDashboard API success:', response)
    return response
  } catch (error: any) {
    apiDebug.error('getAttorneyDashboard API error:', error)
    apiDebug.error('Error response:', error.response?.data)
    throw error
  }
}

export type AttorneyCalendarConnection = {
  id: string
  provider: 'google' | 'microsoft'
  externalAccountEmail?: string | null
  calendarName?: string | null
  syncStatus: string
  lastSyncedAt?: string | null
  lastSyncError?: string | null
  autoSyncEnabled?: boolean
  webhookExpiresAt?: string | null
  lastWebhookAt?: string | null
  connected: boolean
  health?: {
    status: 'healthy' | 'warning' | 'error' | 'disconnected'
    issues: string[]
    recommendedAction: string
    autoSyncEnabled: boolean
    busyBlockCount: number
  }
}

export async function getAttorneyCalendarConnections() {
  const { data } = await api.get('/v1/attorney-calendar')
  return data as { connections: AttorneyCalendarConnection[] }
}

export async function getAttorneyCalendarHealth() {
  const { data } = await api.get('/v1/attorney-calendar/health')
  return data as {
    summary: {
      totalConnections: number
      connectedCount: number
      healthyCount: number
      warningCount: number
      errorCount: number
      disconnectedCount: number
    }
    connections: AttorneyCalendarConnection[]
  }
}

export async function getAttorneyCalendarConnectUrl(provider: 'google' | 'microsoft') {
  const { data } = await api.post(`/v1/attorney-calendar/${provider}/connect`)
  return data as { authorizeUrl: string }
}

export async function syncAttorneyCalendar(provider: 'google' | 'microsoft') {
  const { data } = await api.post(`/v1/attorney-calendar/${provider}/sync`)
  return data as { success: boolean; syncedBlocks: number; autoSyncEnabled?: boolean; webhookExpiresAt?: string | null }
}

export async function disconnectAttorneyCalendar(provider: 'google' | 'microsoft') {
  const { data } = await api.delete(`/v1/attorney-calendar/${provider}`)
  return data as { disconnected: boolean }
}

export interface AttorneyZoomStatus {
  configured: boolean
  connected: boolean
  email?: string | null
  displayName?: string | null
  syncStatus?: string
  updatedAt?: string
}

export async function getAttorneyZoomStatus() {
  const { data } = await api.get('/v1/attorney-zoom/status')
  return data as AttorneyZoomStatus
}

export async function getAttorneyZoomConnectUrl() {
  const { data } = await api.post('/v1/attorney-zoom/connect')
  return data as { authorizeUrl: string }
}

export async function disconnectAttorneyZoom() {
  const { data } = await api.delete('/v1/attorney-zoom')
  return data as { disconnected: boolean }
}

export async function getAttorneyRoiAnalytics(params?: { period?: string; startDate?: string; endDate?: string }) {
  const { data } = await api.get('/v1/attorney-dashboard/analytics/roi', { params })
  return data
}

export async function transferLeadToFirmAttorney(leadId: string, attorneyId: string) {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/transfer`, {
    attorneyId
  })
  return data
}

// Lead Quality & Transparency

export async function getAttorneyFilteredLeads(params?: Record<string, string | number | boolean>) {
  const { data } = await api.get('/v1/attorney-dashboard/leads/filtered', { params })
  return data as { leads: any[]; totalCount: number; page: number; limit: number }
}

export async function getLeadQualityConflictChecks(params?: Record<string, string | number | boolean>) {
  const { data } = await api.get('/v1/lead-quality/conflict-checks', { params })
  return data as { conflictChecks: any[]; totalCount: number }
}

export async function getLeadQualityReports(params?: Record<string, string | number | boolean>) {
  const { data } = await api.get('/v1/lead-quality/reports', { params })
  return data as { reports: any[]; totalCount: number }
}

export async function runLeadConflictCheck(leadId: string) {
  const { data } = await api.post('/v1/lead-quality/conflict-check', { leadId })
  return data
}

// Attorney License Management

// Upload attorney license file
export async function uploadAttorneyLicense(formData: FormData) {
  const { data: response } = await api.post('/v1/attorney-profile/license/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return response
}

// State bar lookup
export async function lookupStateBarLicense(licenseNumber: string, state: string) {
  const { data: response } = await api.post('/v1/attorney-profile/license/state-bar-lookup', {
    licenseNumber,
    state
  })
  return response
}

// Get license status
export async function getAttorneyLicenseStatus() {
  const { data: response } = await api.get('/v1/attorney-profile/license/status', {
    headers: {
      'Cache-Control': 'no-store'
    },
    params: {
      t: Date.now()
    }
  })
  return response
}

export async function decideLead(
  leadId: string,
  decision: 'accept' | 'reject',
  notes?: string,
  declineReason?: string
): Promise<{ status?: string }> {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/decision`, {
    decision,
    notes,
    declineReason
  })
  return data
}

export async function getLeadDecisionIntelligence(leadId: string) {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/decision-intelligence`)
  return data
}

export async function saveLeadDecisionOverride(leadId: string, payload: { decision: 'accept' | 'reject'; rationale?: string }) {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/decision-intelligence/override`, payload)
  return data
}

export async function updateLeadDecisionOutcome(
  leadId: string,
  payload: {
    outcomeStatus: string | null
    outcomeNotes?: string
    retained?: boolean
    settlementAmount?: number
    wentToTrial?: boolean
    attorneySatisfaction?: number
    attorneySatisfactionNotes?: string
  }
) {
  const { data } = await api.patch(`/v1/attorney-dashboard/leads/${leadId}/decision-intelligence/outcome`, payload)
  return data
}

export interface PlaintiffSatisfaction {
  plaintiffSatisfaction: number | null
  plaintiffSatisfactionNotes: string | null
  plaintiffSatisfactionAt: string | null
}

export async function getPlaintiffSatisfaction(assessmentId: string): Promise<PlaintiffSatisfaction> {
  const { data } = await api.get(`/v1/case-insights/assessments/${assessmentId}/satisfaction`)
  return data
}

export async function submitPlaintiffSatisfaction(
  assessmentId: string,
  payload: { satisfaction: number; notes?: string }
) {
  const { data } = await api.post(`/v1/case-insights/assessments/${assessmentId}/satisfaction`, payload)
  return data
}

export async function getAttorneyDecisionProfile() {
  const { data } = await api.get('/v1/attorney-dashboard/attorney/decision-profile')
  return data
}

export async function saveAttorneyDecisionProfile(payload: {
  negotiationStyle?: string
  riskTolerance?: string
  preferences?: Record<string, unknown>
}) {
  const { data } = await api.post('/v1/attorney-dashboard/attorney/decision-profile', payload)
  return data
}

export async function getAttorneyDecisionBenchmark() {
  const { data } = await api.get('/v1/attorney-dashboard/attorney/decision-benchmark')
  return data
}

export async function getAttorneyDecisionSummary() {
  const { data } = await api.get('/v1/attorney-dashboard/attorney/decision-summary')
  return data
}

export async function getAnalyticsIntelligence() {
  const { data } = await api.get('/v1/attorney-dashboard/analytics/intelligence')
  return data
}

export async function getLeadCommentThreads(leadId: string) {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/comments/threads`)
  return data
}

export async function createLeadCommentThread(
  leadId: string,
  payload: { title: string; threadType?: string; allowedRoles?: string[] }
) {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/comments/threads`, payload)
  return data
}

export async function getLeadCommentThread(leadId: string, threadId: string) {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/comments/threads/${threadId}`)
  return data
}

export async function createLeadComment(
  leadId: string,
  threadId: string,
  payload: { message: string }
) {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/comments/threads/${threadId}/comments`, payload)
  return data
}

export async function getLead(leadId: string) {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}`)
  return data
}

export async function updateLeadStatus(leadId: string, status: 'contacted' | 'consulted' | 'retained') {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/status`, { status })
  return data
}

export async function createLeadContact(
  leadId: string,
  payload: { contactType: string; contactMethod?: string; scheduledAt?: string; notes?: string }
) {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/contact`, payload)
  return data
}

export async function getLeadContacts(leadId: string) {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/contacts`)
  return data
}

export async function getCaseContacts(leadId: string) {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/case-contacts`)
  return data
}

export async function getAllCaseContacts() {
  const { data } = await api.get(`/v1/attorney-dashboard/case-contacts`)
  return data
}

// Firm-wide contacts directory (all attorneys in the firm). Firm-admin scoped.
export async function getFirmCaseContacts() {
  const { data } = await api.get(`/v1/firm-dashboard/case-contacts`)
  return data
}

// Per-team caseload aggregation (+ office capacity utilization). Firm-admin scoped.
export async function getFirmTeamCaseload() {
  const { data } = await api.get(`/v1/firm-dashboard/teams/caseload`)
  return data
}

// Cross-case task queue for the signed-in attorney (overdue/today/upcoming/noDueDate).
export async function getAttorneyTaskSummary() {
  const { data } = await api.get(`/v1/attorney-dashboard/tasks/summary`)
  return data
}

export interface AttorneyDeadlineItem {
  id: string
  kind: 'sol' | 'task'
  leadId: string
  clientName: string
  claimType: string | null
  title: string
  dueDate: string
  daysRemaining: number
  severity: 'expired' | 'critical' | 'warning' | 'safe'
  note?: string | null
}

// Cross-case deadlines radar: live statute-of-limitations per case + dated
// deadline tasks across the whole caseload.
export async function getAttorneyDeadlines(): Promise<{ items: AttorneyDeadlineItem[]; caseCount: number }> {
  const { data } = await api.get(`/v1/attorney-dashboard/deadlines`)
  return data
}

export interface GlobalSearchHit {
  id: string
  leadId: string
  title: string
  subtitle: string
  href: string
}

export interface GlobalSearchResult {
  query: string
  cases: GlobalSearchHit[]
  contacts: GlobalSearchHit[]
  documents: GlobalSearchHit[]
  totals?: { cases: number; contacts: number; documents: number }
}

// Universal search across the attorney's cases, contacts, and documents.
export async function globalSearch(query: string, signal?: AbortSignal): Promise<GlobalSearchResult> {
  const { data } = await api.get(`/v1/attorney-dashboard/search`, { params: { q: query }, signal })
  return data
}

// Fees collected year-to-date, with a per-case breakdown.
export async function getAttorneyFeesYtd() {
  const { data } = await api.get(`/v1/attorney-dashboard/fees/ytd`)
  return data
}

export async function createCaseContact(
  leadId: string,
  payload: {
    firstName: string
    lastName: string
    email?: string
    phone?: string
    companyName?: string
    companyUrl?: string
    title?: string
    contactType?: string
    notes?: string
  }
) {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/case-contacts`, payload)
  return data
}

export async function updateCaseContact(
  leadId: string,
  contactId: string,
  payload: {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    companyName?: string
    companyUrl?: string
    title?: string
    contactType?: string
    notes?: string
  }
) {
  const { data } = await api.patch(`/v1/attorney-dashboard/leads/${leadId}/case-contacts/${contactId}`, payload)
  return data
}

export async function deleteCaseContact(leadId: string, contactId: string) {
  await api.delete(`/v1/attorney-dashboard/leads/${leadId}/case-contacts/${contactId}`)
}

export async function createDocumentRequest(
  leadId: string,
  payload: { requestedDocs: string[]; customMessage?: string; sendUploadLinkOnly?: boolean }
) {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/document-request`, payload)
  return data
}

export type OpposingDocRole = 'defendant' | 'opposing_counsel' | 'insurer'

// Attorney serves a document request on the defendant / opposing party / insurer.
export async function createOpposingDocumentRequest(
  leadId: string,
  payload: {
    requestedDocs: string[]
    customMessage?: string
    recipientName: string
    recipientEmail?: string
    recipientRole?: OpposingDocRole
    caseContactId?: string
    suggestionId?: string
  }
) {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/opposing-document-request`, payload)
  return data
}

export type OpposingDocUpload = {
  id: string
  originalName: string
  docType?: string | null
  mimeType?: string | null
  sizeBytes?: number | null
  uploadedByName?: string | null
  note?: string | null
  createdAt: string
}

export type AttorneyDocumentRequest = {
  id: string
  leadId: string
  status: string
  requestedDocs: string[]
  customMessage?: string | null
  uploadLink?: string | null
  targetType?: string | null
  recipientName?: string | null
  recipientRole?: OpposingDocRole | null
  origin?: string | null
  uploadedCount?: number
  lastNudgeAt?: string | null
  createdAt: string
  claimType?: string | null
  clientName?: string | null
}

export async function getAttorneyDocumentRequests(): Promise<AttorneyDocumentRequest[]> {
  const { data } = await api.get('/v1/attorney-dashboard/document-requests')
  return data
}

export type AttorneyDocumentEnvelope = {
  id: string
  leadId: string
  documentType: string
  title: string
  status: string
  signerName: string
  signerEmail: string
  provider: string
  signingUrl?: string | null
  auditTrailUrl?: string | null
  hasSignedFile?: boolean
  sentAt?: string | null
  viewedAt?: string | null
  signedAt?: string | null
  declinedAt?: string | null
  expiresAt?: string | null
  createdAt: string
  claimType?: string | null
  clientName?: string | null
}

export async function getAttorneyDocumentEnvelopes(): Promise<AttorneyDocumentEnvelope[]> {
  const { data } = await api.get('/v1/attorney-dashboard/document-envelopes')
  return data
}

export async function nudgeDocumentRequest(requestId: string) {
  const { data } = await api.post(`/v1/attorney-dashboard/document-requests/${requestId}/nudge`)
  return data
}

export async function getOpposingDocumentUploads(requestId: string): Promise<OpposingDocUpload[]> {
  const { data } = await api.get(`/v1/attorney-dashboard/document-requests/${requestId}/uploads`)
  return data
}

export function getOpposingDocumentDownloadUrl(requestId: string, uploadId: string) {
  return `/v1/attorney-dashboard/document-requests/${requestId}/uploads/${uploadId}/download`
}

export async function downloadOpposingDocument(requestId: string, uploadId: string, fileName: string) {
  const { data } = await api.get<Blob>(
    `/v1/attorney-dashboard/document-requests/${requestId}/uploads/${uploadId}/download`,
    { responseType: 'blob' }
  )
  const url = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export type OpposingDocSuggestion = {
  id: string
  requestedDocs: string[]
  recipientName?: string | null
  recipientRole?: OpposingDocRole | null
  note?: string | null
  status: string
  documentRequestId?: string | null
  createdAt: string
}

export async function getLeadOpposingDocSuggestions(leadId: string): Promise<OpposingDocSuggestion[]> {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/opposing-document-suggestions`)
  return data
}

// Plaintiff suggests documents their attorney should request from the defendant.
export async function createOpposingDocSuggestion(
  assessmentId: string,
  payload: { requestedDocs: string[]; recipientName?: string; recipientRole?: OpposingDocRole; note?: string }
): Promise<OpposingDocSuggestion> {
  const { data } = await api.post(`/v1/assessments/${assessmentId}/opposing-document-suggestions`, payload)
  return data
}

export async function getOpposingDocSuggestions(assessmentId: string): Promise<OpposingDocSuggestion[]> {
  const { data } = await api.get(`/v1/assessments/${assessmentId}/opposing-document-suggestions`)
  return data
}

// Public tokenized portal used by an external recipient (defendant/insurer) — no auth.
export type DocumentPortalRequest = {
  recipientName?: string | null
  recipientRole?: OpposingDocRole | null
  attorneyName?: string | null
  firmName?: string | null
  customMessage?: string | null
  status: string
  requestedDocs: Array<{ key: string; label: string }>
  uploads: Array<{ id: string; originalName: string; docType?: string | null; createdAt: string }>
}

export async function getDocumentPortalRequest(token: string): Promise<DocumentPortalRequest> {
  const { data } = await api.get(`/v1/public/document-requests/${token}`)
  return data
}

export async function uploadDocumentPortalFile(
  token: string,
  file: File,
  meta: { docType?: string; uploadedByName?: string; note?: string }
) {
  const form = new FormData()
  form.append('file', file)
  if (meta.docType) form.append('docType', meta.docType)
  if (meta.uploadedByName) form.append('uploadedByName', meta.uploadedByName)
  if (meta.note) form.append('note', meta.note)
  const { data } = await api.post(`/v1/public/document-requests/${token}/upload`, form)
  return data as { id: string; originalName: string; docType?: string | null; status: string }
}

export async function getLeadCommandCenter(leadId: string) {
  const { data } = await api.get<CaseCommandCenter>(`/v1/attorney-dashboard/leads/${leadId}/command-center`)
  return data
}

export async function askLeadCommandCenterCopilot(leadId: string, question: string) {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/command-center/copilot`, { question })
  return data as { question: string; answer: string; sources: Array<{ label: string; detail: string }> }
}

export async function syncLeadReadinessAutomation(leadId: string) {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/readiness/sync`)
  return data as {
    createdTaskCount: number
    createdReminderCount: number
    tasks: any[]
    reminders: any[]
    readiness: { score: number; label: string; actionType: string }
  }
}

export async function scheduleConsultation(
  leadId: string,
  payload: { date: string; time: string; meetingType: string; notes?: string }
) {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/schedule-consult`, payload)
  return data
}

export async function getLeadEvidenceFiles(leadId: string) {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/evidence`)
  return data
}

// Fetch an evidence/case document by its stored fileUrl as a blob and return a
// same-origin object URL. Used for inline preview (image/PDF) so the file can be
// embedded without hitting the API's cross-origin frame restrictions. Callers
// must URL.revokeObjectURL() the returned value when done.
export async function getEvidenceObjectUrl(fileUrl: string): Promise<string> {
  const { data } = await api.get<Blob>(fileUrl, { responseType: 'blob' })
  return URL.createObjectURL(data)
}

// Regenerate the AI incident-scene schematic for a lead. Returns { status: 'pending' };
// the new image URL becomes available on the next lead fetch once generation finishes.
export async function regenerateLeadSceneImage(leadId: string): Promise<{ status: string }> {
  const { data } = await api.post<{ status: string }>(`/v1/attorney-dashboard/leads/${leadId}/scene/regenerate`)
  return data
}

// Download an evidence/case document by its stored fileUrl (e.g. /uploads/evidence/..)
// as a blob so the browser saves it with the original filename in every environment
// (same-origin in prod, via the API instance cross-origin in dev).
export async function downloadEvidenceByUrl(fileUrl: string, fileName: string) {
  const { data } = await api.get<Blob>(fileUrl, { responseType: 'blob' })
  const url = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName || 'document'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

// Attorney uploads a document on behalf of the client. The file attaches to the
// plaintiff's assessment (provenance = attorney) and re-runs the live estimate.
export async function uploadLeadEvidenceOnBehalf(
  leadId: string,
  file: File,
  meta?: { category?: string; description?: string }
) {
  const formData = new FormData()
  formData.append('file', file)
  if (meta?.category) formData.append('category', meta.category)
  if (meta?.description) formData.append('description', meta.description)
  const { data } = await api.post(
    `/v1/attorney-dashboard/leads/${leadId}/evidence`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  return data
}

// Attorney deletes a document from an assigned case (authorized by case
// assignment, unlike the plaintiff-owned /v1/evidence/:id route).
export async function deleteLeadEvidence(leadId: string, fileId: string) {
  const { data } = await api.delete(`/v1/attorney-dashboard/leads/${leadId}/evidence/${fileId}`)
  return data
}

export async function getLeadMedicalChronology(leadId: string) {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/medical-chronology`)
  return data.chronology
}

export interface MedicalChronologySummary {
  providers: string[]
  visitCount: number
  diagnoses: { code: string; label: string }[]
  icd10Codes: string[]
  procedures: { code: string; label: string }[]
  cptCodes: string[]
  medications: string[]
  imaging: string[]
  surgeries: string[]
  billedTotal: number
  treatmentGaps: { startDate: string; endDate: string; gapDays: number }[]
  firstTreatmentDate: string | null
  lastTreatmentDate: string | null
  eventCount: number
  timeline: any[]
}

export async function getLeadMedicalChronologySummary(leadId: string): Promise<MedicalChronologySummary | null> {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/medical-chronology`)
  return data.summary ?? null
}

export async function getLeadCasePreparation(leadId: string) {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/case-preparation`)
  return data
}

export async function getLeadSettlementBenchmarks(leadId: string) {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/settlement-benchmarks`)
  return data.benchmarks
}

export async function getLeadInsurance(leadId: string) {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/insurance`)
  return data
}

export async function createLeadInsurance(leadId: string, payload: any) {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/insurance`, payload)
  return data
}

export async function updateLeadInsurance(leadId: string, insuranceId: string, payload: any) {
  const { data } = await api.patch(`/v1/attorney-dashboard/leads/${leadId}/insurance/${insuranceId}`, payload)
  return data
}

export async function requestLeadDecPage(leadId: string, insuranceId: string, payload: any = {}) {
  const { data } = await api.post(
    `/v1/attorney-dashboard/leads/${leadId}/insurance/${insuranceId}/request-dec-page`,
    payload,
  )
  return data
}

export async function getLeadInsuranceSuggestion(leadId: string) {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/insurance/suggestion`)
  return data
}

export async function deleteLeadInsurance(leadId: string, insuranceId: string) {
  const { data } = await api.delete(`/v1/attorney-dashboard/leads/${leadId}/insurance/${insuranceId}`)
  return data
}

export async function getLeadLiens(leadId: string) {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/liens`)
  return data
}

export async function createLeadLien(leadId: string, payload: any) {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/liens`, payload)
  return data
}

export async function updateLeadLien(leadId: string, lienId: string, payload: any) {
  const { data } = await api.patch(`/v1/attorney-dashboard/leads/${leadId}/liens/${lienId}`, payload)
  return data
}

export async function deleteLeadLien(leadId: string, lienId: string) {
  const { data } = await api.delete(`/v1/attorney-dashboard/leads/${leadId}/liens/${lienId}`)
  return data
}

// Settlement / net-to-client engine
export async function getLeadSettlement(leadId: string) {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/settlement`)
  return data
}

export async function updateLeadSettlement(leadId: string, payload: any) {
  const { data } = await api.patch(`/v1/attorney-dashboard/leads/${leadId}/settlement`, payload)
  return data
}

export async function getLeadExpenses(leadId: string) {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/expenses`)
  return data
}

export async function createLeadExpense(leadId: string, payload: any) {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/expenses`, payload)
  return data
}

export async function updateLeadExpense(leadId: string, expenseId: string, payload: any) {
  const { data } = await api.patch(`/v1/attorney-dashboard/leads/${leadId}/expenses/${expenseId}`, payload)
  return data
}

export async function deleteLeadExpense(leadId: string, expenseId: string) {
  const { data } = await api.delete(`/v1/attorney-dashboard/leads/${leadId}/expenses/${expenseId}`)
  return data
}

export async function getLeadTasks(leadId: string) {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/tasks`)
  return data
}

export async function createLeadTask(leadId: string, payload: any) {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/tasks`, payload)
  return data
}

export async function createLeadTasksFromReadiness(leadId: string) {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/tasks/from-readiness`)
  return data as { createdCount: number; tasks: any[]; summary: string }
}

export async function updateLeadTask(leadId: string, taskId: string, payload: any) {
  const { data } = await api.patch(`/v1/attorney-dashboard/leads/${leadId}/tasks/${taskId}`, payload)
  return data
}

export async function deleteLeadTask(leadId: string, taskId: string) {
  const { data } = await api.delete(`/v1/attorney-dashboard/leads/${leadId}/tasks/${taskId}`)
  return data
}

export async function createLeadSolTask(leadId: string) {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/tasks/sol`)
  return data
}

export async function getLeadNegotiations(leadId: string) {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/negotiations`)
  return data
}

export async function createLeadNegotiation(leadId: string, payload: any) {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/negotiations`, payload)
  return data
}

export async function updateLeadNegotiation(leadId: string, negotiationId: string, payload: any) {
  const { data } = await api.patch(`/v1/attorney-dashboard/leads/${leadId}/negotiations/${negotiationId}`, payload)
  return data
}

export async function deleteLeadNegotiation(leadId: string, negotiationId: string) {
  const { data } = await api.delete(`/v1/attorney-dashboard/leads/${leadId}/negotiations/${negotiationId}`)
  return data
}

export async function getLeadNotes(leadId: string) {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/notes`)
  return data
}

export async function createLeadNote(leadId: string, payload: any) {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/notes`, payload)
  return data
}

export async function deleteLeadNote(leadId: string, noteId: string) {
  const { data } = await api.delete(`/v1/attorney-dashboard/leads/${leadId}/notes/${noteId}`)
  return data
}

export async function getLeadInvoices(leadId: string) {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/invoices`)
  return data
}

export async function createLeadInvoice(leadId: string, payload: any) {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/invoices`, payload)
  return data
}

export async function createInvoiceCheckoutSession(invoiceId: string, payload?: { successUrl?: string; cancelUrl?: string }) {
  const { data } = await api.post(`/v1/payments/invoices/${invoiceId}/checkout-session`, payload || {})
  return data as { checkoutUrl: string; sessionId: string }
}

export async function createPlatformSubscriptionCheckoutSession(payload?: {
  priceId?: string
  tierId?: string
  successUrl?: string
  cancelUrl?: string
}) {
  const { data } = await api.post('/v1/payments/platform/subscription-checkout-session', payload || {})
  return data as { checkoutUrl: string; sessionId: string }
}

export async function createLeadCreditCheckoutSession(payload: {
  priceId?: string
  amount?: number
  quantity?: number
  successUrl?: string
  cancelUrl?: string
}) {
  const { data } = await api.post('/v1/payments/platform/lead-credit-checkout-session', payload)
  return data as { checkoutUrl: string; sessionId: string }
}

export async function createAttorneyPaymentMethodSetupSession(payload?: { successUrl?: string; cancelUrl?: string }) {
  const { data } = await api.post('/v1/payments/payment-methods/setup-session', payload || {})
  return data as { checkoutUrl: string; sessionId: string }
}

export async function createRoutingFeePaymentSession(payload: {
  leadId: string
  successUrl?: string
  cancelUrl?: string
}) {
  const { data } = await api.post('/v1/payments/platform/routing-fee-session', payload)
  return data as {
    status: string
    amount?: number
    checkoutUrl?: string
    sessionId?: string
    paymentIntentId?: string
    chargedAutomatically?: boolean
  }
}

export type PlatformPaymentRecord = {
  id: string
  type: string
  typeLabel: string
  description: string | null
  leadId: string | null
  assessmentId: string | null
  amount: number
  currency: string
  status: string
  paid: boolean
  createdAt: string
}

export async function getPlatformPaymentHistory() {
  const { data } = await api.get('/v1/payments/platform/history')
  return data as {
    payments: PlatformPaymentRecord[]
    summary: {
      currency: string
      totalPaid: number
      paidThisMonth: number
      paidCount: number
      byType: Record<string, { label: string; amount: number }>
    }
  }
}

export async function createStripeConnectAccountLink(payload?: { refreshUrl?: string; returnUrl?: string }) {
  const { data } = await api.post('/v1/payments/connect/account-link', payload || {})
  return data as { url: string; accountId: string }
}

export async function getStripeConnectStatus() {
  const { data } = await api.get('/v1/payments/connect/status')
  return data
}

export async function getStripeConfig() {
  const { data } = await api.get('/v1/payments/config')
  return data as { publishableKey: string | null; enabled: boolean }
}

// Creates a SetupIntent for in-app card entry via the Stripe Payment Element.
export async function createStripeSetupIntent() {
  const { data } = await api.post('/v1/payments/payment-methods/setup-intent', {})
  return data as { clientSecret: string; customerId: string }
}

// Whether the attorney has a saved default card on file (drives the onboarding gate).
export async function getPaymentMethodStatus() {
  const { data } = await api.get('/v1/payments/payment-methods/status')
  return data as {
    stripeEnabled: boolean
    hasDefaultPaymentMethod: boolean
    brand?: string | null
    last4?: string | null
  }
}

// Promotes the newest saved card to the customer default immediately after
// in-app card entry (avoids waiting on the setup_intent.succeeded webhook).
export async function syncDefaultPaymentMethod() {
  const { data } = await api.post('/v1/payments/payment-methods/sync-default', {})
  return data as { hasDefaultPaymentMethod: boolean; brand?: string | null; last4?: string | null }
}

// Stripe Customer Portal — manage/cancel subscription, update card, view invoices.
export async function createStripePortalSession(payload?: { returnUrl?: string }) {
  const { data } = await api.post('/v1/payments/portal-session', payload || {})
  return data as { url: string }
}

// Featured-placement / visibility boost purchase.
export async function createFeaturedPlacementCheckoutSession(payload: {
  boostLevel: number
  duration?: number
  successUrl?: string
  cancelUrl?: string
}) {
  const { data } = await api.post('/v1/payments/platform/featured-checkout-session', payload)
  return data as { checkoutUrl: string; sessionId: string }
}

export async function updateLeadInvoice(leadId: string, invoiceId: string, payload: any) {
  const { data } = await api.patch(`/v1/attorney-dashboard/leads/${leadId}/invoices/${invoiceId}`, payload)
  return data
}

export async function deleteLeadInvoice(leadId: string, invoiceId: string) {
  const { data } = await api.delete(`/v1/attorney-dashboard/leads/${leadId}/invoices/${invoiceId}`)
  return data
}

export async function downloadLeadInvoiceDocx(leadId: string, invoiceId: string) {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/invoices/${invoiceId}/docx`, {
    responseType: 'blob'
  })
  return data
}

export async function downloadLeadInvoicePdf(leadId: string, invoiceId: string) {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/invoices/${invoiceId}/pdf`, {
    responseType: 'blob'
  })
  return data
}

export async function getLeadPayments(leadId: string) {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/payments`)
  return data
}

export async function createLeadPayment(leadId: string, payload: any) {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/payments`, payload)
  return data
}

export async function deleteLeadPayment(leadId: string, paymentId: string) {
  const { data } = await api.delete(`/v1/attorney-dashboard/leads/${leadId}/payments/${paymentId}`)
  return data
}

export async function downloadLeadPaymentReceiptPdf(leadId: string, paymentId: string) {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/payments/${paymentId}/receipt/pdf`, {
    responseType: 'blob'
  })
  return data
}

export async function downloadLeadCaseFile(leadId: string) {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/case-file`, {
    responseType: 'blob'
  })
  return data
}

export async function getLeadFinanceSummary(leadId: string) {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/finance/summary`)
  return data
}

export async function downloadLeadFinanceDataroom(leadId: string) {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/finance/dataroom`, {
    responseType: 'blob'
  })
  return data
}

export async function downloadLeadFinanceUnderwritingPdf(leadId: string) {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/finance/underwriting/pdf`, {
    responseType: 'blob'
  })
  return data
}

export async function getLeadCaseShares(leadId: string) {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/case-shares`)
  return data
}

export async function createLeadCaseShare(leadId: string, payload: {
  sharedWithAttorneyId?: string
  sharedWithFirmName?: string
  sharedWithEmail?: string
  accessLevel?: 'view' | 'edit'
  message?: string
}) {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/case-shares`, payload)
  return data
}

export async function getLeadReferrals(leadId: string) {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/referrals`)
  return data
}

export async function createLeadReferral(leadId: string, payload: {
  receivingAttorneyId?: string
  receivingFirmName?: string
  receivingEmail?: string
  feeSplitPercent?: number
  projectedRecovery?: number
  status?: string
  notes?: string
}) {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/referrals`, payload)
  return data
}

export async function updateLeadReferral(leadId: string, referralId: string, payload: {
  receivingAttorneyId?: string
  receivingFirmName?: string
  receivingEmail?: string
  feeSplitPercent?: number
  projectedRecovery?: number
  status?: string
  notes?: string
}) {
  const { data } = await api.patch(`/v1/attorney-dashboard/leads/${leadId}/referrals/${referralId}`, payload)
  return data
}

export async function getLeadCoCounselWorkflows(leadId: string) {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/co-counsel`)
  return data
}

export async function createLeadCoCounselWorkflow(leadId: string, payload: {
  coCounselAttorneyId?: string
  coCounselFirmName?: string
  coCounselEmail?: string
  feeSplitPercent?: number
  projectedRecovery?: number
  workflowStatus?: string
  nextStep?: string
  notes?: string
}) {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/co-counsel`, payload)
  return data
}

export async function updateLeadCoCounselWorkflow(leadId: string, workflowId: string, payload: {
  coCounselAttorneyId?: string
  coCounselFirmName?: string
  coCounselEmail?: string
  feeSplitPercent?: number
  projectedRecovery?: number
  workflowStatus?: string
  nextStep?: string
  notes?: string
}) {
  const { data } = await api.patch(`/v1/attorney-dashboard/leads/${leadId}/co-counsel/${workflowId}`, payload)
  return data
}

export async function acceptCaseShare(shareId: string) {
  const { data } = await api.post(`/v1/attorney-dashboard/case-shares/${shareId}/accept`)
  return data
}

export async function declineCaseShare(shareId: string) {
  const { data } = await api.post(`/v1/attorney-dashboard/case-shares/${shareId}/decline`)
  return data
}

export async function acceptLeadReferral(referralId: string) {
  const { data } = await api.post(`/v1/attorney-dashboard/referrals/${referralId}/accept`)
  return data
}

export async function declineLeadReferral(referralId: string) {
  const { data } = await api.post(`/v1/attorney-dashboard/referrals/${referralId}/decline`)
  return data
}

// Medical provider directory (lien-based providers attorneys refer clients to)
export async function getMedicalProviderDirectory(params?: {
  specialty?: string
  city?: string
  state?: string
  acceptsLien?: boolean
  isVerified?: boolean
  page?: number
  limit?: number
}) {
  const qs = new URLSearchParams()
  if (params?.specialty) qs.append('specialty', params.specialty)
  if (params?.city) qs.append('city', params.city)
  if (params?.state) qs.append('state', params.state)
  if (params?.acceptsLien !== undefined) qs.append('acceptsLien', String(params.acceptsLien))
  if (params?.isVerified !== undefined) qs.append('isVerified', String(params.isVerified))
  if (params?.page) qs.append('page', String(params.page))
  if (params?.limit) qs.append('limit', String(params.limit))
  const query = qs.toString()
  const { data } = await api.get(`/v1/medical-providers/providers${query ? `?${query}` : ''}`)
  return data
}

export async function createProviderReferral(payload: {
  leadId: string
  providerId: string
  referralType?: string
  notes?: string
}) {
  const { data } = await api.post(`/v1/medical-providers/referrals`, payload)
  return data
}

export async function updateProviderReferral(
  referralId: string,
  payload: { status?: string; notes?: string; treatmentStartDate?: string }
) {
  const { data } = await api.put(`/v1/medical-providers/referrals/${referralId}`, payload)
  return data
}

// Treatment / diagnoses / bills ledger for a referral (treatment-on-lien workflow)
export interface TreatmentRecordInput {
  visitDate: string
  visitType?: 'initial_eval' | 'follow_up' | 'procedure' | 'imaging' | 'therapy' | 'other'
  diagnosis?: string | null
  diagnosisCode?: string | null
  billedAmount?: number | null
  status?: 'scheduled' | 'completed' | 'no_show' | 'cancelled'
  notes?: string | null
}

export async function getLeadTreatmentSummary(leadId: string) {
  const { data } = await api.get(`/v1/medical-providers/leads/${leadId}/treatment-summary`)
  return data as {
    summary: {
      totalRecords: number
      completedVisits: number
      totalBilled: number
      firstVisitDate: string | null
      lastVisitDate: string | null
    }
  }
}

export async function getReferralTreatmentRecords(referralId: string) {
  const { data } = await api.get(`/v1/medical-providers/referrals/${referralId}/treatment-records`)
  return data
}

export async function createReferralTreatmentRecord(referralId: string, payload: TreatmentRecordInput) {
  const { data } = await api.post(
    `/v1/medical-providers/referrals/${referralId}/treatment-records`,
    payload
  )
  return data
}

export async function updateTreatmentRecord(recordId: string, payload: Partial<TreatmentRecordInput>) {
  const { data } = await api.put(`/v1/medical-providers/treatment-records/${recordId}`, payload)
  return data
}

export async function deleteTreatmentRecord(recordId: string) {
  const { data } = await api.delete(`/v1/medical-providers/treatment-records/${recordId}`)
  return data
}

// Medical provider referrals + Letters of Protection (treatment-on-lien workflow)
export async function getProviderReferrals(params?: { status?: string; page?: number; limit?: number }) {
  const qs = new URLSearchParams()
  if (params?.status) qs.append('status', params.status)
  if (params?.page) qs.append('page', String(params.page))
  if (params?.limit) qs.append('limit', String(params.limit))
  const query = qs.toString()
  const { data } = await api.get(`/v1/medical-providers/referrals${query ? `?${query}` : ''}`)
  return data
}

export async function getReferralLetterOfProtection(referralId: string) {
  const { data } = await api.get(`/v1/medical-providers/referrals/${referralId}/letter-of-protection`)
  return data
}

export async function generateReferralLetterOfProtection(referralId: string, content?: string) {
  const { data } = await api.post(
    `/v1/medical-providers/referrals/${referralId}/letter-of-protection`,
    content ? { content } : {}
  )
  return data
}

export async function sendLetterOfProtection(lopId: string, recipientEmail?: string) {
  const { data } = await api.post(
    `/v1/medical-providers/letters-of-protection/${lopId}/send`,
    recipientEmail ? { recipientEmail } : {}
  )
  return data
}

export async function acceptCoCounselWorkflow(workflowId: string) {
  const { data } = await api.post(`/v1/attorney-dashboard/co-counsel/${workflowId}/accept`)
  return data
}

export async function declineCoCounselWorkflow(workflowId: string) {
  const { data } = await api.post(`/v1/attorney-dashboard/co-counsel/${workflowId}/decline`)
  return data
}

export async function getComplianceSettings() {
  const { data } = await api.get('/v1/compliance/settings')
  return data
}

export async function updateComplianceSettings(payload: {
  hipaaAligned?: boolean
  soc2Ready?: boolean
  secureApis?: boolean
  notes?: string
}) {
  const { data } = await api.post('/v1/compliance/settings', payload)
  return data
}

export async function listRetentionPolicies() {
  const { data } = await api.get('/v1/compliance/retention-policies')
  return data
}

export async function createRetentionPolicy(payload: {
  entityType: string
  retentionDays: number
  action?: 'archive' | 'delete'
  enabled?: boolean
}) {
  const { data } = await api.post('/v1/compliance/retention-policies', payload)
  return data
}

export async function listEthicalWalls(assessmentId?: string) {
  const { data } = await api.get('/v1/compliance/ethical-walls', {
    params: assessmentId ? { assessmentId } : undefined
  })
  return data
}

export async function createEthicalWall(payload: {
  assessmentId: string
  blockedAttorneyId: string
  reason?: string
}) {
  const { data } = await api.post('/v1/compliance/ethical-walls', payload)
  return data
}

export async function listAuditLogs(params?: {
  limit?: number
  offset?: number
  action?: string
  entityType?: string
  search?: string
}) {
  const { data } = await api.get('/v1/compliance/audit-logs', { params })
  return data
}

export async function createManualIntake(payload: {
  template?: string
  claimType?: string
  venueState?: string
  notes?: string
}) {
  const { data } = await api.post('/v1/attorney-dashboard/intake/manual', payload)
  return data
}

export async function createCaseFromLead(payload: { leadId: string }) {
  const { data } = await api.post('/v1/attorney-dashboard/intake/from-lead', payload)
  return data
}

export async function cloneCaseTemplate(payload: { template: string; venueState?: string }) {
  const { data } = await api.post('/v1/attorney-dashboard/intake/clone-template', payload)
  return data
}

export async function importCase(payload: {
  source: string
  includeDocuments?: boolean
  includeHistory?: boolean
  includeTasks?: boolean
  includeMedical?: boolean
  notes?: string
  mapping?: Record<string, string>
  files?: File[] | { name: string; size?: number }[]
}) {
  const hasMapping = payload.mapping && Object.keys(payload.mapping).length > 0
  const hasBrowserFiles =
    typeof File !== 'undefined' &&
    Array.isArray(payload.files) &&
    payload.files.some((file) => file instanceof File)
  if (hasBrowserFiles) {
    const formData = new FormData()
    formData.append('source', payload.source)
    formData.append('includeDocuments', String(payload.includeDocuments ?? true))
    formData.append('includeHistory', String(payload.includeHistory ?? true))
    formData.append('includeTasks', String(payload.includeTasks ?? true))
    formData.append('includeMedical', String(payload.includeMedical ?? true))
    if (payload.notes) formData.append('notes', payload.notes)
    if (hasMapping) formData.append('mapping', JSON.stringify(payload.mapping))
    ;(payload.files as File[]).forEach((file) => formData.append('files', file))
    const { data } = await api.post('/v1/attorney-dashboard/intake/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  }

  const { data } = await api.post('/v1/attorney-dashboard/intake/import', payload)
  return data
}

export async function saveSmartIntakeConfig(payload: {
  dynamicQuestionnaires: boolean
  conditionalLogic: boolean
  missingInfoDetection: boolean
  autoFollowUps: boolean
}) {
  const { data } = await api.post('/v1/attorney-dashboard/intake/smart-config', payload)
  return data
}

export async function getLeadHealth(leadId: string) {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/health`)
  return data
}

export async function saveLeadHealth(leadId: string) {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/health`)
  return data
}

export async function getReminderTemplates() {
  const { data } = await api.get('/v1/attorney-dashboard/templates/reminders')
  return data
}

export async function createReminderTemplate(payload: any) {
  const { data } = await api.post('/v1/attorney-dashboard/templates/reminders', payload)
  return data
}

export async function deleteReminderTemplate(templateId: string) {
  const { data } = await api.delete(`/v1/attorney-dashboard/templates/reminders/${templateId}`)
  return data
}

export async function getLeadReminders(leadId: string) {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/reminders`)
  return data
}

export async function createLeadReminder(leadId: string, payload: any) {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/reminders`, payload)
  return data
}

export async function updateLeadReminder(leadId: string, reminderId: string, payload: any) {
  const { data } = await api.patch(`/v1/attorney-dashboard/leads/${leadId}/reminders/${reminderId}`, payload)
  return data
}

export async function deleteLeadReminder(leadId: string, reminderId: string) {
  const { data } = await api.delete(`/v1/attorney-dashboard/leads/${leadId}/reminders/${reminderId}`)
  return data
}

export async function processLeadReminders(leadId: string) {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/reminders/process`)
  return data
}

export async function getHealthRules() {
  const { data } = await api.get('/v1/attorney-dashboard/health-rules')
  return data
}

export async function createHealthRule(payload: any) {
  const { data } = await api.post('/v1/attorney-dashboard/health-rules', payload)
  return data
}

export async function deleteHealthRule(ruleId: string) {
  const { data } = await api.delete(`/v1/attorney-dashboard/health-rules/${ruleId}`)
  return data
}

export async function getWorkflowTemplates() {
  const { data } = await api.get('/v1/attorney-dashboard/templates/workflows')
  return data
}

export async function createWorkflowTemplate(payload: any) {
  const { data } = await api.post('/v1/attorney-dashboard/templates/workflows', payload)
  return data
}

export async function deleteWorkflowTemplate(templateId: string) {
  const { data } = await api.delete(`/v1/attorney-dashboard/templates/workflows/${templateId}`)
  return data
}

export async function applyWorkflowTemplate(leadId: string, templateId: string, payload?: { baseDate?: string }) {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/workflows/${templateId}/apply`, payload || {})
  return data
}

export async function getNegotiationCadenceTemplates() {
  const { data } = await api.get('/v1/attorney-dashboard/templates/negotiation-cadence')
  return data
}

export async function createNegotiationCadenceTemplate(payload: any) {
  const { data } = await api.post('/v1/attorney-dashboard/templates/negotiation-cadence', payload)
  return data
}

export async function deleteNegotiationCadenceTemplate(templateId: string) {
  const { data } = await api.delete(`/v1/attorney-dashboard/templates/negotiation-cadence/${templateId}`)
  return data
}

export async function getTaskSlaTemplates() {
  const { data } = await api.get('/v1/attorney-dashboard/templates/task-sla')
  return data
}

export async function createTaskSlaTemplate(payload: any) {
  const { data } = await api.post('/v1/attorney-dashboard/templates/task-sla', payload)
  return data
}

export async function deleteTaskSlaTemplate(templateId: string) {
  const { data } = await api.delete(`/v1/attorney-dashboard/templates/task-sla/${templateId}`)
  return data
}

export async function getRecurringInvoices(leadId: string) {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/recurring-invoices`)
  return data
}

export async function createRecurringInvoice(leadId: string, payload: any) {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/recurring-invoices`, payload)
  return data
}

export async function updateRecurringInvoice(leadId: string, recurringId: string, payload: any) {
  const { data } = await api.patch(`/v1/attorney-dashboard/leads/${leadId}/recurring-invoices/${recurringId}`, payload)
  return data
}

export async function deleteRecurringInvoice(leadId: string, recurringId: string) {
  const { data } = await api.delete(`/v1/attorney-dashboard/leads/${leadId}/recurring-invoices/${recurringId}`)
  return data
}

export async function processRecurringInvoices(leadId: string) {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/recurring-invoices/process`)
  return data
}

export async function regenerateLeadAnalysis(assessmentId: string) {
  const { data } = await api.post(`/v1/chatgpt/analyze/${assessmentId}`)
  return data
}

// Admin API functions
export async function getAdminStats() {
  const { data } = await api.get('/v1/admin/stats')
  return data
}

export interface AdminSmsStatus {
  configured: boolean
  provider: string
  region: string
  originationNumber: string | null
}

export async function getAdminSmsStatus(): Promise<AdminSmsStatus> {
  const { data } = await api.get<AdminSmsStatus>('/v1/admin/sms/status')
  return data
}

export async function sendAdminTestSms(phone: string, message?: string): Promise<{ ok: boolean }> {
  const { data } = await api.post('/v1/admin/sms/test', { phone, message })
  return data
}

export interface AdminIntakeLead {
  id: string
  email: string | null
  phone: string | null
  injuryType: string | null
  venueState: string | null
  venueCounty: string | null
  currentStep: string | null
  status: 'in_progress' | 'completed'
  assessmentId: string | null
  userId: string | null
  abandonmentEmailedAt: string | null
  createdAt: string
  updatedAt: string
}

export async function getAdminIntakeLeads(params?: { status?: 'in_progress' | 'completed' | 'abandoned'; limit?: number }): Promise<AdminIntakeLead[]> {
  const { data } = await api.get('/v1/admin/intake-leads', { params })
  return Array.isArray(data?.data) ? data.data : []
}

export async function getAdminAnalytics(days?: number) {
  const params = days ? { days } : {}
  const { data } = await api.get('/v1/admin/analytics', { params })
  return data
}

export interface AdminRoutingFeedbackSummary {
  periodDays: number
  totals: {
    decisionMemories: number
    outcomesRecorded: number
    overrides: number
    overrideRate: number
    averageRecommendedConfidence: number
  }
  recommendations: Record<string, number>
  attorneyDecisions: Record<string, number>
  outcomes: Record<string, number>
  analyticsByEvent: Record<string, number>
}

export interface AdminRoutingFeedbackCandidate {
  id: string
  leadId: string
  assessmentId: string
  attorney?: { id: string; name?: string; email?: string }
  assessment?: { id: string; claimType?: string; venueState?: string; venueCounty?: string | null }
  lead?: { id: string; status?: string; lifecycleState?: string; score?: number | null }
  recommendation: {
    decision?: string
    confidence?: number
    rationale?: string | null
    data?: Record<string, unknown> | null
  }
  actualDecision?: string | null
  attorneyRationale?: string | null
  override?: boolean
  outcomeStatus?: string | null
  outcomeNotes?: string | null
  decisionAt?: string | null
  outcomeAt?: string | null
  createdAt?: string
}

export interface AdminRoutingFeedbackExport {
  count: number
  exportedAt: string
  records: Array<Record<string, unknown>>
}

export async function getAdminRoutingFeedbackSummary(days = 30) {
  const { data } = await api.get<AdminRoutingFeedbackSummary>('/v1/admin/routing-feedback/summary', {
    params: { days },
  })
  return data
}

export async function getAdminRoutingFeedbackCandidates(params?: {
  limit?: number
  overrideOnly?: boolean
  outcomeStatus?: string
}) {
  const search = new URLSearchParams()
  if (params?.limit) search.append('limit', String(params.limit))
  if (params?.overrideOnly) search.append('overrideOnly', 'true')
  if (params?.outcomeStatus) search.append('outcomeStatus', params.outcomeStatus)
  const { data } = await api.get<{ candidates: AdminRoutingFeedbackCandidate[] }>(
    `/v1/admin/routing-feedback/candidates?${search.toString()}`
  )
  return data
}

export async function getAdminRoutingFeedbackExport(params?: {
  limit?: number
  withOutcomeOnly?: boolean
}) {
  const search = new URLSearchParams()
  if (params?.limit) search.append('limit', String(params.limit))
  if (params?.withOutcomeOnly === false) search.append('withOutcomeOnly', 'false')
  const { data } = await api.get<AdminRoutingFeedbackExport>(
    `/v1/admin/routing-feedback/export?${search.toString()}`
  )
  return data
}

export async function createAdminRoutingRetrainingRequest(payload: {
  notes: string
  filters?: Record<string, unknown>
  sampleSize?: number
}) {
  const { data } = await api.post('/v1/admin/routing-feedback/retraining-request', payload)
  return data
}

export interface MatchingRulesConfig {
  routingEnabled: boolean
  maxAttorneysWave1: number
  maxAttorneysWave2: number
  maxAttorneysWave3: number
  defaultAttorneyResponseDeadlineMinutes: number
  defaultAttorneyResponseDeadlineHours?: number
  wave1WaitHours: number
  wave2WaitHours: number
  wave3WaitHours: number
  preRoutingGateMode: 'conservative' | 'balanced' | 'growth' | 'custom'
  gateFailureAction: 'manual_review' | 'needs_more_info' | 'not_routable_yet'
  minCaseScore: number
  minEvidenceScore: number
  supportedJurisdictions: string[]
  supportedClaimTypes: string[]
  claimTypeGateOverrides: Array<{
    claimType: string
    minCaseScore?: number
    minEvidenceScore?: number
    action?: 'manual_review' | 'needs_more_info' | 'not_routable_yet'
  }>
  stateGateOverrides: Array<{
    state: string
    minCaseScore?: number
    minEvidenceScore?: number
    action?: 'manual_review' | 'needs_more_info' | 'not_routable_yet'
  }>
  jurisdictionGateOverrides: Array<{
    state: string
    jurisdiction: string
    minCaseScore?: number
    minEvidenceScore?: number
    action?: 'manual_review' | 'needs_more_info' | 'not_routable_yet'
  }>
  minValueThreshold: number
  geographicExpansionRadiusMiles: number
  routingFeePaymentsEnabled: boolean
  caseRoutingPricingTiers: Array<{
    id: string
    label: string
    priceCents: number
    caseTypes: string[]
    description: string
    enabled: boolean
  }>
  jurisdiction_fit: number
  case_type_fit: number
  economic_fit: number
  response_score: number
  conversion_score: number
  capacity_score: number
  plaintiff_fit: number
  strategic_priority: number
  qualityGateMaxResponseHours: number
  qualityGateHotCaseMaxResponseHours: number
  qualityGateHotCaseViabilityThreshold: number
  qualityGateMinContactRate: number
  qualityGateMaxComplaintRate: number
  qualityGateMaxCherryPickingScore: number
}

export async function getAdminMatchingRules() {
  const { data } = await api.get<MatchingRulesConfig>('/v1/admin/matching-rules')
  return data
}

export async function saveAdminMatchingRules(config: Partial<MatchingRulesConfig>) {
  const { data } = await api.put<MatchingRulesConfig>('/v1/admin/matching-rules', config)
  return data
}

export async function getAdminHeuristics() {
  const { data } = await api.get<HeuristicsConfig>('/v1/admin/heuristics')
  return data
}

export async function saveAdminHeuristics(config: Partial<HeuristicsConfig>) {
  const { data } = await api.put<HeuristicsConfig>('/v1/admin/heuristics', config)
  return data
}

export async function getHeuristics() {
  const { data } = await api.get<HeuristicsConfig>('/v1/heuristics')
  return data
}

export async function getAdminFieldMappings() {
  const { data } = await api.get<FieldMappingsConfig>('/v1/admin/field-mappings')
  return data
}

export async function saveAdminFieldMappings(config: FieldMappingsConfig) {
  const { data } = await api.put<FieldMappingsConfig>('/v1/admin/field-mappings', config)
  return data
}

export async function getAdminManualReviewQueue() {
  const { data } = await api.get('/v1/admin/manual-review')
  return data
}

export async function manualReviewAction(caseId: string, action: 'release' | 'reject' | 'request_info' | 'compliance', note?: string) {
  const { data } = await api.post(`/v1/admin/manual-review/${caseId}/action`, { action, note })
  return data
}

export async function holdCaseForManualReview(caseId: string, reason: string, note?: string) {
  const { data } = await api.post(`/v1/admin/manual-review/${caseId}/hold`, { reason, note })
  return data
}

export async function getAdminQueueCases() {
  const { data } = await api.get('/v1/admin/cases/queue')
  return data
}

export async function getAdminRoutingQueue() {
  const { data } = await api.get('/v1/admin/routing-queue')
  return data
}

export async function getAdminCaseDetail(caseId: string) {
  const { data } = await api.get(`/v1/admin/cases/${caseId}`)
  return data
}

export async function getAdminAttorneyDetail(attorneyId: string) {
  const { data } = await api.get(`/v1/admin/attorneys/${attorneyId}`)
  return data
}

export async function getAllAdminCases(
  paramsOrStatus?: {
    status?: string
    claimType?: string
    state?: string
    county?: string
    routingStatus?: string
    /** ISO-8601 day or use `createdToday` for server-local midnight filter */
    createdToday?: boolean
    limit?: number
    offset?: number
  } | string
) {
  const search = new URLSearchParams()
  if (typeof paramsOrStatus === 'string') {
    if (paramsOrStatus) search.append('status', paramsOrStatus)
  } else if (paramsOrStatus) {
    if (paramsOrStatus.status) search.append('status', paramsOrStatus.status)
    if (paramsOrStatus.claimType) search.append('claimType', paramsOrStatus.claimType)
    if (paramsOrStatus.state) search.append('state', paramsOrStatus.state)
    if (paramsOrStatus.county) search.append('county', paramsOrStatus.county)
    if (paramsOrStatus.routingStatus) search.append('routingStatus', paramsOrStatus.routingStatus)
    if (paramsOrStatus.createdToday) search.append('createdToday', '1')
    if (paramsOrStatus.limit) search.append('limit', paramsOrStatus.limit.toString())
    if (paramsOrStatus.offset) search.append('offset', paramsOrStatus.offset.toString())
  }

  const { data } = await api.get(`/v1/admin/cases/all?${search.toString()}`)
  return data
}

// Bulk route cases to attorney (pass attorneyId or attorneyEmail)
export async function bulkRouteCases(
  caseIds: string[],
  attorneyIdOrEmail?: string,
  message?: string,
  options?: { skipEligibilityCheck?: boolean; autoRoute?: boolean; inviteIfMissing?: boolean }
) {
  const isEmail = attorneyIdOrEmail?.includes('@')
  const payload: Record<string, unknown> = {
    caseIds,
    message,
    skipEligibilityCheck: options?.skipEligibilityCheck,
    autoRoute: options?.autoRoute,
    inviteIfMissing: options?.inviteIfMissing,
  }
  if (isEmail) {
    payload.attorneyEmail = attorneyIdOrEmail
  } else if (attorneyIdOrEmail) {
    payload.attorneyId = attorneyIdOrEmail
  }
  const { data } = await api.post('/v1/admin/cases/route', payload)
  return data
}

// Get all attorneys for routing
export async function getAdminAttorneys() {
  const { data } = await api.get('/v1/admin/attorneys')
  return data
}

export async function getAdminAttorneyRecommendations(caseId: string, limit = 5) {
  const { data } = await api.get(`/v1/admin/cases/${caseId}/recommendations?limit=${limit}`)
  return data
}

export async function runAdminRouteEngine(caseId: string, payload?: {
  maxAttorneysPerWave?: number
  skipPreRoutingGate?: boolean
  dryRun?: boolean
}) {
  const { data } = await api.post(`/v1/admin/cases/${caseId}/route-engine`, payload || {})
  return data
}

// Diagnostic: verify routing state for a case (admin debugging)
export async function getAdminCaseRoutingState(caseId: string, attorneyEmail?: string) {
  const params = attorneyEmail ? `?attorneyEmail=${encodeURIComponent(attorneyEmail)}` : ''
  const { data } = await api.get(`/v1/admin/cases/${caseId}/routing-state${params}`)
  return data
}

/** Debug why routed cases don't show on attorney dashboard. Call with attorney email, e.g. aaron.gomez31@lawfirm.com */
export async function getAdminAttorneyDebug(email: string) {
  const { data } = await api.get(`/v1/admin/attorney-debug?email=${encodeURIComponent(email)}`)
  return data
}

export async function getAdminUsers() {
  const { data } = await api.get('/v1/admin/users')
  return data
}

export async function updateAdminUserRole(userId: string, role: string) {
  const { data } = await api.patch(`/v1/admin/users/${userId}/role`, { role })
  return data
}

export async function getAdminFeatureToggles() {
  const { data } = await api.get('/v1/admin/feature-toggles')
  return data
}

export async function createAdminFeatureToggle(payload: {
  key: string
  description?: string
  enabled?: boolean
  scope?: 'global' | 'firm' | 'user'
  lawFirmId?: string
  userId?: string
}) {
  const { data } = await api.post('/v1/admin/feature-toggles', payload)
  return data
}

export async function updateAdminFeatureToggle(id: string, payload: {
  key?: string
  description?: string
  enabled?: boolean
  scope?: 'global' | 'firm' | 'user'
  lawFirmId?: string
  userId?: string
}) {
  const { data } = await api.patch(`/v1/admin/feature-toggles/${id}`, payload)
  return data
}

export async function getAdminFirmSettings(lawFirmId: string) {
  const { data } = await api.get(`/v1/admin/firm-settings/${lawFirmId}`)
  return data
}

export async function upsertAdminFirmSetting(lawFirmId: string, payload: { key: string; value: any }) {
  const { data } = await api.put(`/v1/admin/firm-settings/${lawFirmId}`, payload)
  return data
}

export async function getAdminFirms() {
  const { data } = await api.get('/v1/admin/firms')
  return data
}

// Phase 2: Admin Communications
export async function getAdminNotifications(params?: {
  role?: string
  status?: string
  channel?: string
  failed24h?: boolean
  limit?: number
}) {
  const search = new URLSearchParams()
  if (params?.role) search.append('role', params.role)
  if (params?.status) search.append('status', params.status)
  if (params?.channel) search.append('channel', params.channel)
  if (params?.failed24h) search.append('failed24h', 'true')
  if (params?.limit) search.append('limit', params.limit.toString())
  const { data } = await api.get(`/v1/admin/communications/notifications?${search.toString()}`)
  return data
}

export async function getAdminFailedNotifications(params?: {
  channel?: string
  eventType?: string
  retryExhausted?: boolean
}) {
  const search = new URLSearchParams()
  if (params?.channel) search.append('channel', params.channel)
  if (params?.eventType) search.append('eventType', params.eventType)
  if (params?.retryExhausted) search.append('retryExhausted', 'true')
  const { data } = await api.get(`/v1/admin/communications/notifications/failed?${search.toString()}`)
  return data
}

export async function resendAdminNotification(id: string, switchChannel?: string) {
  const { data } = await api.post(`/v1/admin/communications/notifications/${id}/resend`, {
    switchChannel,
  })
  return data
}

export async function markNotificationResolved(id: string) {
  const { data } = await api.post(`/v1/admin/communications/notifications/${id}/mark-resolved`)
  return data
}

export async function getAdminSupportTickets(params?: {
  status?: string
  priority?: string
  category?: string
}) {
  const search = new URLSearchParams()
  if (params?.status) search.append('status', params.status)
  if (params?.priority) search.append('priority', params.priority)
  if (params?.category) search.append('category', params.category)
  const { data } = await api.get(`/v1/admin/communications/support-tickets?${search.toString()}`)
  return data
}

export async function getAdminSupportTicket(id: string) {
  const { data } = await api.get(`/v1/admin/communications/support-tickets/${id}`)
  return data
}

export async function createAdminSupportTicket(payload: {
  caseId?: string
  userId?: string
  attorneyId?: string
  role: string
  category: string
  subject: string
  description: string
  priority?: string
}) {
  const { data } = await api.post('/v1/admin/communications/support-tickets', payload)
  return data
}

export async function updateAdminSupportTicket(
  id: string,
  payload: { status?: string; assignedAdminId?: string; priority?: string; resolutionNotes?: string }
) {
  const { data } = await api.patch(`/v1/admin/communications/support-tickets/${id}`, payload)
  return data
}

export async function replyAdminSupportTicket(id: string, body: string) {
  const { data } = await api.post(`/v1/admin/communications/support-tickets/${id}/messages`, {
    body,
  })
  return data
}

export async function getAdminRoutingAlerts() {
  const { data } = await api.get('/v1/admin/communications/routing-alerts')
  return data
}

export type AdminDocumentPipelineStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'needs_review' | 'ready' | 'approved' | 'not_ready' | 'not_applicable'

export interface AdminDocumentItem {
  id: string
  originalName: string
  mimetype: string
  size: number
  fileUrl: string
  category: string
  subcategory?: string | null
  dataType: string
  description?: string | null
  processingStatus: string
  ocrStatus: AdminDocumentPipelineStatus
  extractionStatus: AdminDocumentPipelineStatus
  chronologyStatus: AdminDocumentPipelineStatus
  billExtractionStatus: AdminDocumentPipelineStatus
  aiSummary?: string | null
  aiClassification?: string | null
  aiHighlights: string[]
  ocrPreview: string
  extractedData?: {
    id: string
    icdCodes: string[]
    cptCodes: string[]
    dollarAmounts: string[]
    totalAmount?: number | null
    currency: string
    dates: string[]
    keywords: string[]
    confidence: number
    isManualReview: boolean
    updatedAt: string
  } | null
  latestJob?: {
    id: string
    jobType: string
    status: string
    errorMessage?: string | null
    createdAt: string
    completedAt?: string | null
  } | null
  case?: {
    id: string
    claimType: string
    venueState: string
    venueCounty?: string | null
    status: string
  } | null
  plaintiff?: {
    id: string
    email: string
    name: string
  } | null
  createdAt: string
  updatedAt: string
}

export async function getAdminDocuments(params?: {
  status?: string
  category?: string
  assessmentId?: string
  query?: string
  limit?: number
  offset?: number
}) {
  const search = new URLSearchParams()
  if (params?.status) search.append('status', params.status)
  if (params?.category) search.append('category', params.category)
  if (params?.assessmentId) search.append('assessmentId', params.assessmentId)
  if (params?.query) search.append('query', params.query)
  if (params?.limit) search.append('limit', String(params.limit))
  if (params?.offset) search.append('offset', String(params.offset))
  const { data } = await api.get<{
    documents: AdminDocumentItem[]
    summary: Record<string, any>
    total: number
    limit: number
    offset: number
  }>(`/v1/admin/documents?${search.toString()}`)
  return data
}

export async function reprocessAdminDocument(fileId: string) {
  const { data } = await api.post<{ ok: boolean; document: AdminDocumentItem }>(`/v1/admin/documents/${fileId}/reprocess`)
  return data
}

export async function correctAdminDocumentExtraction(fileId: string, payload: {
  category?: string
  subcategory?: string | null
  aiSummary?: string | null
  extractedData?: {
    icdCodes?: string[]
    cptCodes?: string[]
    dollarAmounts?: string[]
    totalAmount?: number | null
    dates?: string[]
    keywords?: string[]
    confidence?: number
  }
}) {
  const { data } = await api.patch<{ ok: boolean; document: AdminDocumentItem }>(
    `/v1/admin/documents/${fileId}/extracted-data`,
    payload,
  )
  return data
}

export async function approveAdminDocumentChronology(fileId: string) {
  const { data } = await api.post<{ ok: boolean; document: AdminDocumentItem }>(
    `/v1/admin/documents/${fileId}/approve-chronology`,
  )
  return data
}

// User-facing support tickets (plaintiff/attorney)
export async function createSupportTicket(payload: {
  caseId?: string
  category: string
  subject: string
  description: string
  priority?: string
}) {
  const { data } = await api.post('/v1/support-tickets', payload)
  return data
}

export async function getMySupportTickets() {
  const { data } = await api.get('/v1/support-tickets')
  return data
}

export async function getSupportTicket(id: string) {
  const { data } = await api.get(`/v1/support-tickets/${id}`)
  return data
}

export async function replySupportTicket(id: string, body: string) {
  const { data } = await api.post(`/v1/support-tickets/${id}/messages`, { body })
  return data
}

// Get firm dashboard for current attorney's firm
export async function getFirmDashboard() {
  const { data } = await api.get('/v1/firm-dashboard')
  return data
}

// Update the current user's firm profile/settings (firm-admin only)
export async function updateFirm(payload: {
  name?: string
  primaryEmail?: string | null
  phone?: string | null
  website?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
}) {
  const { data } = await api.put('/v1/firm-dashboard', payload)
  return data
}

export async function addFirmAttorney(payload: {
  email: string
  name?: string
  firstName?: string
  middleName?: string
  lastName?: string
  specialties?: string[]
  venues?: string[]
  jurisdictions?: Array<{ state: string; counties?: string[] }>
  officeId?: string
}) {
  const { data } = await api.post('/v1/firm-dashboard/attorneys', payload)
  return data
}

export async function updateFirmMember(memberId: string, payload: { officeId?: string | null }) {
  const { data } = await api.patch(`/v1/firm-dashboard/members/${memberId}`, payload)
  return data
}

export async function addFirmMember(payload: {
  email: string
  firstName?: string
  lastName?: string
  role: string
  title?: string
  officeId?: string
  specialties?: string[]
  venues?: string[]
  jurisdictions?: Array<{ state: string; counties?: string[] }>
}) {
  const { data } = await api.post('/v1/firm-dashboard/members', payload)
  return data
}

export async function addFirmOffice(payload: {
  name: string
  city?: string
  state?: string
  address?: string
  phone?: string
  countiesServed?: string[]
  languages?: string[]
  practiceAreas?: string[]
  capacity?: number
}) {
  const { data } = await api.post('/v1/firm-dashboard/offices', payload)
  return data
}

export async function addFirmTeam(payload: {
  name: string
  teamType?: string
  description?: string
  officeId?: string
}) {
  const { data } = await api.post('/v1/firm-dashboard/teams', payload)
  return data
}

export async function addFirmTeamMember(teamId: string, payload: { firmMemberId: string; role?: 'lead' | 'member' }) {
  const { data } = await api.post(`/v1/firm-dashboard/teams/${teamId}/members`, payload)
  return data
}

export async function removeFirmTeamMember(teamId: string, firmMemberId: string) {
  const { data } = await api.delete(`/v1/firm-dashboard/teams/${teamId}/members/${firmMemberId}`)
  return data
}

// --- Firm direct messages (attorney↔colleague DMs, not case-scoped) ---
export interface FirmColleague {
  userId: string
  name: string
  email: string | null
  role: string
  title: string | null
  isAttorney: boolean
  lastMessage: { body: string; at: string; fromMe: boolean } | null
  lastMessageAt: string | null
  unreadCount: number
}

export interface FirmDirectMessage {
  id: string
  body: string
  at: string
  fromMe: boolean
}

export async function getFirmColleagues(): Promise<{ colleagues: FirmColleague[]; unreadTotal: number }> {
  const { data } = await api.get('/v1/firm-dashboard/colleagues')
  return data
}

export async function getFirmDirectMessageUnread(): Promise<{ count: number }> {
  const { data } = await api.get('/v1/firm-dashboard/direct-messages/unread-count')
  return data
}

export async function getFirmDirectMessages(userId: string): Promise<{ colleague: { userId: string; name: string; email: string | null; role: string }; messages: FirmDirectMessage[] }> {
  const { data } = await api.get(`/v1/firm-dashboard/direct-messages/${userId}`)
  return data
}

export async function sendFirmDirectMessage(userId: string, body: string): Promise<{ message: FirmDirectMessage }> {
  const { data } = await api.post(`/v1/firm-dashboard/direct-messages/${userId}`, { body })
  return data
}

// --- Firm activity inbox (@mentions + recent case discussion) ---
export interface ActivityItem {
  id: string
  author: string
  snippet: string
  threadTitle: string
  caseName: string
  claimType: string | null
  leadId: string | null
  link: string | null
  at: string
}

export async function getFirmActivity(): Promise<{ mentions: ActivityItem[]; discussion: ActivityItem[] }> {
  const { data } = await api.get('/v1/attorney-dashboard/activity')
  return data
}

export async function assignFirmCase(assessmentId: string, payload: {
  role: string
  assignedUserId?: string
  assignedAttorneyId?: string
  notes?: string
  dueDate?: string
}) {
  const { data } = await api.post(`/v1/firm-dashboard/cases/${assessmentId}/assignments`, payload)
  return data
}

// Move a case to a different office (or unassign with officeId: null).
export async function setCaseOffice(assessmentId: string, officeId: string | null) {
  const { data } = await api.patch(`/v1/firm-dashboard/cases/${assessmentId}/office`, { officeId })
  return data
}

export async function updateFirmAttorney(attorneyId: string, payload: {
  firstName?: string
  middleName?: string
  lastName?: string
  specialties?: string[]
  venues?: string[]
  jurisdictions?: Array<{ state: string; counties?: string[] }>
}) {
  const { data } = await api.put(`/v1/firm-dashboard/attorneys/${attorneyId}`, payload)
  return data
}