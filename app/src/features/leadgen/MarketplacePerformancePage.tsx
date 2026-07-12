import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAttorneyDashboard, getFirmDashboard } from '../../lib/api'
import { useFirmDashboardSummary } from '../../hooks/useFirmDashboardSummary'
import { useAttorneyWorkspace } from '../shared/AttorneyWorkspaceContext'
import {
  Avatar,
  Badge,
  DataTable,
  EmptyState,
  FilterStat,
  PageHeader,
  SectionCard,
  StatGrid,
  StatHintsToggle,
  TableScroll,
  Th,
  THeadRow,
  Td,
  Tr,
  useStatHints,
  type BadgeTone,
  type DataTableColumn,
} from '../shared/ui'

function money(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `$${Math.round(value).toLocaleString()}`
}

function compactMoney(n?: number | null) {
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) return '$0'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 2).replace(/\.00$/, '')}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`
  return `$${Math.round(n)}`
}

function pct(fraction?: number | null) {
  if (typeof fraction !== 'number' || Number.isNaN(fraction)) return '—'
  const scaled = fraction <= 1 ? fraction * 100 : fraction
  return `${Math.round(scaled)}%`
}

function multiple(x?: number | null) {
  if (typeof x !== 'number' || !Number.isFinite(x) || x <= 0) return '—'
  return `${x.toFixed(1)}x`
}

interface FunnelRow {
  stage: string
  count: number
  stepConversion: number | null
  note: string
}

interface MonthlyRow {
  key: string
  label: string
  spend: number
  retainedValue: number
  cases: number
  roi: number
}

interface AttorneyRow {
  attorneyId: string
  name: string
  routingSpend: number
  casesRetained: number
  retainedValue: number
  feesCollected: number
  returnOnSpend: number
  costPerRetained: number
}

// Funnel bar tones per stage (routed → accepted → retained → settled).
const FUNNEL_BAR = ['bg-blue-500', 'bg-brand-600', 'bg-emerald-500', 'bg-slate-400']
const FUNNEL_DOT = ['bg-blue-500', 'bg-brand-600', 'bg-emerald-500', 'bg-slate-400']

function conversionTone(v: number): BadgeTone {
  if (v >= 0.5) return 'success'
  if (v >= 0.3) return 'warning'
  return 'danger'
}

function roiTone(x: number): BadgeTone {
  if (x >= 5) return 'success'
  if (x >= 2) return 'warning'
  if (x > 0) return 'neutral'
  return 'neutral'
}

const attorneyColumns: DataTableColumn<AttorneyRow>[] = [
  {
    key: 'name',
    header: 'Attorney',
    cell: (r) => (
      <div className="flex items-center gap-3">
        <Avatar name={r.name} />
        <span className="font-medium text-slate-800">{r.name}</span>
      </div>
    ),
  },
  { key: 'spend', header: 'Routing spend', align: 'right', cellClassName: 'tabular-nums text-slate-600', cell: (r) => money(r.routingSpend) },
  { key: 'cases', header: 'Cases retained', align: 'right', cellClassName: 'tabular-nums text-slate-600', cell: (r) => String(r.casesRetained) },
  {
    key: 'rv',
    header: 'Retained value',
    align: 'right',
    cellClassName: 'tabular-nums font-semibold text-emerald-700',
    cell: (r) => compactMoney(r.retainedValue),
  },
  {
    key: 'roi',
    header: 'ROI',
    align: 'right',
    cell: (r) => (r.returnOnSpend > 0 ? <Badge tone={roiTone(r.returnOnSpend)}>{multiple(r.returnOnSpend)}</Badge> : <span className="text-slate-400">—</span>),
  },
  { key: 'cpr', header: 'Cost / retained', align: 'right', cellClassName: 'tabular-nums text-slate-600', cell: (r) => money(r.costPerRetained) },
]

/** Horizontal-bar funnel: bar width is proportional to each stage's count. */
function FunnelChart({ rows }: { rows: FunnelRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  if (rows.length === 0) return <EmptyState message="No funnel activity yet." />
  return (
    <div className="space-y-3">
      {rows.map((r, i) => {
        const widthPct = r.count > 0 ? Math.max(6, Math.round((r.count / max) * 100)) : 0
        return (
          <div key={r.stage} className="flex items-center gap-3 sm:gap-4">
            <div className="w-36 shrink-0 sm:w-44">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${FUNNEL_DOT[i] ?? 'bg-slate-400'}`} />
                <span className="text-sm font-semibold text-slate-800">{r.stage}</span>
              </div>
              <p className="ml-4 text-xs text-slate-400">{r.note}</p>
            </div>
            <div className="min-w-0 flex-1">
              <div className="h-8 w-full overflow-hidden rounded-lg bg-slate-100">
                <div
                  className={`flex h-8 min-w-[2.5rem] items-center rounded-lg ${FUNNEL_BAR[i] ?? 'bg-slate-400'} transition-all`}
                  style={{ width: `${widthPct}%` }}
                >
                  <span className="px-2.5 text-sm font-semibold tabular-nums text-white">{r.count.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="w-20 shrink-0 text-right sm:w-24">
              {r.stepConversion == null ? (
                <span className="text-xs text-slate-400">—</span>
              ) : (
                <Badge tone={conversionTone(r.stepConversion)}>{pct(r.stepConversion)}</Badge>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Monthly spend-vs-return with a magnitude bar for retained value + ROI badge. */
function MonthlyReturns({ rows }: { rows: MonthlyRow[] }) {
  const maxRv = Math.max(1, ...rows.map((r) => r.retainedValue))
  if (rows.length === 0) return <EmptyState message="No monthly spend recorded yet." />
  return (
    <TableScroll>
      <THeadRow>
        <Th>Month</Th>
        <Th align="right">Routing spend</Th>
        <Th>Retained value</Th>
        <Th align="right">Cases</Th>
        <Th align="right">ROI</Th>
      </THeadRow>
      <tbody>
        {rows.map((r) => {
          const rvWidth = r.retainedValue > 0 ? Math.max(6, Math.round((r.retainedValue / maxRv) * 100)) : 0
          return (
            <Tr key={r.key}>
              <Td>
                <span className="font-semibold text-slate-800">{r.label}</span>
              </Td>
              <Td align="right" className="tabular-nums text-slate-600">
                {money(r.spend)}
              </Td>
              <Td className="min-w-[12rem]">
                <div className="flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${rvWidth}%` }} />
                  </div>
                  <span className="w-16 shrink-0 text-right tabular-nums font-semibold text-emerald-700">
                    {compactMoney(r.retainedValue)}
                  </span>
                </div>
              </Td>
              <Td align="right" className="tabular-nums text-slate-600">
                {r.cases}
              </Td>
              <Td align="right">
                {r.roi > 0 ? <Badge tone={roiTone(r.roi)}>{multiple(r.roi)}</Badge> : <span className="text-slate-400">—</span>}
              </Td>
            </Tr>
          )
        })}
      </tbody>
    </TableScroll>
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

export default function MarketplacePerformancePage() {
  const navigate = useNavigate()
  const { isFirmAdmin } = useAttorneyWorkspace()
  const { data: firmSummary } = useFirmDashboardSummary()
  const [scope, setScope] = useState<'mine' | 'firm'>('mine')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const effectiveScope = scope === 'firm' && isFirmAdmin ? 'firm' : 'mine'
  const firmAttorneyCount = Array.isArray(firmSummary?.attorneys) ? firmSummary.attorneys.length : null

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const loader = effectiveScope === 'firm' ? getFirmDashboard() : getAttorneyDashboard()
    loader
      .then((res: any) => !cancelled && setData(res))
      .catch((err) => !cancelled && setError(err?.response?.data?.error || err?.message || 'Failed to load performance'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [effectiveScope])

  const mp = useMemo(() => (data?.marketplace ?? null), [data])

  const { showHints, toggleHints, hint } = useStatHints()

  return (
    <div className="space-y-4">
      <PageHeader
        title="Marketplace Performance"
        actions={<StatHintsToggle showHints={showHints} onToggle={toggleHints} />}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
          <ScopePill active={scope === 'mine'} onClick={() => setScope('mine')}>
            My performance
          </ScopePill>
          <ScopePill active={scope === 'firm'} onClick={() => setScope('firm')}>
            {firmAttorneyCount ? `Firm · ${firmAttorneyCount} attorneys` : 'Firm'}
          </ScopePill>
        </div>
        <span className="ml-auto text-xs text-slate-400">Source: ClearCaseIQ routing · last 30 days</span>
      </div>

      {scope === 'firm' && !isFirmAdmin ? (
        <EmptyState message="Firm-wide marketplace performance is available to firm admins and managing partners." />
      ) : loading ? (
        <EmptyState message="Loading performance…" />
      ) : error ? (
        <EmptyState message={error} />
      ) : !mp ? (
        <EmptyState message="No performance data available yet." />
      ) : (
        <>
          <StatGrid columns={5}>
            <FilterStat value={money(mp.routingSpend)} label="Routing spend" tone="neutral" filled hint={hint('Total platform routing fees paid over the last 30 days.')} />
            <FilterStat value={compactMoney(mp.retainedValue)} label="Retained value" tone="success" filled hint={hint('Estimated combined value of cases you retained from routed matches.')} />
            <FilterStat value={multiple(mp.returnOnSpend)} label="Return on spend" tone="success" filled hint={hint('Fees collected on retained cases ÷ routing spend — real dollars returned per $1 of routing fees.')} />
            <FilterStat value={money(mp.costPerRetained)} label="Cost / retained case" tone="neutral" filled hint={hint('Routing spend ÷ cases retained — what each signed client cost in routing fees.')} />
            <FilterStat
              value={String(mp.casesRetained ?? 0)}
              label="Cases retained"
              tone="neutral"
              filled
              hint={hint('Matches that became signed/retained clients. Click to view them.')}
              onClick={() =>
                navigate(
                  effectiveScope === 'firm'
                    ? '/attorney-dashboard/cases/firm'
                    : '/attorney-dashboard/cases/active?stage=retained',
                )
              }
            />
          </StatGrid>

          <SectionCard title="Acquisition funnel · last 30 days">
            <FunnelChart rows={(mp.funnel ?? []) as FunnelRow[]} />
          </SectionCard>

          <SectionCard title="Spend vs. return by month">
            <MonthlyReturns rows={(mp.monthly ?? []) as MonthlyRow[]} />
          </SectionCard>

          {effectiveScope === 'firm' && Array.isArray(mp.byAttorney) && (
            <SectionCard
              title="Performance by attorney"
              trailing={<Badge tone="brand">{mp.byAttorney.length} attorneys</Badge>}
            >
              <DataTable
                columns={attorneyColumns}
                rows={mp.byAttorney as AttorneyRow[]}
                rowKey={(r) => r.attorneyId}
                emptyMessage="No attorney activity yet."
              />
            </SectionCard>
          )}
        </>
      )}
    </div>
  )
}
