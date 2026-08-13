import { Navigate } from 'react-router-dom'

/**
 * Legacy left-nav Rose board. Rose now lives as a per-case workspace tab
 * (`/attorney-dashboard/cases/:leadId/rose`).
 */
export default function AiCaseManagerPage() {
  return <Navigate to="/attorney-dashboard/cases/active" replace />
}
