import { AlertTriangle, Bot, FileText, MessageSquare, Shield, Sparkles, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import type { CaseCommandCenter } from '../lib/api'
import type { DocTypeId } from './DocumentRequestModal'

type Props = {
  summary: CaseCommandCenter | null
  loading: boolean
  onReviewSuggestedRequest?: (payload: {
    requestedDocs: DocTypeId[]
    customMessage?: string
    sendUploadLinkOnly?: boolean
  }) => void
  onOpenSuggestedRequestPage?: (payload: {
    requestedDocs: DocTypeId[]
    customMessage?: string
    sendUploadLinkOnly?: boolean
  }) => void
  onDraftPlaintiffUpdate?: (message: string) => void
  onAskCopilot?: (question: string) => Promise<void> | void
  onCreateTasksFromBlockers?: () => Promise<any> | any
  onOpenWorkstream?: (section: 'negotiation' | 'demand' | 'tasks' | 'health') => void
  copilotAnswer?: { answer: string; sources: Array<{ label: string; detail: string }> } | null
  copilotLoading?: boolean
}

export default function AttorneyCaseCommandCenter({
  summary,
  loading,
  onReviewSuggestedRequest,
  onOpenSuggestedRequestPage,
  onDraftPlaintiffUpdate,
  onAskCopilot,
  onCreateTasksFromBlockers,
  onOpenWorkstream,
  copilotAnswer,
  copilotLoading,
}: Props) {
  const [taskActionLoading, setTaskActionLoading] = useState(false)
  const [taskActionMessage, setTaskActionMessage] = useState<string | null>(null)

  if (loading) {
    return <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">Loading case command center...</div>
  }

  if (!summary) return null

  const handleCreateBlockerTasks = async () => {
    if (!onCreateTasksFromBlockers) return
    setTaskActionLoading(true)
    setTaskActionMessage(null)
    try {
      const result = await onCreateTasksFromBlockers()
      const createdCount = result?.createdCount ?? result?.tasks?.length ?? 0
      setTaskActionMessage(
        createdCount > 0
          ? `Created ${createdCount} blocker task${createdCount === 1 ? '' : 's'} and opened Tasks.`
          : result?.summary || 'No new blocker tasks were needed. Opened Tasks.',
      )
    } catch (error: any) {
      setTaskActionMessage(error?.response?.data?.error || error?.message || 'Could not create blocker tasks.')
    } finally {
      setTaskActionLoading(false)
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Case Command Center</div>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">{summary.stage.title}</h3>
          <p className="mt-1 text-sm text-slate-600">{summary.stage.detail}</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-right">
          <div className="text-xs uppercase tracking-wide text-slate-500">Readiness</div>
          <div className="text-lg font-semibold text-slate-900">{summary.readiness.score}%</div>
          <div className="text-xs text-slate-600">{summary.readiness.label}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
            <TrendingUp className="h-4 w-4" />
            Value story
          </div>
          <div className="mt-2 text-sm text-emerald-900">
            {summary.valueStory.median > 0
              ? `${summary.valueStory.detail} Working range ${summary.valueStory.low.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} to ${summary.valueStory.high.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}.`
              : summary.valueStory.detail}
          </div>
        </div>

        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
            <Shield className="h-4 w-4" />
            Liability story
          </div>
          <div className="mt-2 text-sm text-blue-900">
            <span className="font-semibold">{summary.liabilityStory.label}.</span> {summary.liabilityStory.detail}
          </div>
        </div>

        <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertTriangle className="h-4 w-4" />
            Coverage
          </div>
          <div className="mt-2 text-sm text-amber-900">
            <span className="font-semibold">{summary.coverageStory.label}.</span> {summary.coverageStory.detail}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-900">Negotiation command surface</div>
          <div className="mt-2 text-sm text-slate-700">{summary.negotiationSummary.posture}</div>
          <div className="mt-2 text-xs text-slate-500">
            {summary.negotiationSummary.eventCount} event{summary.negotiationSummary.eventCount === 1 ? '' : 's'}
            {summary.negotiationSummary.latestOffer ? ` • Latest offer ${summary.negotiationSummary.latestOffer.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}` : ''}
            {summary.negotiationSummary.latestDemand ? ` • Latest demand ${summary.negotiationSummary.latestDemand.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}` : ''}
          </div>
          <div className="mt-2 text-sm text-slate-700">{summary.negotiationSummary.recommendedMove}</div>
          <button
            type="button"
            onClick={() => onOpenWorkstream?.('negotiation')}
            className="mt-3 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-brand-300 hover:text-brand-700"
          >
            Open negotiation workspace
          </button>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-900">Treatment & providers</div>
          <div className="mt-2 text-sm text-slate-700">{summary.treatmentMonitor.status}</div>
          <div className="mt-2 text-xs text-slate-500">
            {summary.treatmentMonitor.chronologyCount} chronology event{summary.treatmentMonitor.chronologyCount === 1 ? '' : 's'} • {summary.treatmentMonitor.providerCount} provider{summary.treatmentMonitor.providerCount === 1 ? '' : 's'}
            {summary.treatmentMonitor.largestGapDays > 0 ? ` • Largest gap ${summary.treatmentMonitor.largestGapDays} days` : ''}
          </div>
          {summary.treatmentMonitor.providers.length > 0 ? (
            <div className="mt-2 text-xs text-slate-500">Providers: {summary.treatmentMonitor.providers.join(', ')}</div>
          ) : null}
          <div className="mt-2 text-sm text-slate-700">{summary.treatmentMonitor.recommendedAction}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onOpenWorkstream?.('health')}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-brand-300 hover:text-brand-700"
            >
              Open health workspace
            </button>
            <button
              type="button"
              onClick={() => { void handleCreateBlockerTasks() }}
              disabled={taskActionLoading}
              className="rounded-md border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100"
            >
              {taskActionLoading ? 'Creating tasks...' : 'Create blocker tasks'}
            </button>
          </div>
          {taskActionMessage ? (
            <div className="mt-2 text-xs text-slate-600">{taskActionMessage}</div>
          ) : null}
        </div>
      </div>

      {summary.medicalCostBenchmark.status !== 'unavailable' ? (
        <div className="mt-4 rounded-lg border border-violet-100 bg-violet-50 p-4">
          <div className="text-sm font-semibold text-violet-900">Medical cost benchmark context</div>
          <div className="mt-2 text-sm text-violet-900">{summary.medicalCostBenchmark.detail}</div>
          <div className="mt-2 text-xs text-violet-800">
            Matched {summary.medicalCostBenchmark.matchedEventCount} of {summary.medicalCostBenchmark.totalChronologyEvents} chronology events
            {typeof summary.medicalCostBenchmark.benchmarkTypicalTotal === 'number'
              ? ` • Typical benchmark total ${summary.medicalCostBenchmark.benchmarkTypicalTotal.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}`
              : ''}
            {typeof summary.medicalCostBenchmark.medCharges === 'number'
              ? ` • Current med charges ${summary.medicalCostBenchmark.medCharges.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}`
              : ''}
          </div>
          {summary.medicalCostBenchmark.matchedCategories.length > 0 ? (
            <div className="mt-2 text-xs text-violet-800">
              Signals: {summary.medicalCostBenchmark.matchedCategories.slice(0, 3).map((item) => item.categoryLabel).join(', ')}
            </div>
          ) : null}
          <div className="mt-2 text-xs text-violet-700">{summary.medicalCostBenchmark.caution}</div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div>
          <div className="mb-2 text-sm font-semibold text-slate-900">What helps</div>
          <div className="space-y-2">
            {summary.strengths.slice(0, 3).map((item) => (
              <div key={item.title} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-sm font-medium text-slate-900">{item.title}</div>
                <div className="mt-1 text-xs text-slate-600">{item.detail}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold text-slate-900">What hurts</div>
          <div className="space-y-2">
            {summary.weaknesses.slice(0, 3).map((item) => (
              <div key={item.title} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-sm font-medium text-slate-900">{item.title}</div>
                <div className="mt-1 text-xs text-slate-600">{item.detail}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold text-slate-900">Defense risks</div>
          <div className="space-y-2">
            {summary.defenseRisks.slice(0, 3).map((item) => (
              <div key={item.title} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-sm font-medium text-slate-900">{item.title}</div>
                <div className="mt-1 text-xs text-slate-600">{item.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-brand-100 bg-brand-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-brand-900">
            <Sparkles className="h-4 w-4" />
            Next best action
          </div>
          <div className="mt-2 text-sm font-medium text-slate-900">{summary.nextBestAction.title}</div>
          <div className="mt-1 text-sm text-slate-700">{summary.nextBestAction.detail}</div>
          {summary.readiness.score >= 70 ? (
            <button
              type="button"
              onClick={() => onOpenWorkstream?.('demand')}
              className="mt-3 rounded-md border border-brand-200 bg-white px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100"
            >
              Open demand workspace
            </button>
          ) : null}

          {summary.suggestedDocumentRequest ? (
            <div className="mt-4 rounded-lg border border-brand-200 bg-white p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <FileText className="h-4 w-4 text-brand-600" />
                Suggested document request
              </div>
              <div className="mt-2 text-xs text-slate-600">
                Request: {summary.suggestedDocumentRequest.requestedDocs.join(', ')}
              </div>
              <div className="mt-2 text-sm text-slate-700">{summary.suggestedDocumentRequest.customMessage}</div>
              <button
                onClick={() =>
                  onReviewSuggestedRequest?.({
                    requestedDocs: summary.suggestedDocumentRequest?.requestedDocs as DocTypeId[],
                    customMessage: summary.suggestedDocumentRequest?.customMessage,
                  })
                }
                className="mt-3 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                Review request in workflow
              </button>
              <button
                type="button"
                onClick={() =>
                  onOpenSuggestedRequestPage?.({
                    requestedDocs: summary.suggestedDocumentRequest?.requestedDocs as DocTypeId[],
                    customMessage: summary.suggestedDocumentRequest?.customMessage,
                  })
                }
                className="mt-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-brand-300 hover:text-brand-700"
              >
                Open full-page workflow
              </button>
            </div>
          ) : null}

          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <MessageSquare className="h-4 w-4 text-brand-600" />
              Suggested plaintiff update
            </div>
            <div className="mt-2 text-sm text-slate-700">{summary.suggestedPlaintiffUpdate}</div>
            <button
              type="button"
              onClick={() => onDraftPlaintiffUpdate?.(summary.suggestedPlaintiffUpdate)}
              className="mt-3 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-brand-300 hover:text-brand-700"
            >
              Use in message draft
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Bot className="h-4 w-4" />
            Grounded copilot
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {summary.copilot.suggestedPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onAskCopilot?.(prompt)}
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:border-brand-300 hover:text-brand-700"
              >
                {prompt}
              </button>
            ))}
          </div>

          {copilotAnswer ? (
            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
              <div className="text-sm text-slate-800">{copilotAnswer.answer}</div>
              {copilotAnswer.sources.length > 0 ? (
                <div className="mt-3 space-y-1">
                  {copilotAnswer.sources.map((source) => (
                    <div key={source.label} className="text-xs text-slate-500">
                      <span className="font-medium text-slate-600">{source.label}:</span> {source.detail}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 text-sm text-slate-600">
              Ask about missing docs, defense risk, next action, or the current value story.
            </div>
          )}
          {copilotLoading ? <div className="mt-2 text-xs text-slate-500">Thinking...</div> : null}
        </div>
      </div>
    </div>
  )
}
