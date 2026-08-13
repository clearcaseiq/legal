import { Navigate } from 'react-router-dom'

/**
 * Legacy left-nav AI Copilot route. Copilot now lives as a per-case workspace
 * tab (`/attorney-dashboard/cases/:leadId/copilot`).
 */
export default function CopilotPage() {
  return <Navigate to="/attorney-dashboard/cases/active" replace />
}
