export type ApiIsoDateString = string

export type AttorneyDashboardSummary = {
  unreadCount?: number
  [key: string]: unknown
}

export type AttorneyDashboardLead = {
  id: string
  status?: string | null
  claimType?: string | null
  venueState?: string | null
  qualityScore?: number | null
  createdAt?: ApiIsoDateString | null
  updatedAt?: ApiIsoDateString | null
  [key: string]: unknown
}

export type AttorneyDashboardResponse = {
  leads?: AttorneyDashboardLead[]
  queue?: AttorneyDashboardLead[]
  messagingSummary?: AttorneyDashboardSummary
  taskSummary?: AttorneyDashboardSummary
  [key: string]: unknown
}

export type PlaintiffTimelineEvent = {
  id: string
  type: string
  title: string
  description: string
  date: ApiIsoDateString
  status: string
}

export type DocumentRequestContract = {
  id: string
  leadId: string | null
  status: string
  requestedDocs: string[]
  customMessage?: string | null
  uploadLink?: string | null
  createdAt: ApiIsoDateString
  [key: string]: unknown
}
