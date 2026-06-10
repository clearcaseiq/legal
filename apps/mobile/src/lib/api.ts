/**
 * ClearCaseIQ API client for attorney mobile app.
 * Uses SecureStore for auth token (biometric-protected).
 */
import type { AttorneyCalendarEvent } from './calendar'
import { normalizeScore } from './formatLead'
import axios, { isAxiosError, type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import * as SecureStore from 'expo-secure-store'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import type { AttorneyDashboardResponse } from '../../../../shared/api-contracts'

function resolveApiUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim()
  if (configured) return configured

  if (!__DEV__) {
    return 'https://api.clearcaseiq.com'
  }

  // Android emulators cannot reach the host machine via localhost.
  if (__DEV__ && Platform.OS === 'android' && !Device.isDevice) {
    return 'http://10.0.2.2:4000'
  }

  return 'http://localhost:4000'
}

export const API_URL = resolveApiUrl()

export function toAbsoluteApiUrl(url: string) {
  if (!url) return API_URL
  if (/^https?:\/\//i.test(url)) return url
  return `${API_URL}${url.startsWith('/') ? url : `/${url}`}`
}

export function getApiTroubleshootingMessage() {
  if (Device.isDevice && /localhost|127\.0\.0\.1/i.test(API_URL)) {
    return (
      'This phone cannot reach localhost. Set EXPO_PUBLIC_API_URL to your computer LAN IP ' +
      '(for example http://192.168.1.50:4000), then restart Expo.'
    )
  }
  if (__DEV__ && Platform.OS === 'android' && /10\.0\.2\.2/i.test(API_URL)) {
    return 'Android emulator mode detected. API requests are using 10.0.2.2 to reach your computer.'
  }
  return `API base URL: ${API_URL}`
}

let unauthorizedHandler: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler
}

type MobileSessionRole = 'attorney' | 'plaintiff'
type RetryableRequestConfig = InternalAxiosRequestConfig & { _retriedAuth?: boolean }

if (__DEV__ && Device.isDevice && /localhost|127\.0\.0\.1/i.test(API_URL)) {
  // eslint-disable-next-line no-console
  console.warn(
    '[ClearCaseIQ] EXPO_PUBLIC_API_URL points to localhost on a physical device — the phone cannot reach your PC. ' +
      'Set apps/mobile/.env to http://<YOUR_PC_LAN_IP>:4000 (see ipconfig), then restart Expo.'
  )
}

/** Attorney dashboard runs heavy queries; 30s is often too short on device/Wi‑Fi. */
export const api = axios.create({
  baseURL: API_URL,
  timeout: 120_000,
  headers: { 'Content-Type': 'application/json' },
})

/** User-facing message for failed API calls (timeouts, DNS, wrong host, etc.). */
/**
 * True when an error looks like a connectivity failure (no server response),
 * as opposed to a 4xx/5xx the server actually returned. Used by the offline queue.
 */
export function isOfflineError(err: unknown): boolean {
  if (!isAxiosError(err)) return false
  const e = err as AxiosError
  if (e.response) return false
  const msg = (e.message || '').toLowerCase()
  return (
    e.code === 'ERR_NETWORK' ||
    e.code === 'ECONNABORTED' ||
    msg.includes('network error') ||
    msg.includes('timeout')
  )
}

