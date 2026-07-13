import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAttorneyDashboard, getFirmDashboard } from '../../lib/api'
import { useFirmDashboardSummary } from '../../hooks/useFirmDashboardSummary'
import { useAttorneyWorkspace } from '../shared/AttorneyWorkspaceContext'
import { Badge, DataTable, DayWindowSlider, EmptyState, FilterStat, PageHeader, SectionCard, StatGrid, StatHintsToggle, useStatHints, type BadgeTone, type DataTableColumn } from '../shared/ui'

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

// Human-friendly duration from a minute count (e.g. 42 → "42m", 150 → "2h 30m").
function formatMinutes(min: number | null | undefined) {
  if (min == null || !Number.isFinite(min)) return '—'
  if (min < 1) return '<1m'
  if (min < 60) return `${Math.round(min)}m`
  const hours = min / 60
  if (hours < 24) {
    const h = Math.floor(hours)
    const m = Math.round(min - h * 60)
    return m ? `${h}h ${m}m` : `${h}h`
  }
  const days = hours / 24
  const d = Math.floor(days)
  const h = Math.round(hours - d * 24)
  return h ? `${d}d ${h}h` : `${d}d`
}

// Percentile rank (0–100) of `value` within `pool`, i.e. share of peers at or
// below it. Used to badge an attorney against their firm.
function percentileRank(value: number, pool: number[]): number | null {
  const xs = pool.filter((n) => Number.isFinite(n))
  if (xs.length < 2) return null
  const atOrBelow = xs.filter((n) => n <= value).length
  return Math.round((atOrBelow / xs.length) * 100)
}

function median(xs: number[]): number {
  const arr = xs.filter((n) => Number.isFinite(n)).sort((a, b) => a - b)
  if (!arr.length) return 0
  const mid = Math.floor((arr.length - 1) / 2)
  return arr[mid]
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
    </div>
  )
}

// Decision-calibration table: accept & retain rates per AI match-fit band.
const calibrationColumns: DataTableColumn<any>[] = [
  { key: 'band', header: 'Match fit', cell: (r) => r.band },
  { key: 'matches', header: 'Matches', align: 'right', cell: (r) => String(r.matches) },
  { key: 'acceptRate', header: 'Accept rate', align: 'right', cell: (r) => pct(r.acceptRate) },
  { key: 'retainRate', header: 'Retain rate', align: 'right', cell: (r) => pct(r.retainRate) },
]

