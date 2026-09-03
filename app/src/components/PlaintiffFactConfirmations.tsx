import { useCallback, useEffect, useState } from 'react'
import { CheckCircle, MessageSquareWarning } from 'lucide-react'
import {
  getFactConfirmations,
  respondToFactConfirmation,
  type FactConfirmation,
} from '../lib/api-plaintiff'

/**
 * "A specialist wrote this down for you — is it right?"
 *
 * When a case specialist takes an answer on a phone call, it does not go onto
 * the case. It waits here until the claimant confirms it, because a paraphrase
 * of someone's account of their own injury is not that person's account. Both
 * values are shown side by side so declining is a real option, not a hidden one.
 *
 * Renders nothing when there is nothing waiting, which is the normal state.
 */
export default function PlaintiffFactConfirmations({
  assessmentId,
  readOnly = false,
}: {
  assessmentId: string | null | undefined
  readOnly?: boolean
}) {
  const [items, setItems] = useState<FactConfirmation[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmedCount, setConfirmedCount] = useState(0)

  const load = useCallback(async () => {
    if (!assessmentId) return
    try {
      setItems(await getFactConfirmations(assessmentId))
    } catch {
      // Silent: a claimant with nothing pending should never see an error about
      // a feature they have not encountered.
    }
  }, [assessmentId])

  useEffect(() => {
    void load()
  }, [load])

  const respond = async (id: string, decision: 'confirm' | 'decline') => {
    if (!assessmentId) return
    try {
      setBusyId(id)
      setError(null)
      setItems(await respondToFactConfirmation(assessmentId, id, { decision }))
      if (decision === 'confirm') setConfirmedCount((count) => count + 1)
    } catch (err: any) {
      setError(err?.response?.data?.error === 'not_pending'
        ? 'Someone already answered this one.'
        : 'That did not go through. Please try again.')
      void load()
    } finally {
      setBusyId(null)
    }
  }

  if (!assessmentId) return null

  if (items.length === 0) {
    // Acknowledge the last one rather than having the card vanish mid-interaction.
    if (confirmedCount === 0) return null
    return (
      <section className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-start gap-3">
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
          <div>
            <h3 className="font-display text-base font-semibold text-emerald-900">Thanks — that is all updated</h3>
            <p className="mt-1 text-sm text-emerald-800">
              Your case now reflects what you confirmed. Nothing else is waiting on you here.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5"
      aria-label="Details to confirm from your call"
    >
      <div className="flex items-start gap-3">
        <MessageSquareWarning className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-semibold text-amber-900">
            {items.length === 1 ? 'One detail to confirm' : `${items.length} details to confirm`}
          </h3>
          <p className="mt-1 text-sm text-amber-800">
            We wrote these down during your call. Nothing has changed on your case yet — they only count once you
            confirm them.
          </p>

          {error && (
            <p className="mt-3 rounded-lg bg-white px-3 py-2 text-sm text-rose-700" role="alert">
              {error}
            </p>
          )}

          <ul className="mt-4 space-y-3">
            {items.map((item) => (
              <li key={item.id} className="rounded-xl border border-amber-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">{item.label}</p>

                <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">What you had</dt>
                    <dd className="mt-0.5 break-words text-sm text-slate-700">
                      {item.currentValue ?? <span className="italic text-slate-400">Nothing yet</span>}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-amber-50 px-3 py-2">
                    <dt className="text-xs font-medium uppercase tracking-wide text-amber-700">What we noted</dt>
                    <dd className="mt-0.5 break-words text-sm font-medium text-amber-900">
                      {item.proposedValue ?? <span className="italic text-amber-700">Clear this</span>}
                    </dd>
                  </div>
                </dl>

                {!readOnly && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => void respond(item.id, 'confirm')}
                      className="rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busyId === item.id ? 'Saving…' : 'Yes, that is right'}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => void respond(item.id, 'decline')}
                      className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      No, keep what I had
                    </button>
                  </div>
                )}

                {item.proposedBy && (
                  <p className="mt-2 text-xs text-slate-500">Noted by {item.proposedBy}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