export function getApiErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const e = err as AxiosError<{ error?: string }>
    const server = e.response?.data && typeof e.response.data === 'object' ? e.response.data.error : undefined
    if (typeof server === 'string' && server.trim()) {
      if (
        e.response?.status === 401 &&
        /invalid credentials/i.test(server) &&
        API_URL.includes('api.clearcaseiq.com')
      ) {
        return (
          `${server} If the website works on your computer but this app does not, the site may be using a local ` +
          'development API while this build uses production. Use production credentials or ask an admin to reset your password on production.'
        )
      }
      return server
    }
    const msg = (e.message || '').toLowerCase()
    if (e.code === 'ECONNABORTED' || msg.includes('timeout')) {
      return (
        'Request timed out. Check your connection. On a physical phone, set EXPO_PUBLIC_API_URL to your PC LAN IP ' +
        '(not localhost) and ensure the API is running and reachable from Wi‑Fi.'
      )
    }
    if (e.code === 'ERR_NETWORK' || e.message === 'Network Error') {
      return (
        'Cannot reach the API. Confirm EXPO_PUBLIC_API_URL (LAN IP on a real device), VPN/firewall, and that the server is up.'
      )
    }
    if (e.message) return e.message
  }
  if (err instanceof Error && err.message) return err.message
  return 'Something went wrong. Try again.'
}

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

function isAuthCredentialRequest(url: string) {
  return (
    url.includes('/v1/auth/login') ||
    url.includes('/v1/auth/attorney-login') ||
    url.includes('/v1/auth/register')
  )
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const config = error.config as RetryableRequestConfig | undefined
      const method = String(config?.method || '').toLowerCase()
      const url = String(config?.url || '')
      const isSessionProbe = url.includes('/v1/auth/me')

      // Do not clear stored session on failed sign-in attempts.
      if (isAuthCredentialRequest(url)) {
        return Promise.reject(error)
      }

      if (config && method === 'get' && !isSessionProbe && !config._retriedAuth) {
        config._retriedAuth = true
        return api.request(config)
      }

      await SecureStore.deleteItemAsync('auth_token')
      await SecureStore.deleteItemAsync('user')
      await SecureStore.deleteItemAsync('session_role')
      unauthorizedHandler?.()
    }
    return Promise.reject(error)
  }
)

/** Match web attorney login: trim + lowercase for consistent DB lookup. */
export function normalizeAuthEmail(email: string) {
  return email.trim().toLowerCase()
}

// Auth — attorney app uses the same endpoint as web /login/attorney
export async function loginUser(email: string, password: string) {
  const normalizedEmail = normalizeAuthEmail(email)
  const response = await api.post('/v1/auth/attorney-login', {
    email: normalizedEmail,
    password,
  })
  const data = response.data

  await SecureStore.setItemAsync('auth_token', data.token)
  await SecureStore.setItemAsync('user', JSON.stringify(data.user))
  await SecureStore.setItemAsync('session_role', 'attorney')
  return {
    ...data,
    role: 'attorney' as MobileSessionRole,
  }
}

export async function getCurrentUser() {
  const { data } = await api.get('/v1/auth/me')
  return data
}

export async function logout() {
  await SecureStore.deleteItemAsync('auth_token')
  await SecureStore.deleteItemAsync('user')
  await SecureStore.deleteItemAsync('session_role')
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await SecureStore.getItemAsync('auth_token')
  return !!token
}

// Attorney Dashboard / Leads
export async function getAttorneyDashboard(): Promise<AttorneyDashboardResponse> {
  const { data } = await api.get('/v1/attorney-dashboard/dashboard')
  return data
}

export type FilteredLeadParams = {
  status?: string
  minScore?: number
  claimType?: string
  state?: string
  sortBy?: 'score' | 'newest' | 'deadline' | 'value'
}

export async function getFilteredAttorneyLeads(params: FilteredLeadParams = {}) {
  const { data } = await api.get('/v1/attorney-dashboard/leads/filtered', { params })
  return data
}

export async function updateLeadReminder(leadId: string, reminderId: string, payload: any) {
  const { data } = await api.patch(`/v1/attorney-dashboard/leads/${leadId}/reminders/${reminderId}`, payload)
  return data
}

export async function getPlaintiffCaseDashboard() {
  const { data } = await api.get('/v1/case-tracker/dashboard')
  return data
}

export async function getPlaintiffAssessment(assessmentId: string) {
  const { data } = await api.get(`/v1/assessments/${assessmentId}`)
  return data
}

