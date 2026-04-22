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
