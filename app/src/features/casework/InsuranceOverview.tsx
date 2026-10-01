/**
 * Case-level insurance views for the Insurance tab: the coverage stack against
 * the damages on file (flags underinsured cases), and the firm-wide adjuster
 * directory with each adjuster's track record.
 */
import { useEffect, useState } from 'react'
import { AlertTriangle, Check, Info, Search, Users, X } from 'lucide-react'
import { getAdjusterDirectory, type AdjusterProfile, type CoverageStack } from '../../lib/api'

function money(n: number) {
  return `$${Math.round(n).toLocaleString()}`
}

export function CoverageStackCard({ coverage, onAddClientPolicy }: { coverage: CoverageStack; onAddClientPolicy?: () => void }) {
  const layers = [
    { label: 'Liability', value: coverage.liability, cls: 'bg-brand-500' },
    { label: 'UM / UIM', value: coverage.umUim, cls: 'bg-sky-400' },
    { label: 'MedPay / PIP', value: coverage.medpay, cls: 'bg-emerald-400' },
    { label: 'Other', value: coverage.other, cls: 'bg-slate-300' },
  ].filter((l) => l.value > 0)
  const scale = Math.max(coverage.total, coverage.damagesTotal, 1)
  const showClientCta = onAddClientPolicy && coverage.flags.some((f) => /client policy|insurance card/i.test(f.text))

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">Coverage vs damages</h3>
        <p className="text-xs text-slate-500">
          {coverage.damagesSource === 'ledger'
            ? 'Damages from the damages ledger'
            : coverage.damagesSource === 'intake'
              ? 'Damages from intake (ledger empty)'
              : 'No damages recorded yet'}
        </p>
      </div>

      <div className="mt-3 space-y-2">
        <div>
          <div className="mb-1 flex justify-between text-xs text-slate-500">
            <span>Available coverage</span>
            <span className="font-semibold text-slate-900">{money(coverage.total)}</span>
          </div>
          <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
            {layers.map((l) => (
              <div key={l.label} className={l.cls} style={{ width: `${(l.value / scale) * 100}%` }} title={`${l.label}: ${money(l.value)}`} />
            ))}
          </div>
          {layers.length ? (
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
              {layers.map((l) => (
                <span key={l.label} className="inline-flex items-center gap-1">
                  <span className={`h-2 w-2 rounded-full ${l.cls}`} /> {l.label} {money(l.value)}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs text-slate-500">
            <span>Damages (specials {money(coverage.specials)}{coverage.future ? ` + future ${money(coverage.future)}` : ''})</span>
            <span className="font-semibold text-slate-900">{money(coverage.damagesTotal)}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className={coverage.gap > 0 ? 'h-full bg-rose-400' : 'h-full bg-slate-400'}
              style={{ width: `${(coverage.damagesTotal / scale) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <ul className="mt-3 space-y-1.5">
        {coverage.flags.map((f, i) => (
          <li
            key={i}
            className={`flex items-start gap-1.5 text-xs ${f.tone === 'warn' ? 'text-amber-800' : f.tone === 'ok' ? 'text-emerald-700' : 'text-slate-600'}`}
          >
            {f.tone === 'warn' ? (
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            ) : f.tone === 'ok' ? (
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            ) : (
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            )}
            {f.text}
          </li>
        ))}
      </ul>
      {showClientCta ? (
        <button
          type="button"
          onClick={onAddClientPolicy}
          className="mt-2.5 inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Add client's own policy
        </button>
      ) : null}
    </div>
  )
}

export function useAdjusterDirectory(leadId: string) {
  const [adjusters, setAdjusters] = useState<AdjusterProfile[]>([])
  useEffect(() => {
    getAdjusterDirectory(leadId)
      .then(setAdjusters)
      .catch(() => setAdjusters([]))
  }, [leadId])
  return adjusters
}

export function AdjusterDirectoryModal({ leadId, onClose }: { leadId: string; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<AdjusterProfile[] | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => {
      getAdjusterDirectory(leadId, q || undefined)
        .then(setRows)
        .catch(() => setRows([]))
    }, 250)
    return () => window.clearTimeout(t)
  }, [leadId, q])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3" role="dialog" aria-modal="true">
      <div className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Users className="h-4 w-4 text-slate-400" /> Adjuster directory
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">Every adjuster on your firm's cases, with how quickly they respond and how claims have gone.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="border-b border-slate-100 px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by adjuster, email, or carrier"
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {!rows ? <p className="py-6 text-center text-sm text-slate-400">Loading…</p> : null}
          {rows && !rows.length ? <p className="py-6 text-center text-sm text-slate-500">No adjusters recorded yet.</p> : null}
          {rows?.length ? (
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 pr-3 font-semibold">Adjuster</th>
                  <th className="py-2 pr-3 font-semibold">Cases</th>
                  <th className="py-2 pr-3 font-semibold">Avg response</th>
                  <th className="py-2 pr-3 font-semibold">Liability accepted</th>
                  <th className="py-2 font-semibold">Limits demands paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((a) => {
                  const decided = a.liabilityAccepted + a.liabilityDenied
                  const demands = a.limitsAccepted + a.limitsRejected
                  return (
                    <tr key={a.key} className="align-top">
                      <td className="py-2 pr-3">
                        <p className="font-medium text-slate-900">{a.name || a.email}</p>
                        <p className="text-xs text-slate-500">{[a.carriers.join(', '), a.email, a.phone].filter(Boolean).join(' · ')}</p>
                      </td>
                      <td className="py-2 pr-3 text-slate-700">{a.caseCount}</td>
                      <td className="py-2 pr-3 text-slate-700">
                        {a.avgResponseDays != null ? `${a.avgResponseDays} days` : '—'}
                        {a.unansweredOutreach ? <p className="text-xs text-amber-700">{a.unansweredOutreach} unanswered</p> : null}
                      </td>
                      <td className="py-2 pr-3 text-slate-700">{decided ? `${a.liabilityAccepted} of ${decided}` : '—'}</td>
                      <td className="py-2 text-slate-700">{demands ? `${a.limitsAccepted} of ${demands}` : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : null}
        </div>
      </div>
    </div>
  )
}
