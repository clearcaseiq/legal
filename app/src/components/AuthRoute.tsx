import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getLoginRedirect, getPostLoginRoute, getStoredRole, hasValidAuthToken, type WebAppRole } from '../lib/auth'

interface ProtectedRouteProps {
  role?: WebAppRole
}

export function ProtectedRoute({ role }: ProtectedRouteProps) {
  const location = useLocation()
  const storedRole = getStoredRole()

  if (!hasValidAuthToken()) {
    return <Navigate to={getLoginRedirect(location.pathname, role)} replace />
  }

  if (role && storedRole && role !== storedRole) {
    return <Navigate to={getPostLoginRoute(storedRole)} replace />
  }

  return <Outlet />
}

export function GuestRoute({ role }: ProtectedRouteProps) {
  const storedRole = getStoredRole()

  // If the user is already signed in for the same role, keep them in that app.
  // If they intentionally open a different role's login screen, let them proceed and switch accounts.
  if (storedRole && (!role || storedRole === role)) {
    return <Navigate to={getPostLoginRoute(storedRole)} replace />
  }

  return <Outlet />
}
