import { useEffect, useMemo, useState } from 'react'
import {
  getAssistanceProposals,
  proposeAssistanceValue,
  type AssistanceGap,
  type AssistancePendingProposal,
  type AssistanceProposableField,
  type AssistanceQuestion,
} from '../../../lib/api'
import { EmptyState, SectionCard } from '../../../features/shared/ui'
import { timeAgo } from '../assistanceLabels'

/**
 * The guided version of taking answers on a call.
 *
 * The ad-hoc form asks a specialist to pick a field out of a thirty-item
 * dropdown and then think of the question that fills it. On a live call that is
 * backwards — you have the answer in your ear and you are hunting for the box.
 * This runs the other way: one question at a time, in the wording to say out
 * loud, with the field that closes it already open underneath.
 *
 * Nothing here writes to the case. Every answer becomes a proposal the claimant
 * confirms, because a specialist's paraphrase of someone's account of their own
 * injury is not that person's account.
 */

type IntakeStep = {
  id: string
  /** What to say, in the imperative. */
  prompt: string
  /** The claimant-facing phrasing, when it differs from the prompt. */
  verbatim?: string
  why?: string
  /** Candidate fact paths that close this step. Empty means ask-only. */
  paths: string[]
  gapKeys: string[]
}

/**
 * Questions first, then any answerable gap no question covers.
 *
 * Without the second half a gap could be recordable and unreachable: the
 * question generator prunes its own list, so a gap it dropped would have a field
 * behind it that the guided flow never offered.
 */
export function buildIntakeSteps(questions: AssistanceQuestion[], gaps: AssistanceGap[]): IntakeStep[] {
  const pathsForGap = new Map(gaps.map((gap) => [gap.key, gap.factPaths ?? []]))
  const steps: IntakeStep[] = []
  const coveredGaps = new Set<string>()

  for (const question of questions) {
    const gapKeys = question.gapKeys ?? []
    const paths = Array.from(new Set(gapKeys.flatMap((key) => pathsForGap.get(key) ?? [])))
    for (const key of gapKeys) {
      if ((pathsForGap.get(key) ?? []).length > 0) coveredGaps.add(key)
    }
    steps.push({
      id: question.id,
      prompt: question.askInstruction || question.text,
      verbatim: question.askInstruction ? question.text : undefined,
      why: question.whyAsked,
      paths,
      gapKeys,
    })
  }

  for (const gap of gaps) {
    const paths = gap.factPaths ?? []
    if (paths.length === 0 || coveredGaps.has(gap.key)) continue
    steps.push({
      id: `gap:${gap.key}`,
      prompt: `Ask about ${gap.label.toLowerCase()}.`,
      why: gap.rationale,
      paths,
      gapKeys: [gap.key],
    })
  }

  return steps
}

