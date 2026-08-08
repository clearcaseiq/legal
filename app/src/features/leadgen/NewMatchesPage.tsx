import AttorneyDashboardShell from '../../pages/AttorneyDashboardShell'

export default function NewMatchesPage() {
  return <AttorneyDashboardShell chromeless initialView={{ tab: 'leads', leadsSection: 'matches' }} />
}
