import api from './http'

export interface ClaimPreview {
  profile: {
    name: string
    firmName: string | null
    city: string | null
    state: string | null
    maskedEmail: string | null
    maskedPhone: string | null
  }
  methods: Array<'email' | 'sms' | 'bar_number'>
  verified: boolean
}

export async function startClaim(token: string): Promise<ClaimPreview> {
  const { data } = await api.post('/v1/attorney-claim/start', { token })
  return data
}

export async function sendClaimCode(
  token: string,
  method: 'email' | 'sms'
): Promise<{ ok: boolean; delivered: boolean; sentTo: string | null; devCode?: string }> {
  const { data } = await api.post('/v1/attorney-claim/send-code', { token, method })
  return data
}

export async function verifyClaimCode(token: string, code: string): Promise<{ verified: boolean }> {
  const { data } = await api.post('/v1/attorney-claim/verify', { token, code })
  return data
}

export async function verifyClaimBarNumber(
  token: string,
  barNumber: string
): Promise<{ verified: boolean; manualReview?: boolean }> {
  const { data } = await api.post('/v1/attorney-claim/verify', {
    token,
    method: 'bar_number',
    barNumber,
  })
  return data
}

export interface ClaimCompleteResponse {
  token: string
  user: { id: string; email: string; firstName: string; lastName: string }
  attorney: { id: string; name: string }
}

export async function completeClaim(payload: {
  token: string
  password: string
  firstName: string
  lastName: string
  email?: string
}): Promise<ClaimCompleteResponse> {
  const { data } = await api.post('/v1/attorney-claim/complete', payload)
  return data
}