export function AssistedIntake({
  assistanceId,
  questions,
  gaps,
  loading,
  focusGapKey,
  onRecorded,
  onError,
}: {
  assistanceId: string
  questions: AssistanceQuestion[]
  gaps: AssistanceGap[]
  loading: boolean
  /** Jump to the step that closes this gap, set when arriving from a gap list. */
  focusGapKey?: string | null
  onRecorded: (message: string) => void
  onError: (message: string) => void
}) {
  const [fields, setFields] = useState<AssistanceProposableField[]>([])
  const [pending, setPending] = useState<AssistancePendingProposal[]>([])
  const [loaded, setLoaded] = useState(false)
  const [index, setIndex] = useState(0)
  const [value, setValue] = useState('')
  const [path, setPath] = useState('')
  const [showAllFields, setShowAllFields] = useState(false)
  const [busy, setBusy] = useState(false)
  const [recorded, setRecorded] = useState<string[]>([])

  const steps = useMemo(() => buildIntakeSteps(questions, gaps), [questions, gaps])
  const step = steps[index]

  useEffect(() => {
    let cancelled = false
    getAssistanceProposals(assistanceId)
      .then((data) => {
        if (cancelled) return
        setFields(data.fields)
        setPending(data.pending)
        setLoaded(true)
      })
      .catch(() => onError('Could not load the fields for this case'))
    return () => {
      cancelled = true
    }
  }, [assistanceId, onError])

  // Arriving from a gap should land on that gap's question, not the top of the list.
  useEffect(() => {
    if (!focusGapKey || steps.length === 0) return
    const target = steps.findIndex((candidate) => candidate.gapKeys.includes(focusGapKey))
    if (target >= 0) setIndex(target)
  }, [focusGapKey, steps])

  // The default field for a step, reset whenever the step changes.
  useEffect(() => {
    setPath(step?.paths[0] ?? '')
    setValue('')
    setShowAllFields(false)
  }, [step?.id])

  const selectedField = fields.find((field) => field.path === path)
  const offered = showAllFields ? fields : fields.filter((field) => step?.paths.includes(field.path))

  const goTo = (next: number) => setIndex(Math.min(Math.max(next, 0), Math.max(steps.length - 1, 0)))

  const record = async () => {
    if (!path) return
    try {
      setBusy(true)
      await proposeAssistanceValue(assistanceId, {
        // Empty means "clear it" — "no, I never missed work" is an answer.
        path,
        value: value.trim() === '' ? null : value.trim(),
      })
      const refreshed = await getAssistanceProposals(assistanceId)
      setFields(refreshed.fields)
      setPending(refreshed.pending)
      setRecorded((current) => [...current, step?.id ?? path])
      onRecorded('Sent to the claimant to confirm.')
      if (index < steps.length - 1) goTo(index + 1)
    } catch (err: any) {
      onError(err.response?.data?.error || 'That did not go through')
    } finally {
      setBusy(false)
    }
  }

  if (loading || !loaded) {
    return (
      <SectionCard title="Assisted intake">
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
      </SectionCard>
    )
  }

  if (steps.length === 0) {
    return (
      <SectionCard title="Assisted intake">
        <EmptyState message="No outstanding questions for this case." />
      </SectionCard>
    )
  }

  return (
    <SectionCard
      title="Assisted intake"
      trailing={
        <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
          {index + 1} of {steps.length}
          {recorded.length > 0 && ` · ${recorded.length} recorded`}
        </span>
      }
    >
      <div className="h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-brand-600 transition-all"
          style={{ width: `${((index + 1) / steps.length) * 100}%` }}
        />
      </div>

      <div className="mt-4">
        <p className="text-base font-medium text-slate-900 dark:text-slate-100">{step.prompt}</p>
        {step.verbatim && (
          <p className="mt-1 text-sm italic text-slate-500 dark:text-slate-400">“{step.verbatim}”</p>
        )}
        {step.why && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{step.why}</p>}
      </div>

      {step.paths.length === 0 && !showAllFields ? (
        <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-400">
          <p>There is no field for this one. Ask it anyway and put the answer in your call notes.</p>
          <button
            type="button"
            onClick={() => setShowAllFields(true)}
            className="mt-1.5 font-medium text-brand-700 hover:underline dark:text-brand-400"
          >
            Record it against another field
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {offered.length > 1 && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Record this as
              </span>
              <select className="input w-full" value={path} onChange={(e) => setPath(e.target.value)}>
                <option value="">Choose a field…</option>
                {offered.map((field) => (
                  <option key={field.path} value={field.path}>
                    {field.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {selectedField && (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {offered.length <= 1 && (
                  <span className="font-medium text-slate-700 dark:text-slate-300">{selectedField.label}. </span>
                )}
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
                  <select className="input w-full" value={value} onChange={(e) => setValue(e.target.value)}>
                    <option value="">Leave it unanswered</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : (
                  <input
                    className="input w-full"
                    inputMode={selectedField.type === 'number' ? 'decimal' : undefined}
                    value={value}
                    maxLength={5000}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={
                      selectedField.type === 'number' ? 'A number, e.g. 2400' : 'Exactly what they told you'
                    }
                  />
                )}
              </label>
            </>
          )}

          {!showAllFields && step.paths.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAllFields(true)}
              className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-400"
            >
              They told me something else
            </button>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <button
          type="button"
          onClick={() => void record()}
          disabled={busy || !path}
          className="rounded-lg bg-brand-700 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Working…' : 'Record and continue'}
        </button>
        <button
          type="button"
          onClick={() => goTo(index + 1)}
          disabled={index >= steps.length - 1}
          className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          Skip
        </button>
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          Back
        </button>
      </div>

      <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-400">
        Nothing here changes the case. The claimant gets an email asking them to confirm what you entered, and it only
        counts as their answer once they do. Ask these questions — do not answer them, and do not tell a claimant
        whether they have a case or what it is worth.
      </p>

      {pending.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
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
    </SectionCard>
  )
}
