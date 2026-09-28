/**
 * Read-only view of one active case, opened from the firm dashboard's Active
 * Cases list. Staff who don't use the attorney workspace (intake specialists)
 * see the client, the case team, open tasks and where the file stands.
 */
import { useEffect, useState } from 'react'
import { AlertTriangle, CalendarDays, FileText, ListChecks, Loader2, Mail, MapPin, Phone, Users, X } from 'lucide-react'
import ModalPortal from '../../components/ModalPortal'
import { Badge } from '../shared/ui'
import { getFirmCaseDetail, type FirmCaseDetail as FirmCaseDetailData } from '../../lib/api'
import { formatClaimType } from '../../lib/claimTypes'
import { formatCurrency } from '../../lib/formatters'

const STAGE_LABEL: Record<string, string> = {
  contacted: 'Accepted',
  consulted: 'Consulted',
  retained: 'Retained',
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}

function humanize(value: string): string {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function FirmCaseDetail({
  assessmentId,
  onClose,
  onAssign,
}: {
  assessmentId: string
  onClose: () => void
  /** Present only for callers allowed to assign cases. */
  onAssign?: () => void
}) {
  const [detail, setDetail] = useState<FirmCaseDetailData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setDetail(null)
    setError(null)
    getFirmCaseDetail(assessmentId)
      .then((d) => {
        if (!cancelled) setDetail(d)
      })
      .catch((err: any) => {
        if (!cancelled) setError(err?.response?.data?.error || 'Failed to load case.')
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
  const team = detail
    ? [
        ...(detail.primaryAttorney ? [{ role: 'Lead attorney', name: detail.primaryAttorney.name }] : []),
        ...detail.assignments
          .filter((a) => a.name && a.name !== detail.primaryAttorney?.name)
          .map((a) => ({ role: humanize(a.role), name: a.name as string })),
      ]
    : []

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Case details"
          className="flex h-full w-full max-w-2xl flex-col bg-white shadow-xl dark:bg-slate-900"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Active case</p>
              <h2 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-50">
                {detail ? detail.client.name || formatClaimType(detail.claimType) : 'Loading…'}
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
                  <Badge tone="brand">{STAGE_LABEL[detail.leadStatus] || humanize(detail.leadStatus)}</Badge>
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
                <Loader2 className="h-4 w-4 animate-spin" /> Loading case…
              </div>
            ) : (
              <>
                {detail.client.email || detail.client.phone ? (
                  <section className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-700 dark:text-slate-200">
                    {detail.client.phone ? (
                      <a href={`tel:${detail.client.phone}`} className="inline-flex items-center gap-1.5 hover:text-brand-700">
                        <Phone className="h-3.5 w-3.5 text-slate-400" /> {detail.client.phone}
                      </a>
                    ) : null}
                    {detail.client.email ? (
                      <a href={`mailto:${detail.client.email}`} className="inline-flex items-center gap-1.5 break-all hover:text-brand-700">
                        <Mail className="h-3.5 w-3.5 text-slate-400" /> {detail.client.email}
                      </a>
                    ) : null}
                  </section>
                ) : null}

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
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <Users className="h-3.5 w-3.5" /> Case team
                    </h3>
                    {onAssign ? (
                      <button
                        type="button"
                        onClick={onAssign}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                      >
                        Assign
                      </button>
                    ) : null}
                  </div>
                  {team.length ? (
                    <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                      {team.map((m, i) => (
                        <li key={`${m.name}-${i}`} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                          <span className="font-medium text-slate-800 dark:text-slate-100">{m.name}</span>
                          <span className="text-xs text-slate-500">{m.role}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-400">No one assigned yet.</p>
                  )}
                </section>

                <section>
                  <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <ListChecks className="h-3.5 w-3.5" /> Open tasks
                  </h3>
                  {detail.openTasks.length ? (
                    <ul className="space-y-1">
                      {detail.openTasks.map((t) => (
                        <li key={t.id} className="flex items-center justify-between gap-2 text-sm text-slate-700 dark:text-slate-200">
                          <span className="min-w-0 truncate">{t.title}</span>
                          <span className="shrink-0 text-xs text-slate-500">
                            {t.assignedRole ? `${humanize(t.assignedRole)} · ` : ''}
                            {t.dueDate ? `Due ${formatDate(t.dueDate)}` : 'No due date'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-400">No open tasks.</p>
                  )}
                </section>

                <section>
                  <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <CalendarDays className="h-3.5 w-3.5" /> Incident
                  </h3>
                  <p className="text-xs text-slate-500">Date: {formatDate(detail.incident.date)}</p>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                    {detail.incident.narrative || 'No narrative provided.'}
                  </p>
                </section>

                <section>
                  <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <FileText className="h-3.5 w-3.5" /> Evidence on file
                  </h3>
                  {evidence.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {evidence.map(([cat, count]) => (
                        <Badge key={cat} tone="neutral">
                          {humanize(cat)} · {count}
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
