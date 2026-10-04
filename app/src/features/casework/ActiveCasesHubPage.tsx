import { lazy } from 'react'
import { useAttorneyWorkspace } from '../shared/AttorneyWorkspaceContext'
import { HubTabs, type HubTab } from '../shared/HubTabs'

const ActiveCasesPage = lazy(() => import('./ActiveCasesPage'))
const ContactsPage = lazy(() => import('./ContactsPage'))

/** The caseload, with the cross-case parties directory beside it. */
export default function ActiveCasesHubPage() {
  const { isStaff } = useAttorneyWorkspace()
  const tabs: HubTab[] = [{ id: 'cases', label: 'Cases', render: () => <ActiveCasesPage /> }]
  // The contacts directory stays attorney-only, as it was as a separate page.
  if (!isStaff) tabs.push({ id: 'contacts', label: 'Contacts', render: () => <ContactsPage /> })
  return <HubTabs label="Active cases" tabs={tabs} />
}