export async function predictAssessment(assessmentId: string) {
  const { data } = await api.post('/v1/predict', { assessmentId })
  return data
}

export async function getPlaintiffCasePreparation(assessmentId: string) {
  const { data } = await api.get(`/v1/case-insights/assessments/${assessmentId}/case-preparation`)
  return data
}

export async function getPlaintiffSettlementBenchmarks(assessmentId: string) {
  const { data } = await api.get(`/v1/case-insights/assessments/${assessmentId}/settlement-benchmarks`)
  return data.benchmarks
}

export async function calculateCaseSOL(incidentDate: string, venue: { state: string; county?: string }, claimType: string) {
  const { data } = await api.post('/v1/sol/calculate', { incidentDate, venue, claimType })
  return data
}

export type PlaintiffDocumentRequestRow = {
  id: string
  leadId: string | null
  attorney?: { id: string; name?: string | null; email?: string | null } | null
  requestedDocs: string[]
  items: Array<{ key: string; label: string; fulfilled: boolean }>
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
  requests: PlaintiffDocumentRequestRow[]
}> {
  const { data } = await api.get(`/v1/assessments/${assessmentId}/document-requests`)
  return data
}

export type PlaintiffChatRoom = {
  id: string
  attorney?: {
    id?: string
    name?: string | null
    email?: string | null
    profile?: unknown
  } | null
  assessment?: {
    id?: string
    claimType?: string | null
    venueState?: string | null
  } | null
  messages?: Array<{
    id?: string
    content?: string
    senderType?: string
    createdAt?: string
    isRead?: boolean
  }>
  status?: string
  lastMessageAt?: string | null
  createdAt?: string
}

export type PlaintiffTimelineEvent = {
  id: string
  type: string
  title: string
  description: string
  date: string
  status: string
}

export async function getPlaintiffChatRooms(): Promise<PlaintiffChatRoom[]> {
  const { data } = await api.get('/v1/messaging/chat-rooms')
  return Array.isArray(data) ? data : []
}

export async function getPlaintiffChatMessages(chatRoomId: string, limit = 80, offset = 0) {
  const { data } = await api.get(`/v1/messaging/chat-room/${chatRoomId}/messages?limit=${limit}&offset=${offset}`)
  return data
}

export async function sendPlaintiffMessage(chatRoomId: string, content: string) {
  const { data } = await api.post('/v1/messaging/send', { chatRoomId, content })
  return data
}

export async function markPlaintiffChatRead(chatRoomId: string) {
  const { data } = await api.put(`/v1/messaging/chat-room/${chatRoomId}/read`)
  return data
}

export async function getPlaintiffCaseTimeline(caseId: string): Promise<PlaintiffTimelineEvent[]> {
  const { data } = await api.get(`/v1/case-tracker/case/${caseId}/timeline`)
  return Array.isArray(data) ? data : []
}

export async function uploadEvidenceFile(formData: FormData) {
  const { data } = await api.post('/v1/evidence/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return data
}

export async function deleteEvidenceFile(fileId: string) {
  const { data } = await api.delete(`/v1/evidence/${fileId}`)
  return data
}

export async function decideLead(
  leadId: string,
  decision: 'accept' | 'reject',
  notes?: string,
  declineReason?: string
) {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/decision`, {
    decision,
    notes,
    declineReason,
  })
  return data
}

export async function getLeadDetails(leadId: string) {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}`)
  return data
}

export type LeadQualityDetails = {
  qualityScore?: number
  readinessScore?: number
  viabilityBreakdown?: {
    overall?: number
    liability?: number
    causation?: number
    damages?: number
  }
  demandReadiness?: {
    score?: number
    label?: string
    nextAction?: { title?: string; detail?: string; actionType?: string }
  }
  strengths?: string[]
  risks?: string[]
  missingItems?: Array<{ label?: string; detail?: string; actionType?: string }>
  recommendation?: {
    decision?: string
    confidence?: number
    rationale?: string
  }
  evidenceChecklist?: {
    required?: Array<{ name?: string; label?: string; uploaded?: boolean; critical?: boolean; category?: string }>
  }
  conflicts?: Array<{ id?: string; conflictType?: string; riskLevel?: string; isResolved?: boolean; details?: string }>
  sol?: { isUrgent?: boolean; daysUntilExpiration?: number; daysRemaining?: number; deadline?: string; expiresAt?: string }
}

