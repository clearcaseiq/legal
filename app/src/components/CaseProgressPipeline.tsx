/**
 * Plaintiff-facing case journey — plain labels for accessibility and trust.
 */
import { FileText, Send, Search, UserCheck, CalendarCheck } from 'lucide-react'
import { clsx } from 'clsx'

export type PipelineStage = 'draft' | 'submitted' | 'review' | 'matched' | 'consult'

const STEPS: { id: PipelineStage; label: string; description: string; icon: typeof FileText }[] = [
  { id: 'draft', label: 'Assessment', description: 'Your case summary', icon: FileText },
  { id: 'submitted', label: 'Submitted', description: 'Sent to attorneys', icon: Send },
  { id: 'review', label: 'Review', description: 'Attorneys evaluating', icon: Search },
  { id: 'matched', label: 'Matched', description: 'An attorney responded', icon: UserCheck },
  { id: 'consult', label: 'Next step', description: 'Schedule a consultation', icon: CalendarCheck },
]

export default function CaseProgressPipeline({
  submittedForReview,
  attorneyMatched,
  hasScheduledConsult,
  lifecycleState,
  statusMessage,
}: {
  submittedForReview: boolean
  attorneyMatched: boolean
  hasScheduledConsult: boolean
  lifecycleState?: string
  statusMessage?: string
}) {
  const specialStatus = lifecycleState === 'manual_review_needed'
    ? {
        label: 'Team review',
        tone: 'bg-amber-50 text-amber-800 border border-amber-200',
        message: statusMessage || 'Our team is checking routing fit and the next best step.'
      }
    : lifecycleState === 'plaintiff_info_requested'
    ? {
        label: 'More info needed',
        tone: 'bg-blue-50 text-blue-800 border border-blue-200',
        message: statusMessage || 'An attorney requested more information to continue reviewing your case.'
      }
    : lifecycleState === 'needs_more_info'
    ? {
        label: 'Case needs more info',
        tone: 'bg-blue-50 text-blue-800 border border-blue-200',
        message: statusMessage || 'Add a few more details so we can continue your case review.'
      }
    : lifecycleState === 'not_routable_yet'
    ? {
        label: 'Not routable yet',
        tone: 'bg-slate-50 text-slate-700 border border-slate-200',
        message: statusMessage || 'Your case needs stronger details or documentation before attorney routing.'
      }
    : null

  let currentIdx = 0
  if (hasScheduledConsult) currentIdx = 4
  else if (attorneyMatched) currentIdx = 3
  else if (submittedForReview) currentIdx = 2
  else currentIdx = 0

  return (
    <section
      className="rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60 shadow-sm dark:shadow-none px-4 py-5 pb-6"
      aria-label="Your case progress"
    >
      <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">
        Case status
      </h2>
      {specialStatus && (
        <div className={clsx('mb-4 rounded-lg px-3 py-2 text-sm', specialStatus.tone)}>
          <p className="font-semibold">{specialStatus.label}</p>
          <p className="mt-0.5">{specialStatus.message}</p>
        </div>
      )}
      <ol className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {STEPS.map((step, i) => {
          const complete = i < currentIdx
          const current = i === currentIdx
          const Icon = step.icon
          return (
            <li
              key={step.id}
              className={clsx(
                'relative flex gap-3 sm:flex-col sm:items-center sm:text-center rounded-lg px-3 py-3 border transition-all duration-200 motion-reduce:transition-none',
                complete && 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20',
                current && !complete && 'border-amber-300 dark:border-amber-700/80 bg-amber-50/60 dark:bg-amber-950/25 ring-1 ring-amber-200/80 dark:ring-amber-800/50 shadow-sm',
                !complete && !current && 'border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30'
              )}
            >
              <span
                className={clsx(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2',
                  complete && 'border-emerald-500 bg-emerald-500 text-white dark:bg-emerald-600 dark:border-emerald-500',
                  current && !complete && 'border-amber-500 text-amber-700 dark:text-amber-400 bg-white dark:bg-slate-900',
                  !complete && !current && 'border-slate-200 dark:border-slate-600 text-slate-400'
                )}
                aria-hidden
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p
                  className={clsx(
                    'text-sm font-medium',
                    (complete || current) && 'text-slate-900 dark:text-slate-50',
                    !complete && !current && 'text-slate-500 dark:text-slate-500'
                  )}
                >
                  {step.label}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{step.description}</p>
              </div>
            </li>
          )
        })}
      </ol>
      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        Plain-language summary of our process—not legal advice or a guarantee of results.
      </p>
    </section>
  )
}
