/**
 * Plaintiff-facing case journey — plain labels for accessibility and trust.
 * Pre-retention funnel through consult, then post-retention milestones derived
 * from Assessment.caseStage (same spine attorneys see on Active Cases).
 */
import {
  FileText,
  Send,
  Search,
  UserCheck,
  CalendarCheck,
  Briefcase,
  HeartPulse,
  ScrollText,
  Scale,
  CheckCircle2,
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
    if (step.id === 'consult' && hasScheduledConsult) {
      label = t('plaintiffDashboard.pipeline.consultation')
      description = t('plaintiffDashboard.pipeline.consultationDesc')
    }
    return { ...step, label, description }
  })

  return (
    <section
      className="rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_10px_30px_-16px_rgba(15,23,42,0.16)] dark:shadow-none px-4 py-5 pb-6"
      aria-label={t('plaintiffDashboard.pipeline.aria')}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {t('plaintiffDashboard.pipeline.title')}
        </h2>
        {litigationLabel ? (
          <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
            {litigationLabel}
          </span>
        ) : null}
      </div>
      {specialStatus && (
        <div className={clsx('mb-4 rounded-lg px-3 py-2 text-sm', specialStatus.tone)}>
          <p className="font-semibold">{specialStatus.label}</p>
          <p className="mt-0.5">{specialStatus.message}</p>
        </div>
      )}
      <ol className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-10 gap-3">
        {steps.map((step, i) => {
          const complete = i < completeThrough
          const current = currentIdx >= 0 && i === currentIdx
          const Icon = step.icon
          return (
            <li
              key={step.id}
              className={clsx(
                'relative flex gap-3 sm:flex-col sm:items-center sm:text-center rounded-xl px-3 py-3 border transition-all duration-200 motion-reduce:transition-none',
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
        {t('plaintiffDashboard.pipeline.disclaimer')}
      </p>
    </section>
  )
}
