import api from './http'

// --- Sync API keys (external systems that read FROM us) ---------------------

export interface SyncApiKeyView {
  id: string
  name: string
  prefix: string
  lastUsedAt?: string | null
  revokedAt?: string | null
  createdAt: string
}

export const listSyncKeys = async (): Promise<SyncApiKeyView[]> => {
  const res = await api.get('/v1/integrations/sync-keys')
  return res.data.keys
}

export const createSyncKey = async (
  name: string
): Promise<{ key: SyncApiKeyView; token: string }> => {
  const res = await api.post('/v1/integrations/sync-keys', { name })
  return res.data
}

export const revokeSyncKey = async (id: string): Promise<void> => {
  await api.delete(`/v1/integrations/sync-keys/${id}`)
}

// --- Reconciliation inbox (external writes held for human approval) ----------

export interface ReconciliationProposal {
  id: string
  assessmentId: string
  field: string
  currentValue?: string | null
  proposedValue?: string | null
  provider?: string | null
  source: string
  status: string
  note?: string | null
  baseRevision?: number | null
  createdAt: string
}

export const listReconciliationProposals = async (): Promise<ReconciliationProposal[]> => {
  const res = await api.get('/v1/cases/proposals')
  return res.data.proposals
}

export const approveReconciliationProposal = async (
  id: string
): Promise<{ ok: boolean; proposal?: ReconciliationProposal }> => {
  const res = await api.post(`/v1/cases/proposals/${id}/approve`, {})
  return res.data
}

export const rejectReconciliationProposal = async (
  id: string,
  note?: string
): Promise<{ ok: boolean; proposal?: ReconciliationProposal }> => {
  const res = await api.post(`/v1/cases/proposals/${id}/reject`, note ? { note } : {})
  return res.data
}