/**
 * Admin-configurable lead-signal thresholds (subset of /v1/heuristics).
 * Defaults mirror the backend so the UI keeps working before/without a fetch.
 */
export type LeadSignalHeuristics = {
  liabilityStrongMin: number
  liabilityWeakMax: number
  damagesStrongMin: number
  damagesWeakMax: number
  reviewDecisionMin: number
}

const DEFAULT_LEAD_SIGNALS: LeadSignalHeuristics = {
  liabilityStrongMin: 0.65,
  liabilityWeakMax: 0.45,
  damagesStrongMin: 0.65,
  damagesWeakMax: 0.45,
  reviewDecisionMin: 0.6,
}

const DEFAULT_RESPONSE_SLA_HOURS = 24

let cachedLeadSignals: LeadSignalHeuristics | null = null
let cachedResponseSlaHours: number | null = null
let leadSignalsFetchedAt = 0
const LEAD_SIGNALS_TTL_MS = 5 * 60 * 1000

/** Fetch the admin-configured lead-signal thresholds (+ SLA window), cached for 5 minutes. */
export async function getLeadSignalHeuristics(): Promise<LeadSignalHeuristics> {
  if (cachedLeadSignals && Date.now() - leadSignalsFetchedAt < LEAD_SIGNALS_TTL_MS) {
    return cachedLeadSignals
  }
  try {
    const { data } = await api.get('/v1/heuristics')
    const signals = data?.leadSignals || {}
    cachedLeadSignals = {
      liabilityStrongMin: Number(signals.liabilityStrongMin ?? DEFAULT_LEAD_SIGNALS.liabilityStrongMin),
      liabilityWeakMax: Number(signals.liabilityWeakMax ?? DEFAULT_LEAD_SIGNALS.liabilityWeakMax),
      damagesStrongMin: Number(signals.damagesStrongMin ?? DEFAULT_LEAD_SIGNALS.damagesStrongMin),
      damagesWeakMax: Number(signals.damagesWeakMax ?? DEFAULT_LEAD_SIGNALS.damagesWeakMax),
      reviewDecisionMin: Number(signals.reviewDecisionMin ?? DEFAULT_LEAD_SIGNALS.reviewDecisionMin),
    }
    const sla = Number(data?.responseSlaHours)
    cachedResponseSlaHours = Number.isFinite(sla) && sla > 0 ? sla : DEFAULT_RESPONSE_SLA_HOURS
    leadSignalsFetchedAt = Date.now()
    return cachedLeadSignals
  } catch {
    return cachedLeadSignals || DEFAULT_LEAD_SIGNALS
  }
}

/** The admin-configured lead response SLA window in hours (cached; defaults to 24h). */
export async function getResponseSlaHours(): Promise<number> {
  if (cachedResponseSlaHours != null && Date.now() - leadSignalsFetchedAt < LEAD_SIGNALS_TTL_MS) {
    return cachedResponseSlaHours
  }
  await getLeadSignalHeuristics()
  return cachedResponseSlaHours ?? DEFAULT_RESPONSE_SLA_HOURS
}

