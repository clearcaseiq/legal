/**
 * Read-only review of a routed lead for firm intake staff. Mirrors the attorney
 * offer screen's de-identification: no claimant identity until an attorney
 * accepts, so staff can triage and brief the attorney without the fee-gated
 * contact details.
 */
import { useEffect, useState } from 'react'
import { AlertTriangle, CalendarDays, FileText, Loader2, MapPin, ShieldCheck, X } from 'lucide-react'
import ModalPortal from '../../components/ModalPortal'
import { Badge, type BadgeTone } from '../shared/ui'
import { getFirmNewLeadDetail, type FirmNewLeadDetail } from '../../lib/api'
import { formatClaimType } from '../../lib/claimTypes'
import { formatCurrency } from '../../lib/formatters'

const OFFER_TONE: Record<string, BadgeTone> = {
  PENDING: 'brand',
  REQUESTED_INFO: 'warning',
  EXPIRED: 'neutral',
  DECLINED: 'danger',
  ACCEPTED: 'success',
}

const OFFER_LABEL: Record<string, string> = {
  PENDING: 'Awaiting response',
  REQUESTED_INFO: 'Info requested',
  EXPIRED: 'Expired',
  DECLINED: 'Declined',
  ACCEPTED: 'Accepted',
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}

function evidenceLabel(category: string): string {
  return category.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function FirmNewLeadReview({ assessmentId, onClose }: { assessmentId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<FirmNewLeadDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setDetail(null)
    setError(null)
    getFirmNewLeadDetail(assessmentId)
      .then((d) => {
        if (!cancelled) setDetail(d)
      })
      .catch((err: any) => {
        if (!cancelled) setError(err?.response?.data?.error || 'Failed to load lead.')
      })
    return () => {
      cancelled = true
    }
  }, [assessmentId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const venue = detail ? [detail.venueCounty, detail.venueState].filter(Boolean).join(', ') : ''
  const value = detail?.summary?.estimatedValue
  const evidence = Object.entries(detail?.evidenceCounts || {}).sort((a, b) => b[1] - a[1])

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Lead review"
          className="flex h-full w-full max-w-2xl flex-col bg-white shadow-xl dark:bg-slate-900"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Lead review</p>
              <h2 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-50">
                {detail ? detail.caseName || formatClaimType(detail.claimType) : 'Loading…'}
              </h2>
              {detail ? (
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span>{formatClaimType(detail.claimType)}</span>
                  {venue ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {venue}
                    </span>
                  ) : null}
                  {detail.referenceCode ? <span>{detail.referenceCode}</span> : null}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
            {error ? (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">{error}</p>
            ) : !detail ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading lead…
              </div>
            ) : (
              <>
                <p className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:ring-slate-700">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  Client identity and contact details are hidden until an attorney accepts this lead.
                </p>

                {detail.summary ? (
                  <div className="grid gap-2 sm:grid-cols-4">
                    <Stat label="Est. value" value={value ? `${formatCurrency(value.low)}–${formatCurrency(value.high)}` : '—'} />
                    <Stat label="Liability" value={detail.summary.liability.grade} />
                    <Stat label="Severity" value={detail.summary.severity.label} />
                    <Stat
                      label="SOL"
                      value={detail.summary.sol.daysRemaining != null ? `${detail.summary.sol.daysRemaining} days` : 'Confirm'}
                      tone={detail.summary.sol.daysRemaining != null && detail.summary.sol.daysRemaining < 90 ? 'text-rose-600' : undefined}
                    />
                  </div>
                ) : null}

                <section>
                  <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <CalendarDays className="h-3.5 w-3.5" /> Incident
                  </h3>
                  <p className="text-xs text-slate-500">Date: {formatDate(detail.incident.date)}</p>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                    {detail.incident.narrative || 'No narrative provided.'}
                  </p>
                </section>

                {detail.known.length > 0 ? (
                  <section>
                    <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Case facts</h3>
                    <dl className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                      {detail.known.map((k) => (
                        <div key={k.key} className="grid grid-cols-5 gap-3 px-3 py-2 text-sm">
                          <dt className="col-span-2 text-slate-500">{k.label}</dt>
                          <dd className="col-span-3 text-slate-800 dark:text-slate-100">{k.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ) : null}

                <section>
                  <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <FileText className="h-3.5 w-3.5" /> Evidence on file
                  </h3>
                  {evidence.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {evidence.map(([cat, count]) => (
                        <Badge key={cat} tone="neutral">
                          {evidenceLabel(cat)} · {count}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">No documents uploaded yet.</p>
                  )}
                </section>

                {detail.gaps.length > 0 ? (
                  <section>
                    <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Open gaps
                    </h3>
                    <ul className="space-y-1">
                      {detail.gaps.slice(0, 8).map((g) => (
                        <li key={g.key} className="flex items-center justify-between gap-2 text-sm text-slate-700 dark:text-slate-200">
                          <span>{g.label}</span>
                          <span className="text-[11px] text-amber-600">{'★'.repeat(Math.max(1, Math.min(5, g.severity)))}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                <section>
                  <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Routing</h3>
                  <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                    {detail.offers.map((o) => (
                      <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                        <span className="font-medium text-slate-800 dark:text-slate-100">{o.attorney?.name || 'Attorney'}</span>
                        <span className="flex items-center gap-2 text-xs text-slate-500">
                          Wave {o.waveNumber} · {formatDate(o.routedAt)}
                          <Badge tone={OFFER_TONE[o.status] || 'neutral'}>{OFFER_LABEL[o.status] || o.status}</Badge>
                        </span>
                        {o.requestedInfoNotes ? (
                          <p className="w-full text-xs text-amber-700">Info requested: {o.requestedInfoNotes}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              </>
            )}
          </div>
        </aside>
      </div>
    </ModalPortal>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-0.5 truncate text-sm font-semibold ${tone || 'text-slate-900 dark:text-slate-50'}`}>{value}</p>
    </div>
  )
}
