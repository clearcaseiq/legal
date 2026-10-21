import { Compass } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { useOptionalTours } from './TourProvider'

/** "Take a tour" link under the claimant dashboard tabs; replays the portal tour. */
export default function ClientTourButton() {
  const { t } = useLanguage()
  const tours = useOptionalTours()
  if (!tours) return null
  return (
    <div className="mt-2 flex justify-end">
      <button
        type="button"
        data-tour="client-tour-button"
        disabled={Boolean(tours.activeTourId)}
        onClick={() => void tours.startTour('client_portal')}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50 dark:text-brand-300 dark:hover:bg-brand-950/40"
      >
        <Compass className="h-4 w-4" aria-hidden />
        {tours.progress.client_portal?.status === 'completed' ? t('clientTour.replay') : t('clientTour.take')}
      </button>
    </div>
  )
}
