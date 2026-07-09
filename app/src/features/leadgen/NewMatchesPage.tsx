import AttorneyDashboard from '../../pages/AttorneyDashboard'

export default function NewMatchesPage() {
  return <AttorneyDashboard chromeless initialView={{ tab: 'leads', leadsSection: 'matches' }} />
}
