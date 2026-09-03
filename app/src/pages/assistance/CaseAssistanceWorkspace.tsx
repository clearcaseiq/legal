import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getAssistanceAi,
  getAssistanceCase,
  getAssistanceProposals,
  getAssistanceSpecialists,
  logAssistanceInteraction,
  proposeAssistanceValue,
  sendAssistanceDocumentRequest,
  sendAssistanceEmail,
  updateAssistanceCase,
  type AssistancePendingProposal,
  type AssistanceProposableField,
  type AssistanceStatus,
} from '../../lib/api'
import { Badge, BackButton, Breadcrumbs, EmptyState, SectionCard } from '../../features/shared/ui'
import {
  ASSISTANCE_PHASE_LABELS,
  ASSISTANCE_STATUS_LABELS,
  ASSISTANCE_STATUS_ORDER,
  ASSISTANCE_STATUS_TONES,
  CALL_OUTCOMES,
  CHANNEL_LABELS,
  OUTCOME_LABELS,
  PRIORITY_LABELS,
  dueLabel,
  humanize,
  readinessTone,
  timeAgo,
} from './assistanceLabels'
import { useAssistanceBasePath } from './useAssistanceBasePath'

type CaseData = Awaited<ReturnType<typeof getAssistanceCase>>
type AiData = Awaited<ReturnType<typeof getAssistanceAi>>

/**
 * The specialist workspace.
 *
 * Three panes: who the claimant is and how ready their case is, what they told
 * us, and what to do about it.
 *
 * Nothing here writes to the case. An answer taken on a call is *proposed*, and
 * the claimant confirms it before it becomes their answer — a specialist's
 * paraphrase of someone's account of their own injury is not that person's
 * account. See `docs/case-assistance-phase-2.md`.
 */
