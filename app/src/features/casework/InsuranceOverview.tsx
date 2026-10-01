/**
 * Case-level insurance views for the Insurance tab: the coverage stack against
 * the damages on file (flags underinsured cases), and the firm-wide adjuster
 * directory with each adjuster's track record.
 */
import { Fragment, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Check, ChevronRight, ExternalLink, Info, Pencil, Search, Users, X } from 'lucide-react'
import PhoneInput from '../../components/PhoneInput'
import { validatePhoneField } from '../../lib/phone'
import { getAdjusterDirectory, updateAdjuster, type AdjusterProfile, type CoverageStack } from '../../lib/api'

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

export function AdjusterDirectoryModal({
  leadId,
  onClose,
  onChanged,
}: {
  leadId: string
  onClose: () => void
  onChanged?: () => void
}) {
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<AdjusterProfile[] | null>(null)
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ key: string; name: string; email: string; phone: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    const t = window.setTimeout(() => {
      getAdjusterDirectory(leadId, q || undefined)
        .then(setRows)
        .catch(() => setRows([]))
    }, 250)
    return () => window.clearTimeout(t)
  }, [leadId, q, reload])

  const save = async () => {
    if (!editing) return
    setSaving(true)
    setError(null)
    try {
      const phoneError = editing.phone ? validatePhoneField(editing.phone) : null
      if (phoneError) throw new Error(`Phone: ${phoneError}`)
      await updateAdjuster(leadId, {
        key: editing.key,
        name: editing.name.trim(),
        email: editing.email.trim(),
        phone: editing.phone.trim(),
      })
      setEditing(null)
      setOpenKey(editing.email.trim().toLowerCase() || null)
      setReload((n) => n + 1)
      onChanged?.()
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Could not save the adjuster.')
    } finally {
      setSaving(false)
    }
  }

  const fieldCls = 'w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100'

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
                  const open = openKey === a.key
                  return (
                    <Fragment key={a.key}>
                      <tr
                        className={`cursor-pointer align-top hover:bg-slate-50 ${open ? 'bg-slate-50' : ''}`}
                        onClick={() => {
                          setOpenKey(open ? null : a.key)
                          setEditing(null)
                          setError(null)
                        }}
                      >
                        <td className="py-2 pr-3">
                          <p className="flex items-center gap-1 font-medium text-slate-900">
                            <ChevronRight className={`h-3.5 w-3.5 text-slate-400 transition ${open ? 'rotate-90' : ''}`} />
                            {a.name || a.email}
                          </p>
                          <p className="pl-[18px] text-xs text-slate-500">{[a.carriers.join(', '), a.email, a.phone].filter(Boolean).join(' · ')}</p>
                        </td>
                        <td className="py-2 pr-3 text-slate-700">{a.caseCount}</td>
                        <td className="py-2 pr-3 text-slate-700">
                          {a.avgResponseDays != null ? `${a.avgResponseDays} days` : '—'}
                          {a.unansweredOutreach ? <p className="text-xs text-amber-700">{a.unansweredOutreach} unanswered</p> : null}
                        </td>
                        <td className="py-2 pr-3 text-slate-700">{decided ? `${a.liabilityAccepted} of ${decided}` : '—'}</td>
                        <td className="py-2 text-slate-700">{demands ? `${a.limitsAccepted} of ${demands}` : '—'}</td>
                      </tr>
                      {open ? (
                        <tr className="bg-slate-50">
                          <td colSpan={5} className="px-3 pb-3 pt-0">
                            {editing?.key === a.key ? (
                              <div className="rounded-xl border border-slate-200 bg-white p-3">
                                <div className="grid gap-2 sm:grid-cols-3">
                                  <input className={fieldCls} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Name" />
                                  <input className={fieldCls} type="email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} placeholder="Email" />
                                  <PhoneInput className={fieldCls} value={editing.phone} onChange={(v) => setEditing({ ...editing, phone: v })} />
                                </div>
                                <p className="mt-2 text-xs text-slate-500">
                                  Updates this adjuster on all {a.cases?.length ?? a.caseCount} of your firm's policies they handle.
                                </p>
                                {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
                                <div className="mt-2 flex justify-end gap-2">
                                  <button type="button" onClick={() => { setEditing(null); setError(null) }} className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                                    Cancel
                                  </button>
                                  <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-brand-600 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
                                    {saving ? 'Saving…' : 'Save adjuster'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                {(a.cases || []).map((c) => (
                                  <div key={c.policyId} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-1.5 text-xs">
                                    <span className="text-slate-700">
                                      <span className="font-semibold">{c.clientName}</span> · {c.carrierName}
                                    </span>
                                    {c.leadId ? (
                                      <Link
                                        to={`/attorney-dashboard/cases/${c.leadId}/insurance`}
                                        onClick={onClose}
                                        className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"
                                      >
                                        Open Insurance tab <ExternalLink className="h-3 w-3" />
                                      </Link>
                                    ) : null}
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => setEditing({ key: a.key, name: a.name || '', email: a.email || '', phone: a.phone || '' })}
                                  className="mt-1 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  <Pencil className="h-3.5 w-3.5" /> Edit adjuster
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
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
