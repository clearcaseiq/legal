/**
 * Firm Dashboard → New Leads: what routing has learned from each attorney's
 * decline reasons, with a per-attorney reset.
 */

import { useCallback, useEffect, useState } from 'react'
import { Brain, RotateCcw } from 'lucide-react'
import {
  getFirmRoutingLearning,
  resetFirmRoutingLearning,
  type FirmRoutingLearningAttorney,
  type FirmRoutingLearningResponse,
} from '../../lib/api'
import { SectionCard, EmptyState, LoadingState, Badge } from '../shared/ui'
import ConfirmDialog from '../../components/ConfirmDialog'
import { formatClaimType } from '../../lib/claimTypes'

const btnGhost =
  'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60'

function formatMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`
}

function hasLearning(a: FirmRoutingLearningAttorney): boolean {
  return a.claimTypes.length > 0 || a.counties.length > 0 || a.minValue != null || a.pausedUntil != null || a.weakLiability > 0
}

export function FirmRoutingLearningPanel() {
  const [data, setData] = useState<FirmRoutingLearningResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [hidden, setHidden] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetting, setResetting] = useState<FirmRoutingLearningAttorney | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    getFirmRoutingLearning()
      .then(setData)
      .catch((err: any) => {
        if (err?.response?.status === 403 || err?.response?.status === 404) setHidden(true)
        else setError('Could not load what routing has learned.')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const reset = async () => {
    if (!resetting) return
    setBusy(true)
    try {
      await resetFirmRoutingLearning(resetting.attorneyId)
      setResetting(null)
      load()
    } catch {
      setError('Could not reset. Try again.')
      setResetting(null)
    } finally {
      setBusy(false)
    }
  }

  if (hidden) return null

  const learned = (data?.attorneys ?? []).filter(hasLearning)

  return (
    <SectionCard
      title={
        <>
          <Brain className="h-4 w-4 text-brand-600" /> What routing has learned
        </>
      }
    >
      <p className="mb-3 text-sm text-slate-500">
        When your firm declines a case, the reason shapes which cases each attorney is offered next. Each decline fades
        out over {data?.windowDays ?? 90} days. Reset an attorney to start fresh.
      </p>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {loading && !data ? (
        <LoadingState message="Loading…" />
      ) : learned.length === 0 ? (
        <EmptyState message="Nothing learned yet. Decline reasons from the last 90 days will show up here." />
      ) : (
        <div className="space-y-3">
          {learned.map((a) => (
            <div key={a.attorneyId} className="rounded-xl border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-slate-900">{a.name}</span>
                <button type="button" className={btnGhost} onClick={() => setResetting(a)}>
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </button>
              </div>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                {a.pausedUntil && (
                  <li className="flex flex-wrap items-center gap-2">
                    <Badge tone="warning">Paused</Badge>
                    No new offers until {new Date(a.pausedUntil).toLocaleString()} (declined as too busy)
                  </li>
                )}
                {a.claimTypes.map((c) => (
                  <li key={c.claimType} className="flex flex-wrap items-center gap-2">
                    <Badge tone={c.blocked ? 'danger' : 'neutral'}>{c.blocked ? 'Not offered' : 'Offered less'}</Badge>
                    {formatClaimType(c.claimType)} cases (declined as outside practice area)
                  </li>
                ))}
                {a.counties.map((c) => (
                  <li key={`${c.state}|${c.county}`} className="flex flex-wrap items-center gap-2">
                    <Badge tone={c.blocked ? 'danger' : 'neutral'}>{c.blocked ? 'Not offered' : 'Offered less'}</Badge>
                    <span className="capitalize">{c.county}</span>, {c.state} (declined as wrong jurisdiction)
                  </li>
                ))}
                {a.minValue != null && (
                  <li className="flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">Offered less</Badge>
                    Cases valued at {formatMoney(a.minValue)} or below (declined as too low)
                  </li>
                )}
                {a.weakLiability > 0 && (
                  <li className="flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">Offered less</Badge>
                    Cases with weak liability (declined for unclear liability or thin evidence)
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={Boolean(resetting)}
        busy={busy}
        title="Reset routing learning?"
        message={
          <>
            Routing will forget {resetting?.name}’s past decline reasons. Declines from now on will start shaping their
            offers again.
          </>
        }
        confirmLabel="Reset"
        onConfirm={reset}
        onCancel={() => setResetting(null)}
      />
    </SectionCard>
  )
}