function BenchmarkRow({
  label,
  stat,
}: {
  label: string
  stat: { you: number; median: number; percentile: number | null }
}) {
  const p = stat.percentile
  const tone: BadgeTone = p == null ? 'neutral' : p >= 75 ? 'success' : p >= 50 ? 'warning' : 'danger'
  const badgeLabel = p == null ? '—' : p >= 75 ? 'Top quartile' : p >= 50 ? 'Above median' : 'Below median'
  const delta = stat.you - stat.median
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2">
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-800">{label}</div>
        <div className="text-xs text-slate-400">Firm median {pct(stat.median)}</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-lg font-bold tabular-nums text-slate-900">{pct(stat.you)}</div>
          <div className={`text-[11px] tabular-nums ${delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {delta >= 0 ? '+' : '−'}
            {pct(Math.abs(delta))} vs median
          </div>
        </div>
        <Badge tone={tone}>{badgeLabel}</Badge>
      </div>
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
  // Time window (in days) for the per-practice-area breakdown table. Draggable
  // from 1 to 90 days via the slider in the section header.
  const [matchWindowDays, setMatchWindowDays] = useState<number>(() => {
    try {
      const stored = Number(localStorage.getItem('clearcaseiq_match_window'))
      if (Number.isFinite(stored) && stored >= 1 && stored <= 90) return stored
    } catch {}
    return 90
  })
  const chooseMatchWindowDays = (d: number) => {
    const clamped = Math.min(90, Math.max(1, Math.round(d)))
    setMatchWindowDays(clamped)
    try {
      localStorage.setItem('clearcaseiq_match_window', String(clamped))
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

  // You-vs-firm benchmark: rank the attorney's accept/retain rates against firm
  // peers. Only meaningful with 2+ attorneys (firm summary present).
  const benchmark = useMemo(() => {
    const peers = Array.isArray(firmSummary?.attorneys) ? firmSummary.attorneys : []
    if (peers.length < 2 || !mineView) return null
    const rate = (num: number, den: number) => (den ? num / den : 0)
    const acceptRates = peers.map((p: any) =>
      rate(Number(p?.dashboard?.totalLeadsAccepted || 0), Number(p?.dashboard?.totalLeadsReceived || 0)),
    )
    const retainRates = peers.map((p: any) =>
      rate(Number(p?.dashboard?.totalLeadsRetained || 0), Number(p?.dashboard?.totalLeadsReceived || 0)),
    )
    return {
      peers: peers.length,
      accept: {
        you: mineView.acceptRate,
        median: median(acceptRates),
        percentile: percentileRank(mineView.acceptRate, acceptRates),
      },
      retain: {
        you: mineView.retainRate,
        median: median(retainRates),
        percentile: percentileRank(mineView.retainRate, retainRates),
      },
    }
  }, [firmSummary, mineView])

  // Per-practice-area rows recomputed for the selected time window, derived from
  // recentLeads (which carry timestamps, unlike the all-time leadQuality rollup).
  const windowedRows = useMemo(() => {
    const leads: any[] = mine?.recentLeads || []
    const cutoff = Date.now() - matchWindowDays * 24 * 60 * 60 * 1000
    const inWindow = leads.filter((l) => {
      const ts = new Date(l.submittedAt || l.createdAt || l.assessment?.createdAt || 0).getTime()
      return Number.isFinite(ts) && ts >= cutoff
    })
    const groups: Record<string, { matches: number; accepted: number; retained: number; vsum: number }> = {}
    for (const l of inWindow) {
      const key = l.assessment?.claimType || 'other'
      const g = groups[key] || (groups[key] = { matches: 0, accepted: 0, retained: 0, vsum: 0 })
      g.matches += 1
      g.vsum += toFraction(l.viabilityScore)
      if (ACCEPTED_STATUSES.includes(l.status)) g.accepted += 1
      if (l.status === 'retained') g.retained += 1
    }
    return Object.entries(groups)
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
  }, [mine, matchWindowDays])

  const MatchWindowSlider = (
    <DayWindowSlider value={matchWindowDays} onChange={chooseMatchWindowDays} />
  )

  const firmView = useMemo(() => {
    if (!firm) return null
    const cutoff = Date.now() - matchWindowDays * 24 * 60 * 60 * 1000
    const attorneys: any[] = firm.attorneys || []
    const rows = attorneys
      .map((a) => {
        const d = a.dashboard || {}
        // Prefer windowed lead events; fall back to all-time counts if absent.
        const events = Array.isArray(a.matchWindowLeads) ? a.matchWindowLeads : null
        let routed: number
        let accepted: number
        if (events) {
          const inWindow = events.filter((e: any) => {
            const t = new Date(e.submittedAt).getTime()
            return Number.isFinite(t) && t >= cutoff
          })
          routed = inWindow.length
          accepted = inWindow.filter((e: any) => ACCEPTED_STATUSES.includes(e.status)).length
        } else {
          routed = Number(d.totalLeadsReceived || 0)
          accepted = Number(d.totalLeadsAccepted || 0)
        }
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
  }, [firm, matchWindowDays])

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

            <SectionCard title="Match quality by attorney" trailing={MatchWindowSlider}>
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

          {mine?.leadSpeed && (
            <SectionCard
              title="Speed to lead"
              trailing={<span className="text-xs text-slate-400">Faster responses win more cases</span>}
            >
              <StatGrid columns={4}>
                <FilterStat
                  value={formatMinutes(mine.leadSpeed.medianResponseMinutes)}
                  label="Median response"
                  tone="neutral"
                  filled
                  hint={hint('Median time from a routed match to your accept/decline decision.')}
                />
                <FilterStat
                  value={pct(mine.leadSpeed.within1hRate)}
                  label="Responded < 1h"
                  tone="success"
                  filled
                  hint={hint('Share of decided matches you responded to within an hour.')}
                />
                <FilterStat
                  value={String(mine.leadSpeed.aging.open)}
                  label="Awaiting decision"
                  tone={mine.leadSpeed.aging.open > 0 ? 'warning' : 'neutral'}
                  filled
                  hint={hint('Routed matches still waiting on your accept/decline. Click to review.')}
                  onClick={() => navigate('/attorney-dashboard/leadgen/matches')}
                />
                <FilterStat
                  value={String(mine.leadSpeed.aging.over24h)}
                  label="Aging > 24h"
                  tone={mine.leadSpeed.aging.over24h > 0 ? 'danger' : 'neutral'}
                  filled
                  hint={hint('Undecided matches routed more than 24 hours ago — act on these first.')}
                  onClick={() => navigate('/attorney-dashboard/leadgen/matches')}
                />
              </StatGrid>
              {mine.leadSpeed.bySpeed.fast.n > 0 && mine.leadSpeed.bySpeed.slow.n > 0 && (
                <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  Matches you contacted within 1 hour retained at{' '}
                  <span className="font-semibold text-emerald-700">{pct(mine.leadSpeed.bySpeed.fast.retainRate)}</span>{' '}
                  vs{' '}
                  <span className="font-semibold text-slate-700">{pct(mine.leadSpeed.bySpeed.slow.retainRate)}</span>{' '}
                  when you responded slower.
                </div>
              )}
            </SectionCard>
          )}

          {mine?.decisionQuality && (
            <SectionCard title="Decision quality">
              {mine.decisionQuality.declined.total > 0 && (
                <div
                  className={`mb-3 rounded-lg border px-3 py-2.5 text-sm ${
                    mine.decisionQuality.declined.highViability > 0
                      ? 'border-amber-200 bg-amber-50 text-amber-900'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  }`}
                >
                  {mine.decisionQuality.declined.highViability > 0 ? (
                    <>
                      You declined{' '}
                      <span className="font-semibold">{mine.decisionQuality.declined.highViability}</span>{' '}
                      high-value {mine.decisionQuality.declined.highViability === 1 ? 'match' : 'matches'} (viability ≥ 70%)
                      {' '}— {pct(mine.decisionQuality.declined.highViabilityRate)} of your{' '}
                      {mine.decisionQuality.declined.total} declines. Worth a second look at strong-fit passes.
                    </>
                  ) : (
                    <>Good judgment — none of your {mine.decisionQuality.declined.total} declined matches were high-value.</>
                  )}
                </div>
              )}
              <p className="mb-2 text-xs text-slate-500">
                Do higher-fit matches actually convert better? Accept &amp; retain rates by AI match-fit band:
              </p>
              <DataTable
                columns={calibrationColumns}
                rows={mine.decisionQuality.calibration}
                rowKey={(r: any) => r.band}
              />
            </SectionCard>
          )}

          {benchmark && (
            <SectionCard
              title="You vs. firm"
              trailing={<span className="text-xs text-slate-400">{benchmark.peers} attorneys</span>}
            >
              <div className="space-y-2.5">
                <BenchmarkRow label="Accept rate" stat={benchmark.accept} />
                <BenchmarkRow label="Retain rate" stat={benchmark.retain} />
              </div>
            </SectionCard>
          )}

          <SectionCard
            title="My match quality by practice area"
            trailing={
              <div className="flex flex-wrap items-center gap-4">
                <MatchLegend />
                {MatchWindowSlider}
              </div>
            }
          >
            {windowedRows.length === 0 ? (
              <EmptyState
                message={`No matches in the last ${matchWindowDays} ${matchWindowDays === 1 ? 'day' : 'days'}.`}
              />
            ) : (
              <DataTable columns={mineColumns} rows={windowedRows} rowKey={(r) => r.label} />
            )}
          </SectionCard>
        </>
      )}
    </div>
  )
}
