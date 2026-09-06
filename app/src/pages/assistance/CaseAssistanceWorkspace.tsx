import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  getAssistanceAi,
  getAssistanceCase,
  getAssistanceSpecialists,
  updateAssistanceCase,
} from '../../lib/api'
import type { AssistanceGap } from '../../lib/api'
import { BackButton, EmptyState, SectionCard } from '../../features/shared/ui'
import { useAssistanceBasePath } from './useAssistanceBasePath'
import { ActivityList } from './workbench/ActivityList'
import { AssistedIntake } from './workbench/AssistedIntake'
import { CaseAssistantPanel } from './workbench/CaseAssistantPanel'
import { CaseCompleteness } from './workbench/CaseCompleteness'
import { CaseHeader } from './workbench/CaseHeader'
import { CaseSnapshot } from './workbench/CaseSnapshot'
import { ContactActions, type ContactAction } from './workbench/ContactActions'
import { MissingInformation } from './workbench/MissingInformation'
import { NextBestAction } from './workbench/NextBestAction'
import { WorkflowCard } from './workbench/WorkflowCard'
import { WorkbenchTabNav, isWorkbenchTab, type WorkbenchTab } from './workbench/WorkbenchTabs'

type CaseData = Awaited<ReturnType<typeof getAssistanceCase>>
type AiData = Awaited<ReturnType<typeof getAssistanceAi>>

/**
 * The case specialist workbench.
 *
 * Built around one question — what should I do with this case right now — which
 * the previous layout answered badly: three tall columns, the same ranking
 * repeated in three panels, and the claimant's phone number below the fold
 * behind a full-width compliance banner.
 *
 * Now a sticky header carries identity, both workflow states and the actions,
 * and the work itself is split into tabs so no single view is a page-long scroll.
 *
 * Still nothing here writes to the case. An answer taken on a call is
 * *proposed*, and the claimant confirms it before it becomes their answer — a
 * specialist's paraphrase of someone's account of their own injury is not that
 * person's account. See `docs/case-assistance-phase-2.md`.
 */
