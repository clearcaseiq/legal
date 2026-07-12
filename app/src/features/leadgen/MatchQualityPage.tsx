import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAttorneyDashboard, getFirmDashboard } from '../../lib/api'
import { useFirmDashboardSummary } from '../../hooks/useFirmDashboardSummary'
import { useAttorneyWorkspace } from '../shared/AttorneyWorkspaceContext'
import { DataTable, EmptyState, FilterStat, PageHeader, SectionCard, StatGrid, StatHintsToggle, useStatHints, type DataTableColumn } from '../shared/ui'

const CLAIM_LABELS: Record<string, string> = {
  auto: 'Auto',
  slip_and_fall: 'Slip & fall',
  dog_bite: 'Dog bite',
  medmal: 'Med mal',
  product: 'Product liability',
  nursing_home_abuse: 'Nursing home',
  wrongful_death: 'Wrongful death',
  high_severity_surgery: 'Surgical injury',
}

function claimLabel(type?: string) {
  if (!type) return 'Other'
  return CLAIM_LABELS[type] || type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// Scores are stored as 0-1 fractions in some records and 0-100 in others.
function toFraction(value: any) {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n) || n <= 0) return 0
  return n <= 1 ? n : n / 100
}

function pct(fraction: number) {
  if (!Number.isFinite(fraction)) return '—'
  return `${Math.round(fraction * 100)}%`
}

const ACCEPTED_STATUSES = ['contacted', 'consulted', 'retained']

// Match-quality signal → colored status dot (green strong, amber fair, red weak).
// `brand` is a neutral blue identifier dot (used to label a row, not to signal quality).
type DotTone = 'success' | 'warning' | 'danger' | 'brand'
function toneForScore(fraction: number): DotTone {
  if (fraction >= 0.75) return 'success'
  if (fraction >= 0.6) return 'warning'
  return 'danger'
}
const DOT_CLASS: Record<DotTone, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  brand: 'bg-brand-500',
}

