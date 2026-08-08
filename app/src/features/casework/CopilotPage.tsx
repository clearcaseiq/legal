import AttorneyDashboardShell from '../../pages/AttorneyDashboardShell'

export default function CopilotPage() {
  return <AttorneyDashboardShell chromeless initialView={{ tab: 'overview', overviewFocus: 'ai' }} />
}