export default function CaseAssistanceWorkspace() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const basePath = useAssistanceBasePath()
  const [searchParams, setSearchParams] = useSearchParams()

  const [data, setData] = useState<CaseData | null>(null)
  const [ai, setAi] = useState<AiData | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [specialists, setSpecialists] = useState<{ id: string; name: string }[]>([])
  const [openAction, setOpenAction] = useState<ContactAction | null>(null)
  const [focusGapKey, setFocusGapKey] = useState<string | null>(null)

  const tabParam = searchParams.get('tab')
  const tab: WorkbenchTab = isWorkbenchTab(tabParam) ? tabParam : 'overview'

  const setTab = useCallback(
    (next: WorkbenchTab) => {
      // `replace` so tabbing around a case does not bury the queue in history.
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current)
          params.set('tab', next)
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setData(await getAssistanceCase(id))
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load this case')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  // Loaded separately from the case: this call can reach an LLM, and the case
  // should be readable while that is in flight.
  useEffect(() => {
    let cancelled = false
    setAiLoading(true)
    getAssistanceAi(id)
      .then((result) => !cancelled && setAi(result))
      .catch((err: any) => !cancelled && setAiError(err.response?.data?.error || 'Case analysis is not available yet'))
      .finally(() => !cancelled && setAiLoading(false))
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    getAssistanceSpecialists()
      .then((result) => setSpecialists(result.data))
      .catch(() => undefined)
  }, [])

  const patch = async (input: Parameters<typeof updateAssistanceCase>[1], message?: string) => {
    try {
      setSaving(true)
      setNotice(null)
      const result = await updateAssistanceCase(id, input)
      if (result.assistance) setData((current) => (current ? { ...current, assistance: result.assistance! } : current))
      if (message) setNotice(message)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not save that change')
    } finally {
      setSaving(false)
    }
  }

  /** Send the specialist to the tab that owns a form, then open it there. */
  const startAction = useCallback(
    (action: ContactAction) => {
      setTab(action === 'docs' ? 'documents' : action === 'answer' ? 'intake' : 'communications')
      setOpenAction(action)
    },
    [setTab],
  )

  /**
   * Open the guided flow on the question that closes this gap.
   *
   * Clicking a gap used to drop the specialist at the top of a thirty-item
   * field list with no indication of which one they had just asked about.
   */
  const askAboutGap = useCallback(
    (gap: AssistanceGap) => {
      setTab('intake')
      setOpenAction(null)
      setFocusGapKey(gap.key)
    },
    [setTab],
  )

  const openGaps = useMemo(
    () => (ai ? [...ai.gaps.highPriority, ...ai.gaps.recommended] : []),
    [ai],
  )
  // Resolved gaps included on purpose: they are the denominator that turns a
  // list of what is missing into a measure of how much is done.
  const allGaps = useMemo(() => (ai ? [...openGaps, ...ai.gaps.resolved] : []), [ai, openGaps])
  const suggestedDocs = useMemo(
    () => openGaps.map((gap) => gap.requestedDoc).filter(Boolean) as string[],
    [openGaps],
  )

  if (loading) {
    return <p className="p-4 text-sm text-slate-500 dark:text-slate-400">Loading case…</p>
  }
  if (error || !data) {
    return (
      <div className="space-y-4 p-4">
        <BackButton onClick={() => navigate(basePath)} label="Back to queue" />
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error || 'Case not found'}
        </div>
      </div>
    )
  }

  const { assistance, contact, readiness, summary, interactions } = data
  const firstName = (assistance.plaintiffName || '').split(' ')[0] || null
  const commsInteractions = interactions.filter((interaction) => interaction.channel !== 'other')

  const actionProps = {
    assistanceId: id,
    hasEmail: !!contact.email,
    open: openAction,
    onOpenChange: setOpenAction,
    onDone: (message: string) => {
      setNotice(message)
      load()
    },
    onError: setError,
  }

  return (
    <div className="space-y-4">
      <CaseHeader
        assistance={assistance}
        contact={contact}
        readinessScore={readiness?.score ?? null}
        onBack={() => navigate(basePath)}
        onAction={startAction}
      />

      <WorkbenchTabNav
        active={tab}
        onChange={setTab}
        counts={{
          documents: readiness?.missingDocs.length ?? 0,
          activity: interactions.length,
        }}
      />

      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          {notice}
        </div>
      )}

      {tab === 'overview' && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-4">
            <NextBestAction
              headline={ai?.coach?.headline ?? null}
              gaps={ai?.gaps.highPriority ?? []}
              firstName={firstName}
              onStartIntake={() => setTab('intake')}
              onRequestDocuments={() => startAction('docs')}
            />
            <CaseCompleteness gaps={allGaps} evidenceScore={readiness?.score ?? null} />
            <CaseSnapshot summary={summary} known={ai?.known ?? []} />
          </div>
          <div className="space-y-4">
            <CaseAssistantPanel
              questions={ai?.questions ?? []}
              treatmentGaps={readiness?.treatmentGaps ?? []}
              missingDocs={readiness?.missingDocs ?? []}
              loading={aiLoading}
              error={aiError}
              onStartIntake={() => setTab('intake')}
              onRequestDocuments={() => startAction('docs')}
            />
            <WorkflowCard
              assistance={assistance}
              specialists={specialists}
              saving={saving}
              onPatch={patch}
            />
          </div>
        </div>
      )}

      {tab === 'intake' && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-4">
            <AssistedIntake
              assistanceId={id}
              questions={ai?.questions ?? []}
              gaps={openGaps}
              loading={aiLoading}
              focusGapKey={focusGapKey}
              onRecorded={setNotice}
              onError={setError}
            />
            <ContactActions
              {...actionProps}
              actions={['answer']}
              idleMessage="Working off-script? Record any single detail here instead."
            />
          </div>
          <MissingInformation gaps={openGaps} onAsk={askAboutGap} onRequestDocuments={() => startAction('docs')} />
        </div>
      )}

      {tab === 'documents' && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <ContactActions
            {...actionProps}
            actions={['docs']}
            suggestedDocs={suggestedDocs}
            idleMessage="Email the claimant a link to upload what the file is missing."
          />
          <SectionCard title="Documents to request">
            {!readiness || readiness.missingDocs.length === 0 ? (
              <EmptyState message="Nothing is flagged as missing on this case." />
            ) : (
              <ul className="space-y-2">
                {readiness.missingDocs.map((doc) => (
                  <li key={doc.key} className="flex items-center gap-2 text-sm">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        doc.priority === 'high' ? 'bg-rose-500' : doc.priority === 'medium' ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 text-slate-700 dark:text-slate-300">{doc.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      )}

      {tab === 'communications' && (
        <div className="space-y-4">
          <ContactActions {...actionProps} actions={['call', 'email']} />
          <ActivityList
            interactions={commsInteractions}
            title="Calls and messages"
            emptyMessage="No calls or messages logged yet."
          />
        </div>
      )}

      {tab === 'activity' && <ActivityList interactions={interactions} />}
    </div>
  )
}