function StatusDot({ tone }: { tone: DotTone }) {
  return <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${DOT_CLASS[tone]}`} aria-hidden />
}

// Explains what the colored dot next to each practice area means (driven by the
// row's average match score).
function MatchLegend() {
  const items: { tone: DotTone; label: string }[] = [
    { tone: 'success', label: 'Strong ≥75%' },
    { tone: 'warning', label: 'Fair 60–74%' },
    { tone: 'danger', label: 'Weak <60%' },
  ]
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
      <span className="font-medium text-slate-400">Match fit:</span>
      {items.map((it) => (
        <span key={it.tone} className="inline-flex items-center gap-1.5">
          <StatusDot tone={it.tone} />
          {it.label}
        </span>
      ))}
    </div>
  )
}

// A count that drills into the matching filtered case list. Non-zero counts are
// clickable links; zero counts render as plain muted text (nothing to open).
function DrillLink({ value, label, onClick }: { value: number; label: string; onClick: () => void }) {
  if (!value) return <span className="text-slate-400">0</span>
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="rounded font-medium text-brand-600 underline-offset-2 hover:text-brand-700 hover:underline focus:outline-none focus:ring-2 focus:ring-brand-200"
    >
      {value}
    </button>
  )
}

function ScopePill({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
        active ? 'bg-brand-600 text-white' : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      {children}
    </button>
  )
}

// Prototype-style scope bar: both pills are visible to every attorney; the
// tertiary text on the right clarifies who each scope is for. Selecting "Firm"
// as a non-admin surfaces an access note rather than firm-wide data.
function ScopeBar({
  scope,
  setScope,
  firmAttorneyCount,
}: {
  scope: 'mine' | 'firm'
  setScope: (s: 'mine' | 'firm') => void
  firmAttorneyCount: number | null
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
        <ScopePill active={scope === 'mine'} onClick={() => setScope('mine')}>
          My leads
        </ScopePill>
        <ScopePill active={scope === 'firm'} onClick={() => setScope('firm')}>
          {firmAttorneyCount ? `Firm · ${firmAttorneyCount} attorneys` : 'Firm'}
        </ScopePill>
      </div>
      <span className="ml-auto text-xs text-slate-400">
        {scope === 'mine' ? 'Visible to every attorney' : 'Firm admin / managing partner only'}
      </span>
    </div>
  )
}

export default function MatchQualityPage() {
  const navigate = useNavigate()
  const { isFirmAdmin } = useAttorneyWorkspace()
  const { data: firmSummary } = useFirmDashboardSummary()
  const [scope, setScope] = useState<'mine' | 'firm'>('mine')
  const [mine, setMine] = useState<any>(null)
  const [firm, setFirm] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [declineWindow, setDeclineWindow] = useState<'7' | '30' | '90'>(() => {
    try {
      const stored = localStorage.getItem('clearcaseiq_decline_window')
      if (stored === '7' || stored === '30' || stored === '90') return stored
    } catch {}
    return '30'
  })
  const chooseDeclineWindow = (w: '7' | '30' | '90') => {
    setDeclineWindow(w)
    try {
      localStorage.setItem('clearcaseiq_decline_window', w)
    } catch {}
  }

  const effectiveScope = scope === 'firm' && isFirmAdmin ? 'firm' : 'mine'
  const firmAttorneyCount =
    (Array.isArray(firmSummary?.attorneys) ? firmSummary.attorneys.length : null) ??
    (Array.isArray(firm?.attorneys) ? firm.attorneys.length : null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const request =
      effectiveScope === 'firm'
        ? getFirmDashboard().then((d: any) => !cancelled && setFirm(d))
        : getAttorneyDashboard().then((d: any) => !cancelled && setMine(d))
    request
      .catch((err: any) => !cancelled && setError(err?.response?.data?.error || err?.message || 'Failed to load match quality'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [effectiveScope])

  const mineView = useMemo(() => {
    if (!mine) return null

    // Prefer the all-time breakdown computed server-side (not capped at the
    // 100-lead recentLeads window). Falls back to the recentLeads computation
    // for older API responses that don't include `leadQuality`.
    const lq = mine.leadQuality
    if (lq && typeof lq.total === 'number') {
      const rows = (lq.byPracticeArea || [])
        .map((g: any) => ({
          type: g.type,
          label: claimLabel(g.type),
          matches: g.matches,
          accepted: g.accepted,
          retained: g.retained,
          acceptRate: g.acceptRate,
          avgMatch: g.avgMatch,
          tone: toneForScore(g.avgMatch),
        }))
        .sort((a: any, b: any) => b.matches - a.matches)
      return {
        total: lq.total,
        accepted: lq.accepted,
        retained: lq.retained,
        acceptRate: lq.acceptRate,
        retainRate: lq.retainRate,
        avgMatch: lq.avgMatch,
        costPerLead: lq.total > 0 ? Number(mine.dashboard?.totalPlatformSpend || 0) / lq.total : 0,
        refundRate: Number(lq.refundRate || 0),
        rows,
      }
    }

    const leads: any[] = mine.recentLeads || []
    const total = leads.length
    const accepted = leads.filter((l) => ACCEPTED_STATUSES.includes(l.status)).length
    const retained = leads.filter((l) => l.status === 'retained').length
    const avgMatch = total ? leads.reduce((s, l) => s + toFraction(l.viabilityScore), 0) / total : 0

    const groups: Record<string, { matches: number; accepted: number; retained: number; vsum: number }> = {}
    for (const l of leads) {
      const key = l.assessment?.claimType || 'other'
      const g = groups[key] || (groups[key] = { matches: 0, accepted: 0, retained: 0, vsum: 0 })
      g.matches += 1
      g.vsum += toFraction(l.viabilityScore)
      if (ACCEPTED_STATUSES.includes(l.status)) g.accepted += 1
      if (l.status === 'retained') g.retained += 1
    }
    const rows = Object.entries(groups)
      .map(([key, g]) => ({
        type: key,
        label: claimLabel(key),
        matches: g.matches,
        accepted: g.accepted,
        retained: g.retained,
        acceptRate: g.matches ? g.accepted / g.matches : 0,
        avgMatch: g.matches ? g.vsum / g.matches : 0,
        tone: toneForScore(g.matches ? g.vsum / g.matches : 0),
      }))
      .sort((a, b) => b.matches - a.matches)

    const spend = Number(mine.dashboard?.totalPlatformSpend || 0)
    return {
      total,
      accepted,
      retained,
      acceptRate: total ? accepted / total : 0,
      retainRate: total ? retained / total : 0,
      avgMatch,
      costPerLead: total > 0 ? spend / total : 0,
      refundRate: 0,
      rows,
    }
  }, [mine])

  const firmView = useMemo(() => {
    if (!firm) return null
    const attorneys: any[] = firm.attorneys || []
    const rows = attorneys
      .map((a) => {
        const d = a.dashboard || {}
        const routed = Number(d.totalLeadsReceived || 0)
        const accepted = Number(d.totalLeadsAccepted || 0)
        return {
          id: a.id,
          name: a.name || a.email || 'Attorney',
          routed,
          accepted,
          acceptRate: routed ? accepted / routed : 0,
          spend: Number(d.totalPlatformSpend || 0),
          fees: Number(d.feesCollectedFromPayments || 0),
          tone: toneForScore(routed ? accepted / routed : 0),
        }
      })
      .sort((a, b) => b.routed - a.routed)
    const totalRouted = rows.reduce((s, r) => s + r.routed, 0)
    const totalAccepted = rows.reduce((s, r) => s + r.accepted, 0)
    const totalSpend = rows.reduce((s, r) => s + r.spend, 0)
    return {
      attorneys: rows.length,
      totalRouted,
      acceptRate: totalRouted ? totalAccepted / totalRouted : 0,
      totalSpend,
      rows,
    }
  }, [firm])

  const firmColumns: DataTableColumn<any>[] = [
    {
      key: 'name',
      header: 'Attorney',
      cell: (r) => (
        <button
          type="button"
          onClick={() => navigate('/attorney-dashboard/cases/firm')}
          title={`View ${r.name}'s caseload`}
          aria-label={`View ${r.name}'s caseload`}
          className="inline-flex items-center gap-2 rounded font-semibold text-slate-900 underline-offset-2 hover:text-brand-700 hover:underline focus:outline-none focus:ring-2 focus:ring-brand-200"
        >
          <StatusDot tone="brand" />
          {r.name}
        </button>
      ),
    },
    {
      key: 'routed',
      header: 'Routed',
      align: 'right',
      cell: (r) => (
        <DrillLink value={r.routed} label={`View ${r.name}'s caseload`} onClick={() => navigate('/attorney-dashboard/cases/firm')} />
      ),
    },
    {
      key: 'accepted',
      header: 'Accepted',
      align: 'right',
      cell: (r) => (
        <DrillLink value={r.accepted} label={`View ${r.name}'s accepted cases`} onClick={() => navigate('/attorney-dashboard/cases/firm')} />
      ),
    },
    { key: 'acceptRate', header: 'Accept rate', align: 'right', cell: (r) => pct(r.acceptRate) },
  ]

  const mineColumns: DataTableColumn<any>[] = [
    {
      key: 'area',
      header: 'Practice area',
      cell: (r) => (
        <span className="inline-flex items-center gap-2 font-semibold text-slate-900">
          <StatusDot tone={r.tone} />
          {r.label}
        </span>
      ),
    },
    {
      key: 'matches',
      header: 'Matches',
      align: 'right',
      cell: (r) => {
        const typeQuery = r.type && r.type !== 'other' ? `?caseType=${encodeURIComponent(r.type)}` : ''
        return (
          <DrillLink
            value={r.matches}
            label={`View ${r.label} matches`}
            onClick={() => navigate(`/attorney-dashboard/leadgen/matches${typeQuery}`)}
          />
        )
      },
    },
    {
      key: 'accepted',
      header: 'Accepted',
      align: 'right',
      cell: (r) => {
        const typeQuery = r.type && r.type !== 'other' ? `&caseType=${encodeURIComponent(r.type)}` : ''
        return (
          <DrillLink
            value={r.accepted}
            label={`View accepted ${r.label} cases`}
            onClick={() => navigate(`/attorney-dashboard/cases/active?stage=active${typeQuery}`)}
          />
        )
      },
    },
    {
      key: 'retained',
      header: 'Retained',
      align: 'right',
      cell: (r) => {
        const typeQuery = r.type && r.type !== 'other' ? `&caseType=${encodeURIComponent(r.type)}` : ''
        return (
          <DrillLink
            value={r.retained}
            label={`View retained ${r.label} cases`}
            onClick={() => navigate(`/attorney-dashboard/cases/active?stage=retained${typeQuery}`)}
          />
        )
      },
    },
    { key: 'acceptRate', header: 'Accept rate', align: 'right', cell: (r) => pct(r.acceptRate) },
    { key: 'avgMatch', header: 'Avg. match', align: 'right', cell: (r) => pct(r.avgMatch) },
  ]

  const { showHints, toggleHints, hint } = useStatHints()

  // Declined matches — retrospective view of matches this attorney passed on,
  // bucketed server-side by Introduction.respondedAt (7 / 30 / 90 days).
  const declineStats = mine?.declineStats as
    | { last7: number; last30: number; last90: number; total: number }
    | undefined
  const declinedInWindow =
    declineWindow === '7'
      ? declineStats?.last7 ?? 0
      : declineWindow === '90'
        ? declineStats?.last90 ?? 0
        : declineStats?.last30 ?? 0
  const declinedTotal = declineStats?.total ?? 0
  const routedTotal = mineView?.total ?? 0
  const declineRate = routedTotal > 0 ? declinedTotal / routedTotal : 0

  const DeclineWindowToggle = (
    <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white">
      {(['7', '30', '90'] as const).map((w) => (
        <button
          key={w}
          type="button"
          onClick={() => chooseDeclineWindow(w)}
          aria-pressed={declineWindow === w}
          className={`px-2.5 py-1 text-xs font-semibold transition ${
            declineWindow === w
              ? 'bg-brand-600 text-white'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
          }`}
        >
          {w}d
        </button>
      ))}
    </div>
  )

  return (
    <div className="space-y-4">
      <PageHeader
        title="Match Quality"
        actions={<StatHintsToggle showHints={showHints} onToggle={toggleHints} />}
      />

      <ScopeBar scope={scope} setScope={setScope} firmAttorneyCount={firmAttorneyCount} />

      {scope === 'firm' && !isFirmAdmin ? (
        <EmptyState message="Firm-wide match quality is available to firm admins and managing partners." />
      ) : loading ? (
        <EmptyState message="Loading match quality…" />
      ) : error ? (
        <EmptyState message={error} />
      ) : effectiveScope === 'firm' ? (
        !firmView || firmView.rows.length === 0 ? (
          <EmptyState message="No firm attorney data available yet." />
        ) : (
          <>
            <StatGrid columns={3}>
              <FilterStat value={String(firmView.attorneys)} label="Attorneys" hint={hint('Attorneys at your firm currently receiving routed matches. Click to open the firm dashboard.')} onClick={() => navigate('/attorney-dashboard/cases/firm')} />
              <FilterStat value={String(firmView.totalRouted)} label="Matches routed" hint={hint('Total matches ClearCaseIQ has routed to your firm. Click to view the firm caseload.')} onClick={() => navigate('/attorney-dashboard/cases/firm')} />
              <FilterStat value={pct(firmView.acceptRate)} label="Firm accept rate" tone="success" hint={hint('Share of routed matches your firm accepted (accepted ÷ routed). Click to view the firm caseload.')} onClick={() => navigate('/attorney-dashboard/cases/firm')} />
            </StatGrid>

            <SectionCard title="Match quality by attorney">
              <DataTable columns={firmColumns} rows={firmView.rows} rowKey={(r) => r.id} />
            </SectionCard>
          </>
        )
      ) : !mineView || mineView.total === 0 ? (
        <EmptyState message="No routed leads yet. Quality metrics appear as matches arrive." />
      ) : (
        <>
          <StatGrid columns={3}>
            <FilterStat value={pct(mineView.acceptRate)} label="Accept rate" tone="success" filled hint={hint('Share of matches routed to you that you accepted (accepted ÷ routed).')} />
            <FilterStat value={pct(mineView.retainRate)} label="Retain rate" tone="neutral" filled hint={hint('Share of your matches that became signed/retained clients.')} />
            <FilterStat value={pct(mineView.avgMatch)} label="Avg match fit" tone="neutral" filled hint={hint('Average predicted fit across your routed matches. Cost metrics live on Marketplace Performance.')} />
          </StatGrid>

          <SectionCard title="Declined matches" trailing={DeclineWindowToggle}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Declined · last {declineWindow}d
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{declinedInWindow}</p>
                <p className="mt-1 text-xs text-slate-500">Matches you passed on in this window.</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Declined · all time</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{declinedTotal}</p>
                <p className="mt-1 text-xs text-slate-500">Every match you've declined to date.</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Decline rate</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{pct(declineRate)}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {declinedTotal} declined ÷ {routedTotal} routed (all time).
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="My match quality by practice area" trailing={<MatchLegend />}>
            <DataTable columns={mineColumns} rows={mineView.rows} rowKey={(r) => r.label} />
          </SectionCard>
        </>
      )}
    </div>
  )
}
