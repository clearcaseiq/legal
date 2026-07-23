export type WebAppRole = 'plaintiff' | 'attorney' | 'admin' | 'staff'

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
  if (
    explicitRole === 'admin' ||
    explicitRole === 'attorney' ||
    explicitRole === 'plaintiff' ||
    explicitRole === 'staff'
  ) {
    return explicitRole
  }
  const user = getStoredUser<{ role?: string }>('user')
  const normalizedRole = user?.role?.toLowerCase()
  if (normalizedRole === 'admin') return 'admin'
  if (normalizedRole === 'attorney' || localStorage.getItem('attorney')) return 'attorney'
  if (normalizedRole === 'staff' || localStorage.getItem('firm_member')) return 'staff'
  return 'plaintiff'
}

export function clearStoredAuth() {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('user')
  localStorage.removeItem('attorney')
  localStorage.removeItem('firm_member')
  localStorage.removeItem('pending_assessment_id')
  localStorage.removeItem('auth_provider')
  localStorage.removeItem('auth_role')
}

export function getLoginRedirect(pathname: string, role?: WebAppRole | WebAppRole[]) {
  const roles = Array.isArray(role) ? role : role ? [role] : []
  if (roles.includes('admin') || pathname.startsWith('/admin')) {
    return `/login/admin?redirect=${encodeURIComponent(pathname)}`
  }
  // Attorney workspace comes first: an attorney-only path should send an
  // unauthenticated user to the attorney login even though staff can also reach
  // the shared /firm-dashboard.
  if (
    roles.includes('attorney') &&
    !roles.includes('staff') &&
    (pathname.startsWith('/attorney-dashboard') || pathname.startsWith('/attorney-'))
  ) {
    return `/login/attorney?redirect=${encodeURIComponent(pathname)}`
  }
  // Firm workspace (staff + firm attorneys). The standalone /firm-dashboard is
  // primarily a staff entry point, so default it to the staff login.
  if (roles.includes('staff') || pathname.startsWith('/firm-dashboard')) {
    return `/login/staff?redirect=${encodeURIComponent(pathname)}`
  }
  if (
    roles.includes('attorney') ||
    pathname.startsWith('/attorney-dashboard') ||
    pathname.startsWith('/attorney-')
  ) {
    return `/login/attorney?redirect=${encodeURIComponent(pathname)}`
  }
  return `/login/plaintiff?redirect=${encodeURIComponent(pathname)}`
}

export function getPostLoginRoute(role?: WebAppRole | null) {
  if (role === 'admin') return '/admin'
  // Attorneys land in the two-domain workspace (Lead Generation / Case Management).
  if (role === 'attorney') return '/attorney-dashboard/leadgen/matches'
  // Firm staff (paralegals, case managers, etc.) land in the firm workspace,
  // scoped by their permissions.
  if (role === 'staff') return '/firm-dashboard'
  return '/dashboard'
}
