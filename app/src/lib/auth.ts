export type WebAppRole = 'plaintiff' | 'attorney' | 'admin'

export function getStoredUser<T = Record<string, unknown>>(key: string): T | null {
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function hasValidAuthToken() {
  const token = localStorage.getItem('auth_token')
  return !!token && token.split('.').length === 3
}

export function getStoredRole(): WebAppRole | null {
  if (!hasValidAuthToken()) return null
  const explicitRole = localStorage.getItem('auth_role')?.toLowerCase()
  if (explicitRole === 'admin' || explicitRole === 'attorney' || explicitRole === 'plaintiff') {
    return explicitRole
  }
  const user = getStoredUser<{ role?: string }>('user')
  const normalizedRole = user?.role?.toLowerCase()
  if (normalizedRole === 'admin') return 'admin'
  if (normalizedRole === 'attorney' || localStorage.getItem('attorney')) return 'attorney'
  return 'plaintiff'
}

export function clearStoredAuth() {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('user')
  localStorage.removeItem('attorney')
  localStorage.removeItem('pending_assessment_id')
  localStorage.removeItem('auth_provider')
  localStorage.removeItem('auth_role')
}

export function getLoginRedirect(pathname: string, role?: WebAppRole) {
  if (role === 'admin' || pathname.startsWith('/admin')) {
    return `/login/admin?redirect=${encodeURIComponent(pathname)}`
  }
  if (
    role === 'attorney' ||
    pathname.startsWith('/attorney-dashboard') ||
    pathname.startsWith('/firm-dashboard') ||
    pathname.startsWith('/attorney-')
  ) {
    return `/login/attorney?redirect=${encodeURIComponent(pathname)}`
  }
  return `/login/plaintiff?redirect=${encodeURIComponent(pathname)}`
}

export function getPostLoginRoute(role?: WebAppRole | null) {
  if (role === 'admin') return '/admin'
  if (role === 'attorney') return '/attorney-dashboard'
  return '/dashboard'
}
