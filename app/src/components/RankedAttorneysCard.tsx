import { clsx } from 'clsx'
import { useLanguage } from '../contexts/LanguageContext'

export type RankedAttorneyStatus = 'waiting' | 'reviewing' | 'accepted' | 'passed' | 'no_response'

export interface RankedAttorney {
  id: string
  rank: number
  name: string
  firmName?: string | null
  status: RankedAttorneyStatus
}

const STATUS_STYLES: Record<RankedAttorneyStatus, string> = {
  waiting: 'bg-slate-100 text-slate-600',
  reviewing: 'bg-blue-100 text-blue-800',
  accepted: 'bg-emerald-100 text-emerald-800',
  passed: 'bg-slate-100 text-slate-500',
  no_response: 'bg-amber-100 text-amber-800',
}

export default function RankedAttorneysCard({ attorneys }: { attorneys: RankedAttorney[] }) {
  const { t } = useLanguage()
  if (attorneys.length === 0) return null

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">{t('plaintiffDashboard.rankedAttorneys.title')}</h2>
      <p className="mt-1 text-sm text-slate-600">{t('plaintiffDashboard.rankedAttorneys.subtitle')}</p>
      <ol className="mt-4 divide-y divide-slate-100">
        {attorneys.map((attorney) => (
          <li key={attorney.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700"
                aria-label={t('plaintiffDashboard.rankedAttorneys.rank', { rank: attorney.rank })}
              >
                {attorney.rank}
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">{attorney.name}</p>
                {attorney.firmName && <p className="truncate text-sm text-slate-500">{attorney.firmName}</p>}
              </div>
            </div>
            <span className={clsx('rounded-full px-3 py-1 text-xs font-medium', STATUS_STYLES[attorney.status])}>
              {t(`plaintiffDashboard.rankedAttorneys.status.${attorney.status}`)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
