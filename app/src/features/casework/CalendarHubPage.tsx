import { lazy } from 'react'
import { useSearchParams } from 'react-router-dom'
import { HubTabs } from '../shared/HubTabs'
import ZoomConnectNudge from './ZoomConnectNudge'

const CalendarPage = lazy(() => import('../../pages/CalendarPage'))
const SchedulingSettingsPage = lazy(() => import('./SchedulingSettingsPage'))

/** Calendar & Consults, with the public booking-link settings beside it. */
export default function CalendarHubPage() {
  const [params] = useSearchParams()
  return (
    <div className="space-y-4">
      {/* The booking tab carries the full Zoom connection card. */}
      {params.get('tab') !== 'booking' && <ZoomConnectNudge />}
      <HubTabs
        label="Calendar"
        tabs={[
          { id: 'calendar', label: 'Calendar', render: () => <CalendarPage /> },
          { id: 'booking', label: 'Booking link', render: () => <SchedulingSettingsPage /> },
        ]}
      />
    </div>
  )
}
