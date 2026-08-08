import { useNavigate } from 'react-router-dom'
import AttorneyDashboardIntakeTab from '../../components/AttorneyDashboardIntakeTab'

// Standalone Intake surface. The intake tab component is fully self-contained
// (its own state + API calls), so it no longer needs to mount the legacy
// AttorneyDashboard monolith just to render one tab.
export default function IntakePage() {
  const navigate = useNavigate()
  return (
    <div className="w-full">
      <AttorneyDashboardIntakeTab
        onGoToLeads={() => navigate('/attorney-dashboard/leadgen/matches')}
      />
    </div>
  )
}
