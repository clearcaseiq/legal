import api from './http'

export interface CmsProviderMeta {
  id: string
  label: string
  authType: 'oauth' | 'pat' | 'partner' | 'webhook'
  configured: boolean
  notes?: string
  docsUrl?: string
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

export const exportCaseToCms = async (
  assessmentId: string,
  connectionId?: string
): Promise<{ results: any[] }> => {
  const res = await api.post('/v1/integrations/export', { assessmentId, connectionId })
  return res.data
}
