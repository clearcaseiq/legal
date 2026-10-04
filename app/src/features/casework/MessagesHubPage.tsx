import { lazy } from 'react'
import { useFirmAccess } from '../../hooks/useFirmAccess'
import { useAttorneyWorkspace } from '../shared/AttorneyWorkspaceContext'
import { HubTabs, type HubTab } from '../shared/HubTabs'

const ClientMessagesPage = lazy(() => import('./MessagesPage'))
const TeamMessagesPage = lazy(() => import('./TeamMessagesPage'))
const ActivityPage = lazy(() => import('./ActivityPage'))

/** Client and adjuster threads, firm team chat, and @mentions in one place. */
export default function MessagesHubPage() {
  const { isStaff, unreadMessages, unreadTeamMessages } = useAttorneyWorkspace()
  const { can } = useFirmAccess()
  const tabs: HubTab[] = []
  if (can('message')) tabs.push({ id: 'clients', label: 'Clients', badge: unreadMessages, render: () => <ClientMessagesPage /> })
  // Team chat and mentions stay attorney-only, as they were as separate pages.
  if (!isStaff) {
    tabs.push({ id: 'team', label: 'Team', badge: unreadTeamMessages, render: () => <TeamMessagesPage /> })
    tabs.push({ id: 'mentions', label: 'Mentions', render: () => <ActivityPage /> })
  }
  return <HubTabs label="Messages" tabs={tabs} />
}
