/**
 * The attorney half of the Super Demand: readiness, valuation, weaknesses,
 * statement confidence, the quality check, and the approval gate that has to
 * be signed before the letter can be finalized. Nothing here goes to the
 * carrier.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, ChevronDown, Gauge, Loader2, ShieldCheck, XCircle } from 'lucide-react'
import {
  getLeadDemandIntelligence,
  updateLeadDemandApprovalGate,
  type DemandConfidenceLevel,
  type DemandIntelligence,
  type DemandLetter,
} from '../../lib/api'

const money = (n: number | null | undefined) => (n == null ? '\u2014' : `$${Math.round(n).toLocaleString('en-US')}`)

const BAND: Record<DemandIntelligence['readiness']['band'], { label: string; tone: string; bar: string }> = {
  ready: { label: 'Ready to send', tone: 'text-emerald-700', bar: 'bg-emerald-500' },
  nearly_ready: { label: 'Nearly ready', tone: 'text-sky-700', bar: 'bg-sky-500' },
  needs_work: { label: 'Needs work', tone: 'text-amber-700', bar: 'bg-amber-500' },
  not_ready: { label: 'Not ready', tone: 'text-rose-700', bar: 'bg-rose-500' },
}

const CONFIDENCE: Record<DemandConfidenceLevel, { label: string; dot: string; chip: string }> = {
  green: { label: 'Green', dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700' },
  yellow: { label: 'Yellow', dot: 'bg-yellow-400', chip: 'bg-yellow-50 text-yellow-800' },
  orange: { label: 'Orange', dot: 'bg-orange-500', chip: 'bg-orange-50 text-orange-700' },
  red: { label: 'Red', dot: 'bg-rose-600', chip: 'bg-rose-50 text-rose-700' },
}

const POSITION: Record<DemandIntelligence['valuation']['position'], string> = {
  below_range: 'Below the model range',
  in_range: 'Within a defensible range',
  above_range: 'Well above the model range',
  unknown: 'No model range to compare',
}

function Section({ title, badge, defaultOpen = true, children }: { title: string; badge?: ReactNode; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-t border-slate-100">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hover:bg-slate-50"
      >
        <span className="flex-1">{title}</span>
        {badge}
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? <div className="px-4 pb-3">{children}</div> : null}
    </div>
  )
}

function StatusIcon({ status }: { status: 'pass' | 'warn' | 'fail' }) {
  if (status === 'pass') return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
  if (status === 'warn') return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
  return <XCircle className="h-4 w-4 shrink-0 text-rose-600" />
}

export default function DemandIntelligencePanel({
  leadId,
  letter,
  readOnly,
  onLetterUpdated,
}: {
  leadId: string
  letter: DemandLetter
  readOnly: boolean
  onLetterUpdated: (letter: DemandLetter) => void
}) {
  const [intel, setIntel] = useState<DemandIntelligence | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setIntel(await getLeadDemandIntelligence(leadId, letter.id))
    } catch {
      setError('Could not analyze this demand.')
    } finally {
      setLoading(false)
    }
  }, [leadId, letter.id])

  useEffect(() => {
    load()
  }, [load, letter.currentVersion])

  const gate = letter.approvalGate ?? intel?.approvalGate ?? null

  const toggle = async (key: string, checked: boolean) => {
    setSavingKey(key)
    try {
      onLetterUpdated(await updateLeadDemandApprovalGate(leadId, letter.id, { [key]: checked }))
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not save the approval.')
    } finally {
      setSavingKey(null)
    }
  }

  if (loading && !intel) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Analyzing the demand…
      </div>
    )
  }
  if (!intel) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {error || 'Demand Intelligence is unavailable.'}{' '}
        <button type="button" onClick={load} className="font-semibold underline">
          Retry
        </button>
      </div>
    )
  }

  const band = BAND[intel.readiness.band]
  const v = intel.valuation
  const confidenceCounts = intel.statementConfidence.reduce<Record<string, number>>((acc, s) => {
    acc[s.level] = (acc[s.level] || 0) + 1
    return acc
  }, {})
  const qualityFails = intel.qualityCheck.filter((c) => c.status === 'fail').length
  const qualityWarns = intel.qualityCheck.filter((c) => c.status === 'warn').length

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 px-4 py-3.5">
        <Gauge className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-900">Demand Intelligence</h3>
          <p className="text-xs text-slate-500">Attorney workbench. Never included in the carrier letter.</p>
        </div>
        {loading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
      </div>

      <Section title="Readiness score" badge={<span className={`text-xs font-bold ${band.tone}`}>{intel.readiness.score}/100</span>}>
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-bold ${band.tone}`}>{intel.readiness.score}</span>
          <span className={`text-sm font-semibold ${band.tone}`}>{band.label}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full ${band.bar}`} style={{ width: `${Math.max(2, intel.readiness.score)}%` }} />
        </div>
        <ul className="mt-3 space-y-1.5">
          {intel.readiness.factors.map((f) => (
            <li key={f.key} className="text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-700">{f.label}</span>
                <span className="tabular-nums text-slate-500">
                  {f.score}/{f.max}
                </span>
              </div>
              <p className="text-slate-400">{f.note}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Valuation">
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          <dt className="text-slate-500">Low (25th pct)</dt>
          <dd className="text-right tabular-nums text-slate-800">{money(v.p25)}</dd>
          <dt className="text-slate-500">Expected</dt>
          <dd className="text-right font-semibold tabular-nums text-slate-900">{money(v.expected)}</dd>
          <dt className="text-slate-500">High (75th pct)</dt>
          <dd className="text-right tabular-nums text-slate-800">{money(v.p75)}</dd>
          <dt className="mt-1.5 text-slate-500">Economic damages</dt>
          <dd className="mt-1.5 text-right tabular-nums text-slate-800">{money(v.specials)}</dd>
          <dt className="text-slate-500">General damages</dt>
          <dd className="text-right tabular-nums text-slate-800">{money(v.general)}</dd>
          <dt className="text-slate-500">Demand</dt>
          <dd className="text-right font-semibold tabular-nums text-slate-900">{money(v.demand)}</dd>
          <dt className="text-slate-500">Current carrier offer</dt>
          <dd className="text-right tabular-nums text-slate-800">{money(v.currentOffer)}</dd>
        </dl>
        <div className="mt-2 space-y-0.5 text-xs text-slate-500">
          <p>{POSITION[v.position]}{v.source === 'analysis' ? ' (from the case analysis)' : ''}.</p>
          {v.demandToExpected != null ? <p>Demand is {v.demandToExpected}× the expected value.</p> : null}
          {v.demandMultipleOfSpecials != null ? <p>Demand is {v.demandMultipleOfSpecials}× economic damages.</p> : null}
          {v.offerToDemand != null ? <p>The current offer is {Math.round(v.offerToDemand * 100)}% of the demand.</p> : null}
        </div>
      </Section>

      <Section
        title="Weaknesses"
        badge={
          intel.weaknesses.length ? (
            <span className="rounded-full bg-amber-50 px-1.5 text-[11px] font-semibold text-amber-700">{intel.weaknesses.length}</span>
          ) : null
        }
      >
        {intel.weaknesses.length === 0 ? (
          <p className="text-xs text-slate-500">No weaknesses detected in the record.</p>
        ) : (
          <ul className="space-y-2">
            {intel.weaknesses.map((w) => (
              <li key={w.key} className="rounded-lg border border-slate-100 p-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`rounded px-1 text-[10px] font-bold uppercase ${
                      w.severity === 'high' ? 'bg-rose-50 text-rose-700' : w.severity === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {w.severity}
                  </span>
                  <span className="font-semibold text-slate-800">{w.title}</span>
                </div>
                <p className="mt-1 text-slate-500">{w.detail}</p>
                <p className="mt-1 text-slate-700">
                  <span className="font-semibold">Fix: </span>
                  {w.mitigation}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Statement confidence"
        badge={
          <span className="flex items-center gap-1">
            {(['green', 'yellow', 'orange', 'red'] as const).map((level) =>
              confidenceCounts[level] ? (
                <span key={level} className={`rounded-full px-1.5 text-[11px] font-semibold ${CONFIDENCE[level].chip}`}>
                  {confidenceCounts[level]}
                </span>
              ) : null,
            )}
          </span>
        }
      >
        <p className="mb-2 text-[11px] text-slate-400">
          Green: backed by an enclosed document. Yellow: entered on the case. Orange: claimant-reported only. Red: unsupported.
        </p>
        <ul className="space-y-1.5">
          {intel.statementConfidence.map((s) => (
            <li key={s.key} className="flex items-start gap-2 text-xs">
              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${CONFIDENCE[s.level].dot}`} title={CONFIDENCE[s.level].label} />
              <div className="min-w-0">
                <p className="font-medium text-slate-800">{s.statement}</p>
                <p className="text-slate-400">
                  {s.section} · {s.basis}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title="Demand quality check"
        badge={
          qualityFails || qualityWarns ? (
            <span className={`text-[11px] font-semibold ${qualityFails ? 'text-rose-600' : 'text-amber-600'}`}>
              {qualityFails ? `${qualityFails} fail` : ''}
              {qualityFails && qualityWarns ? ' · ' : ''}
              {qualityWarns ? `${qualityWarns} warn` : ''}
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-emerald-600">All pass</span>
          )
        }
      >
        <ul className="space-y-2">
          {intel.qualityCheck.map((c) => (
            <li key={c.key} className="text-xs">
              <div className="flex items-start gap-2">
                <StatusIcon status={c.status} />
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800">{c.label}</p>
                  <p className="text-slate-500">{c.detail}</p>
                  {c.items?.length ? (
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-slate-500">
                      {c.items.slice(0, 8).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      {gate ? (
        <Section
          title="Attorney approval gate"
          badge={
            gate.complete ? (
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            ) : (
              <span className="text-[11px] font-semibold text-slate-500">
                {gate.items.filter((i) => i.checked).length}/{gate.items.length}
              </span>
            )
          }
        >
          {gate.stale ? (
            <p className="mb-2 rounded-lg bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
              The letter changed after it was approved (signed on version {gate.signedVersion}). Review and approve the current
              version again.
            </p>
          ) : null}
          {qualityFails > 0 && !readOnly ? (
            <p className="mb-2 rounded-lg bg-rose-50 px-2 py-1.5 text-xs text-rose-700">
              The quality check has {qualityFails} failing item{qualityFails === 1 ? '' : 's'}. Resolve them before you approve.
            </p>
          ) : null}
          <ul className="space-y-1.5">
            {gate.items.map((item) => (
              <li key={item.key}>
                <label className="flex items-start gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    disabled={readOnly || savingKey != null}
                    onChange={(e) => toggle(item.key, e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span>
                    {item.label}
                    {item.checked && item.checkedByName ? (
                      <span className="block text-[11px] text-slate-400">Signed by {item.checkedByName}</span>
                    ) : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-slate-400">
            {gate.complete ? 'Approved for this version. The letter can be finalized.' : 'Every item must be signed before the letter can be finalized.'}
          </p>
        </Section>
      ) : null}

      {error ? <p className="border-t border-slate-100 px-4 py-2 text-xs text-rose-600">{error}</p> : null}
    </div>
  )
}
