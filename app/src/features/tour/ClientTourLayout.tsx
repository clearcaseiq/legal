import { Outlet } from 'react-router-dom'
import { TourProvider } from './TourProvider'

/** Wraps the claimant portal routes so the client tour can move between them. */
export default function ClientTourLayout() {
  return (
    <TourProvider scope="client">
      <Outlet />
    </TourProvider>
  )
}