export default function CaseAssistanceWorkspace() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const basePath = useAssistanceBasePath()

  const [data, setData] = useState<CaseData | null>(null)
  const [ai, setAi] = useState<AiData | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [specialists, setSpecialists] = useState<{ id: string; name: string }[]>([])

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

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[{ label: 'Case Assistance', to: basePath }, { label: assistance.caseName }]}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{assistance.caseName}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span>{humanize(assistance.claimType)}</span>
            {assistance.referenceCode && <span>· {assistance.referenceCode}</span>}
            <Badge tone={ASSISTANCE_STATUS_TONES[assistance.status] ?? 'neutral'}>
              {ASSISTANCE_STATUS_LABELS[assistance.status] ?? assistance.status}
            </Badge>
            {assistance.phase !== 'assistance' && (
              <Badge tone="neutral">{ASSISTANCE_PHASE_LABELS[assistance.phase]}</Badge>
            )}
          </p>
        </div>
        <BackButton onClick={() => navigate(basePath)} label="Back to queue" />
      </div>

      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          {notice}
        </div>
      )}

      {assistance.manualReviewStatus === 'pending' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          <strong className="font-semibold">This case is held for manual review</strong>
          {assistance.manualReviewReason ? ` (${humanize(assistance.manualReviewReason)})` : ''}. That is a compliance
          hold, separate from your workflow status — check with the review team before promising the claimant a next
          step.
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[20rem_minmax(0,1fr)_24rem]">
        {/* -------------------------------------------------- left: who + readiness */}
        <div className="space-y-4">
          <SectionCard title="Claimant">
            <dl className="space-y-2.5 text-sm">
              <Field label="Name" value={assistance.plaintiffName} />
              <Field label="Phone" value={contact.phone} href={contact.phone ? `tel:${contact.phone}` : undefined} />
              <Field
                label="Email"
                value={contact.email}
                href={contact.email ? `mailto:${contact.email}` : undefined}
              />
              <Field label="Location" value={contact.city || assistance.venueCounty} />
              {contact.preferredLanguage && contact.preferredLanguage !== 'en' && (
                <Field label="Language" value={contact.preferredLanguage.toUpperCase()} />
              )}
              <Field label="Submitted" value={timeAgo(assistance.createdAt)} />
              <Field label="Last contact" value={timeAgo(assistance.lastContactAt)} />
            </dl>
          </SectionCard>

          <SectionCard
            title="Readiness"
            trailing={
              readiness ? (
                <Badge tone={readinessTone(readiness.score)}>{readiness.score}%</Badge>
              ) : undefined
            }
          >
            {!readiness ? (
              <EmptyState message="Readiness is not available for this case yet." />
            ) : (
              <div className="space-y-3">
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full ${
                      readiness.score >= 75 ? 'bg-emerald-500' : readiness.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, readiness.score))}%` }}
                  />
                </div>
                <ul className="space-y-2">
                  {readiness.factors.map((factor) => (
                    <li key={factor.key} className="text-sm">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-slate-700 dark:text-slate-300">{factor.label}</span>
                        <span className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {factor.points}/{factor.max}
                        </span>
                      </div>
                      {factor.hint && factor.points < factor.max && (
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{factor.hint}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Workflow">
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Status</span>
                <select
                  className="input w-full"
                  value={assistance.status}
                  disabled={saving}
                  onChange={(e) => patch({ status: e.target.value as AssistanceStatus })}
                >
                  {ASSISTANCE_STATUS_ORDER.map((option) => (
                    <option key={option} value={option}>
                      {ASSISTANCE_STATUS_LABELS[option]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Priority</span>
                <select
                  className="input w-full"
                  value={assistance.priority}
                  disabled={saving}
                  onChange={(e) => patch({ priority: e.target.value as 'low' | 'normal' | 'high' })}
                >
                  {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <NextActionField
                value={assistance.nextAction}
                disabled={saving}
                onSave={(nextAction) => patch({ nextAction }, 'Next action saved.')}
              />
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Assigned to</span>
                <select
                  className="input w-full"
                  value={assistance.assignedSpecialist?.id || ''}
                  disabled={saving}
                  onChange={(e) => patch({ assignedSpecialistId: e.target.value || null })}
                >
                  <option value="">Unassigned</option>
                  {specialists.map((specialist) => (
                    <option key={specialist.id} value={specialist.id}>
                      {specialist.name}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                First review due {dueLabel(assistance.reviewDueAt)}.
              </p>
            </div>
          </SectionCard>
        </div>

        {/* ------------------------------------------- centre: what they told us */}
        <div className="space-y-4">
          <SectionCard title="What the claimant told us">
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              Read-only. Walk the claimant through anything that needs correcting and let them update it themselves —
              their account is the record of what they said.
            </p>
            <dl className="grid gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2">
              <Field label="Claim type" value={humanize(summary.claimType)} />
              <Field
                label="Venue"
                value={[summary.venueCounty, summary.venueState].filter(Boolean).join(', ') || null}
              />
              <Field label="Documents uploaded" value={String(summary.evidenceCount ?? 0)} />
              <Field label="Assessment submitted" value={timeAgo(summary.submittedAt)} />
            </dl>
            {summary.narrative && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  In their words
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                  {summary.narrative}
                </p>
              </div>
            )}
            <FactBlock label="Incident" value={summary.incident} />
            <FactBlock label="Injuries" value={summary.injuries} />
            <FactBlock label="Treatment" value={summary.treatment} />
            <FactBlock label="Work and income" value={summary.employment} />
            <FactBlock label="Insurance" value={summary.insurance} />
          </SectionCard>

          <ContactActions
            assistanceId={id}
            hasEmail={!!contact.email}
            suggestedDocs={ai?.gaps.highPriority.map((gap) => gap.requestedDoc).filter(Boolean) as string[] | undefined}
            onDone={(message) => {
              setNotice(message)
              load()
            }}
            onError={setError}
          />

          <SectionCard title="Activity">
            {interactions.length === 0 ? (
              <EmptyState message="No contact logged yet." />
            ) : (
              <ol className="space-y-3">
                {interactions.map((interaction) => (
                  <li
                    key={interaction.id}
                    className="border-l-2 border-slate-200 pl-3 text-sm dark:border-slate-700"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="neutral">{CHANNEL_LABELS[interaction.channel] ?? interaction.channel}</Badge>
                      {interaction.outcome && (
                        <span className="text-slate-700 dark:text-slate-300">
                          {OUTCOME_LABELS[interaction.outcome] ?? humanize(interaction.outcome)}
                        </span>
                      )}
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {timeAgo(interaction.occurredAt)}
                        {interaction.specialistName ? ` · ${interaction.specialistName}` : ''}
                      </span>
                    </div>
                    {interaction.notes && (
                      <p className="mt-1 whitespace-pre-wrap text-slate-600 dark:text-slate-400">
                        {interaction.notes}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>
        </div>

        {/* ------------------------------------------------- right: the AI panel */}
        <div className="space-y-4">
          {aiLoading && (
            <SectionCard title="Case analysis">
              <p className="text-sm text-slate-500 dark:text-slate-400">Analysing this case…</p>
            </SectionCard>
          )}

          {!aiLoading && aiError && (
            <SectionCard title="Case analysis">
              <EmptyState message={aiError} />
            </SectionCard>
          )}

          {ai && (
            <>
              {ai.coach?.headline && (
                <SectionCard title="Do this next">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{ai.coach.headline}</p>
                  {ai.coach.insights.length > 0 && (
                    <ul className="mt-3 space-y-2.5">
                      {ai.coach.insights.slice(0, 4).map((insight) => (
                        <li key={insight.key} className="text-sm">
                          <p className="font-medium text-slate-700 dark:text-slate-300">{insight.title}</p>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{insight.why}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </SectionCard>
              )}

              <SectionCard
                title="Information needed"
                trailing={<Badge tone="warning">{ai.gaps.highPriority.length} high priority</Badge>}
              >
                {ai.gaps.highPriority.length === 0 && ai.gaps.recommended.length === 0 ? (
                  <EmptyState message="Nothing outstanding. This case is ready to hand over." />
                ) : (
                  <div className="space-y-4">
                    <GapList title="High priority" gaps={ai.gaps.highPriority} />
                    <GapList title="Recommended" gaps={ai.gaps.recommended} />
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title="Ask the claimant"
                trailing={
                  ai.questionSource === 'baseline' ? <Badge tone="neutral">Standard set</Badge> : undefined
                }
              >
                {ai.questions.length === 0 ? (
                  <EmptyState message="No outstanding questions for this case." />
                ) : (
                  <ol className="space-y-3">
                    {ai.questions.slice(0, 12).map((question) => (
                      <li key={question.id} className="text-sm">
                        <p className="font-medium text-slate-800 dark:text-slate-200">
                          {/* Employee voice when the generator supplied it —
                              "Ask for the claim number" reads better on a call
                              than the claimant-facing question. */}
                          {question.askInstruction || question.text}
                        </p>
                        {question.askInstruction && (
                          <p className="mt-0.5 text-xs italic text-slate-500 dark:text-slate-400">
                            “{question.text}”
                          </p>
                        )}
                        {question.whyAsked && (
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{question.whyAsked}</p>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
                <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  These are questions to ask, not advice to give. Do not tell a claimant whether they have a case,
                  what it is worth, or what they should do legally — that is for an attorney.
                </p>
              </SectionCard>

              {ai.known.length > 0 && (
                <SectionCard title="Already on file">
                  <dl className="space-y-2 text-sm">
                    {ai.known.map((fact) => (
                      <Field key={fact.key} label={fact.label} value={fact.value} />
                    ))}
                  </dl>
                </SectionCard>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function Field({
  label,
  value,
  href,
}: {
  label: string
  value?: string | null
  href?: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd className="min-w-0 truncate text-right text-slate-800 dark:text-slate-200">
        {href && value ? (
          <a className="text-brand-700 hover:underline dark:text-brand-400" href={href}>
            {value}
          </a>
        ) : (
          value || '—'
        )}
      </dd>
    </div>
  )
}

/**
 * Render whatever intake stored under a fact group.
 *
 * `Assessment.facts` is a free-form JSON blob with no schema, so the shape here
 * varies by claim type and by how old the case is. Printing the keys generically
 * is honest about that; a fixed field list would silently drop anything it did
 * not expect.
 */
function FactBlock({ label, value }: { label: string; value: unknown }) {
  const entries = useMemo(() => flattenFacts(value), [value])
  if (entries.length === 0) return null

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <dl className="mt-1 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
        {entries.map(([key, text]) => (
          <Field key={key} label={humanize(key)} value={text} />
        ))}
      </dl>
    </div>
  )
}

function flattenFacts(value: unknown, depth = 0): [string, string][] {
  if (value == null || depth > 2) return []
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      typeof item === 'object' && item
        ? flattenFacts(item, depth + 1).map(([key, text]): [string, string] => [`${index + 1} ${key}`, text])
        : [[`Item ${index + 1}`, String(item)] as [string, string]],
    )
  }
  if (typeof value !== 'object') return [['Value', String(value)]]

  return Object.entries(value as Record<string, unknown>).flatMap(([key, raw]): [string, string][] => {
    if (raw == null || raw === '') return []
    if (typeof raw === 'object') {
      return flattenFacts(raw, depth + 1).map(([nested, text]): [string, string] => [`${key} ${nested}`, text])
    }
    return [[key, typeof raw === 'boolean' ? (raw ? 'Yes' : 'No') : String(raw)]]
  })
}

function NextActionField({
  value,
  disabled,
  onSave,
}: {
  value: string | null
  disabled?: boolean
  onSave: (value: string | null) => void
}) {
  const [draft, setDraft] = useState(value || '')
  useEffect(() => setDraft(value || ''), [value])

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave(draft.trim() || null)
      }}
    >
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Next action</span>
        <input
          className="input w-full"
          value={draft}
          disabled={disabled}
          maxLength={200}
          placeholder="e.g. Call back Thursday morning"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => draft.trim() !== (value || '') && onSave(draft.trim() || null)}
        />
      </label>
    </form>
  )
}

/**
 * Log a call, request documents, or email the claimant.
 *
 * SMS is deliberately absent. `sendSms` can text a claimant today, but inbound
 * SMS only recognises attorney ACCEPT/DECLINE replies and drops everything
 * else — nothing processes a STOP. Texting claimants before opt-out works is
 * TCPA exposure, so it waits for phase 2.
 */
function ContactActions({
  assistanceId,
  hasEmail,
  suggestedDocs,
  onDone,
  onError,
}: {
  assistanceId: string
  hasEmail: boolean
  suggestedDocs?: string[]
  onDone: (message: string) => void
  onError: (message: string) => void
}) {
  const [open, setOpen] = useState<'call' | 'answer' | 'docs' | 'email' | null>(null)
  const [busy, setBusy] = useState(false)

  const [outcome, setOutcome] = useState(CALL_OUTCOMES[0].value)
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<AssistanceStatus | ''>('')

  const [docs, setDocs] = useState<string[]>([])
  const [docMessage, setDocMessage] = useState('')

  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  const [fields, setFields] = useState<AssistanceProposableField[]>([])
  const [pending, setPending] = useState<AssistancePendingProposal[]>([])
  const [fieldPath, setFieldPath] = useState('')
  const [fieldValue, setFieldValue] = useState('')
  const [proposalsLoaded, setProposalsLoaded] = useState(false)

  const uniqueSuggestions = useMemo(() => Array.from(new Set(suggestedDocs || [])), [suggestedDocs])

  const selectedField = fields.find((field) => field.path === fieldPath)

  // Loaded when the panel is first opened rather than with the page: most visits
  // are a specialist reading the case, not editing it.
  useEffect(() => {
    if (open !== 'answer' || proposalsLoaded) return
    let cancelled = false
    getAssistanceProposals(assistanceId)
      .then((data) => {
        if (cancelled) return
        setFields(data.fields)
        setPending(data.pending)
        setProposalsLoaded(true)
      })
      .catch(() => onError('Could not load the fields for this case'))
    return () => {
      cancelled = true
    }
  }, [open, proposalsLoaded, assistanceId, onError])

  const run = async (action: () => Promise<void>, message: string, keepOpen = false) => {
    try {
      setBusy(true)
      await action()
      if (!keepOpen) setOpen(null)
      setNotes('')
      setDocs([])
      setDocMessage('')
      setSubject('')
      setBody('')
      setStatus('')
      onDone(message)
    } catch (err: any) {
      onError(err.response?.data?.error || 'That did not go through')
    } finally {
      setBusy(false)
    }
  }

  return (
    <SectionCard
      title="Actions"
      trailing={
        <div className="flex flex-wrap gap-1.5">
          <ActionButton active={open === 'call'} onClick={() => setOpen(open === 'call' ? null : 'call')}>
            Log a call
          </ActionButton>
          <ActionButton active={open === 'answer'} onClick={() => setOpen(open === 'answer' ? null : 'answer')}>
            Record an answer
          </ActionButton>
          <ActionButton
            active={open === 'docs'}
            disabled={!hasEmail}
            title={hasEmail ? undefined : 'No email address on file for this claimant'}
            onClick={() => setOpen(open === 'docs' ? null : 'docs')}
          >
            Request documents
          </ActionButton>
          <ActionButton
            active={open === 'email'}
            disabled={!hasEmail}
            title={hasEmail ? undefined : 'No email address on file for this claimant'}
            onClick={() => setOpen(open === 'email' ? null : 'email')}
          >
            Send email
          </ActionButton>
        </div>
      }
    >
      {!open && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Calls are dialled from your own phone and logged here. Texting claimants is not available yet.
        </p>
      )}

      {open === 'call' && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            void run(
              async () => {
                await logAssistanceInteraction(assistanceId, {
                  channel: 'call',
                  outcome,
                  notes: notes.trim() || undefined,
                  status: status || undefined,
                })
              },
              'Call logged.',
            )
          }}
        >
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">How did it go?</span>
            <select className="input w-full" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
              {CALL_OUTCOMES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Notes</span>
            <textarea
              className="input w-full"
              rows={4}
              maxLength={4000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What you covered, what they are sending, when to follow up."
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Move the case to (optional)
            </span>
            <select
              className="input w-full"
              value={status}
              onChange={(e) => setStatus(e.target.value as AssistanceStatus | '')}
            >
              <option value="">Leave the status alone</option>
              {ASSISTANCE_STATUS_ORDER.map((option) => (
                <option key={option} value={option}>
                  {ASSISTANCE_STATUS_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
          <SubmitRow busy={busy} label="Log call" onCancel={() => setOpen(null)} />
        </form>
      )}

      {open === 'answer' && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!fieldPath) return
            void run(
              async () => {
                await proposeAssistanceValue(assistanceId, {
                  path: fieldPath,
                  // Empty means "clear it" — "no, I never missed work" is an answer.
                  value: fieldValue.trim() === '' ? null : fieldValue.trim(),
                })
                const refreshed = await getAssistanceProposals(assistanceId)
                setFields(refreshed.fields)
                setPending(refreshed.pending)
                setFieldPath('')
                setFieldValue('')
              },
              'Sent to the claimant to confirm.',
              // Stays open: a specialist usually takes several answers on one call.
              true,
            )
          }}
        >
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-400">
            This does not change the case. The claimant gets an email asking them to confirm what you entered, and it
            only counts as their answer once they do.
          </p>

          {!proposalsLoaded ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
          ) : (
            <>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  What did they tell you about?
                </span>
                <select
                  className="input w-full"
                  value={fieldPath}
                  onChange={(e) => {
                    setFieldPath(e.target.value)
                    setFieldValue('')
                  }}
                >
                  <option value="">Choose a detail…</option>
                  {fields.map((field) => (
                    <option key={field.path} value={field.path}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </label>

              {selectedField && (
                <>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    On file now:{' '}
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {selectedField.currentValue ?? 'nothing yet'}
                    </span>
                  </p>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      What they said
                    </span>
                    {selectedField.type === 'boolean' ? (
                      <select
                        className="input w-full"
                        value={fieldValue}
                        onChange={(e) => setFieldValue(e.target.value)}
                      >
                        <option value="">Leave it unanswered</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    ) : (
                      <input
                        className="input w-full"
                        inputMode={selectedField.type === 'number' ? 'decimal' : undefined}
                        value={fieldValue}
                        maxLength={5000}
                        onChange={(e) => setFieldValue(e.target.value)}
                        placeholder={
                          selectedField.type === 'number' ? 'A number, e.g. 2400' : 'Exactly what they told you'
                        }
                      />
                    )}
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Leave it blank to ask them to clear this.
                  </p>
                </>
              )}

              <SubmitRow busy={busy} disabled={!fieldPath} label="Send to claimant" onCancel={() => setOpen(null)} />

              {pending.length > 0 && (
                <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Waiting on the claimant
                  </p>
                  <ul className="mt-2 space-y-2">
                    {pending.map((proposal) => (
                      <li key={proposal.id} className="text-sm">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{proposal.label}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {proposal.currentValue ?? 'nothing'} → {proposal.proposedValue ?? 'cleared'}
                          <span className="ml-1.5">· asked {timeAgo(proposal.createdAt)}</span>
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </form>
      )}

      {open === 'docs' && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (docs.length === 0) return
            void run(
              async () => {
                await sendAssistanceDocumentRequest(assistanceId, {
                  docs,
                  message: docMessage.trim() || undefined,
                })
              },
              'Document request sent.',
            )
          }}
        >
          {uniqueSuggestions.length > 0 ? (
            <fieldset>
              <legend className="mb-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                Suggested for this case
              </legend>
              <div className="space-y-1.5">
                {uniqueSuggestions.map((doc) => (
                  <label key={doc} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={docs.includes(doc)}
                      onChange={(e) =>
                        setDocs((current) =>
                          e.target.checked ? [...current, doc] : current.filter((item) => item !== doc),
                        )
                      }
                    />
                    <span className="text-slate-700 dark:text-slate-300">{humanize(doc)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Nothing specific is flagged as missing on this case yet.
            </p>
          )}
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Message (optional)
            </span>
            <textarea
              className="input w-full"
              rows={3}
              maxLength={2000}
              value={docMessage}
              onChange={(e) => setDocMessage(e.target.value)}
              placeholder="Anything you agreed on the call."
            />
          </label>
          <SubmitRow
            busy={busy}
            disabled={docs.length === 0}
            label="Send request"
            onCancel={() => setOpen(null)}
          />
        </form>
      )}

      {open === 'email' && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            void run(
              async () => {
                await sendAssistanceEmail(assistanceId, { subject: subject.trim(), body: body.trim() })
              },
              'Email sent.',
            )
          }}
        >
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Subject</span>
            <input
              className="input w-full"
              value={subject}
              maxLength={200}
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Message</span>
            <textarea
              className="input w-full"
              rows={6}
              maxLength={8000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sent from your name, with replies routed to your address.
          </p>
          <SubmitRow
            busy={busy}
            disabled={!subject.trim() || !body.trim()}
            label="Send email"
            onCancel={() => setOpen(null)}
          />
        </form>
      )}
    </SectionCard>
  )
}

function ActionButton({
  children,
  active,
  disabled,
  title,
  onClick,
}: {
  children: React.ReactNode
  active?: boolean
  disabled?: boolean
  title?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={active}
      className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300'
          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
      }`}
    >
      {children}
    </button>
  )
}

function SubmitRow({
  busy,
  disabled,
  label,
  onCancel,
}: {
  busy: boolean
  disabled?: boolean
  label: string
  onCancel: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="submit"
        disabled={busy || disabled}
        className="rounded-lg bg-brand-700 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? 'Working…' : label}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        Cancel
      </button>
    </div>
  )
}

function GapList({ title, gaps }: { title: string; gaps: { key: string; label: string; rationale: string; severity: number }[] }) {
  if (gaps.length === 0) return null
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
      <ul className="mt-1.5 space-y-2.5">
        {gaps.map((gap) => (
          <li key={gap.key} className="text-sm">
            <p className="font-medium text-slate-800 dark:text-slate-200">{gap.label}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{gap.rationale}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