export async function getLeadQuality(leadId: string): Promise<LeadQualityDetails | null> {
  const [{ data }, signals] = await Promise.all([
    api.get(`/v1/attorney-dashboard/leads/${leadId}/quality`),
    getLeadSignalHeuristics(),
  ])
  const qualityDetails = data?.qualityDetails || data
  const viability = qualityDetails?.viabilityBreakdown || {}
  const required = Array.isArray(qualityDetails?.evidenceChecklist?.required)
    ? qualityDetails.evidenceChecklist.required
    : []
  const missingItems = required
    .filter((item: any) => !item?.uploaded)
    .map((item: any) => ({
      label: item?.name || item?.label || 'Missing document',
      detail: item?.critical ? 'Critical supporting document for mobile case review.' : 'Useful supporting document.',
      actionType: 'request_documents',
    }))
  const liability = Number(viability.liability || 0)
  const damages = Number(viability.damages || 0)
  const overall = Number(viability.overall ?? 0)
  const strengths = [
    liability >= signals.liabilityStrongMin ? 'Liability signal is above routing threshold.' : null,
    damages >= signals.damagesStrongMin ? 'Damages signal is strong enough for early review.' : null,
    qualityDetails?.hotness?.level === 'hot' ? 'Recently submitted and should be reviewed quickly.' : null,
  ].filter(Boolean) as string[]
  const risks = [
    liability < signals.liabilityWeakMax ? 'Liability is not yet clearly established.' : null,
    damages < signals.damagesWeakMax ? 'Damages support may be thin.' : null,
    qualityDetails?.sol?.isUrgent ? 'Statute of limitations timing needs attention.' : null,
    missingItems.length > 0 ? `${missingItems.length} requested document${missingItems.length === 1 ? '' : 's'} still missing.` : null,
  ].filter(Boolean) as string[]

  return {
    qualityScore: normalizeScore(Number(qualityDetails?.qualityReports?.[0]?.qualityScore ?? overall)),
    readinessScore: normalizeScore(overall),
    viabilityBreakdown: {
      overall,
      liability,
      causation: Number(viability.causation ?? 0),
      damages,
    },
    strengths,
    risks,
    missingItems,
    demandReadiness: {
      score: overall,
      label: qualityDetails?.hotness?.level
        ? `${String(qualityDetails.hotness.level).toUpperCase()} lead · ${qualityDetails.hotness.hoursSinceSubmission ?? 0}h since submission`
        : undefined,
      nextAction: missingItems[0]
        ? {
            title: `Request ${missingItems[0].label}`,
            detail: missingItems[0].detail,
            actionType: 'request_documents',
          }
        : undefined,
    },
    recommendation: {
      decision: overall >= signals.reviewDecisionMin ? 'review' : 'watch',
      confidence: overall,
      rationale: risks.length > 0
        ? `Review with caution: ${risks[0]}`
        : strengths[0] || 'Case quality signals are available for mobile triage.',
    },
    evidenceChecklist: qualityDetails?.evidenceChecklist,
    conflicts: Array.isArray(qualityDetails?.conflicts) ? qualityDetails.conflicts : [],
    sol: qualityDetails?.sol,
  }
}

export type ConflictCheckResult = {
  conflictCheck?: { id?: string; conflictType?: string; riskLevel?: string; isResolved?: boolean }
  details?: { conflictType?: string; riskLevel?: string; details?: any }
}

export async function runConflictCheck(leadId: string): Promise<ConflictCheckResult> {
  const { data } = await api.post('/v1/lead-quality/conflict-check', { leadId })
  return data
}

export async function updateLeadStatus(leadId: string, status: 'contacted' | 'consulted' | 'retained') {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/status`, { status })
  return data
}

export async function updatePlaintiffCaseStatus(
  leadId: string,
  payload: { status: 'INTAKE' | 'UNDER_REVIEW' | 'FILED' | 'NEGOTIATION' | 'SETTLED' | 'TRIAL' | 'CLOSED'; message?: string }
) {
  const { data } = await api.patch(`/v1/attorney-dashboard/leads/${leadId}/plaintiff-status`, payload)
  return data
}

export type LeadEvidenceFile = {
  id: string
  originalName: string
  filename: string
  mimetype?: string | null
  size?: number | null
  fileUrl: string
  category?: string | null
  isVerified?: boolean
  verifiedAt?: string | null
  description?: string | null
  createdAt?: string
}

export async function getLeadEvidenceFiles(leadId: string): Promise<LeadEvidenceFile[]> {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/evidence`)
  return Array.isArray(data) ? data : []
}

