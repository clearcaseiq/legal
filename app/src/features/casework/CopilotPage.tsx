import AttorneyDashboard from '../../pages/AttorneyDashboard'

export default function CopilotPage() {
  return <AttorneyDashboard chromeless initialView={{ tab: 'overview', overviewFocus: 'ai' }} />
}
