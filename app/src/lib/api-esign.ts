import api from './http'

export type EnvelopeStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'signed'
  | 'declined'
  | 'voided'
  | 'expired'

export interface EsignProviderMeta {
  id: string
  label: string
  configured: boolean
  hipaaCapable: boolean
  notes?: string
  docsUrl?: string
}

export interface DocumentEnvelope {
  id: string
  documentType: string
  title: string
  signerName: string
  signerEmail: string
  status: EnvelopeStatus
  provider: string
  signingUrl?: string | null
  signedFilePath?: string | null
  sentAt?: string | null
  signedAt?: string | null
  createdAt: string
}

export interface CreateHipaaAuthorizationPayload {
  signerName: string
  signerEmail: string
  clientDob?: string
  recordsCustodian?: string
  recordsDateRange?: string
  provider?: string
}

/** Only the e-signature tools configured on this server (drives the picker). */
export const getEsignProviders = async (): Promise<EsignProviderMeta[]> => {
  const res = await api.get('/v1/documents/providers')
  return res.data.providers
}

export const listEnvelopes = async (leadId: string): Promise<DocumentEnvelope[]> => {
  const res = await api.get(`/v1/documents/leads/${leadId}/envelopes`)
  return res.data.envelopes
}

export const createHipaaAuthorization = async (
  leadId: string,
  payload: CreateHipaaAuthorizationPayload
): Promise<DocumentEnvelope> => {
  const res = await api.post(`/v1/documents/leads/${leadId}/hipaa-authorization`, payload)
  return res.data.envelope
}

export interface CreateRetainerAgreementPayload {
  signerName: string
  signerEmail: string
  firmName?: string
  attorneyName?: string
  contingencyPercent?: number
  costsResponsibility?: string
  scope?: string
  provider?: string
}

export const createRetainerAgreement = async (
  leadId: string,
  payload: CreateRetainerAgreementPayload
): Promise<DocumentEnvelope> => {
  const res = await api.post(`/v1/documents/leads/${leadId}/retainer`, payload)
  return res.data.envelope
}

// Download the executed (signed) PDF for an envelope as a blob so the browser
// saves it with a sensible filename in every environment (the route is
// attorney-authenticated, so the Bearer token must ride along).
export const downloadSignedEnvelope = async (envelopeId: string, fileName: string): Promise<void> => {
  const { data } = await api.get<Blob>(`/v1/documents/envelopes/${envelopeId}/signed`, {
    responseType: 'blob',
  })
  const url = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName || 'signed-document.pdf'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