export async function uploadLeadEvidenceFile(leadId: string, formData: FormData): Promise<LeadEvidenceFile> {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/evidence`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return data
}

export async function reviewLeadEvidenceFile(
  leadId: string,
  fileId: string,
  payload: { content?: string; status?: 'reviewed' | 'needs_follow_up' }
): Promise<LeadEvidenceFile> {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/evidence/${fileId}/review`, payload)
  return data
}

export type AttorneyAppointmentsResponse = {
  from: string
  to: string
  events: AttorneyCalendarEvent[]
}

/** Consultations / meetings for the signed-in attorney (case-linked appointments). */
export async function getAttorneyAppointments(from?: Date | string, to?: Date | string) {
  const params = new URLSearchParams()
  if (from != null) params.set('from', typeof from === 'string' ? from : from.toISOString())
  if (to != null) params.set('to', typeof to === 'string' ? to : to.toISOString())
  const q = params.toString()
  const { data } = await api.get<AttorneyAppointmentsResponse>(
    `/v1/attorney-dashboard/appointments${q ? `?${q}` : ''}`
  )
  return data
}

export async function scheduleConsultation(
  leadId: string,
  payload: { date: string; time: string; meetingType: string; notes?: string }
) {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/schedule-consult`, payload)
  return data
}

export async function updateAttorneyAppointment(
  appointmentId: string,
  payload: { scheduledAt?: string; type?: string; duration?: number; notes?: string; status?: string }
) {
  const { data } = await api.patch(`/v1/attorney-dashboard/appointments/${appointmentId}`, payload)
  return data
}

export async function cancelAttorneyAppointment(appointmentId: string, reason?: string) {
  const { data } = await api.post(`/v1/attorney-dashboard/appointments/${appointmentId}/cancel`, { reason })
  return data
}

export type AttorneyCalendarConnection = {
  provider: 'google' | 'microsoft'
  connected: boolean
  externalAccountEmail?: string | null
  calendarName?: string | null
  lastSyncedAt?: string | null
  autoSyncEnabled?: boolean
  webhookExpiresAt?: string | null
  lastSyncError?: string | null
  health?: {
    status: 'healthy' | 'warning' | 'error' | 'disconnected'
    busyBlockCount: number
    recommendedAction: string
    issues: string[]
  }
}

export async function getAttorneyCalendarHealth(): Promise<{
  connections: AttorneyCalendarConnection[]
  summary?: {
    totalConnections: number
    connectedCount: number
    healthyCount: number
    warningCount: number
    errorCount: number
    disconnectedCount: number
  }
}> {
  const { data } = await api.get('/v1/attorney-calendar/health')
  return {
    connections: Array.isArray(data?.connections) ? data.connections : [],
    summary: data?.summary,
  }
}

export async function getAttorneyCalendarConnectUrl(provider: 'google' | 'microsoft') {
  const { data } = await api.post(`/v1/attorney-calendar/${provider}/connect`)
  return data as { authorizeUrl: string }
}

export async function syncAttorneyCalendar(provider: 'google' | 'microsoft') {
  const { data } = await api.post(`/v1/attorney-calendar/${provider}/sync`)
  return data as { syncedBlocks: number; autoSyncEnabled?: boolean }
}

export async function disconnectAttorneyCalendar(provider: 'google' | 'microsoft') {
  const { data } = await api.delete(`/v1/attorney-calendar/${provider}`)
  return data
}

// Push (Expo token registration for server-side alerts)
export async function registerAttorneyPushToken(expoPushToken: string, platform?: string) {
  await api.post('/v1/attorney-dashboard/push/register', { expoPushToken, platform })
}

export async function unregisterAttorneyPushToken(expoPushToken: string) {
  await api.request({
    method: 'DELETE',
    url: '/v1/attorney-dashboard/push/register',
    data: { expoPushToken },
  })
}

// Messaging
export type AttorneyChatRoom = {
  id: string
  leadId?: string | null
  plaintiff?: { name?: string; email?: string } | null
  assessment?: { claimType?: string; venueState?: string } | null
  lastMessage?: { content?: string; senderType?: string; createdAt?: string } | null
  lastMessageAt?: string | null
  unreadCount?: number
}

export async function getAttorneyChatRooms(): Promise<AttorneyChatRoom[]> {
  const { data } = await api.get('/v1/attorney-dashboard/messaging/chat-rooms')
  return data
}

export async function getMessagingUnreadCount(): Promise<{ unreadCount: number }> {
  const { data } = await api.get('/v1/attorney-dashboard/messaging/unread-count')
  return data
}

export async function getChatMessages(chatRoomId: string, limit = 80, offset = 0) {
  const { data } = await api.get(
    `/v1/attorney-dashboard/messaging/chat-room/${chatRoomId}/messages?limit=${limit}&offset=${offset}`
  )
  return data
}

export async function getOrCreateAttorneyChatRoom(payload: { userId: string; assessmentId?: string | null }) {
  const { data } = await api.post('/v1/attorney-dashboard/messaging/chat-room', payload)
  return data as { chatRoomId: string }
}

export async function sendAttorneyMessage(chatRoomId: string, content: string) {
  const { data } = await api.post('/v1/attorney-dashboard/messaging/send', { chatRoomId, content })
  return data
}

export async function markChatRead(chatRoomId: string) {
  const { data } = await api.put(`/v1/attorney-dashboard/messaging/chat-room/${chatRoomId}/read`)
  return data
}

export async function createDocumentRequest(
  leadId: string,
  payload: { requestedDocs?: string[]; customMessage?: string; sendUploadLinkOnly?: boolean }
) {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/document-request`, payload)
  return data
}

