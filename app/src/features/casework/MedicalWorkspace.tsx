import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ChevronRight, Circle, FlaskConical, RefreshCw } from 'lucide-react'
import {
  getLeadMedicalOverview,
  type MedicalOverview,
  type MedicalOverviewTab,
  type MedicalReadinessState,
} from '../../lib/api'
import DocumentFindingsPanel from './DocumentFindingsPanel'

const TABS: { id: MedicalOverviewTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'treatment', label: 'Treatment' },
  { id: 'bills', label: 'Bills & damages' },
  { id: 'evidence', label: 'Evidence review' },
  { id: 'impact', label: 'Daily impact' },
]

const READINESS_ROWS: { key: keyof MedicalOverview['readiness']; label: string; tab: MedicalOverviewTab }[] = [
  { key: 'evidenceExtracted', label: 'Medical records read', tab: 'evidence' },
  { key: 'treatmentReconciled', label: 'Treatment history confirmed', tab: 'evidence' },
  { key: 'providersVerified', label: 'Providers confirmed', tab: 'evidence' },
  { key: 'demandReady', label: 'Medical section of the demand', tab: 'overview' },
]

const STATE_CHIP: Record<MedicalReadinessState, { label: string; cls: string }> = {
  ready: { label: 'Ready', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  needs_review: { label: 'Needs review', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  missing: { label: 'Missing', cls: 'bg-slate-100 text-slate-600 ring-slate-200' },
}

const SEVERITY_CLS: Record<'high' | 'medium' | 'low', string> = {
  high: 'border-rose-200 bg-rose-50 text-rose-800',
  medium: 'border-amber-200 bg-amber-50 text-amber-800',
  low: 'border-slate-200 bg-slate-50 text-slate-700',
}

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`

function formatDay(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function SummaryCard({
  title,
  value,
  sub,
  tone,
  onClick,
}: {
  title: string
  value: string
  sub: string
  tone: 'ok' | 'warn' | 'neutral'
  onClick: () => void
}) {
  const subCls = tone === 'ok' ? 'text-emerald-700' : tone === 'warn' ? 'text-amber-700' : 'text-slate-500'
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-brand-300 hover:shadow"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      <p className={`mt-0.5 text-xs font-medium ${subCls}`}>{sub}</p>
    </button>
  )
}

/**
 * The attorney Medical tab: a header that keeps what the records show apart
 * from what has been confirmed, and one sub-tab per job (treatment, bills,
 * evidence review, daily impact) instead of one long page.
 */
export default function MedicalWorkspace({
  leadId,
  canEdit,
  onOpenSection,
  treatment,
  chronology,
  providerLetters,
  impact,
}: {
  leadId: string
  canEdit: boolean
  onOpenSection: (section: string) => void
  /** The confirmed treatment timeline; `onChanged` refreshes the header. */
  treatment: (onChanged: () => void) => ReactNode
  /** The evidence-derived chronology; re-reads when `reloadKey` changes. */
  chronology: (reloadKey: number, onProvidersChanged: () => void) => ReactNode
  /** Remounted when `reloadKey` changes so a provider added elsewhere shows up. */
  providerLetters: (reloadKey: number) => ReactNode
  impact: ReactNode
}) {
  const [lettersKey, setLettersKey] = useState(0)
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('medTab') as MedicalOverviewTab | null
  const tab: MedicalOverviewTab = TABS.some((t) => t.id === tabParam) ? (tabParam as MedicalOverviewTab) : 'overview'
  const setTab = (next: MedicalOverviewTab) => {
    const params = new URLSearchParams(searchParams)
    if (next === 'overview') params.delete('medTab')
    else params.set('medTab', next)
    setSearchParams(params, { replace: true })
  }

  const [overview, setOverview] = useState<MedicalOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const load = useCallback(async () => {
    try {
      setOverview(await getLeadMedicalOverview(leadId))
      setError(null)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not load the medical overview.')
    }
  }, [leadId])

  useEffect(() => {
    void load()
  }, [load])

  // Findings for older uploads are read in the background on first open.
  useEffect(() => {
    if (!overview?.scanning) return
    const timer = window.setTimeout(() => {
      void load()
      setReloadKey((k) => k + 1)
    }, 8000)
    return () => window.clearTimeout(timer)
  }, [overview?.scanning, load])

  const refresh = useCallback(() => {
    void load()
    setReloadKey((k) => k + 1)
  }, [load])

  const o = overview
  const hasTestDocs = Boolean(o?.testDocuments.length)
  const status = !o
    ? null
    : hasTestDocs
      ? { label: 'Test documents on file', cls: 'bg-rose-50 text-rose-700 ring-rose-200' }
      : o.readiness.demandReady === 'ready'
        ? { label: 'Ready for demand', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' }
        : { label: 'Review needed', cls: 'bg-amber-50 text-amber-700 ring-amber-200' }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Medical &amp; Treatment</h2>
        {status ? (
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${status.cls}`}>{status.label}</span>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">
          {error}{' '}
          <button type="button" onClick={() => void load()} className="font-semibold underline">
            Retry
          </button>
        </div>
      ) : null}

      {hasTestDocs && o ? (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
          <div className="min-w-0">
            <p className="font-semibold">This case contains test documents</p>
            <p className="mt-0.5">
              {o.testDocuments.map((d) => d.fileName).join(', ')}{' '}
              {o.testDocuments.length === 1 ? 'is' : 'are'} labelled synthetic or test material (
              {[...new Set(o.testDocuments.flatMap((d) => d.markers))].slice(0, 3).join(', ')}). They are still read so you can
              check extraction, but they can't support a demand: approving or sending a demand is blocked while they are on
              the case.
            </p>
          </div>
        </div>
      ) : null}

      {o?.scanning ? (
        <div className="flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-2.5 text-sm text-brand-800 ring-1 ring-inset ring-brand-100">
          <RefreshCw className="h-4 w-4 animate-spin" /> Reading the medical records for visits and charges to review…
        </div>
      ) : null}

      {o ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard
            title="Treatment visits"
            value={`${o.visits.found} found`}
            sub={`${o.visits.confirmed} confirmed${o.visits.pending ? ` · ${o.visits.pending} to review` : ''}`}
            tone={o.visits.found && o.visits.confirmed >= o.visits.found ? 'ok' : o.visits.found ? 'warn' : 'neutral'}
            onClick={() => setTab(o.visits.pending ? 'evidence' : 'treatment')}
          />
          <SummaryCard
            title="Medical charges"
            value={o.charges.found ? money(o.charges.found) : o.charges.confirmed ? money(o.charges.confirmed) : '—'}
            sub={o.charges.confirmed ? `${money(o.charges.confirmed)} confirmed in ledger` : o.charges.found ? 'Unverified' : 'None found'}
            tone={o.charges.confirmed ? 'ok' : o.charges.found ? 'warn' : 'neutral'}
            onClick={() => setTab('bills')}
          />
          <SummaryCard
            title="Providers"
            value={`${o.providers.found.length || o.providers.confirmed.length} found`}
            sub={o.providers.unconfirmed.length ? `${o.providers.unconfirmed.length} need review` : o.providers.found.length ? 'All confirmed' : 'None named yet'}
            tone={o.providers.unconfirmed.length ? 'warn' : o.providers.found.length ? 'ok' : 'neutral'}
            onClick={() => setTab('evidence')}
          />
          <SummaryCard
            title="Evidence gaps"
            value={String(o.gaps.length)}
            sub={o.gaps.length ? 'To resolve' : 'Nothing open'}
            tone={o.gaps.length ? 'warn' : 'ok'}
            onClick={() => setTab('overview')}
          />
        </div>
      ) : null}

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition ${
              tab === t.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
            {t.id === 'evidence' && o && o.visits.pending ? (
              <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 text-[11px] font-semibold text-amber-700">{o.visits.pending}</span>
            ) : null}
            {t.id === 'bills' && o && o.charges.pendingCount ? (
              <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 text-[11px] font-semibold text-amber-700">{o.charges.pendingCount}</span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === 'overview' && o ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Medical overview</h3>
            <ol className="mt-3 flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-600">
              {['Upload', 'Extract', 'Verify', 'Accept'].map((step, i, all) => (
                <li key={step} className="flex items-center gap-1.5">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5">{step}</span>
                  {i < all.length - 1 ? <ChevronRight className="h-3 w-3 text-slate-300" /> : null}
                </li>
              ))}
            </ol>
            <p className="mt-2 text-xs text-slate-500">
              What the AI reads from records stays a proposal until someone confirms it against the source page. Only
              confirmed visits and ledger charges count toward the demand.
            </p>
            <ul className="mt-4 divide-y divide-slate-100">
              {READINESS_ROWS.map((row) => {
                const state = o.readiness[row.key]
                const chip = STATE_CHIP[state]
                return (
                  <li key={row.key} className="flex items-center justify-between gap-3 py-2.5">
                    <button type="button" onClick={() => setTab(row.tab)} className="flex items-center gap-2 text-left text-sm text-slate-800 hover:text-brand-700">
                      {state === 'ready' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Circle className="h-4 w-4 text-slate-300" />
                      )}
                      {row.label}
                    </button>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${chip.cls}`}>{chip.label}</span>
                  </li>
                )
              })}
            </ul>
            <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 text-xs">
              <div>
                <dt className="text-slate-500">First visit</dt>
                <dd className="mt-0.5 font-semibold text-slate-800">{formatDay(o.firstVisit)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Last visit</dt>
                <dd className="mt-0.5 font-semibold text-slate-800">{formatDay(o.lastVisit)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Largest gap</dt>
                <dd className="mt-0.5 font-semibold text-slate-800">{o.largestGapDays != null ? `${o.largestGapDays} days` : '—'}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">To resolve</h3>
            {o.gaps.length === 0 ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Nothing open. The medical record is confirmed.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {o.gaps.map((g) => (
                  <li key={g.key}>
                    <button
                      type="button"
                      onClick={() => setTab(g.tab)}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm ${SEVERITY_CLS[g.severity]}`}
                    >
                      <span className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        {g.label}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 opacity-60" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {tab === 'treatment' ? treatment(refresh) : null}

      {tab === 'bills' && o ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Read from bills</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{o.charges.found ? money(o.charges.found) : '—'}</p>
              <p className="mt-0.5 text-xs text-amber-700">Unverified. Accept each charge below to count it.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Medical specials (confirmed)</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{money(o.charges.confirmed)}</p>
              <button type="button" onClick={() => onOpenSection('damages')} className="mt-0.5 text-xs font-semibold text-brand-600 hover:text-brand-700">
                Open damages ledger
              </button>
            </div>
          </div>
          <DocumentFindingsPanel
            leadId={leadId}
            kinds={['medical_charge']}
            title="Charges found on the bills"
            destination="the damages ledger"
            canEdit={canEdit}
            onAccepted={refresh}
          />
        </div>
      ) : null}

      {tab === 'evidence' ? (
        <div className="space-y-6">
          <DocumentFindingsPanel
            leadId={leadId}
            kinds={['treatment_visit']}
            title="Visits found in the records"
            destination="the treatment timeline"
            canEdit={canEdit}
            onAccepted={refresh}
          />
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Chronology from the documents</p>
            {chronology(reloadKey, () => {
              setLettersKey((k) => k + 1)
              void load()
            })}
          </div>
          {providerLetters(lettersKey)}
        </div>
      ) : null}

      {tab === 'impact' ? <div className="space-y-6">{impact}</div> : null}
    </div>
  )
}
