import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Circle, Clock } from 'lucide-react'
import { getAttorneyReadiness, type AttorneyReadiness, type AttorneyReadinessItemId } from '../../lib/api'
import { useLanguage } from '../../contexts/LanguageContext'

const FIX_LINKS: Partial<Record<AttorneyReadinessItemId, string>> = {
  states: '/attorney-profile?tab=practice',
  caseTypes: '/attorney-profile?tab=practice',
  responseTime: '/attorney-profile?tab=preferences',
}

/**
 * Tells an attorney why New Matches is empty. Every item is a hard routing
 * filter; the banner disappears once all of them pass.
 */
export default function AttorneyReadinessBanner() {
  const { t } = useLanguage()
  const [readiness, setReadiness] = useState<AttorneyReadiness | null>(null)

  useEffect(() => {
    let cancelled = false
    getAttorneyReadiness()
      .then((data) => {
        if (!cancelled) setReadiness(data)
      })
      .catch(() => {
        // Without a status there is nothing truthful to show.
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!readiness || readiness.ready) return null

  const submitted = readiness.submittedAt
    ? new Date(readiness.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null
  const onlyApprovalLeft = readiness.items.every((item) => item.done || item.id === 'approval')

  return (
    <section
      aria-labelledby="attorney-readiness-title"
      className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950"
    >
      <div className="flex items-start gap-3">
        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 id="attorney-readiness-title" className="text-sm font-semibold">
            {t('attorneyWorkspace.readiness.title')}
          </h2>
          <p className="mt-0.5 text-sm text-amber-900">
            {onlyApprovalLeft
              ? t('attorneyWorkspace.readiness.onlyApproval')
              : t('attorneyWorkspace.readiness.intro')}
          </p>
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {readiness.items.map((item) => {
              const fix = FIX_LINKS[item.id]
              const label =
                item.id === 'approval' && !item.done && submitted
                  ? t('attorneyWorkspace.readiness.items.approvalPending', { date: submitted })
                  : t(`attorneyWorkspace.readiness.items.${item.id}`)
              return (
                <li key={item.id} className="flex items-center gap-2 text-sm">
                  {item.done ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                  )}
                  <span className={item.done ? 'text-amber-800/70 line-through' : 'font-medium'}>
                    <span className="sr-only">
                      {item.done ? t('attorneyWorkspace.readiness.done') : t('attorneyWorkspace.readiness.todo')}
                    </span>
                    {label}
                  </span>
                  {!item.done && fix && (
                    <Link to={fix} className="ml-auto shrink-0 text-xs font-semibold text-amber-800 underline">
                      {t('attorneyWorkspace.readiness.fix')}
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}
