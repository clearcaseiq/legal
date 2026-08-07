import { Link } from 'react-router-dom'
import { CheckCircle, ChevronRight, Clock, Download, FileText, MessageCircle, Plus, TrendingUp, Upload, Users } from 'lucide-react'
import { formatCurrency } from '../lib/formatters'
import { linkify } from '../lib/linkify'
import { useLanguage } from '../contexts/LanguageContext'

type DeferredTabId = 'tasks' | 'documents' | 'attorney' | 'value' | 'journal' | 'insights' | 'evidence' | 'activity'

type ScoreFactor = {
  label: string
  value: string
  explanation: string
  improve: string | null
}

type CaseValueHistoryEntry = {
  label: string
  shortLabel: string
  value: number
}

type TreatmentEntry = {
  provider?: string
  type?: string
  date?: string
  dates?: string
  diagnosis?: string
  amount?: number
  label?: string
  details?: string
  sourceFileName?: string
  confidence?: string
}

type PotentialValueIncrease = {
  msg: string | null
  show: boolean
}

type EvidenceImpactItem = {
  label: string
  done: boolean
  impact: string
}

type RecentActivityItem = {
  label: string
  done: boolean
}

type DashboardTask = {
  label: string
  detail: string
  done: boolean
  href: string
}

type JournalEntry = {
  date: string
  level: number
  note: string
  days?: number
  dailyWage?: number
}

type AttorneyActivityItem = {
  type: string
  message: string
  timeAgo?: string
}

type CaseMessageItem = {
  subject?: string
  message: string
  createdAt: string
  from?: 'attorney' | 'plaintiff'
}

type Props = {
  activeTab: DeferredTabId
  activeAssessmentId: string
  /** Band describing how complete the case file is, e.g. "High". Never a number. */
  caseReadinessLabel: string
  scoreFactors: ScoreFactor[]
  caseValueHistory: CaseValueHistoryEntry[]
  maxValue: number
  settlementHigh: number
  liabilityLabel: string
  evidencePercent: number
  treatment: TreatmentEntry[]
  damagesLabel: string
  strengths: string[]
  riskLevel: 'Low' | 'Moderate' | 'High'
  venueState: string
  settlementMedian: number
  settlementLow: number
  caseCoachDisplay: {
    tip: string
    action: string
  }
  potentialValueIncrease: PotentialValueIncrease
  evidenceCount: number
  hasWageLoss: boolean
  onDownloadReport: () => void | Promise<void>
  tasks: DashboardTask[]
  evidenceImpact: EvidenceImpactItem[]
  recentActivity: RecentActivityItem[]
  notification: string | null
  wageDays: string
  onWageDaysChange: (value: string) => void
  wageDaily: string
  onWageDailyChange: (value: string) => void
  wageLossEstimate: number | null
  painLevel: number
  onPainLevelChange: (value: number) => void
  painNote: string
  onPainNoteChange: (value: string) => void
  onSavePainJournal: () => void
  editingEntryIndex: number | null
  onCancelEdit: () => void
  journalSaved: boolean
  journalError?: string | null
  journalEntries: JournalEntry[]
  onEditEntry: (index: number) => void
  onDeleteEntry: (index: number) => void
  submittedForReview: boolean
  attorneyMatched: boolean
  hasUpcomingConsult: boolean
  routingLifecycle?: string
  routingStatusMessage: string
  attorneyReviewCount: number
  attorneyActivity: AttorneyActivityItem[]
  caseMessages: CaseMessageItem[]
  attorneyName?: string
}

