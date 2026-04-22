import api from './http'

export type PublicConsentTemplate = {
  version: string
  documentId: string
  title: string
  effectiveDate: string
  plainLanguageSummary: string
  content: string
}

export type PlaintiffConsentCompliance = {
  allRequiredConsentsGranted: boolean
  missingConsents?: string[]
  needsReconsent?: boolean
  missing?: string[]
  outdated?: string[]
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

export async function fetchPublicConsentTemplate(type: string): Promise<PublicConsentTemplate> {
  const response = await api.get(`/v1/consent/templates/${type}`)
  const body = response.data as { success?: boolean; data?: PublicConsentTemplate }
  if (body?.data) return body.data
  throw new Error('Consent template not available')
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