export async function getLeadCommandCenter(leadId: string) {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/command-center`)
  return data
}

export async function createLeadContact(
  leadId: string,
  payload: { contactType: 'call' | 'sms' | 'email' | 'chat' | 'consult' | 'document_request'; contactMethod?: string; scheduledAt?: string; notes?: string }
) {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/contact`, payload)
  return data
}

export async function getAttorneyProfilePreferences(): Promise<{
  attorneyId: string
  defaultVenueState: string
  venueStates: string[]
}> {
  const { data } = await api.get('/v1/attorney-dashboard/profile/preferences')
  return {
    attorneyId: data?.attorneyId,
    defaultVenueState: data?.defaultVenueState || 'CA',
    venueStates: Array.isArray(data?.venueStates) && data.venueStates.length > 0 ? data.venueStates : ['CA'],
  }
}

export async function createManualIntake(payload: {
  template?: string
  claimType?: string
  venueState?: string
  notes?: string
  plaintiffFirstName?: string
  plaintiffLastName?: string
  plaintiffEmail?: string
  plaintiffPhone?: string
  sendInvite?: boolean
}) {
  const { data } = await api.post('/v1/attorney-dashboard/intake/manual', payload)
  return data
}

// Tasks (aggregate)
export type TaskSummaryItem = {
  id: string
  title: string
  dueDate: string | null
  status: string
  priority: string
  taskType: string
  assessmentId: string
  leadId: string
  claimType?: string | null
}

export type TasksSummaryResponse = {
  overdue: TaskSummaryItem[]
  today: TaskSummaryItem[]
  upcoming: TaskSummaryItem[]
  noDueDate: TaskSummaryItem[]
}

export async function getTasksSummary(): Promise<TasksSummaryResponse> {
  const { data } = await api.get('/v1/attorney-dashboard/tasks/summary')
  return data
}

