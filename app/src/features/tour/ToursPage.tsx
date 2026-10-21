import { CheckCircle2, Compass, PlayCircle } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { PageHeader } from '../shared/ui'
import { chromeKey } from './tours'
import { useTours } from './TourProvider'

/** Help → Tours: start or replay a guided walkthrough. */
export default function ToursPage() {
  const { t } = useLanguage()
  const { progress, startTour, stepCount, activeTourId, tourIds } = useTours()

  return (
    <div className="space-y-4">
      <PageHeader title={t('attorneyTour.page.title')} description={t('attorneyTour.page.description')} />
      <div className="grid gap-4 md:grid-cols-2">
        {tourIds.map((tourId) => {
          const done = progress[tourId]?.status === 'completed'
          const steps = stepCount(tourId)
          return (
            <section key={tourId} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <Compass className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-slate-900">{t(chromeKey(tourId, `${tourId}.name`))}</h2>
                    {done ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t('attorneyTour.page.completed')}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{t(chromeKey(tourId, `${tourId}.summary`))}</p>
                  <p className="mt-2 text-xs text-slate-500">{t('attorneyTour.page.steps', { count: steps })}</p>
                </div>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  disabled={Boolean(activeTourId) || steps === 0}
                  onClick={() => void startTour(tourId)}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  <PlayCircle className="h-4 w-4" />
                  {done ? t('attorneyTour.page.replay') : t('attorneyTour.page.start')}
                </button>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
