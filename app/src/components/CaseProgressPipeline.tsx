/**
 * Plaintiff-facing case journey — icon progress rail above labeled status cards,
 * with a one-line process disclaimer.
 */
import {
  FileText,
  Send,
  Search,
  UserCheck,
  CalendarCheck,
  MessagesSquare,
  Briefcase,
  HeartPulse,
  ScrollText,
  Scale,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useLanguage } from '../contexts/LanguageContext'
import { getPlaintiffPipelineProgress } from '../lib/caseStatus'

export type PipelineStage =
  | 'draft'
  | 'submitted'
  | 'review'
  | 'matched'
  | 'consult'
  | 'retained'
  | 'treatment'
  | 'demand'
  | 'negotiation'
  | 'closed'

const STEP_META: { id: PipelineStage; icon: typeof FileText; labelKey: string; descKey: string }[] = [
  { id: 'draft', icon: FileText, labelKey: 'assessment', descKey: 'assessmentDesc' },
  { id: 'submitted', icon: Send, labelKey: 'submitted', descKey: 'submittedDesc' },
  { id: 'review', icon: Search, labelKey: 'review', descKey: 'reviewDesc' },
  { id: 'matched', icon: UserCheck, labelKey: 'matched', descKey: 'matchedDesc' },
  { id: 'consult', icon: CalendarCheck, labelKey: 'consult', descKey: 'consultDesc' },
  { id: 'retained', icon: Briefcase, labelKey: 'retained', descKey: 'retainedDesc' },
  { id: 'treatment', icon: HeartPulse, labelKey: 'treatment', descKey: 'treatmentDesc' },
  { id: 'demand', icon: ScrollText, labelKey: 'demand', descKey: 'demandDesc' },
  { id: 'negotiation', icon: Scale, labelKey: 'negotiation', descKey: 'negotiationDesc' },
  { id: 'closed', icon: CheckCircle2, labelKey: 'closed', descKey: 'closedDesc' },
]

