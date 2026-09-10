import api from './http'

export interface CmsProviderMeta {
  id: string
  label: string
  authType: 'oauth' | 'pat' | 'partner' | 'webhook'
  configured: boolean
  notes?: string
  docsUrl?: string
  /** Whether the firm's existing caseload can be pulled in from this provider. */
  supportsInbound?: boolean
}

export interface CmsConnectionView {
  id: string
  provider: string
  authType: string
  status: string
  externalAccountEmail?: string | null
  apiBaseUrl?: string | null
  lastSyncedAt?: string | null
  lastError?: string | null
  createdAt: string
  /** Whether this provider can be read from, as opposed to only written to. */
  supportsInbound?: boolean
  /** Whether this firm has turned pull sync on. Off until someone does. */
  inboundSyncEnabled?: boolean
}

/** Why a matter in the firm's CMS was looked at but not imported. */
export type InboundSkipReason =
  | 'duplicate'
  | 'missing_external_id'
  | 'missing_incident_date'
  | 'missing_venue_state'
  | 'error'

export interface InboundSkippedMatter {
  externalId: string
  reason: InboundSkipReason
  detail?: string
  /** Enough to recognise the matter in the CMS without opening it. */
  label?: string
}

export interface InboundSyncResult {
  connectionId: string
  provider: string
  dryRun: boolean
  imported: number
  assessmentIds: string[]
  skipped: InboundSkippedMatter[]
  seen: number
  pagesFetched: number
  nextCursor: string | null
  reachedEnd: boolean
}

export interface CmsSyncLogView {
  id: string
  direction: string
  operation: string
  status: string
  externalType?: string | null
  externalId?: string | null
  message?: string | null
  createdAt: string
}

export const getCmsProviders = async (): Promise<CmsProviderMeta[]> => {
  const res = await api.get('/v1/integrations/providers')
  return res.data.providers
}

export const getCmsConnections = async (): Promise<CmsConnectionView[]> => {
  const res = await api.get('/v1/integrations/connections')
  return res.data.connections
}

export interface ConnectPayload {
  apiBaseUrl?: string
  apiKey?: string
  pat?: string
  webhookUrl?: string
}

export const connectCmsProvider = async (
  provider: string,
  payload: ConnectPayload = {}
): Promise<{ mode: 'oauth' | 'connected'; authorizeUrl?: string; connectionId?: string }> => {
  const res = await api.post(`/v1/integrations/connect/${provider}`, payload)
  return res.data
}

export const disconnectCmsConnection = async (id: string): Promise<void> => {
  await api.delete(`/v1/integrations/connections/${id}`)
}

export const getCmsConnectionLogs = async (id: string): Promise<CmsSyncLogView[]> => {
  const res = await api.get(`/v1/integrations/connections/${id}/logs`)
  return res.data.logs
}

/** Turn pull sync on or off for one connection. */
export const setInboundSyncEnabled = async (
  connectionId: string,
  enabled: boolean
): Promise<{ inboundSyncEnabled: boolean }> => {
  const res = await api.post(`/v1/integrations/connections/${connectionId}/inbound-sync`, { enabled })
  return res.data
}

/**
 * Read the firm's caseload out of their CMS.
 *
 * `dryRun` reports what would be created without writing anything, which is how
 * the UI shows a firm what a first sync would do to a caseload of thousands
 * before they commit to it. `full` ignores the incremental watermark and
 * re-reads everything; dedupe makes that safe, just slower.
 */
export const runInboundSync = async (
  connectionId: string,
  options: { dryRun?: boolean; full?: boolean; cursor?: string } = {}
): Promise<InboundSyncResult> => {
  const res = await api.post('/v1/integrations/import-sync', { connectionId, ...options })
  return res.data
}

export const exportCaseToCms = async (
  assessmentId: string,
  connectionId?: string
): Promise<{ results: any[] }> => {
  const res = await api.post('/v1/integrations/export', { assessmentId, connectionId })
  return res.data
}
