import AttorneyDashboardShell from '../../pages/AttorneyDashboardShell'

// Standalone attorney profile settings (bar-license verification + decision
// profile). Replaces the legacy AttorneyDashboard "?tab=profile" deep link with
// a first-class route. Calendar/Zoom connection management now also lives on the
// Scheduling settings page.
export default function AttorneyProfileSettingsPage() {
  return <AttorneyDashboardShell chromeless initialView={{ tab: 'profile' }} />
}