export default function CaseProgressPipeline({
  submittedForReview,
  attorneyMatched,
  hasScheduledConsult,
  retained,
  caseStage,
  lifecycleState,
  statusMessage,
  litigationLabel,
  statusBadge,
}: {
  submittedForReview: boolean
  attorneyMatched: boolean
  hasScheduledConsult: boolean
  retained?: boolean
  caseStage?: string | null
  lifecycleState?: string
  statusMessage?: string
  /** Optional secondary chip when the matter is in active litigation. */
  litigationLabel?: string | null
  /** Current status pill shown beside the section title. */
  statusBadge?: { label: string; className: string; showCheck?: boolean } | null
}) {
  const { t } = useLanguage()

  const specialStatus = lifecycleState === 'manual_review_needed'
    ? {
        label: t('plaintiffDashboard.pipeline.special.teamReview'),
        tone: 'bg-amber-50 text-amber-800 border border-amber-200',
        message: statusMessage || t('plaintiffDashboard.pipeline.special.teamReviewMsg'),
      }
    : lifecycleState === 'plaintiff_info_requested'
    ? {
        label: t('plaintiffDashboard.pipeline.special.moreInfo'),
        tone: 'bg-blue-50 text-blue-800 border border-blue-200',
        message: statusMessage || t('plaintiffDashboard.pipeline.special.moreInfoMsg'),
      }
    : lifecycleState === 'needs_more_info'
    ? {
        label: t('plaintiffDashboard.pipeline.special.needsInfo'),
        tone: 'bg-blue-50 text-blue-800 border border-blue-200',
        message: statusMessage || t('plaintiffDashboard.pipeline.special.needsInfoMsg'),
      }
    : lifecycleState === 'not_routable_yet'
    ? {
        label: t('plaintiffDashboard.pipeline.special.notRoutable'),
        tone: 'bg-slate-50 text-slate-700 border border-slate-200',
        message: statusMessage || t('plaintiffDashboard.pipeline.special.notRoutableMsg'),
      }
    : null

  const { currentIdx, completeThrough } = getPlaintiffPipelineProgress({
    submittedForReview,
    attorneyMatched,
    hasScheduledConsult,
    retained: !!retained,
    caseStage,
  })

  const steps = STEP_META.map((step) => {
    let label = t(`plaintiffDashboard.pipeline.${step.labelKey}`)
    let description = t(`plaintiffDashboard.pipeline.${step.descKey}`)
    let icon = step.icon
    if (step.id === 'consult' && hasScheduledConsult) {
      label = t('plaintiffDashboard.pipeline.consultation')
      description = t('plaintiffDashboard.pipeline.consultationDesc')
      icon = MessagesSquare
    }
    return { ...step, icon, label, description }
  })

  return (
    <section
      className="rounded-2xl border border-slate-200/80 bg-white px-4 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_10px_30px_-16px_rgba(15,23,42,0.16)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-none sm:px-6 sm:py-6"
      aria-label={t('plaintiffDashboard.pipeline.aria')}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl">
          {t('plaintiffDashboard.pipeline.title')}
        </h2>
        {litigationLabel ? (
          <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
            {litigationLabel}
          </span>
        ) : null}
        {statusBadge ? (
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadge.className}`}>
            {statusBadge.showCheck ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : null}
            {statusBadge.label}
          </span>
        ) : null}
      </div>

      {specialStatus && (
        <div className={clsx('mb-4 rounded-lg px-3 py-2 text-sm', specialStatus.tone)}>
          <p className="font-semibold">{specialStatus.label}</p>
          <p className="mt-0.5">{specialStatus.message}</p>
        </div>
      )}

      {/* Compact icon rail — visual progress above Case status cards */}
      <div className="-mx-1 mb-5 overflow-x-auto px-1 pb-1">
        <ol className="flex min-w-[40rem] items-start justify-between gap-0 xl:min-w-0" aria-hidden>
          {steps.map((step, i) => {
            const complete = i < completeThrough
            const current = currentIdx >= 0 && i === currentIdx
            const Icon = step.icon
            const nextIsComplete = i + 1 < completeThrough
            const nextIsCurrent = currentIdx === i + 1
            const showLine = i < steps.length - 1

            return (
              <li key={`rail-${step.id}`} className="relative flex min-w-0 flex-1 flex-col items-center px-0.5">
                {showLine && (
                  <span
                    className={clsx(
                      'pointer-events-none absolute left-[calc(50%+1.35rem)] right-[calc(-50%+1.35rem)] top-[2.05rem] h-[3px]',
                      (nextIsComplete || nextIsCurrent) && 'bg-emerald-600',
                      !nextIsComplete && !nextIsCurrent && 'border-t-[3px] border-dashed border-slate-300 bg-transparent dark:border-slate-600',
                    )}
                  />
                )}

                <span
                  className={clsx(
                    'relative z-[1] mb-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                    complete && 'bg-emerald-600 text-white',
                    current && 'bg-orange-500 text-white',
                    !complete && !current && 'bg-slate-300 text-white dark:bg-slate-600',
                  )}
                >
                  {i + 1}
                </span>

                <span
                  className={clsx(
                    'relative z-[1] flex h-10 w-10 items-center justify-center rounded-full border-[3px] sm:h-11 sm:w-11',
                    complete && 'border-emerald-600 bg-white text-emerald-600 dark:bg-slate-900',
                    current &&
                      'border-orange-500 bg-orange-500 text-white shadow-[0_0_0_5px_rgba(249,115,22,0.2)]',
                    !complete && !current && 'border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-900',
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={current || complete ? 2.25 : 2} />
                </span>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <ol className="flex min-w-[62rem] items-stretch gap-2 xl:min-w-0 xl:gap-2.5">
          {steps.map((step, i) => {
            const complete = i < completeThrough
            const current = currentIdx >= 0 && i === currentIdx
            const upcoming = !complete && !current
            const Icon = step.icon

            return (
              <li
                key={step.id}
                aria-current={current ? 'step' : undefined}
                className={clsx(
                  'relative flex min-w-[5.75rem] flex-1 flex-col items-center rounded-xl border px-2 py-3 text-center sm:min-w-0 sm:px-2.5 sm:py-3.5',
                  complete && 'border-emerald-200 bg-emerald-50/90 dark:border-emerald-800 dark:bg-emerald-950/40',
                  current && 'border-amber-400 bg-white shadow-[0_0_0_1px_rgba(251,191,36,0.35)] dark:border-amber-500 dark:bg-slate-900',
                  upcoming && 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/60',
                )}
              >
                <span
                  className={clsx(
                    'mb-2 flex h-10 w-10 items-center justify-center rounded-full sm:h-11 sm:w-11',
                    complete && 'bg-emerald-600 text-white',
                    current && 'bg-orange-100 text-orange-600 ring-2 ring-amber-400/70 dark:bg-orange-950/50 dark:text-orange-400',
                    upcoming && 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
                  )}
                  aria-hidden
                >
                  <Icon className="h-[1.15rem] w-[1.15rem] sm:h-5 sm:w-5" strokeWidth={current || complete ? 2.25 : 2} />
                </span>

                <p
                  className={clsx(
                    'text-[13px] font-bold leading-tight sm:text-sm',
                    current && 'text-orange-700 dark:text-orange-400',
                    complete && !current && 'text-slate-900 dark:text-slate-50',
                    upcoming && 'text-slate-400 dark:text-slate-500',
                  )}
                >
                  {step.label}
                </p>
                <p
                  className={clsx(
                    'mt-0.5 text-[10px] leading-snug sm:text-[11px]',
                    upcoming ? 'text-slate-400 dark:text-slate-500' : 'text-slate-500 dark:text-slate-400',
                  )}
                >
                  {step.description}
                </p>
              </li>
            )
          })}
        </ol>
      </div>

      <p className="mt-4 flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
        <span>{t('plaintiffDashboard.pipeline.disclaimer')}</span>
      </p>
    </section>
  )
}
