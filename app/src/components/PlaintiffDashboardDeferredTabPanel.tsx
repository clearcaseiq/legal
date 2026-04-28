import { Link } from 'react-router-dom'
import { CheckCircle, Clock, Download, MessageCircle, Plus, TrendingUp, Upload, Users } from 'lucide-react'
import { formatCurrency } from '../lib/formatters'

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

type JournalEntry = {
  date: string
  level: number
  note: string
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
  caseScore: number
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
  caseScore,
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
  if (activeTab === 'tasks') {
    const scoreTasks = scoreFactors
      .filter((factor) => factor.improve)
      .map((factor) => ({
        label: factor.label,
        detail: factor.improve || '',
        done: false,
        href: `/evidence-upload/${activeAssessmentId}`,
      }))
    const evidenceTasks = evidenceImpact
      .filter((item) => !item.done)
      .slice(0, 3)
      .map((item) => ({
        label: item.label,
        detail: `${item.impact} estimated impact when added.`,
        done: false,
        href: `/evidence-upload/${activeAssessmentId}`,
      }))
    const reviewTask = submittedForReview
      ? {
          label: attorneyMatched ? 'Schedule or prepare for consultation' : 'Wait for attorney review',
          detail: attorneyMatched
            ? hasUpcomingConsult
              ? 'Your consultation is scheduled. Upload any documents your attorney may need.'
              : 'Book a consultation with your matched attorney.'
            : 'You do not need to do anything urgent unless we request more information.',
          done: attorneyMatched && hasUpcomingConsult,
          href: attorneyMatched ? '/messaging' : `/results/${activeAssessmentId}`,
        }
      : {
          label: 'Submit for attorney review',
          detail: 'Send your case when you are ready to see attorney matches.',
          done: false,
          href: `/results/${activeAssessmentId}?review=1`,
        }
    const tasks = [reviewTask, ...evidenceTasks, ...scoreTasks].slice(0, 6)

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Tasks</h3>
          <p className="text-sm text-gray-600 mb-5">The most useful things to do next for your case.</p>
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={`${task.label}-${task.detail}`} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-start gap-3">
                  {task.done ? (
                    <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <Clock className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{task.label}</p>
                    <p className="text-sm text-gray-600 mt-1">{task.detail}</p>
                  </div>
                  {!task.done && (
                    <Link to={task.href} className="shrink-0 text-sm font-semibold text-brand-600 hover:text-brand-700">
                      Open
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-brand-50 border border-brand-100 rounded-xl p-4">
          <p className="text-sm font-semibold text-brand-900 mb-1">Case Coach</p>
          <p className="text-sm text-brand-800">{caseCoachDisplay.action}</p>
        </div>
      </div>
    )
  }

  if (activeTab === 'attorney') {
    const inTeamReview = routingLifecycle === 'manual_review_needed'
    const statusTitle = attorneyMatched
      ? 'Attorney matched'
      : inTeamReview
      ? 'Team review'
      : submittedForReview
      ? 'Attorney review in progress'
      : 'Not submitted yet'

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Users className="h-5 w-5 text-brand-600" />
            Attorney Review
          </h3>
          <p className="text-sm text-gray-600 mb-5">Track attorney routing, responses, and messages in one place.</p>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Current status</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{statusTitle}</p>
            <p className="text-sm text-gray-600 mt-1">
              {routingStatusMessage ||
                (submittedForReview
                  ? 'Attorneys typically respond within about 24 hours.'
                  : 'Submit your case when you are ready to review attorney matches.')}
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 mt-4">
            <div className="rounded-lg bg-brand-50 p-3">
              <p className="text-xs font-medium text-brand-600">Reviewing</p>
              <p className="text-xl font-bold text-brand-900">{attorneyReviewCount}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-500">Matched</p>
              <p className="text-sm font-semibold text-gray-900">{attorneyMatched ? attorneyName || 'Attorney matched' : 'Not yet'}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-500">Consultation</p>
              <p className="text-sm font-semibold text-gray-900">{hasUpcomingConsult ? 'Scheduled' : 'Not scheduled'}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {submittedForReview ? (
              <Link to={`/results/${activeAssessmentId}`} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-600 border border-brand-200 rounded-lg hover:bg-brand-50">
                View Case Report
              </Link>
            ) : (
              <Link to={`/results/${activeAssessmentId}?review=1`} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700">
                Submit for Review
              </Link>
            )}
            <Link to={`/evidence-upload/${activeAssessmentId}`} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
              Upload Documents
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Messages</h3>
          {caseMessages.length > 0 ? (
            <div className="space-y-3">
              {caseMessages.map((message, index) => (
                <div key={`${message.createdAt}-${index}`} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-medium text-gray-500 mb-1">{message.from === 'plaintiff' ? 'You' : attorneyName || 'Attorney'}</p>
                  {message.subject && <p className="font-semibold text-gray-900 text-sm">{message.subject}</p>}
                  <p className="text-sm text-gray-700 mt-1">{message.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
              <MessageCircle className="h-5 w-5 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                {submittedForReview ? 'No attorney messages yet. You will see responses and document requests here.' : 'Messages appear after your case is submitted or matched.'}
              </p>
            </div>
          )}
        </div>

        {attorneyActivity.length > 0 && (
          <details className="bg-white rounded-xl border border-gray-200 p-6">
            <summary className="cursor-pointer list-none text-base font-bold text-gray-900">Show review activity</summary>
            <div className="space-y-3 mt-4">
              {attorneyActivity.slice(0, 6).map((activity, index) => (
                <div key={`${activity.message}-${index}`} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.timeAgo || 'Recent update'}</p>
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
          <h3 className="text-lg font-bold text-gray-900 mb-4">Why Your Case Score Is {caseScore}</h3>
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
                {factor.improve && <p className="text-sm text-brand-600 font-medium">How to improve: {factor.improve}</p>}
              </div>
            ))}
          </div>
        </div>

        {scoreFactors.some((factor) => factor.improve) && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">How To Improve Your Score</h3>
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
              Upload Evidence
            </Link>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-brand-600" />
            Case Value History
          </h3>
          <div className="flex items-end gap-2 mb-4">
            {caseValueHistory.map((entry, index) => {
              const barHeight = maxValue > 0 ? Math.max(16, Math.round((entry.value / maxValue) * 64)) : 16
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <div className="w-full flex flex-col justify-end" style={{ height: 64 }}>
                    <div className="w-full bg-brand-500 rounded-t transition-all" style={{ height: barHeight }} />
                  </div>
                  <span className="text-xs text-gray-500" title={entry.label}>
                    {entry.shortLabel}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="space-y-1 text-sm text-gray-600">
            <p>Initial estimate: {formatCurrency(caseValueHistory[0]?.value ?? 0)}</p>
            {caseValueHistory.length > 2 && <p>After injury details: {formatCurrency(caseValueHistory[1]?.value ?? 0)}</p>}
            <p className="font-semibold text-brand-600">Current estimate: {formatCurrency(settlementHigh)}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Case Health: {caseScore}%</h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-500">Liability</p>
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
              <p className="text-xs font-medium text-gray-500">Evidence</p>
              <p
                className={`font-semibold ${
                  evidencePercent >= 75 ? 'text-green-600' : evidencePercent >= 25 ? 'text-amber-600' : 'text-red-600'
                }`}
              >
                {evidencePercent >= 75 ? 'Complete' : evidencePercent >= 25 ? 'Incomplete' : 'Missing'}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-500">Medical Treatment</p>
              <p className={`font-semibold ${treatment.length > 0 ? 'text-green-600' : 'text-amber-600'}`}>
                {treatment.length > 0 ? 'Good' : 'Missing'}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-500">Damages</p>
              <p className={`font-semibold ${damagesLabel === 'Documented' ? 'text-green-600' : 'text-amber-600'}`}>
                {damagesLabel === 'Documented' ? 'Documented' : 'Missing documentation'}
              </p>
            </div>
          </div>
          {scoreFactors.some((factor) => factor.improve) && (
            <p className="text-sm text-brand-600 font-medium">Tip: {scoreFactors.find((factor) => factor.improve)?.improve}</p>
          )}
        </div>

        {strengths.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Your Strengths</h3>
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
          <h3 className="text-lg font-bold text-gray-900 mb-4">What Insurance Companies Often Challenge</h3>
          <p className="text-sm text-gray-600 mb-2">Insurance adjusters commonly question:</p>
          <ul className="text-sm text-gray-600 space-y-1 mb-4">
            <li>• Gaps in medical treatment</li>
            <li>• Missing injury documentation</li>
            <li>• Unclear accident descriptions</li>
          </ul>
          <p className="text-sm text-brand-600 font-medium">Uploading medical records and injury photos reduces these risks.</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Case Risk Level</h3>
          <div className="flex items-center gap-1 mb-2">
            <span className={`text-sm font-medium px-3 py-1 rounded ${riskLevel === 'Low' ? 'bg-green-100 text-green-700' : 'text-gray-500'}`}>
              Low
            </span>
            <span className="text-gray-400">-</span>
            <span
              className={`text-sm font-medium px-3 py-1 rounded ${riskLevel === 'Moderate' ? 'bg-amber-100 text-amber-700' : 'text-gray-500'}`}
            >
              Moderate
            </span>
            <span className="text-gray-400">-</span>
            <span className={`text-sm font-medium px-3 py-1 rounded ${riskLevel === 'High' ? 'bg-red-100 text-red-700' : 'text-gray-500'}`}>
              High
            </span>
          </div>
          <p className="text-sm text-gray-600">
            Your case risk level:{' '}
            <span
              className={`font-semibold ${
                riskLevel === 'Low' ? 'text-green-600' : riskLevel === 'Moderate' ? 'text-amber-600' : 'text-red-600'
              }`}
            >
              {riskLevel}
            </span>
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Cases like yours in {venueState}</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-3 bg-brand-50 rounded-lg">
              <p className="text-xs font-medium text-brand-600">Typical settlement</p>
              <p className="text-lg font-bold text-brand-900">{formatCurrency(settlementMedian)}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-500">Range</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatCurrency(settlementLow)} - {formatCurrency(settlementHigh)}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-500">Typical timeline</p>
              <p className="text-sm font-semibold text-gray-900">8 months</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-3">This reinforces our AI model based on similar cases in your area.</p>
        </div>

        <div className="bg-brand-50 border border-brand-100 rounded-xl p-4">
          <p className="text-sm font-semibold text-brand-900 mb-2">Case Coach</p>
          <p className="text-sm text-brand-800 mb-1">Tip: {caseCoachDisplay.tip}</p>
          <p className="text-sm text-brand-700 font-medium">{caseCoachDisplay.action}</p>
        </div>

        {potentialValueIncrease.show && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-green-900 mb-2">Potential Case Value Increase</h3>
            <p className="text-sm text-green-800">{potentialValueIncrease.msg}</p>
          </div>
        )}

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Analysis Confidence</h3>
          <p className="text-sm text-gray-600">
            {evidenceCount === 0 || !hasWageLoss
              ? 'Your score will become more accurate once medical records and wage loss information are added.'
              : 'Your score is based on the information provided. Additional evidence may refine the estimate.'}
          </p>
        </div>

        <div className="flex gap-2 md:col-span-2">
          <Link
            to={`/evidence-upload/${activeAssessmentId}`}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700"
          >
            <Upload className="h-4 w-4" />
            Upload Evidence
          </Link>
          <button
            type="button"
            onClick={() => {
              void onDownloadReport()
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-600 border border-brand-200 rounded-lg hover:bg-brand-50"
          >
            <Download className="h-4 w-4" />
            Download Case Report
          </button>
          <Link
            to="/assessment/start"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Plus className="h-4 w-4" />
            Start New Case
          </Link>
        </div>
      </div>
    )
  }

  if (activeTab === 'documents' || activeTab === 'evidence') {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Documents & Evidence</h3>
          <p className="text-sm text-gray-600 mb-4">Track the documents that can help attorneys understand and value your case.</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {evidenceImpact.map((item) => (
              <div key={item.label} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded-lg">
                <span className={item.done ? 'text-gray-500 line-through' : 'text-gray-700'}>{item.label}</span>
                <span className={item.done ? 'text-green-600 font-medium' : 'text-brand-600 font-medium'}>{item.impact}</span>
              </div>
            ))}
          </div>
          <Link
            to={`/evidence-upload/${activeAssessmentId}`}
            className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Documents
          </Link>
        </div>
        {treatment.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Medical Summary</h3>
            <div className="space-y-3">
              {treatment.map((entry, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900">{entry.provider || entry.type || 'Treatment'}</p>
                  <p className="text-sm text-gray-600">{entry.date || entry.dates || '-'}</p>
                  {entry.diagnosis && <p className="text-sm text-gray-600">Diagnosis: {entry.diagnosis}</p>}
                  {entry.amount && <p className="text-sm text-gray-600">Total: {formatCurrency(entry.amount)}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
        <Link
          to={`/evidence-upload/${activeAssessmentId}`}
          className="block p-4 border-2 border-dashed border-gray-300 rounded-xl text-center text-gray-600 hover:border-brand-400 hover:text-brand-600"
        >
          Manage Documents →
        </Link>
      </div>
    )
  }

  if (activeTab === 'value') {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-brand-600" />
            Case Value History
          </h3>
          <div className="flex items-end gap-2 mb-4">
            {caseValueHistory.map((entry, index) => {
              const barHeight = maxValue > 0 ? Math.max(16, Math.round((entry.value / maxValue) * 64)) : 16
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <div className="w-full flex flex-col justify-end" style={{ height: 64 }}>
                    <div className="w-full bg-brand-500 rounded-t transition-all" style={{ height: barHeight }} />
                  </div>
                  <span className="text-xs text-gray-500" title={entry.label}>
                    {entry.shortLabel}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Initial: {formatCurrency(caseValueHistory[0]?.value ?? 0)}</span>
            <span className="font-semibold text-brand-600">Current: {formatCurrency(settlementHigh)}</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Cases Like Yours in {venueState}</h3>
          <p className="text-sm text-gray-600 mb-2">Average settlement: {formatCurrency(settlementMedian)}</p>
          <p className="text-sm text-gray-600 mb-2">
            Typical range: {formatCurrency(settlementLow)} - {formatCurrency(settlementHigh)}
          </p>
          <p className="text-sm text-gray-600">
            Most cases like yours settle within this range. This comparison increases confidence in your estimate.
          </p>
        </div>
      </div>
    )
  }

  if (activeTab === 'activity') {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
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
            <p className="text-sm font-medium text-green-800">Update</p>
            <p className="text-sm text-green-700">{notification}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Impact on Your Life</h3>
        <p className="text-sm text-gray-600 mb-4">Document how your injuries affect your daily life. Lawyers value this evidence.</p>
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Days missed from work</p>
            <div className="flex gap-2 mb-2">
              <input
                type="number"
                min="0"
                value={wageDays}
                onChange={(event) => onWageDaysChange(event.target.value)}
                className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="8"
              />
              <span className="self-center text-gray-500">days</span>
            </div>
            <p className="text-sm font-medium text-gray-700 mb-2">Daily wage ($)</p>
            <input
              type="number"
              min="0"
              step="0.01"
              value={wageDaily}
              onChange={(event) => onWageDailyChange(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-2"
              placeholder="220"
            />
            {wageLossEstimate != null && (
              <p className="text-sm font-bold text-brand-600">Estimated claim: {formatCurrency(wageLossEstimate)}</p>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Pain level today</p>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-gray-500">0</span>
              <input
                type="range"
                min="0"
                max="10"
                value={painLevel}
                onChange={(event) => onPainLevelChange(parseInt(event.target.value, 10))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs text-gray-500">10</span>
            </div>
            <p className="text-sm font-medium text-gray-700 mb-2">{painLevel} / 10</p>
            <p className="text-sm text-gray-600 mb-1">How did this affect your day?</p>
            <p className="text-xs text-gray-500 mb-2">Examples: Couldn't work • Missed activities • Trouble sleeping</p>
            <textarea
              value={painNote}
              onChange={(event) => onPainNoteChange(event.target.value)}
              placeholder="Describe how your injuries affected your daily life..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-2 min-h-[80px]"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={onSavePainJournal}
                className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700"
              >
                {editingEntryIndex !== null ? 'Update Entry' : 'Log Entry'}
              </button>
              {editingEntryIndex !== null && (
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
              {journalSaved && <span className="text-sm text-green-600 font-medium">Entry saved!</span>}
            </div>
          </div>
        </div>
        {journalEntries.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Your Journal Entries</h4>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {[...journalEntries].reverse().map((entry, displayIndex) => {
                const originalIndex = journalEntries.length - 1 - displayIndex
                return (
                  <div key={originalIndex} className="p-3 bg-gray-50 rounded-lg text-sm">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-medium text-gray-700">
                            {new Date(entry.date).toLocaleDateString()} at{' '}
                            {new Date(entry.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                          </span>
                          <span className="text-brand-600 font-medium">Pain: {entry.level}/10</span>
                        </div>
                        {entry.note && <p className="text-gray-600">{entry.note}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onEditEntry(originalIndex)}
                          className="px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 rounded"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteEntry(originalIndex)}
                          className="px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded"
                        >
                          Delete
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
    </div>
  )
}
