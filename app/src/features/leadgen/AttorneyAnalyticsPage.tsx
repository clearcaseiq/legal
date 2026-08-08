import AttorneyDashboardShell from '../../pages/AttorneyDashboardShell'

// Standalone ROI / decision analytics surface. Replaces the legacy
// AttorneyDashboard "?tab=analytics" deep link with a first-class route.
export default function AttorneyAnalyticsPage() {
  return <AttorneyDashboardShell chromeless initialView={{ tab: 'analytics' }} />
}