export async function createCaseTask(
  leadId: string,
  payload: {
    title: string
    dueDate?: string
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    notes?: string
    taskType?: string
  }
) {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/tasks`, payload)
  return data
}

export async function createSolTask(leadId: string) {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/tasks/sol`, {})
  return data
}

export type NegotiationEvent = {
  id: string
  assessmentId?: string
  eventType: string
  amount?: number | null
  eventDate?: string | null
  status?: string | null
  notes?: string | null
  counterpartyType?: string | null
  insurerName?: string | null
  adjusterName?: string | null
  createdAt?: string
  updatedAt?: string
}

export async function getLeadNegotiations(leadId: string): Promise<NegotiationEvent[]> {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/negotiations`)
  return Array.isArray(data) ? data : []
}

export async function createNegotiationEvent(
  leadId: string,
  payload: {
    eventType: 'demand' | 'offer' | 'counter' | 'call' | 'email' | 'note'
    amount?: number
    eventDate?: string
    status?: string
    notes?: string
    insurerName?: string
    adjusterName?: string
  }
): Promise<NegotiationEvent> {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/negotiations`, payload)
  return data
}

// Case contacts
export type AttorneyCaseContact = {
  id: string
  leadId: string
  attorneyId: string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  companyName?: string | null
  companyUrl?: string | null
  title?: string | null
  contactType?: string | null
  notes?: string | null
  createdAt?: string
  updatedAt?: string
  lead?: {
    id?: string
    assessment?: {
      claimType?: string | null
      venueCounty?: string | null
      venueState?: string | null
    } | null
  } | null
}

export async function getCaseContacts(): Promise<AttorneyCaseContact[]> {
  const { data } = await api.get('/v1/attorney-dashboard/case-contacts')
  return Array.isArray(data) ? data : []
}

export async function getLeadCaseContacts(leadId: string): Promise<AttorneyCaseContact[]> {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/case-contacts`)
  return Array.isArray(data) ? data : []
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
): Promise<AttorneyCaseContact> {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/case-contacts`, payload)
  return data
}

// Document requests
export type DocumentRequestRow = {
  id: string
  leadId: string
  status: string
  requestedDocs: string[]
  customMessage?: string | null
  uploadLink: string
  attorneyViewedAt?: string | null
  lastNudgeAt?: string | null
  createdAt: string
  claimType?: string | null
}

export async function getDocumentRequests(): Promise<DocumentRequestRow[]> {
  const { data } = await api.get('/v1/attorney-dashboard/document-requests')
  return data
}

export async function markDocumentRequestViewed(id: string) {
  const { data } = await api.patch(`/v1/attorney-dashboard/document-requests/${id}/viewed`)
  return data
}

export async function nudgeDocumentRequest(id: string) {
  const { data } = await api.post(`/v1/attorney-dashboard/document-requests/${id}/nudge`)
  return data
}

// Case notes
export type CaseNote = {
  id: string
  assessmentId: string
  authorId?: string | null
  authorName?: string | null
  authorEmail?: string | null
  noteType?: string | null
  message: string
  createdAt: string
  updatedAt: string
}

export async function getLeadNotes(leadId: string): Promise<CaseNote[]> {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/notes`)
  return Array.isArray(data) ? data : []
}

export async function createLeadNote(leadId: string, payload: { message: string; noteType?: string }) {
  const { data } = await api.post(`/v1/attorney-dashboard/leads/${leadId}/notes`, payload)
  return data
}

// Billing
export type BillingInvoice = {
  id: string
  assessmentId: string
  invoiceNumber?: string | null
  amount: number
  status: string
  dueDate?: string | null
  paidAt?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export type BillingPayment = {
  id: string
  assessmentId: string
  amount: number
  method?: string | null
  receivedAt: string
  reference?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export async function getLeadInvoices(leadId: string): Promise<BillingInvoice[]> {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/invoices`)
  return Array.isArray(data) ? data : []
}

export async function getLeadPayments(leadId: string): Promise<BillingPayment[]> {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/payments`)
  return Array.isArray(data) ? data : []
}
