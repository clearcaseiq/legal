import api from './http'

export type AttorneyAgreement = {
  version: string
  title: string
  effectiveDate: string
  sections: Array<{ heading: string; body: string }>
}

export type AttorneyAgreementStatus = {
  version: string
  accepted: boolean
  acceptedAt: string | null
}

export async function fetchAttorneyAgreement(): Promise<AttorneyAgreement> {
  const { data } = await api.get('/v1/attorney-agreement')
  return data
}

export async function fetchAttorneyAgreementStatus(): Promise<AttorneyAgreementStatus> {
  const { data } = await api.get('/v1/attorney-agreement/status')
  return data
}

export async function acceptAttorneyAgreement(version: string): Promise<void> {
  await api.post('/v1/attorney-agreement/accept', { version })
}
