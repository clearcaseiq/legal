import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getLoginRedirect, getPostLoginRoute, getStoredRole, hasValidAuthToken, type WebAppRole } from '../lib/auth'

interface ProtectedRouteProps {
  // A single role or a set of roles allowed to view the route. The shared firm
  // workspace, for example, allows both 'attorney' and 'staff'.
  role?: WebAppRole | WebAppRole[]
}

function roleAllowed(allowed: WebAppRole | WebAppRole[] | undefined, actual: WebAppRole): boolean {
  if (!allowed) return true
  return Array.isArray(allowed) ? allowed.includes(actual) : allowed === actual
}

export function ProtectedRoute({ role }: ProtectedRouteProps) {
  const location = useLocation()
  const storedRole = getStoredRole()

  if (!hasValidAuthToken()) {
    return <Navigate to={getLoginRedirect(location.pathname, role)} replace />
  }

  if (role && storedRole && !roleAllowed(role, storedRole)) {
    return <Navigate to={getPostLoginRoute(storedRole)} replace />
  }

  return <Outlet />
}

export function GuestRoute({ role }: ProtectedRouteProps) {
  const storedRole = getStoredRole()

  // If the user is already signed in for the same role, keep them in that app.
  // If they intentionally open a different role's login screen, let them proceed and switch accounts.
  if (storedRole && (!role || roleAllowed(role, storedRole))) {
    return <Navigate to={getPostLoginRoute(storedRole)} replace />
  }

  return <Outlet />
}
