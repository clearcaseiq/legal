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

export interface CreatePoliceReportAuthorizationPayload {
  signerName: string
  signerEmail: string
  clientDob?: string
  firmName?: string
  attorneyName?: string
  agencyName?: string
  reportNumber?: string
  incidentDate?: string
  incidentVenue?: string
  provider?: string
}

/** Send a CA police/incident report authorization for the client to sign. */
export const createPoliceReportAuthorization = async (
  leadId: string,
  payload: CreatePoliceReportAuthorizationPayload,
): Promise<DocumentEnvelope> => {
  const res = await api.post(`/v1/documents/leads/${leadId}/police-report-authorization`, payload)
  return res.data.envelope
}

/** Check Collect Police/incident report: report on file and/or client auth status. */
export const checkPoliceReportCollect = async (
  leadId: string,
): Promise<{
  reportOnFile: boolean
  authSigned: boolean
  authSent: boolean
  completedTasks: number
  evidenceFileId: string | null
  authEnvelopeId: string | null
  authTitle: string | null
}> => {
  const res = await api.post(`/v1/documents/leads/${leadId}/check-police-report`)
  return res.data
}

/** Collect medical records / bills: complete tasks when matching evidence is on file. */
export const checkEvidenceCollect = async (
  leadId: string,
  kind: 'medical_records' | 'bills',
): Promise<{
  onFile: boolean
  completedTasks: number
  evidenceFileId: string | null
  label: string
}> => {
  const res = await api.post(`/v1/documents/leads/${leadId}/check-evidence-collect`, { kind })
  return res.data
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

/** Check whether a retainer is signed; completes Confirm-signed tasks when yes. */
export const confirmRetainerSigned = async (
  leadId: string,
): Promise<{
  signed: boolean
  completedTasks: number
  alreadyDone: boolean
  envelopeId: string | null
  title: string | null
  signedAt: string | null
  signerEmail: string | null
}> => {
  const res = await api.post(`/v1/documents/leads/${leadId}/confirm-retainer-signed`)
  return res.data
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
  documentType: 'retainer' | 'hipaa_authorization' | 'police_report_authorization'
  signerName: string
  firmName?: string
  attorneyName?: string
  contingencyPercent?: number
  costsResponsibility?: string
  scope?: string
  clientDob?: string
  recordsCustodian?: string
  recordsDateRange?: string
  agencyName?: string
  reportNumber?: string
  incidentDate?: string
  incidentVenue?: string
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

export interface CaseFirmTemplate {
  id: string
  name: string
  category: string
  description: string | null
  hasFile: boolean
  fileName: string | null
  fileMime: string | null
  isPdf: boolean
  hasBody: boolean
  isActive: boolean
  suggestedDocumentType:
    | 'retainer'
    | 'hipaa_authorization'
    | 'police_report_authorization'
    | 'fee_agreement'
    | 'other'
}

/** Active firm library templates available to pull into Signatures for this case. */
export const listCaseFirmTemplates = async (
  leadId: string,
): Promise<{ templates: CaseFirmTemplate[]; lawFirmId: string | null }> => {
  const res = await api.get(`/v1/documents/leads/${leadId}/firm-templates`)
  return res.data
}

/** Send a firm library template for signature on this case. */
export const sendCaseFirmTemplate = async (
  leadId: string,
  templateId: string,
  payload: {
    signerName: string
    signerEmail: string
    title?: string
    provider?: string
    documentType?:
      | 'retainer'
      | 'hipaa_authorization'
      | 'police_report_authorization'
      | 'fee_agreement'
      | 'other'
  },
): Promise<DocumentEnvelope> => {
  const res = await api.post(
    `/v1/documents/leads/${leadId}/firm-templates/${templateId}/send`,
    payload,
  )
  return res.data.envelope
}

/** Upload a firm-authored PDF (custom retainer or fee agreement) and send it for signature. */
export const uploadFeeAgreement = async (
  leadId: string,
  file: File,
  opts: {
    signerName: string
    signerEmail: string
    title?: string
    provider?: string
    documentType?: 'retainer' | 'fee_agreement'
  }
): Promise<DocumentEnvelope> => {
  const form = new FormData()
  form.append('file', file)
  form.append('signerName', opts.signerName)
  form.append('signerEmail', opts.signerEmail)
  form.append('documentType', opts.documentType || 'fee_agreement')
  if (opts.title) form.append('title', opts.title)
  if (opts.provider) form.append('provider', opts.provider)
  const res = await api.post(`/v1/documents/leads/${leadId}/fee-agreement`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data.envelope
}
