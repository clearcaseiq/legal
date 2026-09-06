import { useEffect, useMemo, useState } from 'react'
import {
  getAssistanceProposals,
  logAssistanceInteraction,
  proposeAssistanceValue,
  sendAssistanceDocumentRequest,
  sendAssistanceEmail,
  type AssistancePendingProposal,
  type AssistanceProposableField,
  type AssistanceStatus,
  type UplViolation,
} from '../../../lib/api'
import { SectionCard } from '../../../features/shared/ui'
import {
  ASSISTANCE_STATUS_LABELS,
  ASSISTANCE_STATUS_ORDER,
  CALL_OUTCOMES,
  humanize,
  timeAgo,
} from '../assistanceLabels'

export type ContactAction = 'call' | 'answer' | 'docs' | 'email'

/**
 * Log a call, record an answer, request documents, or email the claimant.
 *
 * `open` is controlled by the workbench rather than held here, so the header
 * buttons and the next-best-action card can open the right form on the right tab
 * without this component having to know either of them exist.
 *
 * SMS is deliberately absent. `sendSms` can text a claimant today, but inbound
 * SMS only recognises attorney ACCEPT/DECLINE replies and drops everything
 * else, so texting claimants stays off until claimant-side opt-out is handled.
 */
export function ContactActions({
  assistanceId,
  hasEmail,
  suggestedDocs,
  actions,
  open,
  onOpenChange,
  onDone,
  onError,
  idleMessage,
}: {
  assistanceId: string
  hasEmail: boolean
  suggestedDocs?: string[]
  /** Which forms this mount offers. Each tab shows the ones it is about. */
  actions: ContactAction[]
  open: ContactAction | null
  onOpenChange: (open: ContactAction | null) => void
  onDone: (message: string) => void
  onError: (message: string) => void
  idleMessage?: string
}) {
  const [busy, setBusy] = useState(false)

  const [outcome, setOutcome] = useState(CALL_OUTCOMES[0].value)
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<AssistanceStatus | ''>('')

  const [docs, setDocs] = useState<string[]>([])
  const [docMessage, setDocMessage] = useState('')

  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [uplViolations, setUplViolations] = useState<UplViolation[]>([])

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

  const openHere = open && actions.includes(open)

  const run = async (action: () => Promise<void>, message: string, keepOpen = false) => {
    try {
      setBusy(true)
      await action()
      if (!keepOpen) onOpenChange(null)
      setNotes('')
      setDocs([])
      setDocMessage('')
      setSubject('')
      setBody('')
      setStatus('')
      setUplViolations([])
      onDone(message)
    } catch (err: any) {
      // The UPL block is shown in the form rather than as a banner, because the
      // useful part is which phrases to rewrite — and the draft is still in the
      // textarea, which `run` only clears on success.
      if (err.response?.status === 422 && err.response?.data?.code === 'UPL_BOUNDARY') {
        setUplViolations(err.response.data.violations || [])
        return
      }
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
          {actions.includes('call') && (
            <ActionButton active={open === 'call'} onClick={() => onOpenChange(open === 'call' ? null : 'call')}>
              Log a call
            </ActionButton>
          )}
          {actions.includes('answer') && (
            <ActionButton active={open === 'answer'} onClick={() => onOpenChange(open === 'answer' ? null : 'answer')}>
              Record an answer
            </ActionButton>
          )}
          {actions.includes('docs') && (
            <ActionButton
              active={open === 'docs'}
              disabled={!hasEmail}
              title={hasEmail ? undefined : 'No email address on file for this claimant'}
              onClick={() => onOpenChange(open === 'docs' ? null : 'docs')}
            >
              Request documents
            </ActionButton>
          )}
          {actions.includes('email') && (
            <ActionButton
              active={open === 'email'}
              disabled={!hasEmail}
              title={hasEmail ? undefined : 'No email address on file for this claimant'}
              onClick={() => onOpenChange(open === 'email' ? null : 'email')}
            >
              Send email
            </ActionButton>
          )}
        </div>
      }
    >
      {!openHere && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {idleMessage || 'Calls are dialled from your own phone and logged here. Texting claimants is not available yet.'}
        </p>
      )}

      {open === 'call' && actions.includes('call') && (
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
          <SubmitRow busy={busy} label="Log call" onCancel={() => onOpenChange(null)} />
        </form>
      )}

      {open === 'answer' && actions.includes('answer') && (
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

              <SubmitRow busy={busy} disabled={!fieldPath} label="Send to claimant" onCancel={() => onOpenChange(null)} />

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

      {open === 'docs' && actions.includes('docs') && (
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
          {uplViolations.length > 0 && <UplNotice violations={uplViolations} />}
          <SubmitRow
            busy={busy}
            disabled={docs.length === 0}
            label="Send request"
            onCancel={() => onOpenChange(null)}
          />
        </form>
      )}

      {open === 'email' && actions.includes('email') && (
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
          {uplViolations.length > 0 && <UplNotice violations={uplViolations} />}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sent from your name, with replies routed to your address. You can gather facts and route questions to the
            attorney; you cannot advise on the case.
          </p>
          <SubmitRow
            busy={busy}
            disabled={!subject.trim() || !body.trim()}
            label="Send email"
            onCancel={() => onOpenChange(null)}
          />
        </form>
      )}
    </SectionCard>
  )
}

function UplNotice({ violations }: { violations: UplViolation[] }) {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-700/60 dark:bg-amber-950/40">
      <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
        This reads as legal advice, which you cannot give
      </p>
      <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
        Rewrite the parts below, or tell the claimant you will pass the question to their attorney.
      </p>
      <ul className="mt-2 space-y-2">
        {violations.map((violation) => (
          <li key={violation.category} className="text-xs text-amber-900 dark:text-amber-200">
            <span className="font-medium">“{violation.matched}”</span>
            <span className="mt-0.5 block text-amber-800 dark:text-amber-300">{violation.guidance}</span>
          </li>
        ))}
      </ul>
    </div>
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

export function SubmitRow({
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
