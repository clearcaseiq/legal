import api from './http'

export async function register(payload: any) {
  const { data } = await api.post('/v1/auth/register', payload)
  return data
}

export async function login(payload: any) {
  const { data } = await api.post('/v1/auth/login', payload)
  return data
}

export async function loginAttorney(payload: any) {
  const { data } = await api.post('/v1/auth/attorney-login', payload)
  return data
}

export async function requestPasswordReset(email: string) {
  const { data } = await api.post('/v1/auth/request-password-reset', { email })
  return data as { ok: boolean; message: string }
}

export async function validatePasswordResetToken(token: string) {
  const { data } = await api.get(`/v1/auth/reset-password/${encodeURIComponent(token)}/validate`)
  return data as { valid: boolean; isNewPassword?: boolean; error?: string }
}

export async function resetPassword(token: string, password: string) {
  const { data } = await api.post('/v1/auth/reset-password', { token, password })
  return data as { ok: boolean; message: string }
}

export async function getCurrentUser() {
  const { data } = await api.get('/v1/auth/me')
  return data
}

/** Ensures the current JWT is an ADMIN_EMAILS account (call after password login on admin UI). */
export async function verifyAdminAccess(): Promise<void> {
  await api.get('/v1/auth/admin-access')
}

export async function registerAttorney(data: any) {
  const { data: response } = await api.post('/v1/attorney-register/register', data)
  return response
}

/** Returns true when no user/attorney account already uses this email. */
export async function checkAttorneyEmailAvailable(email: string): Promise<boolean> {
  const { data } = await api.get('/v1/attorney-register/email-available', { params: { email } })
  return !!data?.available
}

export async function uploadAttorneyLicense(formData: FormData) {
  const { data: response } = await api.post('/v1/attorney-profile/license/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return response
}

export async function lookupStateBarLicense(licenseNumber: string, state: string) {
  const { data: response } = await api.post('/v1/attorney-profile/license/state-bar-lookup', {
    licenseNumber,
    state
  })
  return response
}
