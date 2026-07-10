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
  auditTrailUrl?: string | null
  sentAt?: string | null
  viewedAt?: string | null
  signedAt?: string | null
  declinedAt?: string | null
  createdAt: string
  updatedAt?: string
}

export interface SigningDefaults {
  firmName?: string
  attorneyName?: string
  contingencyPercent?: number
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

/** Signing defaults (firm/attorney/contingency) to prefill the send form. */
export const getSigningDefaults = async (leadId: string): Promise<SigningDefaults> => {
  const res = await api.get(`/v1/documents/leads/${leadId}/defaults`)
  return res.data.defaults
}

/** Poll open envelopes against the provider and return the refreshed list. */
export const refreshEnvelopes = async (leadId: string): Promise<DocumentEnvelope[]> => {
  const res = await api.post(`/v1/documents/leads/${leadId}/envelopes/refresh`)
  return res.data.envelopes
}

/** Nudge the current signer (re-send the signing email). */
export const remindEnvelope = async (leadId: string, envelopeId: string): Promise<void> => {
  await api.post(`/v1/documents/leads/${leadId}/envelopes/${envelopeId}/remind`)
}

/** Cancel/void an outstanding envelope. */
export const voidEnvelope = async (leadId: string, envelopeId: string): Promise<DocumentEnvelope> => {
  const res = await api.post(`/v1/documents/leads/${leadId}/envelopes/${envelopeId}/void`)
  return res.data.envelope
}

/** Correct the signer's email on an in-flight envelope and re-send. */
export const correctSignerEmail = async (
  leadId: string,
  envelopeId: string,
  signerEmail: string,
  signerName?: string
): Promise<DocumentEnvelope> => {
  const res = await api.post(`/v1/documents/leads/${leadId}/envelopes/${envelopeId}/correct-email`, {
    signerEmail,
    signerName,
  })
  return res.data.envelope
}

export interface PreviewDocumentPayload {
  documentType: 'retainer' | 'hipaa_authorization'
  signerName: string
  firmName?: string
  attorneyName?: string
  contingencyPercent?: number
  costsResponsibility?: string
  scope?: string
  clientDob?: string
  recordsCustodian?: string
  recordsDateRange?: string
}

/**
 * Render the retainer/HIPAA PDF (without sending) and return a same-origin
 * blob: URL for inline preview. Caller must URL.revokeObjectURL when done.
 */
export const previewDocument = async (leadId: string, payload: PreviewDocumentPayload): Promise<string> => {
  const { data } = await api.post<Blob>(`/v1/documents/leads/${leadId}/preview`, payload, {
    responseType: 'blob',
  })
  return URL.createObjectURL(data)
}

export interface OnboardingPacketPayload {
  signerName: string
  signerEmail: string
  provider?: string
  firmName?: string
  attorneyName?: string
  contingencyPercent?: number
  costsResponsibility?: string
  scope?: string
  clientDob?: string
  recordsCustodian?: string
  recordsDateRange?: string
}

/** Send the onboarding packet (retainer + HIPAA) in one action. */
export const sendOnboardingPacket = async (
  leadId: string,
  payload: OnboardingPacketPayload
): Promise<{ retainer: DocumentEnvelope; hipaa: DocumentEnvelope }> => {
  const res = await api.post(`/v1/documents/leads/${leadId}/onboarding-packet`, payload)
  return res.data
}

/** Upload a firm-authored PDF (custom fee agreement) and send it for signature. */
export const uploadFeeAgreement = async (
  leadId: string,
  file: File,
  opts: { signerName: string; signerEmail: string; title?: string; provider?: string }
): Promise<DocumentEnvelope> => {
  const form = new FormData()
  form.append('file', file)
  form.append('signerName', opts.signerName)
  form.append('signerEmail', opts.signerEmail)
  if (opts.title) form.append('title', opts.title)
  if (opts.provider) form.append('provider', opts.provider)
  const res = await api.post(`/v1/documents/leads/${leadId}/fee-agreement`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data.envelope
}
