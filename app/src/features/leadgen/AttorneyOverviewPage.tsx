import AttorneyDashboardShell from '../../pages/AttorneyDashboardShell'

// Standalone attorney overview/dashboard hub. Replaces the legacy
// AttorneyDashboard "?tab=overview" deep link with a first-class route.
export default function AttorneyOverviewPage() {
  return <AttorneyDashboardShell chromeless initialView={{ tab: 'overview' }} />
}
