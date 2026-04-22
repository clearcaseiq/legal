/**
 * ClearCaseIQ API client for attorney mobile app.
 * Uses SecureStore for auth token (biometric-protected).
 */
import type { AttorneyCalendarEvent } from './calendar'
import axios, { isAxiosError, type AxiosError } from 'axios'
import * as SecureStore from 'expo-secure-store'
import * as Device from 'expo-device'
import { Platform } from 'react-native'

function resolveApiUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim()
  if (configured) return configured

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
export function getApiErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const e = err as AxiosError<{ error?: string }>
    const server = e.response?.data && typeof e.response.data === 'object' ? e.response.data.error : undefined
    if (typeof server === 'string' && server.trim()) return server
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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('auth_token')
      await SecureStore.deleteItemAsync('user')
      unauthorizedHandler?.()
    }
    return Promise.reject(error)
  }
)

// Auth
export async function loginUser(email: string, password: string) {
  let role: MobileSessionRole = 'plaintiff'
  let data: any

  try {
    const response = await api.post('/v1/auth/login', { email, password })
    data = response.data
    role = 'plaintiff'
  } catch (error: unknown) {
    const err = error as AxiosError<{ error?: string; isAttorney?: boolean }>
    const shouldRetryAsAttorney =
      !!err.response &&
      err.response.status === 403 &&
      !!err.response.data?.isAttorney

    if (!shouldRetryAsAttorney) {
      throw error
    }

    const response = await api.post('/v1/auth/attorney-login', { email, password })
    data = response.data
    role = 'attorney'
  }

  await SecureStore.setItemAsync('auth_token', data.token)
  await SecureStore.setItemAsync('user', JSON.stringify(data.user))
  await SecureStore.setItemAsync('session_role', role)
  return {
    ...data,
    role,
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
export async function getAttorneyDashboard() {
  const { data } = await api.get('/v1/attorney-dashboard/dashboard')
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

export type LeadEvidenceFile = {
  id: string
  originalName: string
  filename: string
  mimetype?: string | null
  size?: number | null
  fileUrl: string
  category?: string | null
  createdAt?: string
}

export async function getLeadEvidenceFiles(leadId: string): Promise<LeadEvidenceFile[]> {
  const { data } = await api.get(`/v1/attorney-dashboard/leads/${leadId}/evidence`)
  return Array.isArray(data) ? data : []
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

export async function sendAttorneyMessage(chatRoomId: string, content: string) {
  const { data } = await api.post('/v1/attorney-dashboard/messaging/send', { chatRoomId, content })
  return data
}

export async function markChatRead(chatRoomId: string) {
  const { data } = await api.put(`/v1/attorney-dashboard/messaging/chat-room/${chatRoomId}/read`)
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
