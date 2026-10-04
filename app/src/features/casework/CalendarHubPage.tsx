import { lazy } from 'react'
import { HubTabs } from '../shared/HubTabs'

const CalendarPage = lazy(() => import('../../pages/CalendarPage'))
const SchedulingSettingsPage = lazy(() => import('./SchedulingSettingsPage'))

/** Calendar & Consults, with the public booking-link settings beside it. */
export default function CalendarHubPage() {
  return (
    <HubTabs
      label="Calendar"
      tabs={[
        { id: 'calendar', label: 'Calendar', render: () => <CalendarPage /> },
        { id: 'booking', label: 'Booking link', render: () => <SchedulingSettingsPage /> },
      ]}
    />
  )
}