export default function PlaintiffDashboardDeferredTabPanel({
  activeTab,
  activeAssessmentId,
  caseReadinessLabel,
  scoreFactors,
  caseValueHistory,
  maxValue,
  settlementHigh,
  liabilityLabel,
  evidencePercent,
  treatment,
  damagesLabel,
  strengths,
  riskLevel,
  venueState,
  settlementMedian,
  settlementLow,
  caseCoachDisplay,
  potentialValueIncrease,
  evidenceCount,
  hasWageLoss,
  onDownloadReport,
  tasks,
  evidenceImpact,
  recentActivity,
  notification,
  wageDays,
  onWageDaysChange,
  wageDaily,
  onWageDailyChange,
  wageLossEstimate,
  painLevel,
  onPainLevelChange,
  painNote,
  onPainNoteChange,
  onSavePainJournal,
  editingEntryIndex,
  onCancelEdit,
  journalSaved,
  journalError,
  journalEntries,
  onEditEntry,
  onDeleteEntry,
  submittedForReview,
  attorneyMatched,
  hasUpcomingConsult,
  routingLifecycle,
  routingStatusMessage,
  attorneyReviewCount,
  attorneyActivity,
  caseMessages,
  attorneyName,
}: Props) {
  const { t } = useLanguage()
  // Intake stores each treatment as { type, <value> } where the value lives in a
  // type-specific field (imaging/procedure/recommendation/finding/status/notes),
  // while processed medical docs use provider/date/diagnosis/amount/details. Pull
  // whichever detail is present so the Medical Summary shows real information
  // instead of just a category label and a "-" (#23).
  const treatmentTypeLabels: Record<string, string> = {
    imaging: t('plaintiffDashboard.deferred.documents.typeImaging'),
    procedure: t('plaintiffDashboard.deferred.documents.typeProcedure'),
    future_treatment: t('plaintiffDashboard.deferred.documents.typeFutureTreatment'),
    surgery_status: t('plaintiffDashboard.deferred.documents.typeSurgeryStatus'),
    shoulder_finding: t('plaintiffDashboard.deferred.documents.typeShoulderFinding'),
    back_finding: t('plaintiffDashboard.deferred.documents.typeBackFinding'),
  }
  const humanizeTreatment = (value: string) =>
    value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  const treatmentDetailText = (entry: any): string => {
    const raw =
      entry.imaging ||
      entry.procedure ||
      entry.recommendation ||
      entry.finding ||
      entry.status ||
      entry.notes ||
      entry.details ||
      ''
    return typeof raw === 'string' ? raw.trim() : String(raw ?? '')
  }
  const treatmentTitle = (entry: any): string =>
    entry.label ||
    (entry.type ? treatmentTypeLabels[entry.type] || humanizeTreatment(String(entry.type)) : '') ||
    entry.provider ||
    t('plaintiffDashboard.deferred.documents.treatment')
  // OCR on sample/scanned docs often trails boilerplate ("DISCLAIMER: This document
  // is entirely fictitious…") into extracted fields. Strip that noise and cap length
  // so the Medical Summary stays readable (#doc-summary).
  const sanitizeExtracted = (value?: string, max = 90): string => {
    if (!value) return ''
    let s = String(value).split(/\bDISCLAIMER\b/i)[0]
    s = s.replace(/\s+/g, ' ').trim()
    return s.length > max ? `${s.slice(0, max).trimEnd()}…` : s
  }
  // Compact currency for the tight per-bar labels in the Case Value History
  // chart (e.g. "$15K"), so each bar can show its real value without crowding.
  const formatCompactCurrency = (value: number): string => {
    const n = Number(value) || 0
    if (Math.abs(n) >= 1000) {
      const k = n / 1000
      return `$${k % 1 === 0 ? k : k.toFixed(1)}K`
    }
    return `$${Math.round(n)}`
  }

  const meaningfulTreatment = treatment.filter((entry) => {
    const label = (entry.provider || entry.type || entry.label || '').trim()
    const hasDetails = Boolean(
      entry.date || entry.dates || entry.diagnosis || entry.amount || entry.details ||
      entry.sourceFileName || treatmentDetailText(entry)
    )
    if (!hasDetails && ['doctor', 'specialist'].includes(label.toLowerCase())) return false
    if (label.toLowerCase() === 'from uploaded records') return false
    return Boolean(label || hasDetails)
  })

  if (activeTab === 'tasks') {
    const openTasks = tasks.filter((task) => !task.done)
    const doneTasks = tasks.filter((task) => task.done)
    const totalTasks = tasks.length
    const donePct = totalTasks > 0 ? Math.round((doneTasks.length / totalTasks) * 100) : 0
    const taskKind = (href: string): 'upload' | 'message' | 'submit' | 'wait' =>
      href.includes('/evidence-upload')
        ? 'upload'
        : href.includes('/messaging')
        ? 'message'
        : href.includes('review=1')
        ? 'submit'
        : 'wait'

    return (
      <div className="space-y-5">
        {/* Progress header */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="font-display text-xl font-bold text-slate-900">{t('plaintiffDashboard.deferred.tasks.title')}</h3>
              <p className="mt-1 text-sm text-slate-600">
                {openTasks.length > 0
                  ? t(openTasks.length === 1 ? 'plaintiffDashboard.deferred.tasks.oneThing' : 'plaintiffDashboard.deferred.tasks.manyThings', { count: openTasks.length })
                  : t('plaintiffDashboard.deferred.tasks.caughtUp')}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-2xl font-bold text-emerald-600 tabular-nums">{doneTasks.length}<span className="text-sm font-medium text-slate-400">/{totalTasks}</span></p>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{t('plaintiffDashboard.deferred.tasks.done')}</p>
            </div>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${donePct}%` }} />
          </div>
        </div>

        {/* Open tasks */}
        {openTasks.length > 0 && (
          <div className="space-y-3">
            {openTasks.map((task) => {
              const kind = taskKind(task.href)
              const meta =
                kind === 'upload'
                  ? { Icon: Upload, tint: 'bg-amber-100 text-amber-700', cta: t('plaintiffDashboard.deferred.tasks.addDocuments'), ctaClass: 'bg-amber-500 text-white hover:bg-amber-600', ctaIcon: true, badge: t('plaintiffDashboard.deferred.tasks.strengthensBadge'), badgeClass: 'bg-amber-50 text-amber-700' }
                  : kind === 'message'
                  ? { Icon: MessageCircle, tint: 'bg-brand-100 text-brand-700', cta: t('plaintiffDashboard.deferred.tasks.openMessages'), ctaClass: 'bg-brand-600 text-white hover:bg-brand-700', ctaIcon: false, badge: null as string | null, badgeClass: '' }
                  : kind === 'submit'
                  ? { Icon: TrendingUp, tint: 'bg-brand-100 text-brand-700', cta: t('plaintiffDashboard.deferred.tasks.reviewSend'), ctaClass: 'bg-brand-600 text-white hover:bg-brand-700', ctaIcon: false, badge: null as string | null, badgeClass: '' }
                  : { Icon: Clock, tint: 'bg-slate-100 text-slate-500', cta: null as string | null, ctaClass: '', ctaIcon: false, badge: t('plaintiffDashboard.deferred.tasks.noActionBadge'), badgeClass: 'bg-slate-100 text-slate-500' }
              const Icon = meta.Icon
              return (
                <div key={`${task.label}-${task.detail}`} className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.tint}`}><Icon className="h-5 w-5" aria-hidden /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{task.label}</p>
                      {meta.badge && <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.badgeClass}`}>{meta.badge}</span>}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{task.detail}</p>
                    {meta.cta && (
                      <Link to={task.href} className={`mt-3 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold ${meta.ctaClass}`}>
                        {meta.ctaIcon && <Upload className="h-4 w-4" aria-hidden />}
                        {meta.cta}
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Completed tasks */}
        {doneTasks.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t('plaintiffDashboard.deferred.tasks.completed')}</p>
            <div className="space-y-2">
              {doneTasks.map((task) => (
                <div key={`${task.label}-${task.detail}`} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" aria-hidden />
                  <p className="text-sm font-medium text-slate-500 line-through">{task.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Case Coach tip */}
        <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white"><TrendingUp className="h-5 w-5" aria-hidden /></span>
            <p className="text-sm font-semibold text-brand-900">{t('plaintiffDashboard.deferred.tasks.coachTip')}</p>
          </div>
          <p className="mt-2 text-sm font-semibold text-brand-900">{caseCoachDisplay.tip}</p>
          <p className="mt-1 text-sm text-brand-800">{caseCoachDisplay.action}</p>
        </div>
      </div>
    )
  }

  if (activeTab === 'attorney') {
    const inTeamReview = routingLifecycle === 'manual_review_needed'
    const statusTitle = attorneyMatched
      ? t('plaintiffDashboard.deferred.attorney.statusMatched')
      : inTeamReview
      ? t('plaintiffDashboard.deferred.attorney.statusTeamReview')
      : submittedForReview
      ? t('plaintiffDashboard.deferred.attorney.statusReviewProgress')
      : t('plaintiffDashboard.deferred.attorney.statusNotSubmitted')
    const stageMeta = attorneyMatched
      ? { tint: 'from-emerald-600 to-emerald-700', Icon: CheckCircle }
      : inTeamReview
      ? { tint: 'from-amber-500 to-amber-600', Icon: Clock }
      : submittedForReview
      ? { tint: 'from-brand-600 to-brand-700', Icon: Clock }
      : { tint: 'from-slate-500 to-slate-600', Icon: Clock }
    const StageIcon = stageMeta.Icon
    const reviewSteps = [
      { label: t('plaintiffDashboard.deferred.attorney.stepSubmitted'), done: submittedForReview || attorneyMatched, current: false },
      { label: t('plaintiffDashboard.deferred.attorney.stepUnderReview'), done: attorneyMatched, current: submittedForReview && !attorneyMatched },
      { label: t('plaintiffDashboard.deferred.attorney.stepMatched'), done: attorneyMatched, current: false },
      { label: t('plaintiffDashboard.deferred.attorney.stepConsultation'), done: hasUpcomingConsult, current: attorneyMatched && !hasUpcomingConsult },
    ]

    return (
      <div className="space-y-5">
        {/* Status hero */}
        <section className={`overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br ${stageMeta.tint} p-6 text-white shadow-sm`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">{t('plaintiffDashboard.deferred.attorney.heading')}</p>
              <h3 className="mt-1 font-display text-2xl font-bold">{statusTitle}</h3>
              <p className="mt-1 max-w-md text-sm text-white/90">
                {routingStatusMessage ||
                  (submittedForReview
                    ? t('plaintiffDashboard.deferred.attorney.respond24')
                    : t('plaintiffDashboard.deferred.attorney.submitWhenReady'))}
              </p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25"><StageIcon className="h-6 w-6" aria-hidden /></span>
          </div>
          <div className="mt-5 flex items-center gap-2">
            {reviewSteps.map((s, i) => (
              <div key={s.label} className="flex flex-1 items-center gap-2">
                <div className="flex items-center gap-2">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${s.done ? 'bg-white text-slate-900' : s.current ? 'bg-white/30 text-white ring-2 ring-white/70' : 'bg-white/15 text-white/80'}`}>{s.done ? '✓' : i + 1}</span>
                  <span className="hidden text-xs font-medium text-white/90 sm:inline">{s.label}</span>
                </div>
                {i < reviewSteps.length - 1 && <span className={`h-0.5 flex-1 rounded-full ${s.done ? 'bg-white' : 'bg-white/25'}`} />}
              </div>
            ))}
          </div>
        </section>

        {/* Stat tiles */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2"><Users className="h-4 w-4 text-brand-600" aria-hidden /><p className="text-xs font-medium text-slate-500">{t('plaintiffDashboard.deferred.attorney.reviewing')}</p></div>
            <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{attorneyReviewCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-slate-400" aria-hidden /><p className="text-xs font-medium text-slate-500">{t('plaintiffDashboard.deferred.attorney.matched')}</p></div>
            <p className="mt-1 text-sm font-semibold text-slate-900">{attorneyMatched ? attorneyName || t('plaintiffDashboard.deferred.attorney.statusMatched') : t('plaintiffDashboard.deferred.attorney.notYet')}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-slate-400" aria-hidden /><p className="text-xs font-medium text-slate-500">{t('plaintiffDashboard.deferred.attorney.consultation')}</p></div>
            <p className="mt-1 text-sm font-semibold text-slate-900">{hasUpcomingConsult ? t('plaintiffDashboard.deferred.attorney.scheduled') : t('plaintiffDashboard.deferred.attorney.notScheduled')}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {submittedForReview ? (
            <Link to={`/results/${activeAssessmentId}`} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
              {t('plaintiffDashboard.deferred.attorney.viewReport')}
            </Link>
          ) : (
            <Link to={`/results/${activeAssessmentId}?review=1`} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
              {t('plaintiffDashboard.deferred.attorney.submitForReview')}
            </Link>
          )}
          <Link to={`/evidence-upload/${activeAssessmentId}`} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600">
            <Upload className="h-4 w-4" aria-hidden />
            {t('plaintiffDashboard.deferred.attorney.uploadDocuments')}
          </Link>
        </div>

        {/* Messages */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-brand-600" aria-hidden />
            <h3 className="font-display text-lg font-bold text-slate-900">{t('plaintiffDashboard.deferred.attorney.messages')}</h3>
          </div>
          {caseMessages.length > 0 ? (
            <div className="mt-4 space-y-3">
              {caseMessages.map((message, index) => {
                const isYou = message.from === 'plaintiff'
                return (
                  <div key={`${message.createdAt}-${index}`} className={`rounded-xl border p-4 ${isYou ? 'border-brand-100 bg-brand-50/50' : 'border-slate-200 bg-slate-50'}`}>
                    <p className="mb-1 text-xs font-semibold text-slate-500">{isYou ? t('plaintiffDashboard.deferred.attorney.you') : attorneyName || t('plaintiffDashboard.deferred.attorney.attorney')}</p>
                    {message.subject && <p className="text-sm font-semibold text-slate-900">{message.subject}</p>}
                    <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{linkify(message.message)}</p>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
              <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600"><MessageCircle className="h-6 w-6" aria-hidden /></span>
              <p className="text-sm font-medium text-slate-700">{submittedForReview ? t('plaintiffDashboard.deferred.attorney.noMessagesYet') : t('plaintiffDashboard.deferred.attorney.messagesAfterSubmit')}</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                {submittedForReview
                  ? t('plaintiffDashboard.deferred.attorney.noMessagesBody')
                  : t('plaintiffDashboard.deferred.attorney.submitToReceive')}
              </p>
            </div>
          )}
        </div>

        {/* Review activity */}
        {attorneyActivity.length > 0 && (
          <details className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between text-base font-bold text-slate-900">
              <span>{t('plaintiffDashboard.deferred.attorney.reviewActivity')}</span>
              <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-90" aria-hidden />
            </summary>
            <div className="mt-4 space-y-3">
              {attorneyActivity.slice(0, 6).map((activity, index) => (
                <div key={`${activity.message}-${index}`} className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-hidden />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{activity.message}</p>
                    <p className="text-xs text-slate-500">{activity.timeAgo || t('plaintiffDashboard.deferred.attorney.recentUpdate')}</p>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    )
  }

  if (activeTab === 'insights') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {t('plaintiffDashboard.deferred.insights.whatDrives')}
          </h3>
          <div className="space-y-4">
            {scoreFactors.map((factor) => (
              <div key={factor.label} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-gray-900">{factor.label}</span>
                  <span
                    className={`font-semibold ${
                      factor.value === 'Strong' || factor.value === 'Documented'
                        ? 'text-green-600'
                        : factor.value === 'Improving'
                          ? 'text-brand-600'
                          : 'text-amber-600'
                    }`}
                  >
                    {factor.value}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{factor.explanation}</p>
                {factor.improve && <p className="text-sm text-brand-600 font-medium">{t('plaintiffDashboard.deferred.insights.howToImprove', { improve: factor.improve })}</p>}
              </div>
            ))}
          </div>
        </div>

        {scoreFactors.some((factor) => factor.improve) && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{t('plaintiffDashboard.deferred.insights.howToImproveScore')}</h3>
            <ul className="space-y-2">
              {scoreFactors
                .filter((factor) => factor.improve)
                .map((factor) => (
                  <li key={factor.label} className="flex items-start gap-2 text-sm">
                    <span className="text-brand-600 font-medium shrink-0">•</span>
                    <span className="text-gray-700">{factor.improve}</span>
                  </li>
                ))}
            </ul>
            <Link
              to={`/evidence-upload/${activeAssessmentId}`}
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700"
            >
              <Upload className="h-4 w-4" />
              {t('plaintiffDashboard.deferred.insights.uploadEvidence')}
            </Link>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-brand-600" />
            {t('plaintiffDashboard.deferred.insights.valueHistory')}
          </h3>
          <div className="flex items-end gap-2 mb-4">
            {caseValueHistory.map((entry, index) => {
              const barHeight = maxValue > 0 ? Math.max(16, Math.round((entry.value / maxValue) * 64)) : 16
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <div className="w-full flex flex-col justify-end" style={{ height: 64 }}>
                    <div className="w-full bg-brand-500 rounded-t transition-all" style={{ height: barHeight }} />
                  </div>
                  <span className="text-[11px] font-semibold text-gray-700" title={entry.label}>
                    {formatCompactCurrency(entry.value)}
                  </span>
                  <span className="text-[10px] text-gray-400" title={entry.label}>
                    {entry.shortLabel}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="space-y-1 text-sm text-gray-600">
            <p>{t('plaintiffDashboard.deferred.insights.initialEstimate', { value: formatCurrency(caseValueHistory[0]?.value ?? 0) })}</p>
            {caseValueHistory.length > 2 && <p>{t('plaintiffDashboard.deferred.insights.afterInjury', { value: formatCurrency(caseValueHistory[1]?.value ?? 0) })}</p>}
            <p className="font-semibold text-brand-600">{t('plaintiffDashboard.deferred.insights.currentEstimate', { value: formatCurrency(settlementHigh) })}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {t('plaintiffDashboard.deferred.insights.caseReadiness', { label: caseReadinessLabel })}
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-500">{t('plaintiffDashboard.deferred.insights.liability')}</p>
              <p
                className={`font-semibold ${
                  liabilityLabel === 'Strong'
                    ? 'text-green-600'
                    : liabilityLabel === 'Moderate'
                      ? 'text-amber-600'
                      : 'text-red-600'
                }`}
              >
                {liabilityLabel}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-500">{t('plaintiffDashboard.deferred.insights.evidence')}</p>
              <p
                className={`font-semibold ${
                  evidencePercent >= 75 ? 'text-green-600' : evidencePercent >= 25 ? 'text-amber-600' : 'text-red-600'
                }`}
              >
                {evidencePercent >= 75 ? t('plaintiffDashboard.deferred.insights.complete') : evidencePercent >= 25 ? t('plaintiffDashboard.deferred.insights.incomplete') : t('plaintiffDashboard.deferred.insights.missing')}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-500">{t('plaintiffDashboard.deferred.insights.medicalTreatment')}</p>
              <p className={`font-semibold ${treatment.length > 0 ? 'text-green-600' : 'text-amber-600'}`}>
                {treatment.length > 0 ? t('plaintiffDashboard.deferred.insights.good') : t('plaintiffDashboard.deferred.insights.missing')}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-500">{t('plaintiffDashboard.deferred.insights.damages')}</p>
              <p className={`font-semibold ${damagesLabel === 'Documented' ? 'text-green-600' : 'text-amber-600'}`}>
                {damagesLabel === 'Documented' ? t('plaintiffDashboard.deferred.insights.documented') : t('plaintiffDashboard.deferred.insights.missingDocumentation')}
              </p>
            </div>
          </div>
          {scoreFactors.some((factor) => factor.improve) && (
            <p className="text-sm text-brand-600 font-medium">{t('plaintiffDashboard.deferred.insights.tip', { tip: scoreFactors.find((factor) => factor.improve)?.improve ?? '' })}</p>
          )}
        </div>

        {strengths.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{t('plaintiffDashboard.deferred.insights.yourStrengths')}</h3>
            <ul className="space-y-2">
              {strengths.map((strength) => (
                <li key={strength} className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                  {strength}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{t('plaintiffDashboard.deferred.insights.insuranceChallenge')}</h3>
          <p className="text-sm text-gray-600 mb-2">{t('plaintiffDashboard.deferred.insights.adjustersQuestion')}</p>
          <ul className="text-sm text-gray-600 space-y-1 mb-4">
            <li>• {t('plaintiffDashboard.deferred.insights.gapsTreatment')}</li>
            <li>• {t('plaintiffDashboard.deferred.insights.missingInjuryDocs')}</li>
            <li>• {t('plaintiffDashboard.deferred.insights.unclearDescriptions')}</li>
          </ul>
          <p className="text-sm text-brand-600 font-medium">{t('plaintiffDashboard.deferred.insights.uploadReduces')}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{t('plaintiffDashboard.deferred.insights.riskLevel')}</h3>
          <div className="flex items-center gap-1 mb-2">
            <span className={`text-sm font-medium px-3 py-1 rounded ${riskLevel === 'Low' ? 'bg-green-100 text-green-700' : 'text-gray-500'}`}>
              {t('plaintiffDashboard.deferred.insights.low')}
            </span>
            <span className="text-gray-400">-</span>
            <span
              className={`text-sm font-medium px-3 py-1 rounded ${riskLevel === 'Moderate' ? 'bg-amber-100 text-amber-700' : 'text-gray-500'}`}
            >
              {t('plaintiffDashboard.deferred.insights.moderate')}
            </span>
            <span className="text-gray-400">-</span>
            <span className={`text-sm font-medium px-3 py-1 rounded ${riskLevel === 'High' ? 'bg-red-100 text-red-700' : 'text-gray-500'}`}>
              {t('plaintiffDashboard.deferred.insights.high')}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            {t('plaintiffDashboard.deferred.insights.yourRiskLevel')}{' '}
            <span
              className={`font-semibold ${
                riskLevel === 'Low' ? 'text-green-600' : riskLevel === 'Moderate' ? 'text-amber-600' : 'text-red-600'
              }`}
            >
              {riskLevel === 'Low' ? t('plaintiffDashboard.deferred.insights.low') : riskLevel === 'Moderate' ? t('plaintiffDashboard.deferred.insights.moderate') : t('plaintiffDashboard.deferred.insights.high')}
            </span>
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{t('plaintiffDashboard.deferred.insights.casesLikeYours', { state: venueState })}</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-3 bg-brand-50 rounded-lg">
              <p className="text-xs font-medium text-brand-600">{t('plaintiffDashboard.deferred.insights.typicalSettlement')}</p>
              <p className="text-lg font-bold text-brand-900">{formatCurrency(settlementMedian)}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-500">{t('plaintiffDashboard.deferred.insights.range')}</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatCurrency(settlementLow)} - {formatCurrency(settlementHigh)}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-500">{t('plaintiffDashboard.deferred.insights.typicalTimeline')}</p>
              <p className="text-sm font-semibold text-gray-900">{t('plaintiffDashboard.deferred.insights.months8')}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-3">{t('plaintiffDashboard.deferred.insights.reinforces')}</p>
        </div>

        <div className="bg-brand-50 border border-brand-100 rounded-xl p-4">
          <p className="text-sm font-semibold text-brand-900 mb-2">{t('plaintiffDashboard.deferred.insights.caseCoach')}</p>
          <p className="text-sm text-brand-800 mb-1">{t('plaintiffDashboard.deferred.insights.tip', { tip: caseCoachDisplay.tip })}</p>
          <p className="text-sm text-brand-700 font-medium">{caseCoachDisplay.action}</p>
        </div>

        {potentialValueIncrease.show && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-green-900 mb-2">{t('plaintiffDashboard.deferred.insights.potentialIncrease')}</h3>
            <p className="text-sm text-green-800">{potentialValueIncrease.msg}</p>
          </div>
        )}

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">{t('plaintiffDashboard.deferred.insights.analysisConfidence')}</h3>
          <p className="text-sm text-gray-600">
            {evidenceCount === 0 || !hasWageLoss
              ? t('plaintiffDashboard.deferred.insights.confidenceLow')
              : t('plaintiffDashboard.deferred.insights.confidenceHigh')}
          </p>
        </div>

        <div className="flex gap-2 md:col-span-2">
          <Link
            to={`/evidence-upload/${activeAssessmentId}`}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700"
          >
            <Upload className="h-4 w-4" />
            {t('plaintiffDashboard.deferred.insights.uploadEvidence')}
          </Link>
          <button
            type="button"
            onClick={() => {
              void onDownloadReport()
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-600 border border-brand-200 rounded-lg hover:bg-brand-50"
          >
            <Download className="h-4 w-4" />
            {t('plaintiffDashboard.deferred.insights.downloadReport')}
          </button>
          <Link
            to="/assessment/start"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Plus className="h-4 w-4" />
            {t('plaintiffDashboard.deferred.insights.startNewCase')}
          </Link>
        </div>
      </div>
    )
  }

  if (activeTab === 'documents' || activeTab === 'evidence') {
    const docsAdded = evidenceImpact.filter((item) => item.done).length
    const docsTotal = evidenceImpact.length
    const docsPct = docsTotal > 0 ? Math.round((docsAdded / docsTotal) * 100) : 0
    const medicalTotal = meaningfulTreatment.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
    return (
      <div className="space-y-5">
        {/* Documents & Evidence */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="font-display text-xl font-bold text-slate-900">{t('plaintiffDashboard.deferred.documents.title')}</h3>
              <p className="mt-1 text-sm text-slate-600">{t('plaintiffDashboard.deferred.documents.subtitle')}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-2xl font-bold text-emerald-600 tabular-nums">{docsAdded}<span className="text-sm font-medium text-slate-400">/{docsTotal}</span></p>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{t('plaintiffDashboard.deferred.documents.added')}</p>
            </div>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${docsPct}%` }} />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {evidenceImpact.map((item) => (
              <div key={item.label} className={`flex items-center gap-3 rounded-xl border p-3 ${item.done ? 'border-emerald-100 bg-emerald-50/50' : 'border-slate-200 bg-white'}`}>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.done ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-700'}`}>
                  {item.done ? <CheckCircle className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
                </span>
                <p className={`min-w-0 flex-1 truncate text-sm font-medium ${item.done ? 'text-slate-500' : 'text-slate-800'}`}>{item.label}</p>
                {item.done ? (
                  <span className="shrink-0 text-[11px] font-semibold text-emerald-600">{t('plaintiffDashboard.deferred.documents.addedBadge')}</span>
                ) : (
                  <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">{item.impact}</span>
                )}
              </div>
            ))}
          </div>
          <Link
            to={`/evidence-upload/${activeAssessmentId}`}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"
          >
            <Upload className="h-4 w-4" aria-hidden />
            {t('plaintiffDashboard.deferred.documents.uploadDocuments')}
          </Link>
        </div>

        {/* Medical Summary */}
        {meaningfulTreatment.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-xl font-bold text-slate-900">{t('plaintiffDashboard.deferred.documents.medicalSummary')}</h3>
              {medicalTotal > 0 && (
                <div className="shrink-0 text-right">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{t('plaintiffDashboard.deferred.documents.documentedBills')}</p>
                  <p className="text-lg font-bold text-slate-900 tabular-nums">{formatCurrency(medicalTotal)}</p>
                </div>
              )}
            </div>
            <div className="mt-4 space-y-2">
              {meaningfulTreatment.map((entry, index) => {
                const title = treatmentTitle(entry)
                const detail = sanitizeExtracted(treatmentDetailText(entry))
                const dateText = entry.date || entry.dates
                const provider = entry.provider && entry.provider !== title ? sanitizeExtracted(entry.provider, 70) : ''
                const diagnosis = sanitizeExtracted(entry.diagnosis, 70)
                return (
                  <div key={index} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><FileText className="h-4 w-4" aria-hidden /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-slate-900">{title}</p>
                        {dateText && <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">{dateText}</span>}
                      </div>
                      {provider && <p className="mt-0.5 truncate text-sm text-slate-600">{provider}</p>}
                      {!provider && detail && detail !== title && <p className="mt-0.5 truncate text-sm text-slate-600">{detail}</p>}
                      {diagnosis && <p className="text-sm text-slate-600">{t('plaintiffDashboard.deferred.documents.diagnosis', { diagnosis })}</p>}
                      {entry.sourceFileName && <p className="mt-1 text-xs text-slate-400">{t('plaintiffDashboard.deferred.documents.fromFile', { file: entry.sourceFileName })}</p>}
                    </div>
                    {entry.amount ? <p className="shrink-0 text-right text-sm font-bold text-slate-900 tabular-nums">{formatCurrency(entry.amount)}</p> : null}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <Link
          to={`/evidence-upload/${activeAssessmentId}`}
          className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-600 hover:border-amber-400 hover:text-amber-700"
        >
          <Upload className="h-4 w-4" aria-hidden />
          {t('plaintiffDashboard.deferred.documents.manageDocuments')}
        </Link>
      </div>
    )
  }

  if (activeTab === 'value') {
    const initialValue = caseValueHistory[0]?.value ?? 0
    const currentValue = settlementHigh
    const valueGain = currentValue - initialValue
    const valueGainPct = initialValue > 0 ? Math.round((valueGain / initialValue) * 100) : 0
    const rangeSpan = Math.max(1, settlementHigh - settlementLow)
    const midpoint = settlementMedian || Math.round((settlementLow + settlementHigh) / 2)
    const markerPct = Math.min(100, Math.max(0, Math.round(((midpoint - settlementLow) / rangeSpan) * 100)))

    return (
      <div className="space-y-5">
        {/* Value hero */}
        <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-brand-600 to-brand-700 p-6 text-white shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">{t('plaintiffDashboard.deferred.value.estimatedValue')}</p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums">{formatCurrency(settlementLow)} – {formatCurrency(settlementHigh)}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/90">
            <span>{t('plaintiffDashboard.deferred.value.mostLikely')} <span className="font-semibold text-white">{formatCurrency(midpoint)}</span></span>
            {valueGain > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold ring-1 ring-white/25">
                <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                {t('plaintiffDashboard.deferred.value.sinceFirst', { gain: formatCurrency(valueGain), pct: valueGainPct > 0 ? ` (+${valueGainPct}%)` : '' })}
              </span>
            )}
          </div>
        </section>

        {/* Case Value History */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-brand-600" aria-hidden />
            <h3 className="font-display text-lg font-bold text-slate-900">{t('plaintiffDashboard.deferred.value.valueHistory')}</h3>
          </div>
          <p className="mt-1 text-sm text-slate-500">{t('plaintiffDashboard.deferred.value.historySubtitle')}</p>
          <div className="mt-5 flex items-end gap-2 sm:gap-3">
            {caseValueHistory.map((entry, index) => {
              const isCurrent = index === caseValueHistory.length - 1
              const barHeight = maxValue > 0 ? Math.max(20, Math.round((entry.value / maxValue) * 120)) : 20
              return (
                <div key={index} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                  <span className={`text-[11px] font-bold tabular-nums ${isCurrent ? 'text-brand-700' : 'text-slate-600'}`} title={entry.label}>
                    {formatCompactCurrency(entry.value)}
                  </span>
                  <div className="flex w-full flex-col justify-end" style={{ height: 120 }}>
                    <div className={`w-full rounded-t-md transition-all ${isCurrent ? 'bg-gradient-to-t from-brand-600 to-brand-400' : 'bg-slate-200'}`} style={{ height: barHeight }} />
                  </div>
                  <span className={`truncate text-[10px] ${isCurrent ? 'font-semibold text-brand-600' : 'text-slate-400'}`} title={entry.label}>
                    {entry.shortLabel}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
            <span className="text-slate-500">{t('plaintiffDashboard.deferred.value.initial')} <span className="font-medium text-slate-700">{formatCurrency(initialValue)}</span></span>
            <span className="font-semibold text-brand-700">{t('plaintiffDashboard.deferred.value.current')} {formatCurrency(currentValue)}</span>
          </div>
        </div>

        {/* Cases Like Yours */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-display text-lg font-bold text-slate-900">{t('plaintiffDashboard.deferred.value.casesLikeYours', { state: venueState })}</h3>
          <p className="mt-1 text-sm text-slate-500">{t('plaintiffDashboard.deferred.value.benchmarkSubtitle')}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{t('plaintiffDashboard.deferred.value.typicalLow')}</p>
              <p className="mt-0.5 text-lg font-bold text-slate-900 tabular-nums">{formatCurrency(settlementLow)}</p>
            </div>
            <div className="rounded-xl border border-brand-100 bg-brand-50 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-brand-600">{t('plaintiffDashboard.deferred.value.average')}</p>
              <p className="mt-0.5 text-lg font-bold text-brand-900 tabular-nums">{formatCurrency(settlementMedian)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{t('plaintiffDashboard.deferred.value.typicalHigh')}</p>
              <p className="mt-0.5 text-lg font-bold text-slate-900 tabular-nums">{formatCurrency(settlementHigh)}</p>
            </div>
          </div>
          <div className="mt-5">
            <div className="relative h-2.5 w-full rounded-full bg-gradient-to-r from-slate-200 via-brand-200 to-slate-200">
              <span className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand-600 shadow" style={{ left: `${markerPct}%` }} aria-hidden />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-slate-400">
              <span>{formatCurrency(settlementLow)}</span>
              <span className="font-medium text-brand-600">{t('plaintiffDashboard.deferred.value.yourEstimate')}</span>
              <span>{formatCurrency(settlementHigh)}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (activeTab === 'activity') {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{t('plaintiffDashboard.deferred.activity.title')}</h3>
          <ul className="space-y-3">
            {recentActivity.map((item) => (
              <li key={item.label} className="flex items-center gap-3 text-sm">
                {item.done ? (
                  <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-gray-300 shrink-0" />
                )}
                <span className={item.done ? 'text-gray-700' : 'text-gray-500'}>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
        {notification && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-sm font-medium text-green-800">{t('plaintiffDashboard.deferred.activity.update')}</p>
            <p className="text-sm text-green-700">{notification}</p>
          </div>
        )}
      </div>
    )
  }

  const painTone =
    painLevel <= 3
      ? { chip: 'bg-emerald-100 text-emerald-700', label: t('plaintiffDashboard.deferred.journal.mild') }
      : painLevel <= 6
      ? { chip: 'bg-amber-100 text-amber-700', label: t('plaintiffDashboard.deferred.journal.moderate') }
      : { chip: 'bg-red-100 text-red-700', label: t('plaintiffDashboard.deferred.journal.severe') }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="font-display text-xl font-bold text-slate-900">{t('plaintiffDashboard.deferred.journal.title')}</h3>
        <p className="mt-1 text-sm text-slate-600">{t('plaintiffDashboard.deferred.journal.subtitle')}</p>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {/* Lost wages */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
            <p className="text-sm font-semibold text-slate-900">{t('plaintiffDashboard.deferred.journal.lostWages')}</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-500">{t('plaintiffDashboard.deferred.journal.daysMissed')}</label>
                <input
                  type="number"
                  min="0"
                  max="3650"
                  step="1"
                  value={wageDays}
                  onChange={(event) => onWageDaysChange(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="8"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">{t('plaintiffDashboard.deferred.journal.dailyWage')}</label>
                <input
                  type="number"
                  min="0"
                  max="100000"
                  step="0.01"
                  value={wageDaily}
                  onChange={(event) => onWageDailyChange(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="220"
                />
              </div>
            </div>
            {wageLossEstimate != null && (
              <div className="mt-4 flex items-center justify-between rounded-lg border border-brand-100 bg-brand-50 px-3 py-2.5">
                <span className="text-xs font-medium text-brand-700">{t('plaintiffDashboard.deferred.journal.wageLossClaim')}</span>
                <span className="text-lg font-bold text-brand-900 tabular-nums">{formatCurrency(wageLossEstimate)}</span>
              </div>
            )}
          </div>

          {/* Pain + note */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">{t('plaintiffDashboard.deferred.journal.painToday')}</p>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${painTone.chip}`}>{t('plaintiffDashboard.deferred.journal.painValue', { level: painLevel, label: painTone.label })}</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-slate-400">0</span>
              <input
                type="range"
                min="0"
                max="10"
                value={painLevel}
                onChange={(event) => onPainLevelChange(parseInt(event.target.value, 10))}
                className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-200"
              />
              <span className="text-xs text-slate-400">10</span>
            </div>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              {t('plaintiffDashboard.deferred.journal.affectDay')} <span className="text-red-500">*</span>
            </label>
            <p className="mt-0.5 text-xs text-slate-500">{t('plaintiffDashboard.deferred.journal.affectExamples')}</p>
            <textarea
              value={painNote}
              onChange={(event) => onPainNoteChange(event.target.value)}
              placeholder={t('plaintiffDashboard.deferred.journal.notePlaceholder')}
              aria-invalid={journalError ? true : undefined}
              maxLength={2000}
              className={`mt-2 w-full min-h-[84px] rounded-lg border px-3 py-2 text-sm ${journalError ? 'border-red-400' : 'border-slate-300'}`}
            />
            {journalError && <p className="mt-1 text-sm text-red-600">{journalError}</p>}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onSavePainJournal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" aria-hidden />
            {editingEntryIndex !== null ? t('plaintiffDashboard.deferred.journal.updateEntry') : t('plaintiffDashboard.deferred.journal.logEntry')}
          </button>
          {editingEntryIndex !== null && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              {t('plaintiffDashboard.deferred.journal.cancel')}
            </button>
          )}
          {journalSaved && <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600"><CheckCircle className="h-4 w-4" aria-hidden />{t('plaintiffDashboard.deferred.journal.entrySaved')}</span>}
        </div>
      </div>

      {journalEntries.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h4 className="font-display text-lg font-bold text-slate-900">{t('plaintiffDashboard.deferred.journal.yourEntries')}</h4>
          <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
            {[...journalEntries].reverse().map((entry, displayIndex) => {
              const originalIndex = journalEntries.length - 1 - displayIndex
              const lvl = entry.level ?? 0
              const tone = lvl <= 3 ? 'bg-emerald-100 text-emerald-700' : lvl <= 6 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
              const hasDays = typeof entry.days === 'number' && entry.days > 0
              const hasWage = typeof entry.dailyWage === 'number' && entry.dailyWage > 0
              return (
                <div key={originalIndex} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{t('plaintiffDashboard.deferred.journal.painLabel', { level: lvl })}</span>
                        <span className="text-xs text-slate-500">
                          {new Date(entry.date).toLocaleDateString()} · {new Date(entry.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                      {entry.note && <p className="mt-2 text-sm text-slate-700">{entry.note}</p>}
                      {(hasDays || hasWage) && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {hasDays && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{t('plaintiffDashboard.deferred.journal.daysMissedTag', { days: entry.days! })}</span>}
                          {hasWage && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{t('plaintiffDashboard.deferred.journal.perDay', { amount: formatCurrency(entry.dailyWage!) })}</span>}
                          {hasDays && hasWage && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">{t('plaintiffDashboard.deferred.journal.wageLossTag', { amount: formatCurrency(entry.days! * entry.dailyWage!) })}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => onEditEntry(originalIndex)}
                        className="rounded-md px-2 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50"
                      >
                        {t('plaintiffDashboard.deferred.journal.edit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteEntry(originalIndex)}
                        className="rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        {t('plaintiffDashboard.deferred.journal.delete')}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
